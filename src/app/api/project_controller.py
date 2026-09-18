"""Versioned local projects. Shared workspace, not a user/authentication API."""
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, File, UploadFile

from src.app.api.dependencies import (CalculationBackend, call_calculation,
                                      get_calculation_service, get_project_service)
from src.app.dto.calc_dto import ResultExportEnvelopeDTO
from src.app.dto.web_dto import (CalculationCommandDTO, ErrorDTO, ProjectCreateDTO,
                                 ProjectDTO, ProjectListDTO, ProjectUpdateDTO)
from src.app.service.project_service import ProjectService
from src.app.api.plan_controller import SettingsDep, read_json_upload
from src.app.dto.web_dto import ComparisonDTO, ComparisonRequestDTO, ResultDownloadDTO
from src.app.service.export_service import csv_archive, result_document
from src.app.service.json_io import dumps

router = APIRouter(prefix="/api/projects", tags=["Проекты · web extension"], responses={
    404: {"model": ErrorDTO}, 409: {"model": ErrorDTO}, 500: {"model": ErrorDTO}, 503: {"model": ErrorDTO},
})
ServiceDep = Annotated[ProjectService, Depends(get_project_service)]
BackendDep = Annotated[CalculationBackend, Depends(get_calculation_service)]


def set_etag(response: Response, project: ProjectDTO):
    response.headers["ETag"] = f'"{project.project_id}-r{project.revision}"'
    if project.last_run is not None:
        response.headers["X-Result-Origin"] = project.last_run.origin
        response.headers["X-Engine-Status"] = project.last_run.engine.status
        response.headers["X-Input-Hash"] = project.last_run.input_hash
        response.headers["X-Result-Run-ID"] = str(project.last_run.run_id)


@router.post("", response_model=ProjectDTO, status_code=201, summary="Сохранить новый проект без запуска модели")
def create_project(command: ProjectCreateDTO, service: ServiceDep, response: Response):
    project = service.create(command.name, command.plan)
    set_etag(response, project)
    return project


@router.get("", response_model=ProjectListDTO, summary="Список проектов без тяжёлых таблиц результата")
def list_projects(service: ServiceDep, limit: Annotated[int, Query(ge=1, le=100)] = 20,
                  offset: Annotated[int, Query(ge=0)] = 0):
    return service.list(limit, offset)


@router.get("/{project_id}", response_model=ProjectDTO, summary="Открыть проект и последний снимок расчёта")
def get_project(project_id: UUID, service: ServiceDep, response: Response):
    project = service.get(project_id)
    set_etag(response, project)
    return project


@router.put("/{project_id}", response_model=ProjectDTO, summary="Сохранить правки с проверкой expected_revision")
def update_project(project_id: UUID, command: ProjectUpdateDTO, service: ServiceDep, response: Response):
    project = service.update(project_id, command)
    set_etag(response, project)
    return project


@router.delete("/{project_id}", status_code=204, summary="Удалить проект, только если ревизия не изменилась")
def delete_project(project_id: UUID, service: ServiceDep, expected_revision: Annotated[int, Query(ge=1)]):
    service.store.delete(project_id, expected_revision)
    return Response(status_code=204)


@router.post("/{project_id}/calculate", response_model=ProjectDTO, summary="Рассчитать и атомарно сохранить результат этой ревизии")
def calculate_project(project_id: UUID, command: CalculationCommandDTO, service: ServiceDep,
                      backend: BackendDep, response: Response):
    project = service.calculate(project_id, command.expected_revision, lambda plan: call_calculation(backend, plan))
    set_etag(response, project)
    return project


@router.get("/{project_id}/result", response_model=ResultExportEnvelopeDTO, summary="Только актуальный ResultExportEnvelope; stale → 409")
def get_result(project_id: UUID, service: ServiceDep, response: Response):
    project = service.current_result(project_id)
    set_etag(response, project)
    return project.last_run.result




@router.post("/import", response_model=ProjectDTO, status_code=201, summary="Открыть JSON-проект как новую копию; импортированный результат не доверенный")
def import_project(service: ServiceDep, settings: SettingsDep, response: Response,
                   file: Annotated[UploadFile, File(description="JSON-файл сохранённого проекта, schema_version=1")]):
    project = service.import_snapshot(read_json_upload(file, settings))
    set_etag(response, project)
    return project


@router.post("/compare", response_model=ComparisonDTO, summary="Сопоставить 2–6 актуальных сохранённых расчётов без пересчёта")
def compare_projects(command: ComparisonRequestDTO, service: ServiceDep):
    return service.compare(command.project_ids)


@router.get("/{project_id}/export", response_model=ProjectDTO, summary="Скачать полный проект, включая явно устаревший снимок, если он есть")
def export_project(project_id: UUID, service: ServiceDep):
    project = service.get(project_id)
    response = Response(content=dumps(project.model_dump(mode="json"), pretty=True), media_type="application/json",
                        headers={"Content-Disposition": f'attachment; filename="project-{project_id}.json"'})
    set_etag(response, project)
    return response


@router.get("/{project_id}/result/export", response_model=ResultDownloadDTO,
            responses={200: {"content": {"application/zip": {"schema": {"type": "string", "format": "binary"}}}}},
            summary="Скачать актуальный результат: JSON или ZIP с CSV и метаданными")
def export_result(project_id: UUID, service: ServiceDep, format: Literal["json", "csv"] = "json"):
    project = service.current_result(project_id)
    if format == "csv":
        response = Response(content=csv_archive(project), media_type="application/zip",
                            headers={"Content-Disposition": f'attachment; filename="result-{project_id}-csv.zip"'})
    else:
        response = Response(content=dumps(result_document(project), pretty=True), media_type="application/json",
                            headers={"Content-Disposition": f'attachment; filename="result-{project_id}.json"'})
    set_etag(response, project)
    return response
