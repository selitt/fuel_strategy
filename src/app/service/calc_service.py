"""
Сервисный слой расчёта.
Связывает REST-контроллер с расчётным движком.
"""

try:
    from ..dto.calc_dto import (
        ParticipantPlanDTO,
        ResultExportEnvelopeDTO,
        SupplyOrderDTO,
        CapacityReservationDTO,
        InvestmentDecisionDTO,
        InventoryPolicyDTO,
        PlanDecisionsDTO,
    )
    from ...engine.pseudo_engine import run_pseudo_engine
except (ImportError, ValueError):
    from src.app.dto.calc_dto import (
        ParticipantPlanDTO,
        ResultExportEnvelopeDTO,
        SupplyOrderDTO,
        CapacityReservationDTO,
        InvestmentDecisionDTO,
        InventoryPolicyDTO,
        PlanDecisionsDTO,
    )
    from src.engine.pseudo_engine import run_pseudo_engine


class CalculationService:
    """Сервис для выполнения расчётов по планам участников."""

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
        result_dict = run_pseudo_engine(
            plan_id=request.plan_id,
            scenario_id=request.scenario_id,
            decisions=decisions_dict,
        )
        return ResultExportEnvelopeDTO.model_validate(result_dict)


calculation_service = CalculationService()
