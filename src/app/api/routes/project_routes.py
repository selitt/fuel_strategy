"""
Контроллер проектов участников и планов (/api/projects и /api/plans).
Аналог @RestController для управления проектами, снимками расчётов и экспортом.
"""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile

from src.app.api.deps import (
    CalculationBackend,
    call_calculation,
    get_calculation_service,
    get_project_service,
    get_settings,
    project_response,
    read_json_upload,
    set_etag,
)
from src.app.config.config import Settings
from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO
from src.app.dto.web_dto import (
    CalculationCommandDTO,
    ComparisonDTO,
    ComparisonRequestDTO,
    ErrorDTO,
    PlanValidationDTO,
    ProjectCreateDTO,
    ProjectDTO,
    ProjectListDTO,
    ProjectUpdateDTO,
    ResultDownloadDTO,
)
from src.app.service.export_service import csv_archive, result_document
from src.app.service.json_io import dumps
from src.app.service.project_service import ProjectService, validate_plan

plan_router = APIRouter(
    prefix="/api/plans",
    tags=["Планы · web extension"],
    responses={413: {"model": ErrorDTO}, 415: {"model": ErrorDTO}},
)

project_router = APIRouter(
    prefix="/api/projects",
    tags=["Проекты · web extension"],
    responses={
        404: {"model": ErrorDTO},
        409: {"model": ErrorDTO},
        500: {"model": ErrorDTO},
        503: {"model": ErrorDTO},
    },
)


@plan_router.post("/validate", response_model=PlanValidationDTO, summary="Проверить структуру плана без расчёта")
async def validate(_: ParticipantPlanDTO, http_request: Request):
    return validate_plan(await http_request.json())


@plan_router.post("/import", response_model=PlanValidationDTO, summary="Прочитать ParticipantPlan из JSON-файла")
def import_plan(
    settings: Settings = Depends(get_settings),
    file: UploadFile = File(description="JSON-план; не исполняемый Python"),
):
    return validate_plan(read_json_upload(file, settings))


@plan_router.post("/export", response_model=ParticipantPlanDTO, summary="Скачать план в переносимом JSON без запуска расчёта")
def export_plan(request: ParticipantPlanDTO):
    plan = validate_plan(request).plan
    return Response(
        content=dumps(plan.model_dump(mode="python"), pretty=True),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="plan.json"'},
    )


@project_router.post("", response_model=ProjectDTO, status_code=201, summary="Сохранить новый проект без запуска модели")
def create_project(
    command: ProjectCreateDTO,
    response: Response,
    service: ProjectService = Depends(get_project_service),
):
    project = service.create(command.name, command.plan)
    return project_response(project, response, status_code=201)


@project_router.get("", response_model=ProjectListDTO, summary="Список проектов без тяжёлых таблиц результата")
def list_projects(
    service: ProjectService = Depends(get_project_service),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return service.list(limit, offset)


@project_router.get("/{project_id}", response_model=ProjectDTO, summary="Открыть проект и последний снимок расчёта")
def get_project(
    project_id: UUID,
    response: Response,
    service: ProjectService = Depends(get_project_service),
):
    project = service.get(project_id)
    return project_response(project, response)


@project_router.put("/{project_id}", response_model=ProjectDTO, summary="Сохранить правки с проверкой expected_revision")
def update_project(
    project_id: UUID,
    command: ProjectUpdateDTO,
    response: Response,
    service: ProjectService = Depends(get_project_service),
):
    project = service.update(project_id, command)
    return project_response(project, response)


@project_router.delete("/{project_id}", status_code=204, summary="Удалить проект, только если ревизия не изменилась")
def delete_project(
    project_id: UUID,
    expected_revision: int = Query(..., ge=1),
    service: ProjectService = Depends(get_project_service),
):
    service.store.delete(project_id, expected_revision)
    return Response(status_code=204)


@project_router.post("/{project_id}/calculate", response_model=ProjectDTO, summary="Рассчитать и атомарно сохранить результат этой ревизии")
def calculate_project(
    project_id: UUID,
    command: CalculationCommandDTO,
    response: Response,
    service: ProjectService = Depends(get_project_service),
    backend: CalculationBackend = Depends(get_calculation_service),
):
    project = service.calculate(project_id, command.expected_revision, lambda plan: call_calculation(backend, plan))
    return project_response(project, response)


@project_router.get("/{project_id}/result", response_model=ResultExportEnvelopeDTO, summary="Только актуальный ResultExportEnvelope; stale → 409")
def get_result(
    project_id: UUID,
    response: Response,
    service: ProjectService = Depends(get_project_service),
):
    project = service.current_result(project_id)
    set_etag(response, project)
    return project.last_run.result


@project_router.post("/import", response_model=ProjectDTO, status_code=201, summary="Открыть JSON-проект как новую копию; импортированный результат не доверенный")
def import_project(
    response: Response,
    service: ProjectService = Depends(get_project_service),
    settings: Settings = Depends(get_settings),
    file: UploadFile = File(description="JSON-файл сохранённого проекта, schema_version=1"),
):
    project = service.import_snapshot(read_json_upload(file, settings))
    return project_response(project, response, status_code=201)


@project_router.post("/compare", response_model=ComparisonDTO, summary="Сопоставить 2–6 актуальных сохранённых расчётов без пересчёта")
def compare_projects(
    command: ComparisonRequestDTO,
    service: ProjectService = Depends(get_project_service),
):
    return service.compare(command.project_ids)


@project_router.get("/{project_id}/export", response_model=ProjectDTO, summary="Скачать полный проект, включая явно устаревший снимок, если он есть")
def export_project(
    project_id: UUID,
    service: ProjectService = Depends(get_project_service),
):
    project = service.get(project_id)
    response = Response(
        content=dumps(project.model_dump(mode="python"), pretty=True),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="project-{project_id}.json"'},
    )
    set_etag(response, project)
    return response


@project_router.get(
    "/{project_id}/result/export",
    response_model=ResultDownloadDTO,
    responses={200: {"content": {"application/zip": {"schema": {"type": "string", "format": "binary"}}}}},
    summary="Скачать актуальный результат: JSON или ZIP с CSV и метаданными",
)
def export_result(
    project_id: UUID,
    service: ProjectService = Depends(get_project_service),
    export_format: Literal["json", "csv"] = Query(default="json", alias="format"),
):
    project = service.current_result(project_id)
    if export_format == "csv":
        response = Response(
            content=csv_archive(project),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="result-{project_id}-csv.zip"'},
        )
    else:
        response = Response(
            content=dumps(result_document(project), pretty=True),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="result-{project_id}.json"'},
        )
    set_etag(response, project)
    return response
