"""Calculation API: original operations stay compatible; risk analysis is additive."""
from typing import Annotated
from fastapi import APIRouter, Depends

from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO
from src.app.dto.calc_dto import BuiltinStrategyDTO
from src.app.api.deps import get_settings
from src.app.config.config import Settings
from src.engine.strategies import BUILTIN_STRATEGY_KINDS, load_builtin_strategy, load_builtin_strategy_data
from src.app.api.deps import (
    CalculationBackend,
    call_calculation,
    call_risk_calculation,
    call_template,
    get_calculation_service,
)

router = APIRouter(prefix="/api/calc", tags=["Моделирование снабжения"])
BackendDep = Annotated[CalculationBackend, Depends(get_calculation_service)]


@router.get('/strategies', response_model=list[BuiltinStrategyDTO], summary='Готовые стратегии команды')
def get_strategies(settings: Annotated[Settings, Depends(get_settings)]):
    items = []
    for kind in BUILTIN_STRATEGY_KINDS:
        data = load_builtin_strategy_data(kind, settings.reference_dir)
        decisions = load_builtin_strategy(kind, data_root=settings.reference_dir)
        plan_id = decisions.pop('plan_id')
        decisions.pop('description')
        items.append(BuiltinStrategyDTO(
            id=data['id'], name=data['name'], description=data['description'],
            plan=ParticipantPlanDTO(plan_id=plan_id, scenario_id=data['scenario_id'], decisions=decisions),
        ))
    return items


@router.get(
    "/template",
    response_model=ParticipantPlanDTO,
    summary="Получить типовой шаблон плана (ParticipantPlan)",
    operation_id="get_template_api_calc_template_get",
)
def get_template(service: BackendDep):
    """Возвращает пустой план оператора для самостоятельного заполнения."""
    return call_template(service)


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


@router.post(
    "/risk",
    response_model=ResultExportEnvelopeDTO,
    summary="Запустить отдельный анализ рисков Монте-Карло",
    operation_id="calculate_risk_api_calc_risk_post",
)
def calculate_risk(request: ParticipantPlanDTO, service: BackendDep):
    """Возвращает обычный результат и сводку 100 прогонов с seed 42."""
    return call_risk_calculation(service, request)
