"""
Модуль вероятностного анализа рисков методом Монте-Карло (испытания Бернулли).
Моделирует случайные сбои пусков танкеров в соответствии с профилем надёжности каналов.
"""

import math
import random
import statistics
from fractions import Fraction
from typing import Dict, List, Any, Tuple
from .calendar import normalize_plan, source_operating_years
from .audit import audit_constraints
from .finance import calculate_finances
from .loader import CaseCatalog
from .simulation import _emergency_arrival, simulate_daily


def extract_reliability(
    reliability_profile: str,
    year: int,
    first_operating_year: int | None = None,
) -> float:
    """Извлекает числовой коэффициент надежности для заданного года."""
    s = reliability_profile.strip()
    if s.startswith("constant:"):
        return float(s.split(":")[1])
    parts = {}
    for item in s.split(";"):
        if ":" in item:
            key, value = item.split(":", 1)
            parts[key.strip()] = value.strip()
    if "first_operating_year" in parts:
        first_year = year if first_operating_year is None else first_operating_year
        key = "first_operating_year" if year == first_year else "later"
        if key not in parts:
            raise ValueError(f"reliability profile has no {key} value: {s}")
        return float(parts[key])
    if str(year) in parts:
        return float(parts[str(year)])
    try:
        return float(s)
    except ValueError as exc:
        raise ValueError(f"reliability profile has no value for {year}: {s}") from exc


def _build_shortage_histogram(samples: List[float]) -> List[Dict[str, Any]]:
    """Build at most ten equal-width bins over two-decimal shortage samples."""
    sample_cents = [int(round(value * 100)) for value in samples]
    minimum = min(sample_cents)
    maximum = max(sample_cents)

    if minimum == maximum:
        value = minimum / 100
        return [{"lower_t": value, "upper_t": value, "count": len(samples)}]

    bin_count = min(10, len(set(sample_cents)))
    span = maximum - minimum
    counts = [0] * bin_count
    for value in sample_cents:
        if value == maximum:
            bin_index = bin_count - 1
        else:
            bin_index = min(((value - minimum) * bin_count) // span, bin_count - 1)
        counts[bin_index] += 1

    histogram = []
    for index, count in enumerate(counts):
        lower = Fraction(minimum * bin_count + index * span, bin_count * 100)
        upper = Fraction(minimum * bin_count + (index + 1) * span, bin_count * 100)
        histogram.append(
            {
                "lower_t": float(lower),
                "upper_t": float(upper),
                "count": count,
            }
        )
    return histogram


def _empty_daily_trajectories() -> Dict[str, Any]:
    """Return the stable API shape when a mocked simulation has no daily trace."""
    return {
        "days": [],
        "runs": [],
        "bands": {
            "inventory_t": {"p05": [], "median": [], "p95": []},
            "shortage_t": {"p05": [], "median": [], "p95": []},
        },
    }


def _trace_axis(daily_trace: List[Any]) -> List[Dict[str, int]]:
    axis = []
    for record in daily_trace:
        coordinates = (record.day, record.year, record.day_of_year)
        if any(type(value) is not int for value in coordinates):
            raise ValueError("daily trace axis values must be integers")
        axis.append(
            {
                "day": record.day,
                "year": record.year,
                "day_of_year": record.day_of_year,
            }
        )
    return axis


def _trace_values(daily_trace: List[Any], field: str) -> List[float]:
    values = []
    for record in daily_trace:
        value = getattr(record, field)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"daily trace {field} must be numeric")
        number = float(value)
        if not math.isfinite(number) or number < 0:
            raise ValueError(f"daily trace {field} must be finite and non-negative")
        values.append(number)
    return values


def _pointwise_bands(runs: List[Dict[str, Any]], field: str) -> Dict[str, List[float]]:
    if not runs:
        return {"p05": [], "median": [], "p95": []}

    point_count = len(runs[0][field])
    p05_rank = math.ceil(0.05 * len(runs)) - 1
    p95_rank = math.ceil(0.95 * len(runs)) - 1
    p05 = []
    median = []
    p95 = []
    for point_index in range(point_count):
        values = sorted(run[field][point_index] for run in runs)
        p05.append(values[p05_rank])
        median.append(round(statistics.median(values), 2))
        p95.append(values[p95_rank])
    return {"p05": p05, "median": median, "p95": p95}


def run_monte_carlo(
    catalog: CaseCatalog,
    scenario_id: str,
    decisions: Dict[str, Any],
    iterations: int = 100,
    seed: int = 42,
    *,
    emergency_enabled: bool = True,
    include_trajectories: bool = True,
) -> Dict[str, Any]:
    """
    Запускает серию симуляций Монте-Карло.
    В каждом прогоне каждый танкер может потерпеть аварию с вероятностью (1 - reliability).
    Возвращает статистику устойчивости плана к случайным отказам.
    """
    if type(iterations) is not int or iterations <= 0:
        raise ValueError("iterations must be a positive integer")

    rng = random.Random(seed)
    batches, _ = normalize_plan(catalog, decisions)
    source_first_year = source_operating_years(catalog, decisions, batches)
    is_mandatory_stress = scenario_id.upper() == "MANDATORY_STRESS"
    years = sorted(catalog.demands)
    unique_sources = {source.source_id: source for source in catalog.sources.values()}
    emergency_source = unique_sources.get("E")

    total_shortages: List[float] = []
    total_cost_samples: List[float] = []
    emergency_procurement_samples: List[float] = []
    daily_trajectories = _empty_daily_trajectories()
    feasible_runs = 0
    zero_shortage_runs = 0
    all_constraints_runs = 0
    for run_index in range(iterations):
        failures = {}
        for batch in sorted(
            batches,
            key=lambda item: (item.model_day, item.source.source_id, item.batch_id),
        ):
            source = batch.source
            # Обязательный стресс уже задаёт фактическую долю Lunar по годам.
            # Второй случайный отказ того же канала смешал бы два механизма.
            if is_mandatory_stress and source.source_id == "D":
                continue
            p = extract_reliability(
                source.reliability_profile,
                batch.year,
                first_operating_year=source_first_year[source.source_id],
            )
            if not 0 <= p <= 1:
                raise ValueError(
                    f"reliability for {source.source_id} in {batch.year} must be in [0, 1]"
                )
            # Испытание Бернулли выполняется ровно для реальной партии плана.
            if rng.random() > p:
                failures[(batch.year, source.source_id, batch.batch_id)] = True
                if emergency_enabled and source.source_id != "E" and emergency_source:
                    arrival = _emergency_arrival(batch, emergency_source, years)
                    if arrival is not None:
                        _, arrival_date = arrival
                        rescue_p = extract_reliability(
                            emergency_source.reliability_profile,
                            arrival_date.year,
                            first_operating_year=source_first_year.get(
                                emergency_source.source_id,
                                emergency_source.available_from_year,
                            ),
                        )
                        if not 0 <= rescue_p <= 1:
                            raise ValueError(
                                "reliability for Emergency in "
                                f"{arrival_date.year} must be in [0, 1]"
                            )
                        rescue_rng = random.Random(
                            f"{seed}:{run_index}:emergency_rescue:"
                            f"{batch.year}:{source.source_id}:{batch.batch_id}"
                        )
                        if rescue_rng.random() > rescue_p:
                            failures[
                                (
                                    "emergency_rescue",
                                    batch.year,
                                    source.source_id,
                                    batch.batch_id,
                                )
                            ] = True

        yearly_bal, source_schedules, daily_trace, violations, avg_inventory = simulate_daily(
            catalog=catalog,
            scenario_id=scenario_id,
            decisions=decisions,
            monte_carlo_failures=failures,
            emergency_enabled=emergency_enabled,
        )

        investments = decisions.get("investments", [])
        inventory_policy = decisions.get("inventory_policy", {})
        initial_inventory_t = float(inventory_policy.get("initial_inventory_t", 0.0))
        financial_breakdowns, total_cost, _ = calculate_finances(
            catalog=catalog,
            source_schedules=source_schedules,
            avg_inventory_by_year=avg_inventory,
            investments=investments,
            initial_inventory_t=initial_inventory_t,
        )
        _, all_constraints_met = audit_constraints(
            catalog=catalog,
            scenario_id=scenario_id,
            yearly_balances=yearly_bal,
            financial_breakdowns=financial_breakdowns,
            source_schedules=source_schedules,
            simulation_violations=violations,
            decisions=decisions,
        )

        run_shortage = float(sum(b.shortage_t for b in yearly_bal))
        if not math.isfinite(run_shortage) or run_shortage < 0:
            raise ValueError("shortage sample must be finite and non-negative")

        total_shortages.append(round(run_shortage, 2))

        if not math.isfinite(total_cost) or total_cost < 0:
            raise ValueError("total cost sample must be finite and non-negative")
        total_cost_samples.append(round(total_cost, 2))

        rescue_procurement = sum(
            schedule.emergency_rescue_procurement_cost_mln
            for schedule in source_schedules
        )
        if not math.isfinite(rescue_procurement) or rescue_procurement < 0:
            raise ValueError(
                "emergency procurement sample must be finite and non-negative"
            )
        emergency_procurement_samples.append(round(rescue_procurement, 2))

        if include_trajectories:
            run_axis = _trace_axis(daily_trace)
            if run_index == 0:
                daily_trajectories["days"] = run_axis
            elif run_axis != daily_trajectories["days"]:
                raise ValueError("daily trace axis must be identical for every run")

            if daily_trace:
                daily_trajectories["runs"].append(
                    {
                        "run": run_index + 1,
                        "inventory_t": _trace_values(daily_trace, "closing_inventory_t"),
                        "shortage_t": _trace_values(daily_trace, "shortage_t"),
                        "delivered_t": _trace_values(daily_trace, "delivered_t"),
                    }
                )
        if run_shortage == 0:
            zero_shortage_runs += 1
        if run_shortage == 0 and len(violations) == 0:
            feasible_runs += 1
        if all_constraints_met:
            all_constraints_runs += 1

    sorted_shortages = sorted(total_shortages)
    p50_shortage = statistics.median(sorted_shortages)
    p95_shortage = sorted_shortages[math.ceil(0.95 * iterations) - 1]
    max_shortage = sorted_shortages[-1]
    prob_success = round(feasible_runs / iterations, 4)
    probability_of_no_shortage = round(zero_shortage_runs / iterations, 4)
    probability_of_all_constraints = round(all_constraints_runs / iterations, 4)

    sorted_total_costs = sorted(total_cost_samples)
    sorted_emergency_costs = sorted(emergency_procurement_samples)
    mean_total_cost = round(statistics.mean(total_cost_samples), 2)
    p95_total_cost = sorted_total_costs[math.ceil(0.95 * iterations) - 1]
    mean_emergency_procurement = round(
        statistics.mean(emergency_procurement_samples),
        2,
    )
    p95_emergency_procurement = sorted_emergency_costs[
        math.ceil(0.95 * iterations) - 1
    ]

    daily_trajectories["bands"] = {
        "inventory_t": _pointwise_bands(daily_trajectories["runs"], "inventory_t"),
        "shortage_t": _pointwise_bands(daily_trajectories["runs"], "shortage_t"),
    }

    risk_register_entry = {
        "risk_id": "R_LAUNCH_FAILURE_MONTE_CARLO",
        "analysis_context": (
            "RESEARCH_STRESS_RISK"
            if is_mandatory_stress
            else "RESEARCH_BASE_RISK"
        ),
        "event": (
            "Исследовательские случайные сбои партий поверх обязательного "
            "стресса; Lunar использует только фиксированные доли сценария"
            if is_mandatory_stress
            else "Случайные сбои и аварии пусков танкеров по схеме Бернулли"
        ),
        "iterations": iterations,
        "seed": seed,
        "shortage_samples_t": total_shortages,
        "shortage_histogram": _build_shortage_histogram(total_shortages),
        "daily_trajectories": daily_trajectories,
        "successful_runs": feasible_runs,
        "zero_shortage_runs": zero_shortage_runs,
        "probability_of_no_shortage": probability_of_no_shortage,
        "probability_of_zero_shortage": prob_success,
        "probability_of_all_constraints": probability_of_all_constraints,
        "median_shortage_t": round(p50_shortage, 2),
        "p95_shortage_t": round(p95_shortage, 2),
        "max_shortage_t": round(max_shortage, 2),
        "total_cost_samples_mln": total_cost_samples,
        "emergency_procurement_samples_mln": emergency_procurement_samples,
        "mean_total_cost_mln": mean_total_cost,
        "p95_total_cost_mln": round(p95_total_cost, 2),
        "mean_emergency_procurement_mln": mean_emergency_procurement,
        "p95_emergency_procurement_mln": round(p95_emergency_procurement, 2),
        "quantile_method": "nearest_rank",
        "median_method": "arithmetic_middle",
        "recommendation": "Поддерживать страховой буфер в баке или держать бронь Emergency для парирования сбоев",
    }

    return risk_register_entry
