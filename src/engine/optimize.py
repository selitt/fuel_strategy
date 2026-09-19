"""
Модуль программной оптимизации стратегий (Python API).
Позволяет программно находить оптимальные конфигурации снабжения методом Дифференциальной Эволюции (DE)
для интеграции в сервисный слой, тесты или сценарии расчёта.
"""

import sys
import os
import random
from typing import Dict, Any, List, Tuple

from src.engine.engine import run_engine, get_engine
from src.engine.monte_carlo import run_monte_carlo
from src.engine.strategies import make_monthly_batches


# Границы варьирования параметров плана (9 управляющих объёмов)
PARAM_BOUNDS: List[Tuple[float, float]] = [
    (110.0, 130.0),  # o35: Earth-Core 2035 (спрос 100)
    (150.0, 180.0),  # o36: Earth-Core 2036 (спрос 140, ввод ZBO)
    (185.0, 190.0),  # o37_c: Earth-Core 2037
    (0.0, 25.0),     # o37_f: Earth-Flex 2037
    (55.0, 85.0),    # o38_f: Earth-Flex 2038 (Core 190, спрос 250)
    (95.0, 110.0),   # o39_f: Earth-Flex 2039 (Core 190, спрос 320)
    (15.0, 45.0),    # o39_e: Emergency 2039
    (90.0, 110.0),   # o40_f: Earth-Flex 2040 (Core 190, спрос 390)
    (50.0, 80.0),    # o40_e: Emergency 2040
]

# Базовое экспертное начальное приближение (Warm Start)
WARM_START_X0: List[float] = [118.0, 165.0, 190.0, 8.0, 67.0, 110.0, 30.0, 110.0, 74.0]


def decode_params_to_plan(params: List[float], plan_id: str = "strategy_de_optimal") -> Dict[str, Any]:
    """
    Декодирует численный вектор параметров в помесячный датированный план космического контура.
    """
    o35, o36, o37_c, o37_f, o38_f, o39_f, o39_e, o40_f, o40_e = params

    orders = []
    # 2035: Core
    orders.extend(make_monthly_batches(2035, "Earth-Core", round(o35, 1), batch_prefix="core"))
    # 2036: Core
    orders.extend(make_monthly_batches(2036, "Earth-Core", round(o36, 1), batch_prefix="core"))
    # 2037: Core + Flex
    orders.extend(make_monthly_batches(2037, "Earth-Core", round(o37_c, 1), batch_prefix="core"))
    orders.extend(make_monthly_batches(2037, "Earth-Flex", round(o37_f, 1), batch_prefix="flex"))
    # 2038: Core + Flex
    orders.extend(make_monthly_batches(2038, "Earth-Core", 190.0, batch_prefix="core"))
    orders.extend(make_monthly_batches(2038, "Earth-Flex", round(o38_f, 1), batch_prefix="flex"))
    # 2039: Core + Flex + Emergency
    orders.extend(make_monthly_batches(2039, "Earth-Core", 190.0, batch_prefix="core"))
    orders.extend(make_monthly_batches(2039, "Earth-Flex", round(o39_f, 1), batch_prefix="flex"))
    orders.extend(make_monthly_batches(2039, "Emergency", round(o39_e, 1), batch_prefix="emer"))
    # 2040: Core + Flex + Emergency
    orders.extend(make_monthly_batches(2040, "Earth-Core", 190.0, batch_prefix="core"))
    orders.extend(make_monthly_batches(2040, "Earth-Flex", round(o40_f, 1), batch_prefix="flex"))
    orders.extend(make_monthly_batches(2040, "Emergency", round(o40_e, 1), batch_prefix="emer"))

    reservations = [
        {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": round(max(o35, 140.0), 1)},
        {"year": 2035, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": round(max(o36, 170.0), 1)},
        {"year": 2036, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2037, "source_id": "Earth-Flex", "reserved_capacity_t": round(max(o37_f + 10.0, 30.0), 1)},
        {"year": 2037, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2038, "source_id": "Earth-Flex", "reserved_capacity_t": round(max(o38_f + 10.0, 70.0), 1)},
        {"year": 2038, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2039, "source_id": "Earth-Flex", "reserved_capacity_t": 110.0},
        {"year": 2039, "source_id": "Emergency", "reserved_capacity_t": round(max(o39_e + 10.0, 45.0), 1)},
        {"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2040, "source_id": "Earth-Flex", "reserved_capacity_t": 110.0},
        {"year": 2040, "source_id": "Emergency", "reserved_capacity_t": 80.0},
    ]

    return {
        "plan_id": plan_id,
        "description": "Оптимизированная стратегия (Differential Evolution, помесячные партии)",
        "investments": [{"investment_id": "ZBO", "year": 2036}],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0},
    }


def evaluate_fitness(params: List[float], mc_iterations: int = 30) -> float:
    """
    Фитнес-функция с Early-Exit фильтрацией детерминированных нарушений.
    """
    plan = decode_params_to_plan(params)

    # 1. Быстрый детерминированный прогон
    base_res = run_engine(plan["plan_id"], "BASE", plan, run_risk_analysis=False)
    violations = [c for c in base_res["constraint_checks"] if not c["passed"]]

    if violations:
        penalty = 0.0
        for v in violations:
            excess = abs(v.get("excess") or 5.0)
            penalty += 3000.0 + excess * 500.0
        return 100000.0 + penalty

    # 2. Быстрый прогон Монте-Карло для оценки устойчивости
    engine = get_engine()
    mc = run_monte_carlo(catalog=engine.catalog, scenario_id="BASE", decisions=plan, iterations=mc_iterations)
    prob_success = mc.get("probability_of_zero_shortage", 0.0)
    total_cost = base_res["total_cost_mln"]

    target_prob = 0.95
    if prob_success < target_prob:
        shortfall = target_prob - prob_success
        prob_penalty = (shortfall ** 2) * 40000.0
        return total_cost + prob_penalty

    return total_cost - (prob_success - target_prob) * 500.0


def run_pure_python_de(
    fitness_fn,
    bounds: List[Tuple[float, float]],
    pop_size: int = 12,
    max_gen: int = 15,
    f_mut: float = 0.8,
    cr: float = 0.7,
    seed: int = 42,
    x0: List[float] = None,
) -> List[float]:
    """Автономная реализация Дифференциальной Эволюции на стандартной библиотеке Python."""
    rng = random.Random(seed)
    dim = len(bounds)
    pop = []
    if x0 is not None:
        pop.append(list(x0))
        for _ in range(min(3, pop_size - 1)):
            noisy = []
            for j in range(dim):
                val = x0[j] + rng.gauss(0.0, 2.0)
                val = max(bounds[j][0], min(bounds[j][1], val))
                noisy.append(val)
            pop.append(noisy)

    while len(pop) < pop_size:
        ind = [b[0] + rng.random() * (b[1] - b[0]) for b in bounds]
        pop.append(ind)

    scores = [fitness_fn(ind) for ind in pop]
    best_idx = scores.index(min(scores))

    for gen in range(max_gen):
        for i in range(pop_size):
            candidates = [idx for idx in range(pop_size) if idx != i]
            a, b, c = [pop[idx] for idx in rng.sample(candidates, 3)]

            trial = []
            r_j = rng.randint(0, dim - 1)
            for j in range(dim):
                if rng.random() < cr or j == r_j:
                    v = a[j] + f_mut * (b[j] - c[j])
                    v = max(bounds[j][0], min(bounds[j][1], v))
                    trial.append(v)
                else:
                    trial.append(pop[i][j])

            f_trial = fitness_fn(trial)
            if f_trial < scores[i]:
                pop[i] = trial
                scores[i] = f_trial

        best_idx = scores.index(min(scores))
        print(f"Поколение {gen + 1:2d}/{max_gen}: лучший счёт = {scores[best_idx]:.2f}", flush=True)

    return pop[best_idx]


def optimize_strategy(
    max_iter: int = 15,
    pop_size: int = 12,
    seed: int = 42,
    x0: List[float] = None,
) -> Dict[str, Any]:
    """
    Основная точка входа для оптимизации стратегии.
    Автоматически использует SciPy при наличии либо встроенный Python DE.
    """
    initial_guess = x0 or WARM_START_X0

    try:
        from scipy.optimize import differential_evolution
        scipy_popsize = max(1, pop_size // len(PARAM_BOUNDS))
        total_pop = scipy_popsize * len(PARAM_BOUNDS)
        print(f"Используется scipy.optimize.differential_evolution (популяция: {total_pop} особей)...")

        gen_counter = 0
        def scipy_callback(xk, convergence=None):
            nonlocal gen_counter
            gen_counter += 1
            print(f"Поколение {gen_counter:2d}/{max_iter} завершено...", flush=True)

        res_scipy = differential_evolution(
            func=evaluate_fitness,
            bounds=PARAM_BOUNDS,
            x0=initial_guess,
            strategy="best1bin",
            maxiter=max_iter,
            popsize=scipy_popsize,
            mutation=(0.5, 1.0),
            recombination=0.7,
            seed=seed,
            polish=False,
            callback=scipy_callback,
            workers=1,
        )
        best_params = list(res_scipy.x)
    except ImportError as e:
        print(f"scipy не найден ({e}), используется встроенный DE на чистом Python...")
        best_params = run_pure_python_de(
            fitness_fn=evaluate_fitness,
            bounds=PARAM_BOUNDS,
            pop_size=pop_size,
            max_gen=max_iter,
            seed=seed,
            x0=initial_guess,
        )

    # Финальная полная валидация на 100 прогонах Монте-Карло
    final_plan = decode_params_to_plan(best_params, plan_id="strategy_earth_fortress_optimized")
    final_res = run_engine(final_plan["plan_id"], "BASE", final_plan, run_risk_analysis=True)
    mc = final_res["risk_register"][0] if final_res["risk_register"] else {}

    print("\n=== РЕЗУЛЬТАТ ОПТИМИЗАЦИИ ===")
    print(f"План валиден (Feasible): {final_res['is_feasible']}")
    print(f"Total Cost:              {final_res['total_cost_mln']:.2f} млн")
    print(f"Вероятность успеха MC:   {mc.get('probability_of_zero_shortage', 0.0) * 100:.1f}%")
    print(f"Медианный дефицит:        {mc.get('median_shortage_t', 0.0):.2f} т")
    return final_plan


if __name__ == "__main__":
    optimize_strategy()