"""
Сервисный слой расчёта.
Связывает REST API с расчётным движком src/engine и валидирует результаты.
"""

from pathlib import Path
from typing import Any
from src.app.dto.calc_dto import (
    ParticipantPlanDTO,
    ResultExportEnvelopeDTO,
    SupplyOrderDTO,
    CapacityReservationDTO,
    InvestmentDecisionDTO,
    InventoryPolicyDTO,
    PlanDecisionsDTO,
)
from src.app.service.json_io import ensure_finite
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog

REQUIRED_RESULT_FIELDS = frozenset({
    "scenario_id", "plan_id", "units", "assumptions_reference",
    "yearly_balance", "source_schedule", "inventory_trace", "financial_breakdown",
    "constraint_checks", "risk_register", "is_feasible", "total_cost_mln",
})


def validate_result(value: Any) -> ResultExportEnvelopeDTO:
    """Проверяет полноту и конечность чисел в результате расчёта."""
    supplied = value.model_fields_set if isinstance(value, ResultExportEnvelopeDTO) else set(value)
    if not REQUIRED_RESULT_FIELDS <= supplied:
        raise ValueError("Incomplete result; success and zero defaults must not be manufactured")
    result = value if isinstance(value, ResultExportEnvelopeDTO) else ResultExportEnvelopeDTO.model_validate(value)
    ensure_finite(result.model_dump(mode="python"))
    return result


class CalculationService:
    """Сервис для выполнения расчётов по планам участников."""

    def __init__(self, reference_dir: Path | None = None):
        self.engine = SimulationEngine(CaseCatalog(reference_dir))

    @staticmethod
    def get_template_plan() -> ParticipantPlanDTO:
        """Возвращает типовой базовый план (шаблон)."""
        orders = []
        reservations = []
        for y in range(2035, 2041):
            orders.append(SupplyOrderDTO(year=y, source_id="Earth-Core", order_t=100.0))
            reservations.append(CapacityReservationDTO(year=y, source_id="Earth-Core", reserved_capacity_t=120.0))

        return ParticipantPlanDTO(
            plan_id="baseline-plan-v1",
            scenario_id="BASE",
            decisions=PlanDecisionsDTO(
                supply_orders=orders,
                capacity_reservations=reservations,
                investments=[
                    InvestmentDecisionDTO(investment_id="ZBO", year=2036),
                    InvestmentDecisionDTO(investment_id="LUNAR_ISRU", year=2038),
                ],
                inventory_policy=InventoryPolicyDTO(initial_inventory_t=12.33),
            ),
        )

    def calculate(self, request: ParticipantPlanDTO) -> ResultExportEnvelopeDTO:
        """
        Принимает план участника (ParticipantPlan), выполняет симуляцию в движке
        и возвращает валидированный конверт результатов (ResultExportEnvelope).
        """
        decisions_dict = request.decisions.model_dump()
        result_dict = self.engine.run(
            plan_id=request.plan_id,
            scenario_id=request.scenario_id,
            decisions=decisions_dict,
            run_risk_analysis=False,
        )
        return validate_result(result_dict)

    def calculate_risk(self, request: ParticipantPlanDTO) -> ResultExportEnvelopeDTO:
        """Запускает тот же расчёт с существующим анализом Монте-Карло."""
        result_dict = self.engine.run(
            plan_id=request.plan_id,
            scenario_id=request.scenario_id,
            decisions=request.decisions.model_dump(),
            run_risk_analysis=True,
        )
        return validate_result(result_dict)
