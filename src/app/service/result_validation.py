"""Completeness checks at transport/storage boundaries, not mathematical validation."""
from src.app.dto.calc_dto import ResultExportEnvelopeDTO
from src.app.service.json_io import ensure_finite

REQUIRED_RESULT_FIELDS = frozenset({
    "scenario_id", "plan_id", "units", "assumptions_reference",
    "yearly_balance", "source_schedule", "inventory_trace", "financial_breakdown",
    "constraint_checks", "risk_register", "is_feasible", "total_cost_mln",
})


def validate_result(value) -> ResultExportEnvelopeDTO:
    supplied = value.model_fields_set if isinstance(value, ResultExportEnvelopeDTO) else set(value)
    if not REQUIRED_RESULT_FIELDS <= supplied:
        raise ValueError("Incomplete result; success and zero defaults must not be manufactured")
    result = value if isinstance(value, ResultExportEnvelopeDTO) else ResultExportEnvelopeDTO.model_validate(value)
    # Check Python values before JSON serialization can turn NaN/Infinity in
    # extensible fields into null and erase evidence of an invalid result.
    ensure_finite(result.model_dump(mode="python"))
    return result
