"""The web adapter exposes the existing daily engine without copying its formulas."""

from pathlib import Path
import shutil

from fastapi.testclient import TestClient

from src.app.api.main import create_app
from src.app.config import Settings
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog


ROOT = Path(__file__).resolve().parents[2]


def direct_result(client, plan, *, risk=False):
    engine = SimulationEngine(CaseCatalog(client.app.state.settings.reference_dir))
    return engine.run(
        plan_id=plan["plan_id"],
        scenario_id=plan["scenario_id"],
        decisions=plan["decisions"],
        run_risk_analysis=risk,
    )


def test_stateless_calc_matches_real_daily_engine(client, plan):
    expected = direct_result(client, plan)

    response = client.post("/api/calc", json=plan)

    assert response.status_code == 200, response.text
    actual = response.json()
    assert actual["inventory_trace"] == expected["inventory_trace"]
    assert actual["source_schedule"] == expected["source_schedule"]
    assert len(actual["inventory_trace"]) == 6 * 365
    assert actual["risk_register"] == []


def test_risk_calc_matches_real_100_run_seed_42_analysis(client, plan):
    expected = direct_result(client, plan, risk=True)

    response = client.post("/api/calc/risk", json=plan)

    assert response.status_code == 200, response.text
    actual = response.json()
    assert actual["inventory_trace"] == expected["inventory_trace"]
    assert actual["risk_register"] == expected["risk_register"]
    assert actual["risk_register"][0]["iterations"] == 100
    assert actual["risk_register"][0]["seed"] == 42


def test_risk_route_is_503_when_injected_adapter_has_no_risk_method(client_factory, plan):
    class CalculateOnlyAdapter:
        def calculate(self, request):
            raise AssertionError("risk endpoint must not fall back to normal calculation")

    response = client_factory(calculation_service=CalculateOnlyAdapter()).post(
        "/api/calc/risk", json=plan
    )

    assert response.status_code == 503
    assert response.json()["code"] == "RISK_ANALYSIS_NOT_AVAILABLE"


def test_default_engine_version_includes_reference_data_and_marks_saved_run_stale(tmp_path, plan):
    reference_dir = tmp_path / "reference"
    shutil.copytree(ROOT / "data", reference_dir)
    project_dir = tmp_path / "projects"

    first_app = create_app(settings=Settings(data_dir=project_dir, reference_dir=reference_dir))
    with TestClient(first_app) as first:
        engine_before = first.get("/api/meta").json()["engine"]
        assert engine_before["engine_id"] == "src.engine.engine.SimulationEngine"
        project = first.post("/api/projects", json={"name": "Versioned", "plan": plan}).json()
        project_id = project["project_id"]
        calculated = first.post(
            f"/api/projects/{project_id}/calculate", json={"expected_revision": 1}
        )
        assert calculated.status_code == 200, calculated.text

    demand_path = reference_dir / "demand.csv"
    demand_path.write_text(
        demand_path.read_text(encoding="utf-8").replace("2035,100,80", "2035,101,80", 1),
        encoding="utf-8",
    )

    second_app = create_app(settings=Settings(data_dir=project_dir, reference_dir=reference_dir))
    with TestClient(second_app) as second:
        engine_after = second.get("/api/meta").json()["engine"]
        assert engine_after["version"] != engine_before["version"]
        reopened = second.get(f"/api/projects/{project_id}")
        assert reopened.status_code == 200, reopened.text
        assert reopened.json()["result_state"] == "stale"
