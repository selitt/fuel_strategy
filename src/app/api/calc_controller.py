"""
REST-контроллер для расчёта и планирования снабжения.
Принимает ParticipantPlan (plan.schema.json) и возвращает ResultExportEnvelope (export.schema.json).
"""

from fastapi import APIRouter

try:
    from ..dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO
    from ..service.calc_service import calculation_service, get_template_plan
except (ImportError, ValueError):
    from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO
    from src.app.service.calc_service import calculation_service

router = APIRouter(prefix="/api/calc", tags=["Моделирование снабжения"])


@router.get(
    "/template",
    response_model=ParticipantPlanDTO,
    summary="Получить типовой шаблон плана (ParticipantPlan)",
)
async def get_template():
    """
    Возвращает предзаполненный шаблон плана оператора для быстрого старта.
    """
    return get_template_plan()


@router.post(
    "",
    response_model=ResultExportEnvelopeDTO,
    summary="Запустить расчёт материального баланса и экономики",
)
async def calculate(request: ParticipantPlanDTO):
    """
    Принимает план решений оператора по схеме plan.schema.json
    и возвращает результаты моделирования по схеме export.schema.json.
    """
    return calculate(request)
