from copy import deepcopy
import csv
import io
import json
from pathlib import Path
import zipfile

from jsonschema import Draft202012Validator

from conftest import create_project

ROOT = Path(__file__).resolve().parents[2]


def calculated_project(client, plan):
    project = create_project(client, plan)
    response = client.post(f'/api/projects/{project["project_id"]}/calculate', json={"expected_revision": 1})
    assert response.status_code == 200, response.text
    return response.json()


def test_plan_download_matches_input_and_organizer_schema(client, plan):
    response = client.post("/api/plans/export", json=plan)
    assert response.status_code == 200, response.text
    assert "attachment" in response.headers["content-disposition"]
    assert response.json() == plan
    schema = json.loads((ROOT / "data/schemas/plan.schema.json").read_text())
    Draft202012Validator(schema).validate(response.json())


def test_result_json_retains_all_values_and_carries_prototype_provenance(client, plan):
    project = calculated_project(client, plan)
    url = f'/api/projects/{project["project_id"]}/result/export'
    response = client.get(url, params={"format": "json"})
    assert response.status_code == 200, response.text
    result = response.json()
    schema = json.loads((ROOT / "data/schemas/export.schema.json").read_text())
    Draft202012Validator(schema).validate(result)
    metadata = result.pop("_web_export")
    assert metadata["input_hash"] == project["last_run"]["input_hash"]
    assert metadata["engine"]["model_verified"] is False
    assert metadata["engine"]["status"] == "prototype"
    assert result == project["last_run"]["result"]


def test_csv_zip_matches_saved_result_and_keeps_empty_tables_explicit(client, plan):
    project = calculated_project(client, plan)
    response = client.get(f'/api/projects/{project["project_id"]}/result/export?format=csv')
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        assert {"yearly_balance.csv", "financial_breakdown.csv", "risk_register.csv", "metadata.json", "plan.json", "result.json"} <= set(archive.namelist())
        result = json.loads(archive.read("result.json"))
        result.pop("_web_export")
        assert result == project["last_run"]["result"]
        assert json.loads(archive.read("plan.json")) == plan
        rows = list(csv.DictReader(io.StringIO(archive.read("financial_breakdown.csv").decode("utf-8-sig"))))
        assert float(rows[0]["total"]) == project["last_run"]["result"]["financial_breakdown"][0]["total"]
        assert rows[0]["export_scenario_id"] == plan["scenario_id"]
        metadata = json.loads(archive.read("metadata.json"))
        assert metadata["units"] == project["last_run"]["result"]["units"]
        assert metadata["table_rows"]["risk_register"] == 0
        assert metadata["warnings"]
        assert list(csv.DictReader(io.StringIO(archive.read("risk_register.csv").decode("utf-8-sig")))) == []


def test_no_automatic_recalculation_during_export(client_factory, plan):
    from src.app.service.calc_service import CalculationService
    class Service:
        calls = 0
        def calculate(self, request):
            self.calls += 1
            return CalculationService().calculate(request)
    service = Service()
    client = client_factory(calculation_service=service)
    project = calculated_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    assert service.calls == 1
    assert client.get(url + "/result/export?format=csv").status_code == 200
    assert client.get(url + "/result/export?format=json").status_code == 200
    assert service.calls == 1


def test_stale_result_cannot_be_exported_as_current(client, plan):
    project = calculated_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    changed = deepcopy(plan)
    changed["scenario_id"] = "MANDATORY_STRESS"
    client.put(url, json={"name": "stress", "plan": changed, "expected_revision": project["revision"]})
    assert client.get(url + "/result/export?format=csv").status_code == 409
    # Saving the whole project, including an explicitly stale snapshot, is allowed.
    assert client.get(url + "/export").json()["result_state"] == "stale"


def test_project_file_reopens_as_new_id_with_imported_unverified_origin(client, plan):
    original = calculated_project(client, plan)
    response = client.get(f'/api/projects/{original["project_id"]}/export')
    assert response.status_code == 200
    imported = client.post("/api/projects/import", files={"file": ("project.json", response.content, "application/json")})
    assert imported.status_code == 201, imported.text
    project = imported.json()
    assert project["project_id"] != original["project_id"]
    assert project["revision"] == 1
    assert project["plan"] == original["plan"]
    assert project["last_run"]["result"] == original["last_run"]["result"]
    assert project["last_run"]["origin"] == "imported"
    assert project["last_run"]["engine"]["model_verified"] is False
    assert project["last_run"]["engine"]["status"] == "unverified"
    assert client.get(f'/api/projects/{original["project_id"]}').json() == original


def test_tampered_imported_snapshot_hash_is_rejected(client, plan):
    project = calculated_project(client, plan)
    project["last_run"]["plan_snapshot"]["plan_id"] = "altered"
    project["last_run"]["result"]["plan_id"] = "altered"
    response = client.post("/api/projects/import", files={"file": ("project.json", json.dumps(project).encode())})
    assert response.status_code == 422
    assert client.get("/api/projects").json()["total"] == 1


def test_comparison_returns_saved_results_not_an_invented_recommendation(client, plan):
    base = calculated_project(client, plan)
    stress_plan = deepcopy(plan)
    stress_plan["scenario_id"] = "MANDATORY_STRESS"
    stress = calculated_project(client, stress_plan)
    response = client.post("/api/projects/compare", json={"project_ids": [base["project_id"], stress["project_id"]]})
    assert response.status_code == 200, response.text
    value = response.json()
    assert value["items"][0]["run"]["result"] == base["last_run"]["result"]
    assert value["items"][1]["run"]["result"] == stress["last_run"]["result"]
    assert "winner" not in value
    assert value["warnings"]
    assert client.post("/api/projects/compare", json={"project_ids": [base["project_id"], base["project_id"]]}).status_code == 422


def test_csv_cells_are_neutralized_but_json_is_lossless(client, plan):
    # The project import API is a realistic way user-provided strings reach CSV.
    project = calculated_project(client, plan)
    strings = ["=HYPERLINK(\"https://example.invalid\")", " +1+1", "@SUM(1)", "\tcmd", "-formula"]
    project["last_run"]["result"]["risk_register"] = [{"label": text} for text in strings]
    response = client.post("/api/projects/import", files={"file": ("project.json", json.dumps(project).encode())})
    assert response.status_code == 201, response.text
    imported = response.json()
    archive_response = client.get(f'/api/projects/{imported["project_id"]}/result/export?format=csv')
    assert archive_response.status_code == 200
    with zipfile.ZipFile(io.BytesIO(archive_response.content)) as archive:
        rows = list(csv.DictReader(io.StringIO(archive.read("risk_register.csv").decode("utf-8-sig"))))
        assert all(row["label"].startswith("'") for row in rows)
        original = json.loads(archive.read("result.json"))
        assert [row["label"] for row in original["risk_register"]] == strings
