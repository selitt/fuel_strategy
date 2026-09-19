import copy
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import yaml
from types import SimpleNamespace

import pytest

from src.engine.analysis import (
    capped_reserve_plan,
    compact_monte_carlo,
    demand_catalog,
    detect_scan_events,
    generate_analysis_bundle,
    json_ready,
    load_analysis_config,
    result_year_rows,
    select_candidate,
    strategy_plans,
)


ROOT = Path(__file__).resolve().parents[1]


def test_analysis_config_discloses_case_endpoints_and_team_assumption_ranges():
    config = load_analysis_config(ROOT / "data" / "analysis" / "config.yaml")

    assert config["classification"] == "TEAM_ASSUMPTION"
    assert config["sensitivity"]["earth_core_price"]["values"] == pytest.approx(
        [6.0, 6.2, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0]
    )
    assert config["sensitivity"]["earth_core_price"]["case_input_control"] == 6.2
    assert config["sensitivity"]["earth_core_price"]["comparison_pair"] == [
        "earth_fortress",
        "lunar_pioneer",
    ]
    assert config["sensitivity"]["demand_interpolation"]["case_input_endpoints"] == [
        "low_total_t",
        "high_total_t",
    ]
    assert config["monte_carlo"] == {
        "iterations": 100,
        "primary_seed": 42,
        "seeds": [42, 43, 44],
    }


def test_analysis_config_rejects_unimplemented_discounting(tmp_path):
    source = yaml.safe_load((ROOT / "data" / "analysis" / "config.yaml").read_text())
    source["cost_comparison"]["discount_rate"] = 0.1
    path = tmp_path / "config.yaml"
    path.write_text(yaml.safe_dump(source), encoding="utf-8")

    with pytest.raises(ValueError, match="undiscounted_sum.*discount_rate=0"):
        load_analysis_config(path)


@pytest.mark.parametrize(
    ("section", "field", "value"),
    [
        ("demand_interpolation", "base_critical_unchanged", False),
        ("lunar_actual_share", "years", [2039, 2040]),
    ],
)
def test_analysis_config_rejects_unsupported_sensitivity_semantics(
    tmp_path, section, field, value
):
    source = yaml.safe_load((ROOT / "data" / "analysis" / "config.yaml").read_text())
    source["sensitivity"][section][field] = value
    path = tmp_path / "config.yaml"
    path.write_text(yaml.safe_dump(source), encoding="utf-8")

    with pytest.raises(ValueError, match="unsupported sensitivity semantics"):
        load_analysis_config(path)


def test_strategy_plans_returns_five_independent_existing_factory_plans():
    first = strategy_plans()
    second = strategy_plans()

    assert list(first) == [
        "earth_fortress",
        "lunar_pioneer",
        "balanced",
        "base_builtin",
        "stress_builtin",
    ]
    assert len({plan["plan_id"] for plan in first.values()}) == 5
    first["base_builtin"]["inventory_policy"]["initial_inventory_t"] = -1
    assert second["base_builtin"]["inventory_policy"]["initial_inventory_t"] >= 0


def test_demand_interpolation_deep_copies_catalog_and_keeps_base_critical():
    original = SimpleNamespace(
        demands={
            2035: SimpleNamespace(
                base_total_t=100.0,
                base_critical_t=80.0,
                low_total_t=70.0,
                high_total_t=130.0,
            )
        }
    )
    snapshot = copy.deepcopy(original)

    changed = demand_catalog(original, 0.25)

    assert changed.demands[2035].base_total_t == 85.0
    assert changed.demands[2035].base_critical_t == 80.0
    assert original.demands[2035].base_total_t == snapshot.demands[2035].base_total_t
    assert changed is not original


def test_demand_interpolation_rejects_total_below_unchanged_critical():
    original = SimpleNamespace(
        demands={
            2035: SimpleNamespace(
                base_total_t=100.0,
                base_critical_t=80.0,
                low_total_t=70.0,
                high_total_t=130.0,
            )
        }
    )

    with pytest.raises(ValueError, match="below critical"):
        demand_catalog(original, 0.0)


def test_candidate_selection_never_calls_a_candidate_optimal():
    feasible = [
        {"strategy_id": "expensive", "is_feasible": True, "total_cost_mln": 20.0},
        {"strategy_id": "cheap", "is_feasible": True, "total_cost_mln": 10.0},
        {"strategy_id": "failed", "is_feasible": False, "total_cost_mln": 1.0},
    ]
    no_feasible = [
        {"strategy_id": "b", "is_feasible": False, "total_cost_mln": 12.0},
        {"strategy_id": "a", "is_feasible": False, "total_cost_mln": 11.0},
    ]

    selected = select_candidate(feasible)
    diagnosis = select_candidate(no_feasible)

    assert selected == {
        "status": "cheapest_feasible_candidate",
        "strategy_id": "cheap",
        "total_cost_mln": 10.0,
        "is_feasible": True,
    }
    assert diagnosis["status"] == "diagnostic_cheapest_infeasible_candidate"
    assert diagnosis["strategy_id"] == "a"
    assert "optimal" not in json.dumps([selected, diagnosis]).lower()


def test_scan_events_only_compares_costs_when_both_candidates_are_feasible():
    rows = [
        {"value": 0.0, "strategy_id": "a", "is_feasible": True, "total_cost_mln": 10.0},
        {"value": 0.0, "strategy_id": "b", "is_feasible": True, "total_cost_mln": 11.0},
        {"value": 1.0, "strategy_id": "a", "is_feasible": True, "total_cost_mln": 12.0},
        {"value": 1.0, "strategy_id": "b", "is_feasible": True, "total_cost_mln": 11.0},
        {"value": 2.0, "strategy_id": "a", "is_feasible": False, "total_cost_mln": 9.0},
        {"value": 2.0, "strategy_id": "b", "is_feasible": True, "total_cost_mln": 13.0},
    ]

    events = detect_scan_events(rows)

    assert events["cost_crossing_brackets"] == [
        {"left": 0.0, "right": 1.0, "strategy_ids": ["a", "b"]}
    ]
    assert events["nominal_cost_crossing_brackets"] == [
        {
            "left": 0.0,
            "right": 1.0,
            "strategy_ids": ["a", "b"],
            "left_both_feasible": True,
            "right_both_feasible": True,
        },
        {
            "left": 1.0,
            "right": 2.0,
            "strategy_ids": ["a", "b"],
            "left_both_feasible": True,
            "right_both_feasible": False,
        },
    ]
    assert events["feasibility_transition_brackets"] == [
        {"left": 1.0, "right": 2.0, "strategy_id": "a"}
    ]
    assert events["comparison_rule"] == "costs_compared_only_when_both_candidates_feasible"


def test_compact_monte_carlo_keeps_samples_but_drops_daily_trajectories():
    source = {
        "iterations": 2,
        "seed": 42,
        "shortage_samples_t": [0.0, 1.0],
        "total_cost_samples_mln": [10.0, 11.0],
        "daily_trajectories": {"runs": [{"inventory_t": list(range(1000))}]},
    }

    compact = compact_monte_carlo(source)

    assert compact["shortage_samples_t"] == [0.0, 1.0]
    assert compact["total_cost_samples_mln"] == [10.0, 11.0]
    assert compact["daily_trajectories_omitted"] is True
    assert "daily_trajectories" not in compact
    assert source["daily_trajectories"]["runs"]


def test_json_ready_rejects_nan_and_infinity():
    assert json_ready({"value": 1.25}) == {"value": 1.25}
    for value in (math.nan, math.inf, -math.inf):
        with pytest.raises(ValueError, match="non-finite"):
            json_ready({"value": value})


def test_result_year_rows_preserves_required_cost_service_stock_and_constraints():
    result = {
        "is_feasible": False,
        "total_cost_mln": 123.0,
        "yearly_balance": [
            {
                "year": 2035,
                "service_level_total": 0.98,
                "service_level_critical": 1.0,
                "shortage_t": 2.0,
                "closing_inventory_t": 4.0,
                "spill_t": 1.0,
            }
        ],
        "financial_breakdown": [{"year": 2035, "total": 20.0}],
        "constraint_checks": [
            {"constraint_id": "A", "year": 2035, "passed": False},
            {"constraint_id": "B", "year": 2035, "passed": True},
        ],
    }

    rows = result_year_rows("plan", "BASE", result)

    assert rows == [
        {
            "strategy_id": "plan",
            "scenario_id": "BASE",
            "year": 2035,
            "is_feasible": False,
            "total_cost_mln": 123.0,
            "year_cost_mln": 20.0,
            "service_level_total": 0.98,
            "service_level_critical": 1.0,
            "shortage_t": 2.0,
            "closing_inventory_t": 4.0,
            "spill_t": 1.0,
            "failed_constraints": "A",
        }
    ]


def test_reserve_prevention_adds_twenty_percent_without_exceeding_case_capacity():
    catalog = SimpleNamespace(
        sources={
            "A": SimpleNamespace(source_id="A", capacity_t_per_year=100.0),
            "Emergency": SimpleNamespace(source_id="E", capacity_t_per_year=50.0),
        }
    )
    source = {
        "capacity_reservations": [
            {"year": 2035, "source_id": "A", "reserved_capacity_t": 90.0},
            {"year": 2035, "source_id": "Emergency", "reserved_capacity_t": 45.0},
        ]
    }

    changed = capped_reserve_plan(source, catalog)

    assert [row["reserved_capacity_t"] for row in changed["capacity_reservations"]] == [
        90.0,
        50.0,
    ]
    assert source["capacity_reservations"][0]["reserved_capacity_t"] == 90.0


def test_generate_bundle_is_strict_json_compact_and_does_not_change_case_inputs(tmp_path):
    observed_mc_calls = []

    def deterministic_runner(catalog, scenario_id, plan):
        years = sorted(catalog.demands)
        stock = float(plan["inventory_policy"]["initial_inventory_t"])
        price = catalog.sources["Earth-Core"].variable_cost_mln_per_t
        cost = round(1000.0 + price + stock, 2)
        return {
            "scenario_id": scenario_id,
            "plan_id": plan["plan_id"],
            "is_feasible": True,
            "total_cost_mln": cost,
            "yearly_balance": [
                {
                    "year": year,
                    "service_level_total": 1.0,
                    "service_level_critical": 1.0,
                    "shortage_t": 0.0,
                    "closing_inventory_t": stock,
                    "spill_t": 0.0,
                }
                for year in years
            ],
            "financial_breakdown": [
                {"year": year, "total": round(cost / len(years), 2)}
                for year in years
            ],
            "constraint_checks": [],
            "source_schedule": [],
            "delivery_schedule": [{"large": "omitted"}],
            "inventory_trace": [{"large": "omitted"}],
            "risk_register": [],
        }

    def mc_runner(catalog, scenario_id, plan, **kwargs):
        observed_mc_calls.append((scenario_id, plan["plan_id"], kwargs))
        return {
            "iterations": kwargs["iterations"],
            "seed": kwargs["seed"],
            "probability_of_all_constraints": 1.0,
            "probability_of_no_shortage": 1.0,
            "mean_total_cost_mln": 10.0,
            "p95_total_cost_mln": 11.0,
            "mean_emergency_procurement_mln": 0.0,
            "p95_emergency_procurement_mln": 0.0,
            "shortage_samples_t": [0.0] * kwargs["iterations"],
            "daily_trajectories": {"runs": [{"large": "omitted"}]},
        }

    input_path = ROOT / "data" / "demand.csv"
    before = hashlib.sha256(input_path.read_bytes()).hexdigest()
    outputs = generate_analysis_bundle(
        config_path=ROOT / "data" / "analysis" / "config.yaml",
        output_dir=tmp_path,
        command=["python", "tools/analyze_case.py"],
        deterministic_runner=deterministic_runner,
        monte_carlo_runner=mc_runner,
    )

    assert set(outputs) == {
        "analysis_manifest.json",
        "strategy_scenarios.json",
        "strategy_scenarios.csv",
        "sensitivity.csv",
        "sensitivity_crossovers.json",
        "research_risks.csv",
        "prevention_measures.csv",
        "monte_carlo.json",
    }
    manifest = json.loads((tmp_path / "analysis_manifest.json").read_text())
    monte_carlo = json.loads((tmp_path / "monte_carlo.json").read_text())
    assert manifest["model_verified"] is False
    assert manifest["command"] == ["python", "tools/analyze_case.py"]
    assert len(manifest["strategy_plan_snapshots"]) == 5
    assert manifest["input_file_sha256"]["data/demand.csv"] == before
    assert "src/engine/analysis.py" in manifest["code_file_sha256"]
    assert "tools/analyze_case.py" in manifest["code_file_sha256"]
    assert hashlib.sha256(input_path.read_bytes()).hexdigest() == before
    assert all("daily_trajectories" not in row["summary"] for row in monte_carlo)
    assert all(call[2]["include_trajectories"] is False for call in observed_mc_calls)
    assert any(call[2]["emergency_enabled"] is False for call in observed_mc_calls)
    assert len(observed_mc_calls) == 12


def test_analysis_cli_exposes_reproducible_default_paths():
    completed = subprocess.run(
        [sys.executable, "tools/analyze_case.py", "--help"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )

    assert "data/analysis/config.yaml" in completed.stdout
    assert "reports" in completed.stdout
    assert "--output" in completed.stdout
