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
from src.engine.source_overrides import catalog_with_source_overrides

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

    def get_template_plan(self) -> ParticipantPlanDTO:
        """Возвращает пустой план оператора для самостоятельного заполнения."""
        path = self.engine.catalog.data_root / "examples" / "empty_plan.json"
        return ParticipantPlanDTO.model_validate_json(path.read_text(encoding="utf-8"))

    def _run(self, request: ParticipantPlanDTO, *, risk: bool) -> ResultExportEnvelopeDTO:
        overrides = {key: value.model_dump() for key, value in request.source_overrides.items()}
        engine = self.engine
        if overrides:
            engine = SimulationEngine(catalog_with_source_overrides(self.engine.catalog, overrides))
        result = engine.run(
            plan_id=request.plan_id, scenario_id=request.scenario_id,
            decisions=request.decisions.model_dump(), run_risk_analysis=risk,
        )
        if overrides:
            result['source_overrides'] = overrides
            result['input_context'] = 'RESEARCH_SOURCE_OVERRIDES'
            result['assumptions_reference'] = {
                'model': 'docs/MODEL.md', 'classification': 'TEAM_ASSUMPTION',
                'source_overrides': overrides,
            }
        return validate_result(result)

    def calculate(self, request: ParticipantPlanDTO) -> ResultExportEnvelopeDTO:
        """
        Принимает план участника (ParticipantPlan), выполняет симуляцию в движке
        и возвращает валидированный конверт результатов (ResultExportEnvelope).
        """
        return self._run(request, risk=False)

    def calculate_risk(self, request: ParticipantPlanDTO) -> ResultExportEnvelopeDTO:
        """Запускает тот же расчёт с существующим анализом Монте-Карло."""
        return self._run(request, risk=True)
