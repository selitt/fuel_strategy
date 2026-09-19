"""
Сервисный слой расчёта.
Связывает REST-контроллер с расчётным движком.
"""

from pathlib import Path

from src.app.dto.calc_dto import (
    ParticipantPlanDTO,
    ResultExportEnvelopeDTO,
    SupplyOrderDTO,
    CapacityReservationDTO,
    InvestmentDecisionDTO,
    InventoryPolicyDTO,
    PlanDecisionsDTO,
)
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog


class CalculationService:
    """Сервис для выполнения расчётов по планам участников."""

    def __init__(self, reference_dir: Path | None = None):
        self.engine = SimulationEngine(CaseCatalog(reference_dir))

    def get_template_plan(self) -> ParticipantPlanDTO:
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
        и возвращает конверт результатов (ResultExportEnvelope).
        """
        decisions_dict = request.decisions.model_dump()
        result_dict = self.engine.run(
            plan_id=request.plan_id,
            scenario_id=request.scenario_id,
            decisions=decisions_dict,
            run_risk_analysis=False,
        )
        return ResultExportEnvelopeDTO.model_validate(result_dict)

    def calculate_risk(self, request: ParticipantPlanDTO) -> ResultExportEnvelopeDTO:
        """Запускает тот же расчёт с существующим анализом Монте-Карло."""
        result_dict = self.engine.run(
            plan_id=request.plan_id,
            scenario_id=request.scenario_id,
            decisions=request.decisions.model_dump(),
            run_risk_analysis=True,
        )
        return ResultExportEnvelopeDTO.model_validate(result_dict)


calculation_service = CalculationService()
