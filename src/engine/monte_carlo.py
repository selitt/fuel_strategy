"""
Модуль вероятностного анализа рисков методом Монте-Карло (испытания Бернулли).
Моделирует случайные сбои пусков танкеров в соответствии с профилем надёжности каналов.
"""

import random
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
    rng = random.Random(seed)
    years = sorted(catalog.demands.keys())

    total_shortages = []
    feasible_runs = 0
    num_batches = 6

    sources = [s for s in catalog.sources.values() if s.source_id in ("A", "B", "C", "D", "E")]
    # Убираем дубли по именам
    unique_sources = {s.source_id: s for s in sources}.values()

    for run_idx in range(iterations):
        failures = {}
        for y in years:
            for s in unique_sources:
                p = extract_reliability(s.reliability_profile, y)
                for b_idx in range(num_batches):
                    # Испытание Бернулли: сбой с вероятностью 1 - p
                    if rng.random() > p:
                        failures[(y, s.source_id, b_idx)] = True

        yearly_bal, _, _, violations, _ = simulate_daily(
            catalog=catalog,
            scenario_id=scenario_id,
            decisions=decisions,
            monte_carlo_failures=failures,
        )

        run_shortage = sum(b.shortage_t for b in yearly_bal)
        total_shortages.append(run_shortage)
        if run_shortage == 0 and len(violations) == 0:
            feasible_runs += 1

    total_shortages.sort()
    p50_shortage = total_shortages[int(0.50 * iterations)]
    p95_shortage = total_shortages[int(0.95 * iterations)]
    max_shortage = max(total_shortages)
    prob_success = round(feasible_runs / iterations, 4)

    risk_register_entry = {
        "risk_id": "R_LAUNCH_FAILURE_MONTE_CARLO",
        "event": "Случайные сбои и аварии пусков танкеров по схеме Бернулли",
        "iterations": iterations,
        "seed": seed,
        "probability_of_zero_shortage": prob_success,
        "median_shortage_t": round(p50_shortage, 2),
        "p95_shortage_t": round(p95_shortage, 2),
        "max_shortage_t": round(max_shortage, 2),
        "recommendation": "Поддерживать страховой буфер в баке или держать бронь Emergency для парирования сбоев",
    }

    return risk_register_entry
