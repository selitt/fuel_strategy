"""Additive plan import/validation routes; never replaces /api/calc."""
from typing import Annotated
from fastapi import APIRouter, Depends, File, UploadFile, Request

from src.app.api.dependencies import get_settings
from src.app.config import Settings
from src.app.dto.calc_dto import ParticipantPlanDTO
from src.app.dto.web_dto import ErrorDTO, PlanValidationDTO
from src.app.service.plan_io import parse_json_file, validate_plan

router = APIRouter(prefix="/api/plans", tags=["Планы · web extension"], responses={
    413: {"model": ErrorDTO, "description": "Превышен размер запроса или файла"}, 415: {"model": ErrorDTO},
})
SettingsDep = Annotated[Settings, Depends(get_settings)]


def read_json_upload(file: UploadFile, settings: Settings):
    try:
        contents = file.file.read(settings.max_upload_bytes + 1)
        return parse_json_file(contents, file.filename, settings.max_upload_bytes)
    finally:
        file.file.close()


@router.post("/validate", response_model=PlanValidationDTO, summary="Проверить структуру плана без расчёта")
async def validate(request: ParticipantPlanDTO, http_request: Request):
    # Read the original JSON as well as using the DTO for OpenAPI/body validation.
    # Otherwise Pydantic defaults would have erased evidence of normalization.
    return validate_plan(await http_request.json())


@router.post("/import", response_model=PlanValidationDTO, summary="Прочитать ParticipantPlan из JSON-файла")
def import_plan(settings: SettingsDep, file: Annotated[UploadFile, File(description="JSON-план; не исполняемый Python")]):
    return validate_plan(read_json_upload(file, settings))


@router.post("/export", response_model=ParticipantPlanDTO, summary="Скачать план в переносимом JSON без запуска расчёта")
def export_plan(request: ParticipantPlanDTO):
    from fastapi import Response
    from src.app.service.json_io import dumps
    plan = validate_plan(request).plan
    return Response(content=dumps(plan.model_dump(mode="json"), pretty=True), media_type="application/json",
                    headers={"Content-Disposition": 'attachment; filename="plan.json"'})
