"""
Набор модульных тестов для расчётного ядра src/engine.
Проверяет динамическую загрузку, посуточную симуляцию, контрольные правила кейса (V01-V10),
стресс-тестирование, Монте-Карло и 3 стратегии развития.
"""

from pathlib import Path
import unittest
from src.engine.loader import CaseCatalog
from src.engine.engine import run_engine
from src.engine.monte_carlo import run_monte_carlo
from src.engine.strategies import (
    get_earth_fortress_strategy,
    get_lunar_pioneer_strategy,
    get_balanced_strategy,
)


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

    def test_earth_fortress_strategy_base(self):
        """Проверка стратегии 1 («Земная крепость») в сценарии BASE."""
        plan = get_earth_fortress_strategy()
        result = run_engine(
            plan_id=plan["plan_id"],
            scenario_id="BASE",
            decisions=plan,
        )
        self.assertEqual(len(result["yearly_balance"]), 6)
        self.assertEqual(len(result["inventory_trace"]), 2190)  # 6 лет * 365 дней
        self.assertGreater(result["total_cost_mln"], 0)
        self.assertEqual(result["assumptions_reference"], "docs/MODEL.md")

        # Проверка отсутствия отрицательного запаса на всем горизонте
        for trace in result["inventory_trace"]:
            self.assertGreaterEqual(trace["closing_inventory_t"], 0.0)

    def test_lunar_pioneer_strategy(self):
        """Проверка стратегии 2 («Лунный прорыв») в BASE и STRESS."""
        plan = get_lunar_pioneer_strategy()
        res_base = run_engine(
            plan_id=plan["plan_id"],
            scenario_id="BASE",
            decisions=plan,
        )
        self.assertEqual(len(res_base["yearly_balance"]), 6)

        # В стрессе недопоставка Луны не ломает расчет
        res_stress = run_engine(
            plan_id=plan["plan_id"],
            scenario_id="MANDATORY_STRESS",
            decisions=plan,
        )
        self.assertEqual(len(res_stress["yearly_balance"]), 6)
        # В стрессе затраты должны измениться из-за шока спроса и цен
        self.assertNotEqual(res_base["total_cost_mln"], res_stress["total_cost_mln"])

    def test_balanced_dual_strategy(self):
        """Проверка стратегии 3 («Сбалансированный дуальный контур»)."""
        plan = get_balanced_strategy()
        result = run_engine(
            plan_id=plan["plan_id"],
            scenario_id="BASE",
            decisions=plan,
        )
        self.assertEqual(len(result["yearly_balance"]), 6)
        self.assertIn("constraint_checks", result)

    def test_take_or_pay_v03(self):
        """Контрольный тест V03: Take-or-pay threshold."""
        plan = {
            "capacity_reservations": [
                {"year": 2035, "source_id": "A", "reserved_capacity_t": 100.0}
            ],
            "supply_orders": [
                {"year": 2035, "source_id": "A", "order_volume_t": 50.0}
            ],
            "investments": [],
            "inventory_policy": {"initial_inventory_t": 15.0}
        }
        res = run_engine("test_top", "BASE", plan)
        # Для Earth-Core (A) TOP share = 0.70. При заказе 50 и брони 100 оплачивается 70 т.
        sched_a = [s for s in res["source_schedule"] if s["year"] == 2035 and (s["source_id"] == "Earth-Core" or s["source_id"] == "A")][0]
        self.assertEqual(sched_a["ordered_t"], 50.0)
        # Take-or-pay минимум = 70.0
        # Стоимость закупки = 70.0 * 6.2 = 434.0
        self.assertEqual(sched_a["procurement_cost_mln"], 434.0)

    def test_monte_carlo_bernoulli(self):
        """Проверка вероятностного модуля Монте-Карло."""
        plan = get_balanced_strategy()
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
