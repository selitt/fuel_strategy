"""Original four-operation API: the payloads and operationIds stay compatible with KosmoAPI.yaml."""
from typing import Annotated
from fastapi import APIRouter, Depends

from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO
from src.app.api.dependencies import CalculationBackend, call_calculation, get_calculation_service

router = APIRouter(prefix="/api/calc", tags=["Моделирование снабжения"])
BackendDep = Annotated[CalculationBackend, Depends(get_calculation_service)]


@router.get(
    "/template",
    response_model=ParticipantPlanDTO,
    summary="Получить типовой шаблон плана (ParticipantPlan)",
    operation_id="get_template_api_calc_template_get",
)
def get_template(service: BackendDep):
    """Возвращает предзаполненный шаблон плана оператора для быстрого старта."""
    return service.get_template_plan()


@router.post(
    "",
    response_model=ResultExportEnvelopeDTO,
    summary="Запустить расчёт материального баланса и экономики",
    operation_id="calculate_api_calc_post",
)
def calculate(request: ParticipantPlanDTO, service: BackendDep):
    """
    Принимает план решений оператора по схеме plan.schema.json
    и возвращает результаты моделирования по схеме export.schema.json.
    """
    # A synchronous service runs in FastAPI's threadpool, not on the event loop.
    # This is not a process pool or a claim of CPU parallelism/acceleration.
    return call_calculation(service, request)
