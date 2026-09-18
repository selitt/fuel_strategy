import unittest
from fastapi.testclient import TestClient
from src.app.api.main import app


class TestCalcApi(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_calc_success(self):
        payload = {"a": 10.0, "b": 20.0, "c": 30.0}
        response = self.client.post("/api/calc", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("points", data)
        self.assertEqual(data["points"], [10.0, 20.0, 30.0, 60.0])

    def test_calc_validation_error(self):
        payload = {"a": "invalid"}
        response = self.client.post("/api/calc", json=payload)
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
