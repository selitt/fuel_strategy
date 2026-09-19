"""
Модуль вероятностного анализа рисков методом Монте-Карло (испытания Бернулли).
Моделирует случайные сбои пусков танкеров в соответствии с профилем надёжности каналов.
"""

import math
import random
import statistics
from fractions import Fraction
from typing import Dict, List, Any, Tuple
from .loader import CaseCatalog
from .simulation import simulate_daily


def extract_reliability(reliability_profile: str, year: int) -> float:
    """Извлекает числовой коэффициент надежности для заданного года."""
    s = reliability_profile.strip()
    if s.startswith("constant:"):
        return float(s.split(":")[1])
    elif "2038:" in s:
        # Например: 2038:0.78;2039:0.90;2040:0.93
        parts = s.split(";")
        for p in parts:
            if f"{year}:" in p:
                return float(p.split(":")[1])
        return 0.90
    elif "first_operating_year:" in s:
        return 0.88 if year == 2035 else 0.94
    try:
        return float(s)
    except ValueError:
        return 0.95


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
) -> Dict[str, Any]:
    """
    Запускает серию симуляций Монте-Карло.
    В каждом прогоне каждый танкер может потерпеть аварию с вероятностью (1 - reliability).
    Возвращает статистику устойчивости плана к случайным отказам.
    """
    if type(iterations) is not int or iterations <= 0:
        raise ValueError("iterations must be a positive integer")

    rng = random.Random(seed)
    years = sorted(catalog.demands.keys())

    total_shortages: List[float] = []
    daily_trajectories = _empty_daily_trajectories()
    feasible_runs = 0
    zero_shortage_runs = 0
    num_batches = 6

    sources = [s for s in catalog.sources.values() if s.source_id in ("A", "B", "C", "D", "E")]
    # Убираем дубли по именам
    unique_sources = {s.source_id: s for s in sources}.values()

    for run_index in range(iterations):
        failures = {}
        for y in years:
            for s in unique_sources:
                p = extract_reliability(s.reliability_profile, y)
                for b_idx in range(num_batches):
                    # Испытание Бернулли: сбой с вероятностью 1 - p
                    if rng.random() > p:
                        failures[(y, s.source_id, b_idx)] = True

        yearly_bal, _, daily_trace, violations, _ = simulate_daily(
            catalog=catalog,
            scenario_id=scenario_id,
            decisions=decisions,
            monte_carlo_failures=failures,
        )

        run_shortage = float(sum(b.shortage_t for b in yearly_bal))
        if not math.isfinite(run_shortage) or run_shortage < 0:
            raise ValueError("shortage sample must be finite and non-negative")

        total_shortages.append(round(run_shortage, 2))

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

    sorted_shortages = sorted(total_shortages)
    p50_shortage = statistics.median(sorted_shortages)
    p95_shortage = sorted_shortages[math.ceil(0.95 * iterations) - 1]
    max_shortage = sorted_shortages[-1]
    prob_success = round(feasible_runs / iterations, 4)
    probability_of_no_shortage = round(zero_shortage_runs / iterations, 4)

    daily_trajectories["bands"] = {
        "inventory_t": _pointwise_bands(daily_trajectories["runs"], "inventory_t"),
        "shortage_t": _pointwise_bands(daily_trajectories["runs"], "shortage_t"),
    }

    risk_register_entry = {
        "risk_id": "R_LAUNCH_FAILURE_MONTE_CARLO",
        "event": "Случайные сбои и аварии пусков танкеров по схеме Бернулли",
        "iterations": iterations,
        "seed": seed,
        "shortage_samples_t": total_shortages,
        "shortage_histogram": _build_shortage_histogram(total_shortages),
        "daily_trajectories": daily_trajectories,
        "successful_runs": feasible_runs,
        "zero_shortage_runs": zero_shortage_runs,
        "probability_of_no_shortage": probability_of_no_shortage,
        "probability_of_zero_shortage": prob_success,
        "median_shortage_t": round(p50_shortage, 2),
        "p95_shortage_t": round(p95_shortage, 2),
        "max_shortage_t": round(max_shortage, 2),
        "quantile_method": "nearest_rank",
        "median_method": "arithmetic_middle",
        "recommendation": "Поддерживать страховой буфер в баке или держать бронь Emergency для парирования сбоев",
    }

    return risk_register_entry
