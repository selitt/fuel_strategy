"""
Контроллер расчётов материального баланса и экономики (/api/calc).
Аналог @RestController для операций моделирования снабжения.
"""

from fastapi import APIRouter, Depends

from src.app.api.deps import CalculationBackend, call_calculation, call_template, get_calculation_service
from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO

router = APIRouter(prefix="/api/calc", tags=["Моделирование снабжения"])


@router.get(
    "/template",
    response_model=ParticipantPlanDTO,
    summary="Получить типовой шаблон плана (ParticipantPlan)",
    operation_id="get_template_api_calc_template_get",
)
def get_template(service: CalculationBackend = Depends(get_calculation_service)):
    """Возвращает предзаполненный шаблон плана оператора для быстрого старта."""
    return call_template(service)


@router.post(
    "",
    response_model=ResultExportEnvelopeDTO,
    summary="Запустить расчёт материального баланса и экономики",
    operation_id="calculate_api_calc_post",
)
def calculate(
    request: ParticipantPlanDTO,
    service: CalculationBackend = Depends(get_calculation_service),
):
    """
    Принимает план решений оператора по схеме plan.schema.json
    и возвращает результаты моделирования по схеме export.schema.json.
    """
    return call_calculation(service, request)
