"""The web adapter exposes the existing daily engine without copying its formulas."""

from pathlib import Path
import shutil

from fastapi.testclient import TestClient

from src.app.main import create_app
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
    risk = actual["risk_register"][0]
    assert len(risk['total_cost_samples_mln']) == 100
    assert len(risk['emergency_procurement_samples_mln']) == 100
    assert 0 <= risk['probability_of_all_constraints'] <= 1
    assert all(total >= rescue >= 0 for total, rescue in zip(
        risk['total_cost_samples_mln'], risk['emergency_procurement_samples_mln']))
    assert risk['mean_total_cost_mln'] == round(sum(risk['total_cost_samples_mln']) / 100, 2)
    assert risk['p95_total_cost_mln'] == sorted(risk['total_cost_samples_mln'])[94]
    samples = sorted(risk["shortage_samples_t"])
    assert len(samples) == 100
    assert risk["median_shortage_t"] == round((samples[49] + samples[50]) / 2, 2)
    assert risk["p95_shortage_t"] == samples[94]
    assert risk["max_shortage_t"] == samples[-1]
    bins = risk["shortage_histogram"]
    assert sum(row["count"] for row in bins) == 100
    for index, row in enumerate(bins):
        observed = sum(row["lower_t"] <= value and
                       (value <= row["upper_t"] if index == len(bins)-1 else value < row["upper_t"])
                       for value in samples)
        assert row["count"] == observed
    assert risk["probability_of_no_shortage"] == risk["zero_shortage_runs"] / 100
    assert risk["probability_of_zero_shortage"] == risk["successful_runs"] / 100
    assert risk["successful_runs"] <= risk["zero_shortage_runs"]
    trajectories = risk["daily_trajectories"]
    assert len(trajectories["runs"]) == 100
    assert len(trajectories["days"]) == 2190
    assert trajectories["days"][0] == {"day": 0, "year": 2035, "day_of_year": 1}
    assert trajectories["days"][-1] == {"day": 2189, "year": 2040, "day_of_year": 365}
    for metric in ("inventory_t", "shortage_t"):
        band = trajectories["bands"][metric]
        for day_index in range(2190):
            values = sorted(run[metric][day_index] for run in trajectories["runs"])
            assert band["p05"][day_index] == values[4]
            assert band["median"][day_index] == round((values[49] + values[50]) / 2, 2)
            assert band["p95"][day_index] == values[94]



def test_risk_route_is_503_when_injected_adapter_has_no_risk_method(client_factory, plan):
    class CalculateOnlyAdapter:
        def calculate(self, request):
            raise AssertionError("risk endpoint must not fall back to normal calculation")

    response = client_factory(calculation_service=CalculateOnlyAdapter()).post(
        "/api/calc/risk", json=plan
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Анализ рисков не подключён"}


def test_two_app_instances_calculate_from_their_own_reference_directories(tmp_path, plan):
    first_reference = tmp_path / "first-reference"
    second_reference = tmp_path / "second-reference"
    shutil.copytree(ROOT / "data", first_reference)
    shutil.copytree(ROOT / "data", second_reference)
    second_demand = second_reference / "demand.csv"
    second_demand.write_text(
        second_demand.read_text(encoding="utf-8").replace("2035,100,80", "2035,101,80", 1),
        encoding="utf-8",
    )

    first_app = create_app(settings=Settings(
        data_dir=tmp_path / "first-projects", reference_dir=first_reference,
    ))
    second_app = create_app(settings=Settings(
        data_dir=tmp_path / "second-projects", reference_dir=second_reference,
    ))

    with TestClient(first_app) as first, TestClient(second_app) as second:
        first_result = first.post("/api/calc", json=plan)
        second_result = second.post("/api/calc", json=plan)
        first_again = first.post("/api/calc", json=plan)

    assert first_result.status_code == 200, first_result.text
    assert second_result.status_code == 200, second_result.text
    assert first_again.status_code == 200, first_again.text
    assert first_result.json()["yearly_balance"][0]["demand_total_t"] == 100
    assert second_result.json()["yearly_balance"][0]["demand_total_t"] == 101
    assert first_again.json()["yearly_balance"][0]["demand_total_t"] == 100


def test_default_engine_version_hashes_adapter_engine_and_reference_inputs(tmp_path, monkeypatch):
    from src.app import main

    root = tmp_path / "root"
    tracked = {
        root / "src/engine/engine.py": "engine-v1\n",
        root / "src/app/service/calc_service.py": "adapter-v1\n",
        root / "src/app/dto/calc_dto.py": "contract-v1\n",
        root / "reference/demand.csv": "year,base_total_t\n2035,100\n",
        root / "reference/scenarios/base.yaml": "scenario_id: BASE\n",
    }
    for path, contents in tracked.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents, encoding="utf-8")
    monkeypatch.setattr(main, "ROOT", root)
    reference_dir = root / "reference"
    baseline = main._default_engine_version(reference_dir)

    for path in (
        root / "src/engine/engine.py",
        root / "src/app/service/calc_service.py",
        root / "src/app/dto/calc_dto.py",
        reference_dir / "demand.csv",
        reference_dir / "scenarios/base.yaml",
    ):
        original = path.read_text(encoding="utf-8")
        path.write_text(original + "changed\n", encoding="utf-8")
        assert main._default_engine_version(reference_dir) != baseline, path
        path.write_text(original, encoding="utf-8")
        assert main._default_engine_version(reference_dir) == baseline, path


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
