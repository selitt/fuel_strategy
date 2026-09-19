"""
Набор модульных тестов для расчётного ядра src/engine.
Проверяет динамическую загрузку, посуточную симуляцию, помесячное планирование партий,
контрольные правила кейса (V01-V10), стресс-тестирование, Монте-Карло и оптимизированные стратегии.
"""

from pathlib import Path
import unittest
from src.engine.calendar import PlanValidationError
from src.engine.loader import CaseCatalog
from src.engine.engine import run_engine
from src.engine.monte_carlo import run_monte_carlo
from src.engine.strategies import (
    make_monthly_batches,
    get_earth_fortress_strategy,
    get_lunar_pioneer_strategy,
    get_balanced_strategy,
    get_optimal_resilient_strategy,
    get_stress_resilient_strategy,
)
from src.engine.optimize import decode_params_to_plan, evaluate_fitness, WARM_START_X0


class TestEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = CaseCatalog()

    def test_catalog_loaded_dynamically(self):
        """Проверка динамической загрузки всех таблиц без хардкода."""
        self.assertGreaterEqual(len(self.catalog.demands), 6)
        self.assertIn("Earth-Core", self.catalog.sources)
        self.assertIn("A", self.catalog.sources)
        self.assertIn("BASE", self.catalog.storages)
        self.assertIn("ZBO", self.catalog.storages)
        self.assertIn("LUNAR_ISRU", self.catalog.investments)
        self.assertGreaterEqual(len(self.catalog.constraints), 7)

    def test_default_catalog_uses_the_root_data_directory(self):
        root = Path(__file__).resolve().parents[1]
        self.assertEqual(self.catalog.data_root.resolve(), (root / "data").resolve())

    @staticmethod
    def dated_plan():
        return {
            "plan_id": "dated-engine-test",
            "capacity_reservations": [
                {"year": 2035, "source_id": "A", "reserved_capacity_t": 10.0},
                {"year": 2038, "source_id": "A", "reserved_capacity_t": 10.0},
            ],
            "supply_orders": [
                {
                    "year": 2035,
                    "source_id": "A",
                    "order_t": 5.0,
                    "delivery_date": "2035-05-01",
                    "batch_id": "core-2035",
                },
                {
                    "year": 2038,
                    "source_id": "A",
                    "order_t": 5.0,
                    "delivery_date": "2038-05-01",
                    "batch_id": "core-2038",
                },
            ],
            "investments": [],
            "inventory_policy": {"initial_inventory_t": 0.0},
        }

    def test_dated_plan_runs_daily_balance(self):
        plan = self.dated_plan()
        result = run_engine(plan["plan_id"], "BASE", plan)
        self.assertEqual(len(result["yearly_balance"]), 6)
        self.assertEqual(len(result["inventory_trace"]), 2190)  # 6 лет * 365 дней
        self.assertGreater(result["total_cost_mln"], 0)
        self.assertEqual(result["assumptions_reference"], "docs/MODEL.md")

        # Проверка отсутствия отрицательного запаса на всем горизонте
        for trace in result["inventory_trace"]:
            self.assertGreaterEqual(trace["closing_inventory_t"], 0.0)

    def test_dated_plan_runs_base_and_mandatory_stress(self):
        plan = self.dated_plan()
        res_base = run_engine(
            plan_id=plan["plan_id"],
            scenario_id="BASE",
            decisions=plan,
        )
        self.assertEqual(len(res_base["yearly_balance"]), 6)

        res_stress = run_engine(
            plan_id=plan["plan_id"],
            scenario_id="MANDATORY_STRESS",
            decisions=plan,
        )
        self.assertEqual(len(res_stress["yearly_balance"]), 6)
        # Поставка Core 2038 использует стрессовый ценовой множитель.
        self.assertNotEqual(res_base["total_cost_mln"], res_stress["total_cost_mln"])

    def test_legacy_builtin_strategies_require_operator_assigned_dates(self):
        """Планы без дат и идентификаторов партий блокируются валидатором."""
        for factory in (
            get_earth_fortress_strategy,
            get_lunar_pioneer_strategy,
            get_balanced_strategy,
        ):
            plan = factory(monthly=False)
            with self.subTest(plan=plan["plan_id"]):
                with self.assertRaises(PlanValidationError):
                    run_engine(plan["plan_id"], "BASE", plan)

    def test_monthly_strategies_execute_daily_balance(self):
        """Все 5 стратегий по умолчанию формируют датированные помесячные партии и успешно симулируются."""
        strategies = [
            ("Earth Fortress", get_earth_fortress_strategy(), "BASE"),
            ("Lunar Pioneer", get_lunar_pioneer_strategy(), "BASE"),
            ("Balanced Dual", get_balanced_strategy(), "BASE"),
            ("Optimal Resilient", get_optimal_resilient_strategy(), "BASE"),
            ("Stress Resilient", get_stress_resilient_strategy(), "MANDATORY_STRESS"),
        ]
        for name, plan, scen in strategies:
            with self.subTest(strategy=name):
                res = run_engine(plan["plan_id"], scen, plan)
                self.assertEqual(len(res["yearly_balance"]), 6)
                self.assertEqual(len(res["inventory_trace"]), 2190)
                self.assertGreater(len(plan["supply_orders"]), 100)

    def test_optimal_resilient_strategy_feasibility_and_mc(self):
        """Оптимальная стратегия в BASE: 100% выполнимость, MC zero shortage >= 90%."""
        plan = get_optimal_resilient_strategy()
        res = run_engine(plan["plan_id"], "BASE", plan)
        self.assertTrue(res["is_feasible"], "Оптимальная стратегия должна выполнять все жесткие ограничения")
        self.assertLess(res["total_cost_mln"], 12000.0)

        mc = run_monte_carlo(self.catalog, "BASE", plan, iterations=100, seed=42)
        self.assertGreaterEqual(mc["probability_of_no_shortage"], 0.90)
        self.assertLessEqual(mc["p95_shortage_t"], 5.0)

    def test_stress_resilient_strategy_feasibility_and_mc(self):
        """Стресс-стратегия в MANDATORY_STRESS: 100% выполнимость, MC zero shortage >= 90%, P95 = 0.00 т."""
        plan = get_stress_resilient_strategy()
        res = run_engine(plan["plan_id"], "MANDATORY_STRESS", plan)
        self.assertTrue(res["is_feasible"], "Стресс-стратегия должна выполнять все жесткие ограничения в MANDATORY_STRESS")

        mc = run_monte_carlo(self.catalog, "MANDATORY_STRESS", plan, iterations=100, seed=42)
        self.assertGreaterEqual(mc["probability_of_zero_shortage"], 0.90)
        self.assertEqual(mc["p95_shortage_t"], 0.0)

    def test_optimize_fitness_function_on_monthly_plan(self):
        """Оптимизатор генерирует помесячные партии и успешно оценивает целевую функцию."""
        plan = decode_params_to_plan(WARM_START_X0)
        self.assertGreaterEqual(len(plan["supply_orders"]), 100)
        fitness = evaluate_fitness(WARM_START_X0, mc_iterations=10)
        self.assertLess(fitness, 20000.0, "Фитнес начального приближения не должен иметь штрафов за нарушения")

    def test_take_or_pay_v03(self):
        """Контрольный тест V03: Take-or-pay threshold."""
        plan = {
            "capacity_reservations": [
                {"year": 2035, "source_id": "A", "reserved_capacity_t": 100.0}
            ],
            "supply_orders": [
                {
                    "year": 2035,
                    "source_id": "A",
                    "order_t": 50.0,
                    "delivery_date": "2035-06-01",
                    "batch_id": "top-2035",
                }
            ],
            "investments": [],
            "inventory_policy": {"initial_inventory_t": 15.0}
        }
        res = run_engine("test_top", "BASE", plan)
        sched_a = [s for s in res["source_schedule"] if s["year"] == 2035 and (s["source_id"] == "Earth-Core" or s["source_id"] == "A")][0]
        self.assertEqual(sched_a["ordered_t"], 50.0)
        self.assertEqual(sched_a["procurement_cost_mln"], 434.0)

    def test_v05_reservation_payment(self):
        """Контрольный тест V05: плата за резервирование."""
        plan = {
            "capacity_reservations": [
                {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 100.0}
            ],
            "supply_orders": [
                {"year": 2035, "source_id": "Earth-Core", "order_t": 80.0, "delivery_date": "2035-06-01", "batch_id": "res-b1"}
            ],
            "investments": [],
            "inventory_policy": {"initial_inventory_t": 15.0}
        }
        res = run_engine("test_res", "BASE", plan)
        sched_a = [s for s in res["source_schedule"] if s["year"] == 2035 and (s["source_id"] == "Earth-Core" or s["source_id"] == "A")][0]
        # Earth-Core reservation rate = 0.45 млн/т-год -> 100 * 0.45 = 45.0 млн
        self.assertEqual(sched_a["reservation_cost_mln"], 45.0)

    def test_monte_carlo_bernoulli(self):
        """Проверка вероятностного модуля Монте-Карло."""
        plan = self.dated_plan()
        mc_summary = run_monte_carlo(
            catalog=self.catalog,
            scenario_id="BASE",
            decisions=plan,
            iterations=50,
            seed=42,
        )
        self.assertEqual(mc_summary["risk_id"], "R_LAUNCH_FAILURE_MONTE_CARLO")
        self.assertIn("probability_of_zero_shortage", mc_summary)
        self.assertIn("p95_shortage_t", mc_summary)


if __name__ == "__main__":
    unittest.main()
