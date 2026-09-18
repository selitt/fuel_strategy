import unittest
from fastapi.testclient import TestClient
from src.app.api.main import app


class TestCalcApi(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_template(self):
        """Проверка эндпоинта получения шаблона плана."""
        response = self.client.get("/api/calc/template")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("plan_id", data)
        self.assertIn("scenario_id", data)
        self.assertIn("decisions", data)
        self.assertIn("supply_orders", data["decisions"])
        self.assertIn("capacity_reservations", data["decisions"])

    def test_calc_success(self):
        """Проверка расчёта плана по схеме plan.schema.json -> export.schema.json."""
        payload = {
            "plan_id": "test-run-1",
            "scenario_id": "BASE",
            "decisions": {
                "supply_orders": [
                    {"year": 2035, "source_id": "Earth-Core", "order_t": 100.0},
                    {"year": 2036, "source_id": "Earth-Core", "order_t": 140.0},
                ],
                "capacity_reservations": [
                    {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 120.0},
                    {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 150.0},
                ],
                "investments": [
                    {"investment_id": "ZBO", "year": 2036}
                ],
                "inventory_policy": {
                    "initial_inventory_t": 12.33
                }
            }
        }
        response = self.client.post("/api/calc", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Проверка соответствия схеме export.schema.json
        self.assertEqual(data["plan_id"], "test-run-1")
        self.assertEqual(data["scenario_id"], "BASE")
        self.assertIn("yearly_balance", data)
        self.assertIn("financial_breakdown", data)
        self.assertIn("constraint_checks", data)
        self.assertIn("source_schedule", data)
        self.assertEqual(len(data["yearly_balance"]), 6)  # 2035-2040

    def test_calc_validation_error(self):
        """Проверка валидации некорректного входного тела."""
        payload = {"plan_id": "broken", "decisions": "not_an_object"}
        response = self.client.post("/api/calc", json=payload)
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
