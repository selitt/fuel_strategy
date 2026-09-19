"""
Сервис управления проектами и планами.
Жизненный цикл проектов, вычисление хэша плана, валидация входных структур и снимков.
"""
from __future__ import annotations

from pathlib import PurePosixPath
from time import perf_counter
from uuid import UUID, uuid4

from fastapi import HTTPException
from pydantic import ValidationError

from src.app.dto.calc_dto import ParticipantPlanDTO
from src.app.dto.web_dto import (
    ComparisonDTO,
    ComparisonItemDTO,
    EngineInfoDTO,
    PlanValidationDTO,
    ProjectDTO,
    ProjectListDTO,
    ProjectSummaryDTO,
    RunRecordDTO,
)
from src.app.persistence.project_store import ProjectStore, now
from src.app.service.calc_service import validate_result
from src.app.service.json_io import InvalidJSON, MAX_DOCUMENT_DEPTH, ensure_finite, loads, plan_hash

PLAN_WARNINGS = [
    "Проверены только DTO и JSON-структура; допустимость плана и ограничения модели здесь не рассчитываются.",
    "Defaults, включая initial_inventory_t=12.33, унаследованы из DTO Васи; это не новые условия организатора.",
    "Дополнительные поля сохраняются, но их поддержку расчётным модулем должен подтвердить его владелец.",
]


def validation_problem(exc: ValidationError) -> HTTPException:
    """Форматирует ошибки Pydantic в стандартный HTTPException."""
    return HTTPException(status_code=422, detail=exc.errors())


def validate_plan(value) -> PlanValidationDTO:
    """Валидирует входной JSON-объект на соответствие ParticipantPlanDTO."""
    raw = value.model_dump(mode="python") if isinstance(value, ParticipantPlanDTO) else value
    try:
        ensure_finite(raw)
        plan = ParticipantPlanDTO.model_validate(raw)
        ensure_finite(plan.model_dump(mode="python"))
    except ValidationError as exc:
        raise validation_problem(exc) from exc
    except InvalidJSON as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return PlanValidationDTO(plan=plan, normalized=plan.model_dump(mode="python") != raw, warnings=list(PLAN_WARNINGS))


def parse_json_file(contents: bytes, filename: str | None, limit: int):
    """Безопасно парсит загруженный файл JSON с проверкой размера и расширения."""
    name = (filename or "").replace("\\", "/")
    if PurePosixPath(name).suffix.lower() != ".json":
        raise HTTPException(status_code=415, detail="Поддерживается JSON-файл (.json), не Python/CSV/XLSX")
    if len(contents) > limit:
        raise HTTPException(status_code=413, detail="Файл превышает разрешённый размер")
    try:
        return loads(contents)
    except InvalidJSON as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


class ProjectService:
    """Сервис жизненного цикла проектов участников."""

    def __init__(self, store: ProjectStore, engine: EngineInfoDTO):
        self.store = store
        self.engine = engine

    def _view(self, project: ProjectDTO) -> ProjectDTO:
        run = project.last_run
        if run is None:
            project.result_state = "not_calculated"
        else:
            same_inputs = run.input_hash == plan_hash(project.plan)
            same_engine = (run.engine.engine_id == self.engine.engine_id and run.engine.version == self.engine.version)
            project.result_state = "current" if same_inputs and same_engine else "stale"
        return project

    def create(self, name: str, plan: ParticipantPlanDTO | dict) -> ProjectDTO:
        normalized = validate_plan(plan).plan
        return self._view(self.store.create(name, normalized))

    def get(self, project_id: UUID) -> ProjectDTO:
        return self._view(self.store.get(project_id))

    def list_projects(self, limit: int, offset: int) -> ProjectListDTO:
        projects = self.store.list_all()
        items = []
        for project in projects[offset:offset + limit]:
            project = self._view(project)
            items.append(ProjectSummaryDTO(
                project_id=project.project_id, name=project.name, revision=project.revision,
                plan_id=project.plan.plan_id, scenario_id=project.plan.scenario_id,
                created_at=project.created_at, updated_at=project.updated_at, result_state=project.result_state,
            ))
        return ProjectListDTO(items=items, total=len(projects), limit=limit, offset=offset)

    list = list_projects

    def update(self, project_id: UUID, command) -> ProjectDTO:
        normalized = validate_plan(command.plan).plan
        return self._view(self.store.update(
            project_id, expected_revision=command.expected_revision,
            name=command.name, plan=normalized,
        ))

    def calculate(self, project_id: UUID, expected_revision: int, runner) -> ProjectDTO:
        original = self.get(project_id)
        self.store.require_revision(original, expected_revision)
        snapshot = original.plan.model_copy(deep=True)
        input_hash = plan_hash(snapshot)
        started = perf_counter()
        result = runner(snapshot.model_copy(deep=True))
        run = RunRecordDTO(
            run_id=uuid4(), input_revision=expected_revision, input_hash=input_hash,
            plan_snapshot=snapshot, result=result, created_at=now(),
            duration_ms=(perf_counter() - started) * 1000, engine=self.engine, origin="server",
        )
        return self._view(self.store.save_run(project_id, expected_revision, run))

    def current_result(self, project_id: UUID) -> ProjectDTO:
        project = self.get(project_id)
        if project.last_run is None:
            raise HTTPException(status_code=409, detail="Проект ещё не рассчитан")
        if project.result_state != "current":
            raise HTTPException(status_code=409, detail="Входы или версия модели изменились; выполните пересчёт")
        return project

    def import_snapshot(self, raw) -> ProjectDTO:
        try:
            imported = ProjectDTO.model_validate(raw)
            ensure_finite(imported.model_dump(mode="python"), max_depth=MAX_DOCUMENT_DEPTH)
            validate_plan(imported.plan)
            run = imported.last_run
            if run is not None:
                validate_result(run.result)
                if run.input_hash != plan_hash(run.plan_snapshot):
                    raise HTTPException(status_code=422, detail="Снимок входов не соответствует сохранённому input_hash")
                run.origin = "imported"
                run.engine = run.engine.model_copy(update={
                    "status": "unverified",
                    "limitations": [*run.engine.limitations, "Импортированный результат не пересчитан и не подтверждён сервером."],
                })
            return self._view(self.store.create(imported.name, imported.plan, last_run=run))
        except ValidationError as exc:
            raise validation_problem(exc) from exc
        except (InvalidJSON, ValueError) as exc:
            raise HTTPException(status_code=422, detail="Снимок должен содержать полный результат с конечными числами") from exc

    def compare(self, project_ids: list[UUID]) -> ComparisonDTO:
        items = []
        with self.store.lock:
            for project_id in project_ids:
                project = self.current_result(project_id)
                items.append(ComparisonItemDTO(
                    project_id=project.project_id, name=project.name,
                    revision=project.revision, run=project.last_run,
                ))
        return ComparisonDTO(items=items, warnings=[
            "Возвращены сохранённые результаты; новые расчёты, ранжирование и выбор стратегии не выполняются.",
            "Сопоставимость допущений, горизонтов и моделей должна проверяться отдельно.",
            "Статус и происхождение каждого расчёта находятся в run.engine и run.origin.",
        ])
