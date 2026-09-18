"""Project lifecycle around the existing calculation service; no model formulas."""
from time import perf_counter
from uuid import UUID, uuid4

from src.app.dto.web_dto import (EngineInfoDTO, ProjectDTO, ProjectListDTO,
                                 ProjectSummaryDTO, RunRecordDTO)
from src.app.errors import ApiProblem
from src.app.persistence.project_store import ProjectStore, now
from src.app.service.plan_io import plan_hash, validate_plan
from src.app.service.result_validation import validate_result


class ProjectService:
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

    def create(self, name, plan):
        normalized = validate_plan(plan).plan
        return self._view(self.store.create(name, normalized))

    def get(self, project_id: UUID) -> ProjectDTO:
        return self._view(self.store.get(project_id))

    def list(self, limit: int, offset: int) -> ProjectListDTO:
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

    def update(self, project_id, command):
        normalized = validate_plan(command.plan).plan
        return self._view(self.store.update(project_id, expected_revision=command.expected_revision,
                                           name=command.name, plan=normalized))

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
        # Commit only if no update/delete/other calculation has changed this project.
        return self._view(self.store.save_run(project_id, expected_revision, run))

    def current_result(self, project_id: UUID) -> ProjectDTO:
        project = self.get(project_id)
        if project.last_run is None:
            raise ApiProblem(409, "RESULT_NOT_AVAILABLE", "Проект ещё не рассчитан")
        if project.result_state != "current":
            raise ApiProblem(409, "RESULT_STALE", "Входы или версия модели изменились; выполните пересчёт")
        return project

    def import_snapshot(self, raw) -> ProjectDTO:
        from pydantic import ValidationError
        from src.app.service.json_io import InvalidJSON, ensure_finite
        from src.app.service.plan_io import validation_problem
        try:
            imported = ProjectDTO.model_validate(raw)
            ensure_finite(imported.model_dump(mode="json"))
            validate_plan(imported.plan)
            run = imported.last_run
            if run is not None:
                validate_result(run.result)
                if run.input_hash != plan_hash(run.plan_snapshot):
                    raise ApiProblem(422, "SNAPSHOT_HASH_MISMATCH", "Снимок входов не соответствует сохранённому input_hash")
                run.origin = "imported"
                run.engine = run.engine.model_copy(update={
                    "status": "unverified",
                    "limitations": [*run.engine.limitations, "Импортированный результат не пересчитан и не подтверждён сервером."],
                })
            # Do not use uploaded UUIDs/paths/revisions as storage destinations.
            return self._view(self.store.create(imported.name, imported.plan, last_run=run))
        except ValidationError as exc:
            raise validation_problem(exc) from exc
        except (InvalidJSON, ValueError) as exc:
            raise ApiProblem(422, "INVALID_SNAPSHOT", "Снимок должен содержать полный результат с конечными числами") from exc

    def compare(self, project_ids):
        from src.app.dto.web_dto import ComparisonDTO, ComparisonItemDTO
        items = []
        # Reading under one lock gives a coherent snapshot, not half an update.
        with self.store.lock:
            for project_id in project_ids:
                project = self.current_result(project_id)
                items.append(ComparisonItemDTO(project_id=project.project_id, name=project.name,
                                               revision=project.revision, run=project.last_run))
        return ComparisonDTO(items=items, warnings=[
            "Возвращены сохранённые результаты; новые расчёты, ранжирование и выбор стратегии не выполняются.",
            "Сопоставимость допущений, горизонтов и моделей должна проверяться отдельно.",
            "Статус и происхождение каждого расчёта находятся в run.engine и run.origin.",
        ])
