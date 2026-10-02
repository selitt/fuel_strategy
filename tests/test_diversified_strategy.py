import json
import hashlib
from pathlib import Path

import pytest

from src.engine.calendar import normalize_plan
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog
from tools.optimize_strategy import (
    decode_diversified,
    diversified_concentration,
    evaluate_diversified_candidate,
    optimize_diversified,
)


ROOT = Path(__file__).resolve().parents[1]


def _params():
    return [
        60, 60,
        80, 80,
        100, 100,
        75, 75, 75, 75,
        90, 90, 90, 90,
        105, 105, 105, 105,
    ]


def test_diversified_decoder_uses_only_available_regular_channels():
    plan = decode_diversified(_params())
    normalize_plan(CaseCatalog(), plan)

    orders = plan["supply_orders"]
    by_year = {}
    for row in orders:
        by_year.setdefault(row["year"], set()).add(row["source_id"])

    assert by_year[2035] == {"Earth-Core", "Earth-Flex"}
    assert by_year[2036] == {"Earth-Core", "Earth-Flex"}
    assert by_year[2037] == {"Earth-Core", "Earth-Flex"}
    assert by_year[2038] == {
        "Earth-Core", "Earth-Flex", "Earth-New", "Lunar-ISRU"
    }
    assert all(row["source_id"] != "Emergency" for row in orders)
    assert all(not row["delivery_date"].endswith("-02-29") for row in orders)
    assert plan["inventory_policy"] == {"initial_inventory_t": 15.0}
    assert plan["investments"] == [
        {"investment_id": "ZBO", "year": 2036},
        {"investment_id": "LUNAR_ISRU", "year": 2036},
        {"investment_id": "EARTH_NEW", "year": 2036},
    ]


def test_concentration_is_maximum_regular_provider_share_in_any_year():
    plan = decode_diversified(_params())
    assert diversified_concentration(plan) == 0.5


def test_candidate_is_ranked_by_both_scenarios_before_concentration_and_cost():
    score, details = evaluate_diversified_candidate(_params())

    assert len(score) == 4
    assert set(details["scenarios"]) == {"BASE", "MANDATORY_STRESS"}
    assert score[0] == sum(
        len(result["violations"]) for result in details["scenarios"].values()
    )
    assert score[2] == diversified_concentration(details["plan"])


def test_bounded_search_is_reproducible_and_never_exceeds_engine_budget():
    first_plan, first_report = optimize_diversified(max_evaluations=8, seed=42)
    second_plan, second_report = optimize_diversified(max_evaluations=8, seed=42)

    assert first_plan == second_plan
    assert first_report == second_report
    assert 1 <= first_report["engine_evaluations"] <= 8
    assert first_report["evaluation_limit"] == 8
    assert first_report["seed"] == 42
    assert first_report["objective_order"] == [
        "hard_constraint_violations",
        "total_violation_excess",
        "max_annual_regular_provider_share",
        "base_total_cost_mln",
    ]


@pytest.mark.parametrize("limit", [1, 10_001])
def test_search_rejects_budget_outside_declared_bound(limit):
    with pytest.raises(ValueError, match="between 2 and 10000"):
        optimize_diversified(max_evaluations=limit, seed=42)


def test_published_strategy_and_report_match_real_engine_outputs():
    data = json.loads((ROOT / "data/strategies/diversified.json").read_text())
    report = json.loads((ROOT / "reports/diversified_strategy.json").read_text())
    decisions = {
        key: data[key]
        for key in (
            "investments", "capacity_reservations", "supply_orders", "inventory_policy"
        )
    }
    engine = SimulationEngine(CaseCatalog())

    assert data["id"] == "strategy_diversified"
    assert data["name"] == "Распределённый контур"
    assert data["decision_kind"] == "TEAM_DECISION"
    assert report["model_verified"] is False
    expected_hash = hashlib.sha256(
        json.dumps(data, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()
    assert report["strategy_sha256"] == expected_hash
    assert report["search"]["engine_evaluations"] <= 10_000
    for scenario in ("BASE", "MANDATORY_STRESS"):
        actual = engine.run(data["id"], scenario, decisions, run_risk_analysis=False)
        saved = report["deterministic"][scenario]
        assert saved["is_feasible"] == actual["is_feasible"]
        assert saved["total_cost_mln"] == actual["total_cost_mln"]
        assert saved["violations"] == [
            row for row in actual["constraint_checks"] if not row["passed"]
        ]
    for kind in ("diversified", "balanced"):
        mc = report["monte_carlo_base"][kind]
        assert mc["iterations"] == 100 and mc["seed"] == 42
        assert "probability_of_no_shortage" in mc
        assert "probability_of_all_constraints" in mc
        assert "median_shortage_t" in mc and "p95_shortage_t" in mc
