"""
Утилита оптимизации стратегий снабжения методом Дифференциальной Эволюции (DE).
Находит баланс: минимальный Total Cost при соблюдении всех Hard Constraints и высокой вероятности в Монте-Карло.

Запуск из терминала Windows:
    py -3 tools/optimize_strategy.py --archetype earth_fortress --iter 20 --pop 12
"""

import sys
import os
import json
import argparse
import random
import hashlib
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Tuple

# Добавляем корень проекта в путь поиска модулей
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.engine.engine import run_engine
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog
from src.engine.monte_carlo import run_monte_carlo
from src.engine.optimize import to_participant_plan
from src.engine.strategies import make_monthly_batches


def _format_metric(value: Any, suffix: str = "") -> str:
    if not isinstance(value, (int, float)):
        return "недоступно"
    return f"{value:.2f}{suffix}"


def decode_earth_fortress(params: List[float], plan_id: str = "strategy_earth_fortress_optimized") -> Dict[str, Any]:
    """
    Декодирует вектор параметров в структуру плана «Земная крепость» (ZBO + Земля).
    params: [
        ord_35, ord_36, ord_37_core, ord_37_flex,
        ord_38_flex, ord_39_flex, ord_39_emer,
        ord_40_flex, ord_40_emer
    ]
    """
    o35, o36, o37_c, o37_f, o38_f, o39_f, o39_e, o40_f, o40_e = params

    annual_orders = [
        (2035, "Earth-Core", round(o35, 1), "core"),
        (2036, "Earth-Core", round(o36, 1), "core"),
        (2037, "Earth-Core", round(o37_c, 1), "core"),
        (2037, "Earth-Flex", round(o37_f, 1), "flex"),
        (2038, "Earth-Core", 190.0, "core"),
        (2038, "Earth-Flex", round(o38_f, 1), "flex"),
        (2039, "Earth-Core", 190.0, "core"),
        (2039, "Earth-Flex", round(o39_f, 1), "flex"),
        (2039, "Emergency", round(o39_e, 1), "emer"),
        (2040, "Earth-Core", 190.0, "core"),
        (2040, "Earth-Flex", round(o40_f, 1), "flex"),
        (2040, "Emergency", round(o40_e, 1), "emer"),
    ]
    orders = [
        batch
        for year, source_id, volume_t, prefix in annual_orders
        for batch in make_monthly_batches(year, source_id, volume_t, batch_prefix=prefix)
    ]

    reservations = [
        {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": round(max(o35, 140.0), 1)},
        {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": round(max(o36, 170.0), 1)},
        {"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2037, "source_id": "Earth-Flex", "reserved_capacity_t": round(max(o37_f + 10.0, 30.0), 1)},
        {"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2038, "source_id": "Earth-Flex", "reserved_capacity_t": round(max(o38_f + 10.0, 70.0), 1)},
        {"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2039, "source_id": "Earth-Flex", "reserved_capacity_t": 110.0},
        {"year": 2039, "source_id": "Emergency", "reserved_capacity_t": round(max(o39_e + 10.0, 30.0), 1)},
        {"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2040, "source_id": "Earth-Flex", "reserved_capacity_t": 110.0},
        {"year": 2040, "source_id": "Emergency", "reserved_capacity_t": 80.0},
    ]

    return {
        "plan_id": plan_id,
        "description": "Оптимизированная стратегия «Земная крепость»",
        "investments": [{"investment_id": "ZBO", "year": 2036}],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0},
    }


def decode_lunar_dual(params: List[float], plan_id: str = "strategy_lunar_dual_optimized") -> Dict[str, Any]:
    """
    Декодирует вектор параметров в структуру плана «Глобальный дуальный контур» (Земля + Луна ISRU + ZBO).
    params: [
        o35, o36, o37_c, o37_f,
        o38_c, o38_l, o38_f,
        o39_c, o39_l, o39_f,
        o40_c, o40_l, o40_f, o40_e
    ]
    """
    o35, o36, o37_c, o37_f, o38_c, o38_l, o38_f, o39_c, o39_l, o39_f, o40_c, o40_l, o40_f, o40_e = params

    annual_orders = [
        (2035, "Earth-Core", round(o35, 1), "core"),
        (2036, "Earth-Core", round(o36, 1), "core"),
        (2037, "Earth-Core", round(o37_c, 1), "core"),
        (2037, "Earth-Flex", round(o37_f, 1), "flex"),
        (2038, "Earth-Core", round(o38_c, 1), "core"),
        (2038, "Lunar-ISRU", round(o38_l, 1), "lunar"),
        (2038, "Earth-Flex", round(o38_f, 1), "flex"),
        (2039, "Earth-Core", round(o39_c, 1), "core"),
        (2039, "Lunar-ISRU", round(o39_l, 1), "lunar"),
        (2039, "Earth-Flex", round(o39_f, 1), "flex"),
        (2040, "Earth-Core", round(o40_c, 1), "core"),
        (2040, "Lunar-ISRU", round(o40_l, 1), "lunar"),
        (2040, "Earth-Flex", round(o40_f, 1), "flex"),
        (2040, "Emergency", round(o40_e, 1), "emer"),
    ]
    orders = [
        batch
        for year, source_id, volume_t, prefix in annual_orders
        for batch in make_monthly_batches(year, source_id, volume_t, batch_prefix=prefix)
    ]

    reservations = [
        {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": round(max(o35, 140.0), 1)},
        {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": round(max(o36, 170.0), 1)},
        {"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2037, "source_id": "Earth-Flex", "reserved_capacity_t": round(max(o37_f + 10.0, 30.0), 1)},
        {"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": round(max(o38_c, 150.0), 1)},
        {"year": 2038, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2038, "source_id": "Earth-Flex", "reserved_capacity_t": round(max(o38_f + 10.0, 30.0), 1)},
        {"year": 2038, "source_id": "Emergency", "reserved_capacity_t": 20.0},
        {"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2039, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2039, "source_id": "Earth-Flex", "reserved_capacity_t": round(max(o39_f + 10.0, 30.0), 1)},
        {"year": 2039, "source_id": "Emergency", "reserved_capacity_t": 20.0},
        {"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2040, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2040, "source_id": "Earth-Flex", "reserved_capacity_t": round(max(o40_f + 10.0, 50.0), 1)},
        {"year": 2040, "source_id": "Emergency", "reserved_capacity_t": round(max(o40_e + 10.0, 30.0), 1)},
    ]

    return {
        "plan_id": plan_id,
        "description": "Оптимизированная стратегия «Глобальный дуальный контур» (Земля + Луна ISRU)",
        "investments": [
            {"investment_id": "ZBO", "year": 2036},
            {"investment_id": "LUNAR_ISRU", "year": 2036},
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0},
    }


DIVERSIFIED_YEARS_AND_SOURCES = (
    (2035, ("Earth-Core", "Earth-Flex")),
    (2036, ("Earth-Core", "Earth-Flex")),
    (2037, ("Earth-Core", "Earth-Flex")),
    (2038, ("Earth-Core", "Earth-Flex", "Earth-New", "Lunar-ISRU")),
    (2039, ("Earth-Core", "Earth-Flex", "Earth-New", "Lunar-ISRU")),
    (2040, ("Earth-Core", "Earth-Flex", "Earth-New", "Lunar-ISRU")),
)
DIVERSIFIED_WARM_START = (
    62.5, 62.5,
    82.5, 82.5,
    105.0, 105.0,
    90.0, 70.0, 70.0, 110.0,
    100.0, 90.0, 100.0, 120.0,
    120.0, 110.0, 110.0, 120.0,
)
DIVERSIFIED_LEAN_START = (
    55.0, 55.0,
    75.0, 75.0,
    100.0, 100.0,
    95.0, 90.0, 100.0, 5.0,
    125.0, 110.0, 125.0, 10.0,
    160.0, 110.0, 130.0, 40.0,
)


def decode_diversified(
    params: List[float],
    plan_id: str = "strategy_diversified",
    catalog: CaseCatalog | None = None,
) -> Dict[str, Any]:
    """Decode regular annual volumes for the diversified team decision."""
    reference = catalog or CaseCatalog()
    expected = sum(len(sources) for _, sources in DIVERSIFIED_YEARS_AND_SOURCES)
    if len(params) != expected:
        raise ValueError(f"diversified vector must contain {expected} volumes")

    annual_orders = []
    index = 0
    for year, sources in DIVERSIFIED_YEARS_AND_SOURCES:
        for source_id in sources:
            volume = round(float(params[index]), 1)
            index += 1
            if not math.isfinite(volume) or volume <= 0:
                raise ValueError("diversified regular volumes must be positive and finite")
            capacity = reference.sources[source_id].capacity_t_per_year
            if volume > capacity:
                raise ValueError(f"{source_id} volume exceeds reference capacity")
            annual_orders.append((year, source_id, volume))

    supply_orders = [
        batch
        for year, source_id, volume in annual_orders
        for batch in make_monthly_batches(
            year,
            source_id,
            volume,
            batch_prefix={
                "Earth-Core": "core",
                "Earth-Flex": "flex",
                "Earth-New": "new",
                "Lunar-ISRU": "lunar",
            }[source_id],
        )
    ]
    reservations = [
        {
            "year": year,
            "source_id": source_id,
            "reserved_capacity_t": volume,
        }
        for year, source_id, volume in annual_orders
    ]
    reservations.extend(
        {
            "year": year,
            "source_id": "Emergency",
            "reserved_capacity_t": 28.0,
        }
        for year, _ in DIVERSIFIED_YEARS_AND_SOURCES
    )
    return {
        "plan_id": plan_id,
        "description": (
            "Стратегия «Распределённый контур»: Earth-Core и Earth-Flex с 2035 года, "
            "Earth-New и Lunar-ISRU с 2038 года; Emergency зарезервирован только для сбоев."
        ),
        "investments": [
            {"investment_id": "ZBO", "year": 2036},
            {"investment_id": "LUNAR_ISRU", "year": 2036},
            {"investment_id": "EARTH_NEW", "year": 2036},
        ],
        "capacity_reservations": reservations,
        "supply_orders": supply_orders,
        "inventory_policy": {"initial_inventory_t": 15.0},
    }


def diversified_concentration(plan: Dict[str, Any]) -> float:
    """Maximum annual share of one planned regular provider."""
    volumes: Dict[int, Dict[str, float]] = {}
    for row in plan["supply_orders"]:
        if row["source_id"] == "Emergency":
            continue
        year = int(row["year"])
        source = str(row["source_id"])
        volumes.setdefault(year, {})[source] = (
            volumes.setdefault(year, {}).get(source, 0.0) + float(row["order_t"])
        )
    shares = [max(by_source.values()) / sum(by_source.values()) for by_source in volumes.values()]
    return round(max(shares), 6)


def _scenario_summary(result: Dict[str, Any]) -> Dict[str, Any]:
    violations = [row for row in result["constraint_checks"] if not row["passed"]]
    return {
        "is_feasible": result["is_feasible"],
        "total_cost_mln": result["total_cost_mln"],
        "total_shortage_t": round(
            sum(float(row["shortage_t"]) for row in result["yearly_balance"]), 2
        ),
        "minimum_critical_service": min(
            float(row["service_level_critical"]) for row in result["yearly_balance"]
        ),
        "yearly_balance": result["yearly_balance"],
        "violations": violations,
    }


def evaluate_diversified_candidate(
    params: List[float], engine: SimulationEngine | None = None
) -> Tuple[Tuple[float, float, float, float], Dict[str, Any]]:
    """Evaluate BASE and mandatory stress before concentration and BASE cost."""
    candidate_engine = engine or SimulationEngine(CaseCatalog())
    plan = decode_diversified(params, catalog=candidate_engine.catalog)
    results = {
        scenario: candidate_engine.run(
            plan["plan_id"], scenario, plan, run_risk_analysis=False
        )
        for scenario in ("BASE", "MANDATORY_STRESS")
    }
    summaries = {scenario: _scenario_summary(result) for scenario, result in results.items()}
    violations = [
        violation
        for summary in summaries.values()
        for violation in summary["violations"]
    ]
    excess = round(
        sum(abs(float(row["excess"])) if row.get("excess") is not None else 1.0 for row in violations),
        6,
    )
    score = (
        len(violations),
        excess,
        diversified_concentration(plan),
        float(results["BASE"]["total_cost_mln"]),
    )
    return score, {"plan": plan, "scenarios": summaries}


def _diversified_candidates(seed: int, catalog: CaseCatalog):
    """Yield deterministic candidate vectors, starting from a hand-checkable seed."""
    anchors = (list(DIVERSIFIED_WARM_START), list(DIVERSIFIED_LEAN_START))
    yield from anchors
    rng = random.Random(seed)
    capacities = [
        catalog.sources[source].capacity_t_per_year
        for _, sources in DIVERSIFIED_YEARS_AND_SOURCES
        for source in sources
    ]
    while True:
        base = anchors[rng.randrange(len(anchors))]
        candidate = []
        for value, capacity in zip(base, capacities):
            shifted = value + rng.choice((-15.0, -10.0, -5.0, 0.0, 5.0, 10.0, 15.0))
            candidate.append(round(min(capacity, max(1.0, shifted)), 1))
        yield candidate


def _calendar_objective(
    plan: Dict[str, Any], results: Dict[str, Dict[str, Any]]
) -> Tuple[float, float, float, float]:
    violations = [
        violation
        for result in results.values()
        for violation in result["constraint_checks"]
        if not violation["passed"]
    ]
    excess = round(
        sum(
            abs(float(row["excess"])) if row.get("excess") is not None else 1.0
            for row in violations
        ),
        6,
    )
    return (
        len(violations),
        excess,
        diversified_concentration(plan),
        float(results["BASE"]["total_cost_mln"]),
    )


def _evaluate_diversified_plan(
    plan: Dict[str, Any], engine: SimulationEngine
) -> Tuple[Tuple[float, float, float, float], Dict[str, Dict[str, Any]]]:
    results = {
        scenario: engine.run(plan["plan_id"], scenario, plan, run_risk_analysis=False)
        for scenario in ("BASE", "MANDATORY_STRESS")
    }
    return _calendar_objective(plan, results), results


def prepare_diversified_calendar(
    plan: Dict[str, Any],
    engine: SimulationEngine,
    max_evaluations: int,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Search delivery days against both required deterministic scenarios."""
    if max_evaluations < 2:
        return plan, {
            "method": "not run: no remaining two-scenario evaluation budget",
            "engine_evaluations": 0,
            "improvements": 0,
        }

    selected = {**plan, "supply_orders": [dict(row) for row in plan["supply_orders"]]}
    best, results = _evaluate_diversified_plan(selected, engine)
    baseline = list(best)
    evaluations = 2
    improvements = 0

    source_patterns = (
        {"Earth-Core": 5, "Earth-Flex": 12, "Earth-New": 19, "Lunar-ISRU": 26},
        {"Earth-Core": 28, "Earth-Flex": 21, "Earth-New": 14, "Lunar-ISRU": 7},
    )
    for pattern in source_patterns:
        if evaluations + 2 > max_evaluations:
            break
        candidate = {**selected, "supply_orders": [dict(row) for row in selected["supply_orders"]]}
        for row in candidate["supply_orders"]:
            month = int(row["delivery_date"][5:7])
            last_day = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)[month - 1]
            day = min(pattern[row["source_id"]], last_day)
            row["delivery_date"] = f"{row['year']}-{month:02d}-{day:02d}"
        score, candidate_results = _evaluate_diversified_plan(candidate, engine)
        evaluations += 2
        if score < best:
            selected, best, results = candidate, score, candidate_results
            improvements += 1

    while evaluations + 2 <= max_evaluations:
        improved_sweep = False
        for index, row in enumerate(selected["supply_orders"]):
            month = int(row["delivery_date"][5:7])
            last_day = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)[month - 1]
            days = tuple(dict.fromkeys((1, 5, 8, 12, 15, 19, 22, 26, last_day)))
            for day in days:
                if evaluations + 2 > max_evaluations:
                    break
                proposed_date = f"{row['year']}-{month:02d}-{day:02d}"
                if proposed_date == row["delivery_date"]:
                    continue
                candidate = {
                    **selected,
                    "supply_orders": [dict(item) for item in selected["supply_orders"]],
                }
                candidate["supply_orders"][index]["delivery_date"] = proposed_date
                score, candidate_results = _evaluate_diversified_plan(candidate, engine)
                evaluations += 2
                if score < best:
                    selected, best, results = candidate, score, candidate_results
                    improvements += 1
                    improved_sweep = True
                    break
            if evaluations + 2 > max_evaluations:
                break
        if not improved_sweep:
            break

    return selected, {
        "method": "bounded coordinate search of delivery days in each source-month",
        "engine_evaluations": evaluations,
        "improvements": improvements,
        "objective_fields": [
            "hard_constraint_violations",
            "total_violation_excess",
            "max_annual_regular_provider_share",
            "base_total_cost_mln",
        ],
        "baseline_objective": baseline,
        "selected_objective": list(best),
        "global_optimum_proven": False,
        "scenarios": {
            scenario: _scenario_summary(result) for scenario, result in results.items()
        },
    }


def optimize_diversified(
    max_evaluations: int = 10_000, seed: int = 42
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Bounded reproducible search; one candidate consumes two engine evaluations."""
    if not 2 <= max_evaluations <= 10_000:
        raise ValueError("max_evaluations must be between 2 and 10000")
    engine = SimulationEngine(CaseCatalog())
    best_score = None
    best_details = None
    evaluations = 0
    candidates = 0
    # Preserve enough of a full run for the required two-scenario calendar search.
    annual_budget = max_evaluations if max_evaluations < 1_000 else min(4_000, max_evaluations)
    for params in _diversified_candidates(seed, engine.catalog):
        if evaluations + 2 > annual_budget:
            break
        score, details = evaluate_diversified_candidate(params, engine)
        evaluations += 2
        candidates += 1
        if best_score is None or score < best_score:
            best_score, best_details = score, details
    assert best_score is not None and best_details is not None
    annual_evaluations = evaluations
    selected_plan, calendar_search = prepare_diversified_calendar(
        best_details["plan"], engine, max_evaluations - evaluations
    )
    evaluations += calendar_search["engine_evaluations"]
    selected_scenarios = calendar_search.get("scenarios", best_details["scenarios"])
    selected_objective = calendar_search.get("selected_objective", list(best_score))
    return selected_plan, {
        "method": "bounded deterministic seeded candidate search",
        "seed": seed,
        "evaluation_limit": max_evaluations,
        "engine_evaluations": evaluations,
        "annual_engine_evaluations": annual_evaluations,
        "candidate_count": candidates,
        "objective_order": [
            "hard_constraint_violations",
            "total_violation_excess",
            "max_annual_regular_provider_share",
            "base_total_cost_mln",
        ],
        "selected_objective": selected_objective,
        "global_optimum_proven": False,
        "scenarios": selected_scenarios,
        "calendar_search": calendar_search,
    }


def _annual_orders(plan: Dict[str, Any]) -> List[Dict[str, Any]]:
    from decimal import Decimal

    grouped: Dict[Tuple[int, str], Decimal] = {}
    for row in plan["supply_orders"]:
        key = (int(row["year"]), str(row["source_id"]))
        grouped[key] = grouped.get(key, Decimal("0")) + Decimal(str(row["order_t"]))
    prefix = {
        "Earth-Core": "core",
        "Earth-Flex": "flex",
        "Earth-New": "new",
        "Lunar-ISRU": "lunar",
    }
    return [
        {"year": year, "source_id": source, "volume_t": float(volume), "prefix": prefix[source]}
        for (year, source), volume in grouped.items()
    ]


def diversified_strategy_data(plan: Dict[str, Any]) -> Dict[str, Any]:
    description = (
        "Стратегия 6: «Распределённый контур». Earth-Core и Earth-Flex работают с "
        "2035 года; Earth-New и Lunar-ISRU подключаются с 2038 года; Emergency "
        "зарезервирован для сбоев и не используется как плановый канал."
    )
    return {
        "id": "strategy_diversified",
        "name": "Распределённый контур",
        "description": description,
        "scenario_id": "BASE",
        "legacy_description": description,
        "annual_orders": _annual_orders(plan),
        "investments": plan["investments"],
        "capacity_reservations": plan["capacity_reservations"],
        "inventory_policy": plan["inventory_policy"],
        "decision_kind": "TEAM_DECISION",
        "supply_orders": plan["supply_orders"],
        "calendar_note": (
            "TEAM_DECISION: даты выбраны ограниченным поиском по BASE и обязательному "
            "стрессу. Глобальная оптимальность и математическая приёмка не доказаны."
        ),
    }


def _decisions_from_strategy(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: data[key]
        for key in ("investments", "capacity_reservations", "supply_orders", "inventory_policy")
    }


def _sha256_json(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def _mc_summary(result: Dict[str, Any]) -> Dict[str, Any]:
    fields = (
        "iterations", "seed", "probability_of_no_shortage",
        "probability_of_all_constraints", "probability_of_zero_shortage",
        "median_shortage_t", "p95_shortage_t", "max_shortage_t",
        "mean_total_cost_mln", "p95_total_cost_mln",
        "mean_emergency_procurement_mln", "p95_emergency_procurement_mln",
        "quantile_method", "median_method",
    )
    return {field: result[field] for field in fields}


def build_diversified_report(
    strategy: Dict[str, Any], search: Dict[str, Any], catalog: CaseCatalog
) -> Dict[str, Any]:
    from tools.prepare_strategy_calendars import OBJECTIVE_FIELDS, objective, uniform_plan

    root = catalog.data_root
    engine = SimulationEngine(catalog)
    decisions = _decisions_from_strategy(strategy)
    selected_results = {
        scenario: engine.run(strategy["id"], scenario, decisions, run_risk_analysis=False)
        for scenario in ("BASE", "MANDATORY_STRESS")
    }
    deterministic = {
        scenario: _scenario_summary(result) for scenario, result in selected_results.items()
    }
    uniform = uniform_plan(strategy)
    uniform_results = {
        scenario: engine.run(strategy["id"], scenario, uniform, run_risk_analysis=False)
        for scenario in ("BASE", "MANDATORY_STRESS")
    }
    calendar_comparison = {
        "objective_fields": list(OBJECTIVE_FIELDS),
        "BASE": {
            "uniform_objective": list(objective(uniform_results["BASE"])),
            "selected_objective": list(objective(selected_results["BASE"])),
            "uniform": _scenario_summary(uniform_results["BASE"]),
            "selected": deterministic["BASE"],
        },
        "MANDATORY_STRESS": {
            "uniform": _scenario_summary(uniform_results["MANDATORY_STRESS"]),
            "selected": deterministic["MANDATORY_STRESS"],
        },
    }
    balanced = json.loads((root / "strategies" / "balanced.json").read_text(encoding="utf-8"))
    monte_carlo = {}
    for kind, plan in (("diversified", strategy), ("balanced", balanced)):
        result = run_monte_carlo(
            catalog,
            "BASE",
            _decisions_from_strategy(plan),
            iterations=100,
            seed=42,
            include_trajectories=False,
        )
        monte_carlo[kind] = _mc_summary(result)

    provenance_paths = (
        "demand.csv", "supply_sources.csv", "storage_options.csv",
        "investment_options.csv", "constraints.csv", "scenarios/base.yaml",
        "scenarios/mandatory_stress.yaml", "strategies/balanced.json",
    )
    input_sha256 = {
        path: hashlib.sha256((root / path).read_bytes()).hexdigest()
        for path in provenance_paths
    }
    annual_shares = {}
    for row in strategy["annual_orders"]:
        annual_shares.setdefault(str(row["year"]), {})[row["source_id"]] = row["volume_t"]
    for year, volumes in annual_shares.items():
        total = sum(volumes.values())
        annual_shares[year] = {
            source: round(volume / total, 6) for source, volume in volumes.items()
        }
    code_paths = [Path(__file__), *sorted((Path(__file__).parents[1] / "src/engine").glob("*.py"))]
    code_sha256 = {
        str(path.resolve().relative_to(Path(__file__).parents[1].resolve())):
            hashlib.sha256(path.read_bytes()).hexdigest()
        for path in code_paths
    }
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "method": "bounded annual-volume search followed by bounded delivery-day search",
        "model_verified": False,
        "global_optimum_proven": False,
        "strategy_sha256": _sha256_json(strategy),
        "balanced_strategy_sha256": _sha256_json(balanced),
        "input_sha256": input_sha256,
        "code_sha256": code_sha256,
        "team_decisions": {
            "initial_inventory_t": strategy["inventory_policy"]["initial_inventory_t"],
            "investments": strategy["investments"],
            "emergency_reservation_t_per_year": 28.0,
        },
        "annual_orders": strategy["annual_orders"],
        "annual_regular_provider_shares": annual_shares,
        "max_annual_regular_provider_share": diversified_concentration(decisions),
        "search": search,
        "calendar_comparison": calendar_comparison,
        "deterministic": deterministic,
        "monte_carlo_base": monte_carlo,
    }


def publish_diversified(
    output: Path,
    report_output: Path,
    max_evaluations: int = 10_000,
    seed: int = 42,
) -> Dict[str, Any]:
    plan, search = optimize_diversified(max_evaluations=max_evaluations, seed=seed)
    strategy = diversified_strategy_data(plan)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(strategy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    scratch = Path(".local/diversified-work/search.json")
    scratch.parent.mkdir(parents=True, exist_ok=True)
    scratch.write_text(
        json.dumps({"strategy": strategy, "search": search}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    report = build_diversified_report(strategy, search, CaseCatalog())
    report_output.parent.mkdir(parents=True, exist_ok=True)
    report_output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return strategy


def evaluate_candidate(params: List[float], decode_fn, mc_iterations: int = 30) -> Tuple[float, Dict[str, Any]]:
    """
    Фитнес-функция с двухуровневой оценкой (Early-Exit).
    """
    plan = decode_fn(params)

    # 1. Быстрый детерминированный прогон (0.009 с)
    base_res = run_engine(plan["plan_id"], "BASE", plan, run_risk_analysis=False)
    violations = [c for c in base_res["constraint_checks"] if not c["passed"]]

    if violations:
        # Тяжёлый штраф за нарушения физических правил
        penalty = 0.0
        for v in violations:
            excess = abs(v.get("excess") or 5.0)
            penalty += 3000.0 + excess * 500.0
        return 100000.0 + penalty, base_res

    # 2. Быстрый прогон Монте-Карло для оценки при поиске
    from src.engine.monte_carlo import run_monte_carlo
    from src.engine.engine import get_engine
    engine = get_engine()
    mc = run_monte_carlo(catalog=engine.catalog, scenario_id="BASE", decisions=plan, iterations=mc_iterations)
    prob_success = mc.get("probability_of_zero_shortage", 0.0)
    total_cost = base_res["total_cost_mln"]

    # Штрафуем за P_mc < 0.95
    target_prob = 0.95
    if prob_success < target_prob:
        shortfall = target_prob - prob_success
        prob_penalty = (shortfall ** 2) * 40000.0
        score = total_cost + prob_penalty
    else:
        # Бонус за перевыполнение надёжности
        score = total_cost - (prob_success - target_prob) * 500.0

    return score, base_res


def run_pure_python_differential_evolution(
    fitness_fn,
    bounds: List[Tuple[float, float]],
    pop_size: int = 12,
    max_iter: int = 20,
    f_mut: float = 0.8,
    cr: float = 0.7,
    seed: int = 42,
    x0: List[float] = None,
) -> List[float]:
    """Встроенный легковесный алгоритм дифференциальной эволюции на чистом Python с поддержкой тёплого старта."""
    rng = random.Random(seed)
    dim = len(bounds)

    # Инициализация популяции
    pop = []
    # Если передан x0 (тёплый старт), обязательно включаем его первым
    if x0 is not None:
        pop.append(list(x0))
        # Засеиваем несколько особей в окрестности x0 (с небольшим шумом)
        for _ in range(min(3, pop_size - 1)):
            noisy = []
            for j in range(dim):
                val = x0[j] + rng.gauss(0.0, 2.0)
                val = max(bounds[j][0], min(bounds[j][1], val))
                noisy.append(val)
            pop.append(noisy)

    # Оставшиеся особи инициализируются равномерно по пространству
    while len(pop) < pop_size:
        ind = [b[0] + rng.random() * (b[1] - b[0]) for b in bounds]
        pop.append(ind)

    scores = []
    print(f"Инициализация популяции из {pop_size} особей...")
    for idx, ind in enumerate(pop):
        score, _ = fitness_fn(ind)
        scores.append(score)

    best_idx = scores.index(min(scores))
    print(f"Стартовый лучший счет: {scores[best_idx]:.2f}")

    for gen in range(max_iter):
        improved = 0
        for i in range(pop_size):
            candidates = [idx for idx in range(pop_size) if idx != i]
            a_idx, b_idx, c_idx = rng.sample(candidates, 3)
            a, b, c = pop[a_idx], pop[b_idx], pop[c_idx]

            # Мутация и скрещивание
            trial = []
            r_j = rng.randint(0, dim - 1)
            for j in range(dim):
                if rng.random() < cr or j == r_j:
                    v = a[j] + f_mut * (b[j] - c[j])
                    v = max(bounds[j][0], min(bounds[j][1], v))
                    trial.append(v)
                else:
                    trial.append(pop[i][j])

            # Оценка потомка
            f_trial, _ = fitness_fn(trial)
            if f_trial < scores[i]:
                pop[i] = trial
                scores[i] = f_trial
                improved += 1

        best_idx = scores.index(min(scores))
        best_score = scores[best_idx]
        print(f"Поколение {gen + 1:2d}/{max_iter}: лучший счет = {best_score:9.2f} (улучшений: {improved})")

    return pop[best_idx]


def main():
    parser = argparse.ArgumentParser(description="Оптимизация топливной стратегии (DE)")
    parser.add_argument("--archetype", choices=["earth_fortress", "lunar_dual", "diversified"], default="earth_fortress", help="Архетип для оптимизации")
    parser.add_argument("--iter", type=int, default=15, help="Число поколений эволюции (default: 15)")
    parser.add_argument("--pop", type=int, default=12, help="Размер популяции (default: 12)")
    parser.add_argument("--output", type=str, default="data/optimized_strategy.json", help="Путь для сохранения JSON-плана")
    parser.add_argument("--report", type=str, default="reports/diversified_strategy.json", help="Отчёт для diversified")
    parser.add_argument("--max-evaluations", type=int, default=10_000, help="Общий лимит engine-оценок diversified")
    parser.add_argument("--seed", type=int, default=42, help="Seed поиска diversified")
    args = parser.parse_args()

    if args.archetype == "diversified":
        strategy = publish_diversified(
            Path(args.output),
            Path(args.report),
            max_evaluations=args.max_evaluations,
            seed=args.seed,
        )
        print(
            f"Стратегия сохранена в {args.output}; отчёт — в {args.report}",
            file=sys.stderr,
        )
        return strategy

    if args.archetype == "lunar_dual":
        decode_fn = decode_lunar_dual
        bounds = [
            (110.0, 130.0),  # o35
            (150.0, 180.0),  # o36
            (185.0, 190.0),  # o37_c
            (0.0, 25.0),     # o37_f
            (130.0, 180.0),  # o38_c
            (60.0, 120.0),   # o38_l
            (0.0, 40.0),     # o38_f
            (180.0, 190.0),  # o39_c
            (80.0, 120.0),   # o39_l
            (0.0, 50.0),     # o39_f
            (180.0, 190.0),  # o40_c
            (80.0, 120.0),   # o40_l
            (40.0, 100.0),   # o40_f
            (0.0, 40.0),     # o40_e
        ]
        x0 = [118.0, 165.0, 190.0, 8.0, 150.0, 100.0, 15.0, 190.0, 120.0, 25.0, 190.0, 120.0, 75.0, 20.0]
    else:
        decode_fn = decode_earth_fortress
        bounds = [
            (110.0, 130.0),  # o35: Core 2035 (спрос 100)
            (150.0, 180.0),  # o36: Core 2036 (спрос 140, ZBO ввод)
            (185.0, 190.0),  # o37_c: Core 2037
            (0.0, 25.0),     # o37_f: Flex 2037
            (55.0, 85.0),    # o38_f: Flex 2038 (Core 190, спрос 250)
            (95.0, 110.0),   # o39_f: Flex 2039 (спрос 320)
            (15.0, 45.0),    # o39_e: Emer 2039
            (90.0, 110.0),   # o40_f: Flex 2040 (спрос 390)
            (50.0, 80.0),    # o40_e: Emer 2040
        ]
        x0 = [118.0, 165.0, 190.0, 8.0, 63.0, 110.0, 23.0, 110.0, 70.0]

    print(f"=== Запуск оптимизации архетипа '{args.archetype}' ===", file=sys.stderr)
    print(f"Поколений: {args.iter}, Популяция: {args.pop}", file=sys.stderr)
    print("Инициализирован экспертный тёплый старт (Warm Start x0)...", file=sys.stderr)

    def fit_call(params):
        return evaluate_candidate(params, decode_fn)

    # Пробуем scipy, если установлен
    try:
        from scipy.optimize import differential_evolution
        scipy_popsize = max(1, args.pop // len(bounds))
        total_pop = scipy_popsize * len(bounds)
        print(
            f"Используется scipy.optimize.differential_evolution "
            f"(популяция: {total_pop} особей)...",
            file=sys.stderr,
        )

        gen_counter = 0
        def scipy_callback(xk, convergence=None):
            nonlocal gen_counter
            gen_counter += 1
            print(
                f"Поколение {gen_counter:2d}/{args.iter} завершено...",
                flush=True,
                file=sys.stderr,
            )

        res_scipy = differential_evolution(
            func=lambda p: fit_call(p)[0],
            bounds=bounds,
            x0=x0,
            strategy="best1bin",
            maxiter=args.iter,
            popsize=scipy_popsize,
            mutation=(0.5, 1.0),
            recombination=0.7,
            seed=42,
            polish=False,
            callback=scipy_callback,
            workers=1,
        )
        best_vec = list(res_scipy.x)
    except ImportError as exc:
        raise RuntimeError(
            "Для оптимизации требуется SciPy: установите зависимости проекта "
            "с scipy и повторите запуск."
        ) from exc

    # Итоговый детальный расчёт лучшего плана
    plan_name = f"strategy_{args.archetype}_optimized"
    final_plan = decode_fn(best_vec, plan_id=plan_name)
    final_res = run_engine(final_plan["plan_id"], "BASE", final_plan, run_risk_analysis=True)
    mc = final_res["risk_register"][0] if final_res["risk_register"] else {}
    violations = [c for c in final_res["constraint_checks"] if not c["passed"]]

    probability = mc.get("probability_of_no_shortage")
    probability_text = (
        _format_metric(probability * 100, "%")
        if isinstance(probability, (int, float))
        else "недоступно"
    )
    print("\n=======================================================", file=sys.stderr)
    print("                РЕЗУЛЬТАТ ОПТИМИЗАЦИИ                  ", file=sys.stderr)
    print("=======================================================", file=sys.stderr)
    print(f"План Feasible (Hard Constraints): {final_res['is_feasible']}", file=sys.stderr)
    print(
        f"Совокупные затраты (Total Cost):  {final_res['total_cost_mln']:.2f} млн у.е.",
        file=sys.stderr,
    )
    print(f"Вероятность нулевого дефицита MC: {probability_text}", file=sys.stderr)
    print(
        f"Медианный дефицит:                 {_format_metric(mc.get('median_shortage_t'), ' т')}",
        file=sys.stderr,
    )
    print(
        f"P95 дефицит:                       {_format_metric(mc.get('p95_shortage_t'), ' т')}",
        file=sys.stderr,
    )
    if violations:
        print(f"Нарушения: {violations}", file=sys.stderr)
    else:
        print(
            "Нарушений (Violations):            0 (Все 7 Hard Constraints выполнены!)",
            file=sys.stderr,
        )
    print("=======================================================\n", file=sys.stderr)

    # Сохранение JSON
    exported_plan = to_participant_plan(final_plan)
    out_dir = os.path.dirname(os.path.abspath(args.output))
    os.makedirs(out_dir, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(exported_plan, f, ensure_ascii=False, indent=2)
    print(f"JSON-план успешно сохранён в: {args.output}", file=sys.stderr)
    return exported_plan


if __name__ == "__main__":
    print(json.dumps(main(), ensure_ascii=False, indent=2))
