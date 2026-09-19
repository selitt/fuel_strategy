"""
Модуль вероятностного анализа рисков методом Монте-Карло (испытания Бернулли).
Моделирует случайные сбои пусков танкеров в соответствии с профилем надёжности каналов.
"""

import random
from typing import Dict, List, Any, Tuple, Optional
from .loader import CaseCatalog
from .simulation import simulate_daily


def extract_reliability(
    reliability_profile: str,
    year: int,
    first_operating_year: Optional[int] = None
) -> float:
    s = reliability_profile.strip().strip('"').strip("'")

    # 1. Формат constant:0.96
    if s.startswith("constant:"):
        return float(s.split(":")[1].strip())

    # 2. Формат first_operating_year:0.88;later:0.94
    if "first_operating_year:" in s:
        pairs = dict(part.split(":") for part in s.split(";"))
        first_val = float(pairs.get("first_operating_year", 0.88))
        later_val = float(pairs.get("later", pairs.get("subsequent", 0.94)))

        # Если передан реальный год ввода канала
        if first_operating_year is not None:
            return first_val if year == first_operating_year else later_val
        return first_val if year == 2035 else later_val

    # 3. Формат по годам 2038:0.78;2039:0.90;2040:0.93
    if ":" in s:
        year_map = {}
        for part in s.split(";"):
            if ":" in part:
                k, v = part.split(":")
                year_map[int(k.strip())] = float(v.strip())

        if year in year_map:
            return year_map[year]
        # Если год раньше первого известного — берём значение первого года
        min_y = min(year_map.keys())
        if year < min_y:
            return year_map[min_y]
        # Если год позже — берём последнее значение
        max_y = max(year_map.keys())
        return year_map[max_y]

    return float(s)


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

    # Извлекаем реальный год ввода каналов из инвестиций
    first_op_years = {}
    for inv in decisions.get("investments", []):
        inv_id = str(inv.get("investment_id", "")).upper()
        y = inv.get("commissioning_year", inv.get("year"))
        if y:
            if "LUNAR" in inv_id:
                first_op_years["Lunar-ISRU"] = int(y)
                first_op_years["D"] = int(y)
            elif "EARTH_NEW" in inv_id or "NEW" in inv_id:
                first_op_years["Earth-New"] = int(y)
                first_op_years["C"] = int(y)

    for run_idx in range(iterations):
        failures = {}
        for y in years:
            for s in unique_sources:
                f_op = first_op_years.get(s.source_id, first_op_years.get(s.name))
                p = extract_reliability(s.reliability_profile, y, first_operating_year=f_op)
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
