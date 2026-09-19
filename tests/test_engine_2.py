"""
Набор модульных и интеграционных тестов для расчётного ядра src/engine.
Проверяет динамическую загрузку, посуточную симуляцию, жесткие ограничения (Hard Constraints V01-V07),
физические лимиты бака, Take-or-pay, стресс-сценарий, Монте-Карло и 3 стратегии развития.
"""

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
        """Инициализация каталога данных кейса один раз для всех тестов."""
        cls.catalog = CaseCatalog()

    # =========================================================================
    # 1. ЗАГРУЗКА ДАННЫХ И СТРАТЕГИИ
    # =========================================================================

    def test_catalog_loaded_dynamically(self):
        """Проверка динамической загрузки всех таблиц без хардкода."""
        self.assertGreaterEqual(len(self.catalog.demands), 6)
        self.assertIn("Earth-Core", self.catalog.sources)
        self.assertIn("A", self.catalog.sources)
        self.assertIn("BASE", self.catalog.storages)
        self.assertIn("ZBO", self.catalog.storages)
        self.assertIn("LUNAR_ISRU", self.catalog.investments)
        self.assertGreaterEqual(len(self.catalog.constraints), 7)

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

    # =========================================================================
    # 2. ЖЕСТКИЕ ТЕСТЫ ФИЗИКИ, ЭКОНОМИКИ И ОГРАНИЧЕНИЙ (HARD CONSTRAINTS)
    # =========================================================================

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
        sched_a = [
            s for s in res["source_schedule"]
            if s["year"] == 2035 and (s["source_id"] == "Earth-Core" or s["source_id"] == "A")
        ][0]
        self.assertEqual(sched_a["ordered_t"], 50.0)
        self.assertEqual(sched_a["procurement_cost_mln"], 434.0)

    def test_storage_overflow_strict_clamping(self):
        """Стресс-тест переполнения бака: излишек стравливается, лимит 70 т не нарушается."""
        plan = {
            "inventory_policy": {"initial_inventory_t": 68.0},
            "investments": [],  # ZBO нет -> объем бака строго 70 т
            "supply_orders": [
                {"year": 2035, "source_id": "Earth-Core", "order_volume_t": 180.0}
            ],
            "capacity_reservations": [
                {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 190.0}
            ]
        }
        res = run_engine("test_overflow", "BASE", plan)

        # Должно быть зафиксировано нарушение STORAGE_OVERFLOW и план признан невалидным
        overflow_checks = [c for c in res["constraint_checks"] if c["constraint_id"] == "STORAGE_OVERFLOW"]
        self.assertGreater(len(overflow_checks), 0)
        self.assertFalse(res["is_feasible"])

        # Физический остаток в любой день симуляции не должен превышать 70 т
        for trace in res["inventory_trace"]:
            if trace["year"] == 2035:
                self.assertLessEqual(trace["closing_inventory_t"], 70.0 + 1e-6)

    def test_critical_demand_strict_priority(self):
        """Тест приоритета критического спроса: при дефиците коммерческий спрос падает до нуля."""
        plan = {
            "inventory_policy": {"initial_inventory_t": 0.05},  # Практически пустой бак
            "investments": [],
            "supply_orders": [],  # Поставок нет
            "capacity_reservations": []
        }
        res = run_engine("test_crit_priority", "BASE", plan)

        # В день 0 остаток 0.05 т: критический спрос получит всё, коммерческий — 0
        day_0 = res["inventory_trace"][0]
        self.assertAlmostEqual(day_0["served_critical_t"], 0.05, places=4)
        self.assertAlmostEqual(day_0["served_total_t"], 0.05, places=4)
        self.assertGreater(day_0["shortage_t"], 0.0)
        self.assertAlmostEqual(day_0["closing_inventory_t"], 0.0, places=4)

    def test_zbo_commissioning_loss_and_capacity_jump(self):
        """Тест переключения режима потерь и емкости бака при вводе ZBO в 2036 году."""
        plan = {
            "inventory_policy": {"initial_inventory_t": 50.0},
            "investments": [{"investment_id": "ZBO", "commissioning_year": 2036}],
            "supply_orders": [
                {"year": 2035, "source_id": "Earth-Core", "order_volume_t": 60.0},
                {"year": 2036, "source_id": "Earth-Core", "order_volume_t": 60.0},
            ],
            "capacity_reservations": [
                {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 100.0},
                {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 100.0},
            ]
        }
        res = run_engine("test_zbo_jump", "BASE", plan)
        bal_2035 = [b for b in res["yearly_balance"] if b["year"] == 2035][0]
        bal_2036 = [b for b in res["yearly_balance"] if b["year"] == 2036][0]

        # 2035: бак 70 т, потери 4.5% (60 * 0.045 = 2.7 т)
        self.assertAlmostEqual(bal_2035["losses_t"], 2.7, delta=0.05)
        # 2036: бак 120 т, потери 1.2% (60 * 0.012 = 0.72 т)
        self.assertAlmostEqual(bal_2036["losses_t"], 0.72, delta=0.05)

        trace_2035 = [t for t in res["inventory_trace"] if t["year"] == 2035][0]
        trace_2036 = [t for t in res["inventory_trace"] if t["year"] == 2036][0]
        self.assertEqual(trace_2035["storage_capacity_t"], 70.0)
        self.assertEqual(trace_2036["storage_capacity_t"], 120.0)

    def test_reserve_45d_rule_violation(self):
        """Тест нарушения RESERVE_45D при недостаточном остатке на 1 января."""
        # Задаем мизерный начальный остаток (1.0 т), заведомо ниже 45-дневной нормы 2035 года
        plan = {
            "inventory_policy": {"initial_inventory_t": 1.0},
            "investments": [],
            "supply_orders": [{"year": 2035, "source_id": "Earth-Core", "order_volume_t": 100.0}],
            "capacity_reservations": [{"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 100.0}]
        }
        res = run_engine("test_reserve_45d", "BASE", plan)

        self.assertFalse(res["is_feasible"])
        r45_failed = [c for c in res["constraint_checks"] if c["constraint_id"] == "RESERVE_45D" and not c["passed"]]
        self.assertGreater(len(r45_failed), 0)

    def test_channel_capacity_exceeded_rule(self):
        """Тест нарушения CAPACITY_EXCEEDED: бронь превышает пропускную способность канала."""
        # Earth-Core имеет предел 190.0 т/год; пробуем забронировать 250.0 т
        plan = {
            "inventory_policy": {"initial_inventory_t": 15.0},
            "investments": [],
            "supply_orders": [{"year": 2035, "source_id": "Earth-Core", "order_volume_t": 100.0}],
            "capacity_reservations": [{"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 250.0}]
        }
        res = run_engine("test_capacity_limit", "BASE", plan)

        self.assertFalse(res["is_feasible"])
        cap_checks = [c for c in res["constraint_checks"] if c["constraint_id"] == "CAPACITY_EXCEEDED" and not c["passed"]]
        self.assertGreater(len(cap_checks), 0)
        self.assertEqual(cap_checks[0]["excess"], 60.0)  # 250 - 190

    def test_emergency_streak_rule_violation(self):
        """Тест правила EMERGENCY_BASE_STREAK: запрет доминирования Emergency > 2 лет подряд."""
        plan = {
            "inventory_policy": {"initial_inventory_t": 15.0},
            "investments": [],
            "supply_orders": [
                {"year": 2035, "source_id": "Emergency", "order_volume_t": 100.0},
                {"year": 2036, "source_id": "Emergency", "order_volume_t": 140.0},
                {"year": 2037, "source_id": "Emergency", "order_volume_t": 190.0},
            ],
            "capacity_reservations": [
                {"year": 2035, "source_id": "Emergency", "reserved_capacity_t": 100.0},
                {"year": 2036, "source_id": "Emergency", "reserved_capacity_t": 140.0},
                {"year": 2037, "source_id": "Emergency", "reserved_capacity_t": 190.0},
            ]
        }
        res = run_engine("test_emer_streak", "BASE", plan)

        self.assertFalse(res["is_feasible"])
        streak_check = [c for c in res["constraint_checks"] if c["constraint_id"] == "EMERGENCY_BASE_STREAK"][0]
        self.assertFalse(streak_check["passed"])
        self.assertGreaterEqual(streak_check["excess"], 1.0)

    def test_capex_limit_2037_exceeded(self):
        """Тест превышения лимита инвестиций к концу 2037 года (CAPEX_2037 <= 1800 млн)."""
        plan = {
            "inventory_policy": {"initial_inventory_t": 15.0},
            "investments": [
                {"investment_id": "ZBO", "commissioning_year": 2036},  # 180 млн
                {"investment_id": "EARTH_NEW", "option_year": 2036, "exercise_year": 2037},  # 90 + 270 = 360 млн
                {"investment_id": "LUNAR_ISRU", "commissioning_year": 2038, "capex_schedule": {2036: 800.0, 2037: 800.0}}  # 1600 млн
            ],  # Суммарно к концу 2037: 180 + 360 + 1600 = 2140 млн > 1800 млн
            "supply_orders": [],
            "capacity_reservations": []
        }
        res = run_engine("test_capex_limit", "BASE", plan)

        self.assertFalse(res["is_feasible"])
        capex_check = [c for c in res["constraint_checks"] if c["constraint_id"] == "CAPEX_2037"][0]
        self.assertFalse(capex_check["passed"])
        self.assertEqual(capex_check["excess"], 340.0)  # 2140 - 1800


if __name__ == "__main__":
    unittest.main()
