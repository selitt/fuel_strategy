"""Reproducible, explicitly non-optimizing analysis over existing plans."""

from __future__ import annotations

import copy
import csv
import hashlib
import io
import json
import math
import os
from pathlib import Path
import tempfile
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional

import yaml

from .engine import SimulationEngine
from .loader import CaseCatalog, find_data_root
from .monte_carlo import run_monte_carlo
from .strategies import (
    get_balanced_strategy,
    get_earth_fortress_strategy,
    get_lunar_pioneer_strategy,
    get_optimal_resilient_strategy,
    get_stress_resilient_strategy,
)


STRATEGY_FACTORIES = {
    "earth_fortress": get_earth_fortress_strategy,
    "lunar_pioneer": get_lunar_pioneer_strategy,
    "balanced": get_balanced_strategy,
    "base_builtin": get_optimal_resilient_strategy,
    "stress_builtin": get_stress_resilient_strategy,
}

STRATEGY_NAMES = {
    "earth_fortress": "Земная крепость",
    "lunar_pioneer": "Лунный прорыв",
    "balanced": "Сбалансированный контур",
    "base_builtin": "Базовая",
    "stress_builtin": "Стресс-устойчивая",
}

SUPPORTED_PREVENTION_MEASURES = (
    "baseline_emergency_on",
    "emergency_off",
    "reserve_plus_20pct_capped",
    "initial_stock_plus_25pct",
)


def load_analysis_config(path: Path, *, content: Optional[bytes] = None) -> Dict[str, Any]:
    raw = path.read_bytes() if content is None else content
    value = yaml.safe_load(raw.decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("analysis config must be a mapping")
    if value.get("classification") != "TEAM_ASSUMPTION":
        raise ValueError("analysis config ranges must be marked TEAM_ASSUMPTION")
    sensitivity = value.get("sensitivity")
    if not isinstance(sensitivity, dict) or not sensitivity:
        raise ValueError("analysis config must define sensitivity ranges")
    for variable, settings in sensitivity.items():
        points = settings.get("values") if isinstance(settings, dict) else None
        if not isinstance(points, list) or not points:
            raise ValueError(f"sensitivity {variable} must contain values")
        if any(
            isinstance(point, bool)
            or not isinstance(point, (int, float))
            or not math.isfinite(float(point))
            for point in points
        ):
            raise ValueError(f"sensitivity {variable} values must be finite numbers")
    if (
        sensitivity.get("demand_interpolation", {}).get("base_critical_unchanged")
        is not True
        or sensitivity.get("lunar_actual_share", {}).get("years")
        != [2038, 2039, 2040]
    ):
        raise ValueError("unsupported sensitivity semantics in analysis config")
    mc = value.get("monte_carlo", {})
    if type(mc.get("iterations")) is not int or mc["iterations"] <= 0:
        raise ValueError("monte_carlo iterations must be a positive integer")
    seeds = mc.get("seeds")
    if (
        not isinstance(seeds, list)
        or not seeds
        or any(type(seed) is not int for seed in seeds)
        or len(seeds) != len(set(seeds))
    ):
        raise ValueError("monte_carlo seeds must be unique integers")
    if type(mc.get("primary_seed")) is not int or mc["primary_seed"] not in seeds:
        raise ValueError("monte_carlo primary_seed must be present in seeds")
    if value.get("prevention_measures") != list(SUPPORTED_PREVENTION_MEASURES):
        raise ValueError(
            "prevention_measures must list every supported measure in canonical order"
        )
    cost_comparison = value.get("cost_comparison", {})
    if (
        cost_comparison.get("method") != "undiscounted_sum"
        or cost_comparison.get("discount_rate") != 0.0
        or cost_comparison.get("base_year") != 2035
        or cost_comparison.get("classification") != "TEAM_ASSUMPTION"
    ):
        raise ValueError(
            "cost comparison supports only undiscounted_sum with discount_rate=0, "
            "base_year=2035, classification=TEAM_ASSUMPTION"
        )
    return value


def strategy_plans() -> Dict[str, Dict[str, Any]]:
    """Return fresh monthly plans from all five existing strategy factories."""
    return {name: copy.deepcopy(factory()) for name, factory in STRATEGY_FACTORIES.items()}


def demand_catalog(catalog: Any, interpolation: float) -> Any:
    """Interpolate total demand LOW--HIGH while leaving critical demand unchanged."""
    if not 0.0 <= interpolation <= 1.0:
        raise ValueError("demand interpolation must be in [0, 1]")
    changed = copy.deepcopy(catalog)
    for demand in changed.demands.values():
        total = (
            demand.low_total_t
            + interpolation * (demand.high_total_t - demand.low_total_t)
        )
        if total < demand.base_critical_t:
            raise ValueError("interpolated total demand is below critical demand")
        demand.base_total_t = total
    return changed


def select_candidate(rows: Iterable[Mapping[str, Any]]) -> Dict[str, Any]:
    candidates = list(rows)
    feasible = [row for row in candidates if row["is_feasible"]]
    pool = feasible if feasible else candidates
    if not pool:
        return {
            "status": "no_candidate",
            "strategy_id": None,
            "total_cost_mln": None,
            "is_feasible": False,
        }
    chosen = min(pool, key=lambda row: (float(row["total_cost_mln"]), row["strategy_id"]))
    return {
        "status": (
            "cheapest_feasible_candidate"
            if feasible
            else "diagnostic_cheapest_infeasible_candidate"
        ),
        "strategy_id": chosen["strategy_id"],
        "total_cost_mln": chosen["total_cost_mln"],
        "is_feasible": bool(chosen["is_feasible"]),
    }


def result_year_rows(
    strategy_id: str,
    scenario_id: str,
    result: Mapping[str, Any],
) -> List[Dict[str, Any]]:
    finances = {int(row["year"]): row for row in result["financial_breakdown"]}
    failed_by_year: Dict[int, List[str]] = {}
    for check in result["constraint_checks"]:
        if not check["passed"]:
            failed_by_year.setdefault(int(check["year"]), []).append(
                str(check["constraint_id"])
            )
    rows = []
    for balance in result["yearly_balance"]:
        year = int(balance["year"])
        rows.append(
            {
                "strategy_id": strategy_id,
                "scenario_id": scenario_id,
                "year": year,
                "is_feasible": bool(result["is_feasible"]),
                "total_cost_mln": result["total_cost_mln"],
                "year_cost_mln": finances[year]["total"],
                "service_level_total": balance["service_level_total"],
                "service_level_critical": balance["service_level_critical"],
                "shortage_t": balance["shortage_t"],
                "closing_inventory_t": balance["closing_inventory_t"],
                "spill_t": balance["spill_t"],
                "failed_constraints": "|".join(sorted(set(failed_by_year.get(year, [])))),
            }
        )
    return rows


def capped_reserve_plan(plan: Mapping[str, Any], catalog: Any) -> Dict[str, Any]:
    changed = copy.deepcopy(dict(plan))
    for reservation in changed.get("capacity_reservations", []):
        source = catalog.sources[reservation["source_id"]]
        if source.source_id != "E":
            continue
        reservation["reserved_capacity_t"] = round(
            min(
                float(reservation["reserved_capacity_t"]) * 1.2,
                float(source.capacity_t_per_year),
            ),
            6,
        )
    return changed


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _canonical_json(value: Any) -> bytes:
    return json.dumps(
        json_ready(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def _compact_result(result: Mapping[str, Any]) -> Dict[str, Any]:
    compact = copy.deepcopy(dict(result))
    omitted = []
    for field in ("inventory_trace", "delivery_schedule", "risk_register"):
        if field in compact:
            compact.pop(field)
            omitted.append(field)
    compact["omitted_large_fields"] = omitted
    return compact


def _catalog_for_value(base: Any, variable: str, value: float) -> Any:
    if variable == "demand_interpolation":
        return demand_catalog(base, value)
    catalog = copy.deepcopy(base)
    if variable == "earth_core_price":
        catalog.sources["Earth-Core"].variable_cost_mln_per_t = value
    elif variable == "lunar_actual_share":
        catalog.scenarios["BASE"].setdefault("actual_delivery_share", {})[
            "Lunar-ISRU"
        ] = {year: value for year in (2038, 2039, 2040)}
    elif variable != "initial_stock_multiplier":
        raise ValueError(f"unknown sensitivity variable: {variable}")
    return catalog


def _plan_for_value(plan: Mapping[str, Any], variable: str, value: float) -> Dict[str, Any]:
    changed = copy.deepcopy(dict(plan))
    if variable == "initial_stock_multiplier":
        inventory = changed.setdefault("inventory_policy", {})
        inventory["initial_inventory_t"] = round(
            float(inventory.get("initial_inventory_t", 0.0)) * value,
            6,
        )
    return changed


def _run_candidate(
    runner: Callable[[Any, str, Dict[str, Any]], Dict[str, Any]],
    catalog: Any,
    scenario_id: str,
    strategy_id: str,
    plan: Mapping[str, Any],
) -> Dict[str, Any]:
    result = runner(catalog, scenario_id, copy.deepcopy(dict(plan)))
    return {
        "strategy_id": strategy_id,
        "scenario_id": scenario_id,
        "is_feasible": bool(result["is_feasible"]),
        "total_cost_mln": float(result["total_cost_mln"]),
        "result": result,
    }


def _scan_sensitivity(
    variable: str,
    values: Iterable[float],
    base_catalog: Any,
    plans: Mapping[str, Mapping[str, Any]],
    runner: Callable[[Any, str, Dict[str, Any]], Dict[str, Any]],
) -> List[Dict[str, Any]]:
    rows = []
    for value in values:
        catalog = _catalog_for_value(base_catalog, variable, float(value))
        for strategy_id, source_plan in plans.items():
            plan = _plan_for_value(source_plan, variable, float(value))
            evaluated = _run_candidate(
                runner, catalog, "BASE", strategy_id, plan
            )
            result = evaluated.pop("result")
            for year_row in result_year_rows(strategy_id, "BASE", result):
                rows.append(
                    {
                        "classification": "TEAM_ASSUMPTION",
                        "variable": variable,
                        "parameter_unit": "",
                        "value": float(value),
                        "strategy_name": STRATEGY_NAMES[strategy_id],
                        **year_row,
                    }
                )
    return rows


def _aggregate_scan_rows(rows: Iterable[Mapping[str, Any]]) -> List[Dict[str, Any]]:
    aggregated: Dict[tuple[float, str], Dict[str, Any]] = {}
    for row in rows:
        key = (float(row["value"]), str(row["strategy_id"]))
        aggregated[key] = {
            "value": key[0],
            "strategy_id": key[1],
            "is_feasible": bool(row["is_feasible"]),
            "total_cost_mln": float(row["total_cost_mln"]),
        }
    return list(aggregated.values())


def _refine_scan_events(
    variable: str,
    events: Mapping[str, Any],
    base_catalog: Any,
    plans: Mapping[str, Mapping[str, Any]],
    runner: Callable[[Any, str, Dict[str, Any]], Dict[str, Any]],
    iterations: int,
    tolerance: float,
) -> Dict[str, Any]:
    cache: Dict[tuple[float, str], Dict[str, Any]] = {}

    def evaluate(value: float, strategy_id: str) -> Dict[str, Any]:
        key = (value, strategy_id)
        if key not in cache:
            catalog = _catalog_for_value(base_catalog, variable, value)
            plan = _plan_for_value(plans[strategy_id], variable, value)
            item = _run_candidate(runner, catalog, "BASE", strategy_id, plan)
            item.pop("result")
            cache[key] = item
        return cache[key]

    feasibility = []
    for bracket in events["feasibility_transition_brackets"]:
        left, right = float(bracket["left"]), float(bracket["right"])
        strategy_id = bracket["strategy_id"]
        left_state = evaluate(left, strategy_id)["is_feasible"]
        for _ in range(iterations):
            if right - left <= tolerance:
                break
            midpoint = (left + right) / 2.0
            if evaluate(midpoint, strategy_id)["is_feasible"] == left_state:
                left = midpoint
            else:
                right = midpoint
        feasibility.append(
            {
                "strategy_id": strategy_id,
                "lower": left,
                "upper": right,
                "tolerance": right - left,
                "lower_feasible": left_state,
                "claim": "bracketed_feasibility_transition",
            }
        )

    crossings = []
    for bracket in events["cost_crossing_brackets"]:
        left, right = float(bracket["left"]), float(bracket["right"])
        first_id, second_id = bracket["strategy_ids"]

        def delta(value: float) -> Optional[float]:
            first = evaluate(value, first_id)
            second = evaluate(value, second_id)
            if not first["is_feasible"] or not second["is_feasible"]:
                return None
            return first["total_cost_mln"] - second["total_cost_mln"]

        left_delta = delta(left)
        stopped = None
        for _ in range(iterations):
            if right - left <= tolerance:
                break
            midpoint = (left + right) / 2.0
            middle_delta = delta(midpoint)
            if middle_delta is None:
                stopped = "infeasible_candidate_inside_bracket"
                break
            if left_delta == 0 or left_delta * middle_delta <= 0:
                right = midpoint
            else:
                left = midpoint
                left_delta = middle_delta
        crossings.append(
            {
                "strategy_ids": [first_id, second_id],
                "lower": left,
                "upper": right,
                "tolerance": right - left,
                "claim": (
                    "refinement_stopped"
                    if stopped
                    else "bracketed_feasible_cost_crossing"
                ),
                "reason": stopped,
            }
        )
    nominal_crossings = []
    for bracket in events["nominal_cost_crossing_brackets"]:
        left, right = float(bracket["left"]), float(bracket["right"])
        first_id, second_id = bracket["strategy_ids"]

        def nominal_delta(value: float) -> float:
            return (
                evaluate(value, first_id)["total_cost_mln"]
                - evaluate(value, second_id)["total_cost_mln"]
            )

        left_delta = nominal_delta(left)
        for _ in range(iterations):
            if right - left <= tolerance:
                break
            midpoint = (left + right) / 2.0
            middle_delta = nominal_delta(midpoint)
            if left_delta == 0 or left_delta * middle_delta <= 0:
                right = midpoint
            else:
                left = midpoint
                left_delta = middle_delta
        lower_first = evaluate(left, first_id)
        lower_second = evaluate(left, second_id)
        upper_first = evaluate(right, first_id)
        upper_second = evaluate(right, second_id)
        nominal_crossings.append(
            {
                "strategy_ids": [first_id, second_id],
                "lower": left,
                "upper": right,
                "tolerance": right - left,
                "claim": "nominal_cost_crossing_bracket",
                "lower_both_feasible": lower_first["is_feasible"]
                and lower_second["is_feasible"],
                "upper_both_feasible": upper_first["is_feasible"]
                and upper_second["is_feasible"],
            }
        )
    return {
        "variable": variable,
        "monotonicity_assumed": False,
        "comparison_rule": events["comparison_rule"],
        "feasibility_transitions": feasibility,
        "cost_crossings": crossings,
        "nominal_cost_crossings": nominal_crossings,
        "nominal_endpoint_cost_deltas": events["nominal_endpoint_cost_deltas"],
        "no_feasibility_transition_detected": not feasibility,
        "no_cost_crossing_detected": not crossings,
        "no_nominal_cost_crossing_detected": not nominal_crossings,
    }


def _research_catalog(base: Any, risk_id: str) -> Any:
    catalog = copy.deepcopy(base)
    if risk_id == "lunar_zero_2038":
        catalog.scenarios["BASE"].setdefault("actual_delivery_share", {})[
            "Lunar-ISRU"
        ] = {2038: 0.0, 2039: 1.0, 2040: 1.0}
    elif risk_id.startswith("core_flex_price_"):
        factor = 1.25 if risk_id.endswith("1_25") else 1.5
        for source_name in ("Earth-Core", "Earth-Flex"):
            catalog.sources[source_name].variable_cost_mln_per_t *= factor
    elif risk_id == "zbo_loss_equals_base":
        catalog.storages["ZBO"].loss_rate_on_throughput = catalog.storages[
            "BASE"
        ].loss_rate_on_throughput
    elif risk_id == "low_demand":
        for demand in catalog.demands.values():
            demand.base_total_t = demand.low_total_t
    else:
        raise ValueError(f"unknown deterministic research risk: {risk_id}")
    return catalog


def _write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(
            json_ready(value),
            ensure_ascii=False,
            sort_keys=True,
            indent=2,
            allow_nan=False,
        )
        + "\n",
        encoding="utf-8",
    )


def _write_csv(path: Path, rows: List[Mapping[str, Any]]) -> None:
    fieldnames = sorted({key for row in rows for key in row})
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(json_ready(dict(row)))


def _json_bytes(value: Any) -> bytes:
    return (
        json.dumps(
            json_ready(value),
            ensure_ascii=False,
            sort_keys=True,
            indent=2,
            allow_nan=False,
        )
        + "\n"
    ).encode("utf-8")


def _csv_bytes(rows: List[Mapping[str, Any]]) -> bytes:
    fieldnames = sorted({key for row in rows for key in row})
    handle = io.StringIO(newline="")
    writer = csv.DictWriter(handle, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(json_ready(dict(row)))
    return handle.getvalue().encode("utf-8")


def generate_analysis_bundle(
    *,
    config_path: Path,
    output_dir: Path,
    command: List[str],
    deterministic_runner: Optional[
        Callable[[Any, str, Dict[str, Any]], Dict[str, Any]]
    ] = None,
    monte_carlo_runner: Optional[Callable[..., Dict[str, Any]]] = None,
) -> Dict[str, Path]:
    """Run the approved analysis and write the complete compact report bundle."""
    config_path = config_path.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    config_bytes_before = config_path.read_bytes()
    config = load_analysis_config(config_path, content=config_bytes_before)
    data_root = config_path.parents[1]
    if data_root.resolve() != find_data_root().resolve():
        raise ValueError("analysis config must live under the canonical data/analysis directory")

    if deterministic_runner is None:
        deterministic_runner = lambda run_catalog, scenario, plan: SimulationEngine(
            run_catalog
        ).run(plan["plan_id"], scenario, plan)
    if monte_carlo_runner is None:
        monte_carlo_runner = run_monte_carlo

    input_files = [
        config_path,
        data_root / "demand.csv",
        data_root / "supply_sources.csv",
        data_root / "storage_options.csv",
        data_root / "investment_options.csv",
        data_root / "constraints.csv",
        data_root / "scenarios" / "base.yaml",
        data_root / "scenarios" / "mandatory_stress.yaml",
    ] + sorted((data_root / "strategies").glob("*.json"))
    code_files = sorted((data_root.parent / "src" / "engine").glob("*.py")) + [
        data_root.parent / "tools" / "analyze_case.py"
    ]
    before_hashes = {
        str(path.relative_to(data_root.parent)): _sha256_bytes(path.read_bytes())
        for path in input_files
    }
    code_hashes_before = {
        str(path.relative_to(data_root.parent)): _sha256_bytes(path.read_bytes())
        for path in code_files
    }
    catalog = CaseCatalog(data_root)
    plans = strategy_plans()

    scenario_records = []
    scenario_rows = []
    selections = {}
    for scenario_id in ("BASE", "MANDATORY_STRESS"):
        candidates = []
        for strategy_id, plan in plans.items():
            item = _run_candidate(
                deterministic_runner, catalog, scenario_id, strategy_id, plan
            )
            result = item.pop("result")
            candidates.append(item)
            scenario_records.append(
                {
                    **item,
                    "strategy_name": STRATEGY_NAMES[strategy_id],
                    "plan_id": plan["plan_id"],
                    "investments": copy.deepcopy(plan.get("investments", [])),
                    "failed_constraints": sorted(
                        {
                            check["constraint_id"]
                            for check in result["constraint_checks"]
                            if not check["passed"]
                        }
                    ),
                    "result": _compact_result(result),
                }
            )
            scenario_rows.extend(result_year_rows(strategy_id, scenario_id, result))
        selections[scenario_id] = select_candidate(candidates)

    for row in scenario_rows:
        selected = selections[row["scenario_id"]]
        row["strategy_name"] = STRATEGY_NAMES[row["strategy_id"]]
        row["plan_id"] = plans[row["strategy_id"]]["plan_id"]
        row["selection_role"] = (
            selected["status"]
            if row["strategy_id"] == selected["strategy_id"]
            else "evaluated_candidate"
        )

    sensitivity_rows = []
    refinements = []
    for variable, settings in config["sensitivity"].items():
        variable_rows = _scan_sensitivity(
            variable,
            settings["values"],
            catalog,
            plans,
            deterministic_runner,
        )
        sensitivity_rows.extend(variable_rows)
        for row in variable_rows:
            row["parameter_unit"] = settings["unit"]
            row["case_input_reference"] = json.dumps(
                {
                    key: settings[key]
                    for key in (
                        "case_input_control",
                        "case_input_endpoint",
                        "case_input_endpoints",
                    )
                    if key in settings
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        events = detect_scan_events(
            _aggregate_scan_rows(variable_rows),
            settings.get("comparison_pair"),
        )
        refinements.append(
            _refine_scan_events(
                variable,
                events,
                catalog,
                plans,
                deterministic_runner,
                int(config["refinement"]["iterations"]),
                float(config["refinement"]["value_tolerance"]),
            )
        )

    research_rows = []
    deterministic_risks = [
        risk_id
        for risk_id in config["research_risks"]
        if risk_id != "monte_carlo_failures"
    ]
    for risk_id in deterministic_risks:
        risk_catalog = _research_catalog(catalog, risk_id)
        risk_candidates = []
        risk_results = []
        for strategy_id, plan in plans.items():
            item = _run_candidate(
                deterministic_runner, risk_catalog, "BASE", strategy_id, plan
            )
            result = item.pop("result")
            risk_candidates.append(item)
            risk_results.append((item, result))
        selection = select_candidate(risk_candidates)
        for item, result in risk_results:
            research_rows.append(
                {
                    "classification": "TEAM_ASSUMPTION",
                    "risk_id": risk_id,
                    "strategy_id": item["strategy_id"],
                    "strategy_name": STRATEGY_NAMES[item["strategy_id"]],
                    "selection_role": (
                        selection["status"]
                        if item["strategy_id"] == selection["strategy_id"]
                        else "evaluated_candidate"
                    ),
                    "is_feasible": item["is_feasible"],
                    "total_cost_mln": item["total_cost_mln"],
                    "total_shortage_t": round(
                        sum(row["shortage_t"] for row in result["yearly_balance"]), 2
                    ),
                    "failed_constraints": "|".join(
                        sorted(
                            {
                                row["constraint_id"]
                                for row in result["constraint_checks"]
                                if not row["passed"]
                            }
                        )
                    ),
                }
            )

    mc_settings = config["monte_carlo"]
    primary_seed = int(mc_settings["primary_seed"])
    mc_rows = []
    primary_mc: Dict[tuple[str, str], Dict[str, Any]] = {}
    selected_plans: Dict[str, tuple[str, Dict[str, Any], str]] = {}
    for scenario_id in ("BASE", "MANDATORY_STRESS"):
        selection = selections[scenario_id]
        strategy_id = selection["strategy_id"]
        if strategy_id is None:
            continue
        selected_plans[scenario_id] = (
            strategy_id,
            plans[strategy_id],
            selection["status"],
        )
        for seed in mc_settings["seeds"]:
            summary = monte_carlo_runner(
                catalog,
                scenario_id,
                copy.deepcopy(plans[strategy_id]),
                iterations=int(mc_settings["iterations"]),
                seed=int(seed),
                emergency_enabled=True,
                include_trajectories=False,
            )
            mc_rows.append(
                {
                    "scenario_id": scenario_id,
                    "strategy_id": strategy_id,
                    "selection_role": selection["status"],
                    "run_role": (
                        "primary" if int(seed) == primary_seed else "robustness"
                    ),
                    "summary": compact_monte_carlo(summary),
                }
            )
            if int(seed) == primary_seed:
                primary_mc[(scenario_id, strategy_id)] = compact_monte_carlo(summary)

    for row in mc_rows:
        if row["run_role"] == "primary":
            summary = row["summary"]
            research_rows.append(
                {
                    "classification": "TEAM_ASSUMPTION",
                    "risk_id": "monte_carlo_failures",
                    "strategy_id": row["strategy_id"],
                    "selection_role": row["selection_role"],
                    "scenario_id": row["scenario_id"],
                    "is_feasible": "stochastic_summary",
                    "total_cost_mln": summary.get("mean_total_cost_mln"),
                    "total_shortage_t": None,
                    "failed_constraints": None,
                    "probability_of_all_constraints": summary.get(
                        "probability_of_all_constraints"
                    ),
                    "probability_of_no_shortage": summary.get(
                        "probability_of_no_shortage"
                    ),
                }
            )

    prevention_rows = []
    prevention_plan_snapshots = {}
    for scenario_id, (strategy_id, plan, selection_role) in selected_plans.items():
        measures = {
            "baseline_emergency_on": (copy.deepcopy(plan), True),
            "emergency_off": (copy.deepcopy(plan), False),
            "reserve_plus_20pct_capped": (capped_reserve_plan(plan, catalog), True),
            "initial_stock_plus_25pct": (copy.deepcopy(plan), True),
        }
        stock_plan = measures["initial_stock_plus_25pct"][0]
        stock_policy = stock_plan.setdefault("inventory_policy", {})
        stock_policy["initial_inventory_t"] = round(
            float(stock_policy.get("initial_inventory_t", 0.0)) * 1.25, 6
        )
        baseline_cost = None
        for measure_id in config["prevention_measures"]:
            measure_plan, emergency_enabled = measures[measure_id]
            snapshot_key = f"{scenario_id}:{measure_id}"
            prevention_plan_snapshots[snapshot_key] = {
                "sha256": _sha256_bytes(_canonical_json(measure_plan)),
                "plan": copy.deepcopy(measure_plan),
                "emergency_enabled": emergency_enabled,
                "transform": (
                    "none"
                    if measure_id in ("baseline_emergency_on", "emergency_off")
                    else measure_id
                ),
            }
            deterministic = deterministic_runner(catalog, scenario_id, measure_plan)
            if measure_id == "baseline_emergency_on":
                summary = primary_mc[(scenario_id, strategy_id)]
            else:
                summary = compact_monte_carlo(
                    monte_carlo_runner(
                        catalog,
                        scenario_id,
                        measure_plan,
                        iterations=int(mc_settings["iterations"]),
                        seed=primary_seed,
                        emergency_enabled=emergency_enabled,
                        include_trajectories=False,
                    )
                )
                mc_rows.append(
                    {
                        "scenario_id": scenario_id,
                        "strategy_id": strategy_id,
                        "selection_role": selection_role,
                        "run_role": "prevention_measure",
                        "measure_id": measure_id,
                        "summary": summary,
                    }
                )
            if measure_id == "baseline_emergency_on":
                baseline_cost = float(deterministic["total_cost_mln"])
            prevention_rows.append(
                {
                    "classification": "TEAM_ASSUMPTION",
                    "scenario_id": scenario_id,
                    "strategy_id": strategy_id,
                    "selection_role": selection_role,
                    "measure_id": measure_id,
                    "plan_sha256": prevention_plan_snapshots[snapshot_key]["sha256"],
                    "emergency_enabled": emergency_enabled,
                    "deterministic_feasible": deterministic["is_feasible"],
                    "deterministic_total_cost_mln": deterministic["total_cost_mln"],
                    "deterministic_cost_delta_mln": round(
                        float(deterministic["total_cost_mln"])
                        - float(
                            deterministic["total_cost_mln"]
                            if baseline_cost is None
                            else baseline_cost
                        ),
                        2,
                    ),
                    "probability_of_all_constraints": summary.get(
                        "probability_of_all_constraints"
                    ),
                    "probability_of_no_shortage": summary.get(
                        "probability_of_no_shortage"
                    ),
                    "mean_total_cost_mln": summary.get("mean_total_cost_mln"),
                    "p95_total_cost_mln": summary.get("p95_total_cost_mln"),
                    "mean_emergency_procurement_mln": summary.get(
                        "mean_emergency_procurement_mln"
                    ),
                    "p95_emergency_procurement_mln": summary.get(
                        "p95_emergency_procurement_mln"
                    ),
                    "median_shortage_t": summary.get("median_shortage_t"),
                    "p95_shortage_t": summary.get("p95_shortage_t"),
                    "max_shortage_t": summary.get("max_shortage_t"),
                }
            )

    after_hashes = {
        str(path.relative_to(data_root.parent)): _sha256_bytes(path.read_bytes())
        for path in input_files
    }
    if after_hashes != before_hashes:
        raise RuntimeError("CASE_INPUT files changed during analysis")
    if config_path.read_bytes() != config_bytes_before:
        raise RuntimeError("analysis config changed during analysis")
    code_hashes_after = {
        str(path.relative_to(data_root.parent)): _sha256_bytes(path.read_bytes())
        for path in code_files
    }
    if code_hashes_after != code_hashes_before:
        raise RuntimeError("analysis engine code changed during analysis")

    plan_snapshots = {
        strategy_id: {
            "sha256": _sha256_bytes(_canonical_json(plan)),
            "plan": plan,
        }
        for strategy_id, plan in plans.items()
    }
    manifest = {
        "schema_version": int(config["schema_version"]),
        "model_verified": False,
        "engine_status": "prototype",
        "selection_claim": "cheapest feasible candidate among five evaluated plans; no global optimum claim",
        "command": list(command),
        "config_path": str(config_path.relative_to(data_root.parent)),
        "config_sha256": _sha256_bytes(config_bytes_before),
        "config_snapshot": config,
        "input_file_sha256": before_hashes,
        "code_file_sha256": code_hashes_before,
        "monte_carlo_seeds": list(mc_settings["seeds"]),
        "strategy_plan_snapshots": plan_snapshots,
        "prevention_plan_snapshots": prevention_plan_snapshots,
        "scenario_selections": selections,
        "cost_comparison_method": {
            **config["cost_comparison"],
            "description": "undiscounted horizon sum with explicitly agreed r=0",
        },
    }
    outputs = {
        "strategy_scenarios.json": scenario_records,
        "strategy_scenarios.csv": scenario_rows,
        "sensitivity.csv": sensitivity_rows,
        "sensitivity_crossovers.json": refinements,
        "research_risks.csv": research_rows,
        "prevention_measures.csv": prevention_rows,
        "monte_carlo.json": mc_rows,
    }
    rendered = {
        filename: (
            _json_bytes(value) if filename.endswith(".json") else _csv_bytes(value)
        )
        for filename, value in outputs.items()
    }
    manifest["output_file_sha256"] = {
        filename: _sha256_bytes(content)
        for filename, content in rendered.items()
    }
    manifest["run_id"] = _sha256_bytes(_canonical_json(manifest))[:16]
    rendered["analysis_manifest.json"] = _json_bytes(manifest)

    staging_dir = Path(tempfile.mkdtemp(prefix=".analysis-", dir=output_dir))
    paths: Dict[str, Path] = {}
    publication_order = [
        filename for filename in rendered if filename != "analysis_manifest.json"
    ] + ["analysis_manifest.json"]
    try:
        for filename, content in rendered.items():
            (staging_dir / filename).write_bytes(content)
        for filename in publication_order:
            path = output_dir / filename
            os.replace(staging_dir / filename, path)
            paths[filename] = path
    finally:
        for staged_path in staging_dir.iterdir():
            staged_path.unlink()
        staging_dir.rmdir()
    return paths


def detect_scan_events(
    rows: Iterable[Mapping[str, Any]],
    comparison_pair: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """Detect local brackets without assuming whole-range monotonicity."""
    rows = list(rows)
    values = sorted({float(row["value"]) for row in rows})
    strategy_ids = sorted({str(row["strategy_id"]) for row in rows})
    indexed = {
        (float(row["value"]), str(row["strategy_id"])): row
        for row in rows
    }
    feasibility = []
    crossings = []
    nominal_crossings = []
    allowed_pair = tuple(comparison_pair) if comparison_pair is not None else None
    endpoint_deltas = []
    for left, right in zip(values, values[1:]):
        for strategy_id in strategy_ids:
            lhs = indexed.get((left, strategy_id))
            rhs = indexed.get((right, strategy_id))
            if lhs and rhs and bool(lhs["is_feasible"]) != bool(rhs["is_feasible"]):
                feasibility.append(
                    {"left": left, "right": right, "strategy_id": strategy_id}
                )
        for index, first_id in enumerate(strategy_ids):
            for second_id in strategy_ids[index + 1 :]:
                if allowed_pair is not None and {first_id, second_id} != set(allowed_pair):
                    continue
                lhs_first = indexed.get((left, first_id))
                lhs_second = indexed.get((left, second_id))
                rhs_first = indexed.get((right, first_id))
                rhs_second = indexed.get((right, second_id))
                points = (lhs_first, lhs_second, rhs_first, rhs_second)
                if not all(points):
                    continue
                left_delta = float(lhs_first["total_cost_mln"]) - float(lhs_second["total_cost_mln"])
                right_delta = float(rhs_first["total_cost_mln"]) - float(rhs_second["total_cost_mln"])
                if left_delta == 0 or right_delta == 0 or left_delta * right_delta < 0:
                    nominal_crossings.append(
                        {
                            "left": left,
                            "right": right,
                            "strategy_ids": [first_id, second_id],
                            "left_both_feasible": bool(lhs_first["is_feasible"])
                            and bool(lhs_second["is_feasible"]),
                            "right_both_feasible": bool(rhs_first["is_feasible"])
                            and bool(rhs_second["is_feasible"]),
                        }
                    )
                if not all(bool(point["is_feasible"]) for point in points):
                    continue
                if left_delta == 0 or right_delta == 0 or left_delta * right_delta < 0:
                    crossings.append(
                        {
                            "left": left,
                            "right": right,
                            "strategy_ids": [first_id, second_id],
                        }
                    )
    pairs = []
    if allowed_pair is not None:
        pairs = [tuple(allowed_pair)]
    else:
        pairs = [
            (first, second)
            for index, first in enumerate(strategy_ids)
            for second in strategy_ids[index + 1 :]
        ]
    if values:
        for first_id, second_id in pairs:
            for label, value in (("lower_endpoint", values[0]), ("upper_endpoint", values[-1])):
                first = indexed.get((value, first_id))
                second = indexed.get((value, second_id))
                if first and second:
                    endpoint_deltas.append(
                        {
                            "endpoint": label,
                            "value": value,
                            "strategy_ids": [first_id, second_id],
                            "nominal_cost_delta_mln": round(
                                float(first["total_cost_mln"])
                                - float(second["total_cost_mln"]),
                                6,
                            ),
                            "both_feasible": bool(first["is_feasible"])
                            and bool(second["is_feasible"]),
                        }
                    )
    return {
        "comparison_rule": "costs_compared_only_when_both_candidates_feasible",
        "monotonicity_assumed": False,
        "feasibility_transition_brackets": feasibility,
        "cost_crossing_brackets": crossings,
        "nominal_cost_crossing_brackets": nominal_crossings,
        "nominal_endpoint_cost_deltas": endpoint_deltas,
    }


def compact_monte_carlo(value: Mapping[str, Any]) -> Dict[str, Any]:
    compact = copy.deepcopy(dict(value))
    if "daily_trajectories" in compact:
        compact.pop("daily_trajectories")
        compact["daily_trajectories_omitted"] = True
    return compact


def json_ready(value: Any) -> Any:
    """Validate recursively that an output can be strict JSON (no NaN/Infinity)."""
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("non-finite number is not valid report JSON")
        return value
    if isinstance(value, dict):
        return {str(key): json_ready(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_ready(item) for item in value]
    return value
