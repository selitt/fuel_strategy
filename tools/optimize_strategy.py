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
from typing import Dict, Any, List, Tuple

# Добавляем корень проекта в путь поиска модулей
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.engine.engine import run_engine


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

    orders = [
        {"year": 2035, "source_id": "Earth-Core", "order_volume_t": round(o35, 1)},
        {"year": 2036, "source_id": "Earth-Core", "order_volume_t": round(o36, 1)},
        {"year": 2037, "source_id": "Earth-Core", "order_volume_t": round(o37_c, 1)},
        {"year": 2037, "source_id": "Earth-Flex", "order_volume_t": round(o37_f, 1)},
        {"year": 2038, "source_id": "Earth-Core", "order_volume_t": 190.0},
        {"year": 2038, "source_id": "Earth-Flex", "order_volume_t": round(o38_f, 1)},
        {"year": 2039, "source_id": "Earth-Core", "order_volume_t": 190.0},
        {"year": 2039, "source_id": "Earth-Flex", "order_volume_t": round(o39_f, 1)},
        {"year": 2039, "source_id": "Emergency", "order_volume_t": round(o39_e, 1)},
        {"year": 2040, "source_id": "Earth-Core", "order_volume_t": 190.0},
        {"year": 2040, "source_id": "Earth-Flex", "order_volume_t": round(o40_f, 1)},
        {"year": 2040, "source_id": "Emergency", "order_volume_t": round(o40_e, 1)},
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
        "investments": [{"investment_id": "ZBO", "commissioning_year": 2036}],
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

    orders = [
        {"year": 2035, "source_id": "Earth-Core", "order_volume_t": round(o35, 1)},
        {"year": 2036, "source_id": "Earth-Core", "order_volume_t": round(o36, 1)},
        {"year": 2037, "source_id": "Earth-Core", "order_volume_t": round(o37_c, 1)},
        {"year": 2037, "source_id": "Earth-Flex", "order_volume_t": round(o37_f, 1)},
        {"year": 2038, "source_id": "Earth-Core", "order_volume_t": round(o38_c, 1)},
        {"year": 2038, "source_id": "Lunar-ISRU", "order_volume_t": round(o38_l, 1)},
        {"year": 2038, "source_id": "Earth-Flex", "order_volume_t": round(o38_f, 1)},
        {"year": 2039, "source_id": "Earth-Core", "order_volume_t": round(o39_c, 1)},
        {"year": 2039, "source_id": "Lunar-ISRU", "order_volume_t": round(o39_l, 1)},
        {"year": 2039, "source_id": "Earth-Flex", "order_volume_t": round(o39_f, 1)},
        {"year": 2040, "source_id": "Earth-Core", "order_volume_t": round(o40_c, 1)},
        {"year": 2040, "source_id": "Lunar-ISRU", "order_volume_t": round(o40_l, 1)},
        {"year": 2040, "source_id": "Earth-Flex", "order_volume_t": round(o40_f, 1)},
        {"year": 2040, "source_id": "Emergency", "order_volume_t": round(o40_e, 1)},
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
            {"investment_id": "ZBO", "commissioning_year": 2036},
            {"investment_id": "LUNAR_ISRU", "commissioning_year": 2038, "capex_schedule": {2036: 450.0, 2037: 800.0}}
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0},
    }


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
    parser.add_argument("--archetype", choices=["earth_fortress", "lunar_dual"], default="earth_fortress", help="Архетип для оптимизации (earth_fortress или lunar_dual)")
    parser.add_argument("--iter", type=int, default=15, help="Число поколений эволюции (default: 15)")
    parser.add_argument("--pop", type=int, default=12, help="Размер популяции (default: 12)")
    parser.add_argument("--output", type=str, default="plans/optimized_strategy.json", help="Путь для сохранения JSON-плана")
    args = parser.parse_args()

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

    print(f"=== Запуск оптимизации архетипа '{args.archetype}' ===")
    print(f"Поколений: {args.iter}, Популяция: {args.pop}")
    print(f"Инициализирован экспертный тёплый старт (Warm Start x0)...")

    def fit_call(params):
        return evaluate_candidate(params, decode_fn)

    # Пробуем scipy, если установлен
    try:
        from scipy.optimize import differential_evolution
        scipy_popsize = max(1, args.pop // len(bounds))
        total_pop = scipy_popsize * len(bounds)
        print(f"Используется scipy.optimize.differential_evolution (популяция: {total_pop} особей)...")

        gen_counter = 0
        def scipy_callback(xk, convergence=None):
            nonlocal gen_counter
            gen_counter += 1
            print(f"Поколение {gen_counter:2d}/{args.iter} завершено...", flush=True)

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
    except ImportError as e:
        print(f"scipy не найден в текущем интерпретаторе ({sys.executable}).")
        print("Используется встроенный чистый Python DE...")
        best_vec = run_pure_python_differential_evolution(
            fitness_fn=fit_call,
            bounds=bounds,
            pop_size=args.pop,
            max_iter=args.iter,
            seed=42,
            x0=x0,
        )

    # Итоговый детальный расчёт лучшего плана
    plan_name = f"strategy_{args.archetype}_optimized"
    final_plan = decode_fn(best_vec, plan_id=plan_name)
    final_res = run_engine(final_plan["plan_id"], "BASE", final_plan, run_risk_analysis=True)
    mc = final_res["risk_register"][0] if final_res["risk_register"] else {}
    violations = [c for c in final_res["constraint_checks"] if not c["passed"]]

    print("\n=======================================================")
    print("                РЕЗУЛЬТАТ ОПТИМИЗАЦИИ                  ")
    print("=======================================================")
    print(f"План Feasible (Hard Constraints): {final_res['is_feasible']}")
    print(f"Совокупные затраты (Total Cost):  {final_res['total_cost_mln']:.2f} млн у.е.")
    print(f"Вероятность успеха Монте-Карло:    {mc.get('probability_of_zero_shortage', 0.0) * 100:.1f}%")
    print(f"Медианный дефицит:                 {mc.get('median_shortage_t', 0.0):.2f} т")
    print(f"P95 дефицит:                       {mc.get('p95_shortage_t', 0.0):.2f} т")
    if violations:
        print(f"Нарушения: {violations}")
    else:
        print("Нарушений (Violations):            0 (Все 7 Hard Constraints выполнены!)")
    print("=======================================================\n")

    # Сохранение JSON
    out_dir = os.path.dirname(os.path.abspath(args.output))
    os.makedirs(out_dir, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(final_plan, f, ensure_ascii=False, indent=2)
    print(f"JSON-план успешно сохранён в: {args.output}")

    print(f"\nВы можете добавить эту функцию в 'src/engine/strategies.py':\n")
    print(f"def get_optimized_{args.archetype}_strategy() -> Dict[str, Any]:")
    print(f'    """Оптимизированная стратегия ({args.archetype}) с высокой устойчивостью по Монте-Карло."""')
    print(f"    return {json.dumps(final_plan, ensure_ascii=False, indent=8)}")


if __name__ == "__main__":
    main()
