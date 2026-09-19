import json
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]


def resolve(value, document):
    if isinstance(value, dict):
        if "$ref" in value:
            result = document
            for part in value["$ref"][2:].split("/"):
                result = result[part]
            return resolve(result, document)
        return {key: resolve(item, document) for key, item in value.items()
                if key not in {"title", "description"}}
    if isinstance(value, list):
        return [resolve(item, document) for item in value]
    return value


def test_legacy_operations_and_payload_schemas_are_preserved(client):
    baseline = yaml.safe_load((ROOT / "src/app/api/KosmoAPI.yaml").read_text())
    live = client.get("/openapi.json").json()
    for path, methods in baseline["paths"].items():
        for method, expected in methods.items():
            actual = live["paths"][path][method]
            assert actual["operationId"] == expected["operationId"]
            assert resolve(actual["responses"]["200"], live) == resolve(expected["responses"]["200"], baseline)
            if "requestBody" in expected:
                assert resolve(actual["requestBody"], live) == resolve(expected["requestBody"], baseline)


def test_actual_calculation_conforms_to_organizer_envelope(client, plan):
    response = client.post("/api/calc", json=plan)
    assert response.status_code == 200, response.text
    assert response.headers["x-engine-status"] == "prototype"
    assert response.headers["x-model-verified"] == "false"
    schema = json.loads((ROOT / "data/schemas/export.schema.json").read_text())
    Draft202012Validator(schema).validate(response.json())
    assert response.json()["plan_id"] == plan["plan_id"]
    assert len(response.json()["yearly_balance"]) == 6


def test_health_and_metadata_do_not_claim_verified_model(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["engine"]["status"] == "prototype"
    assert health.json()["engine"]["model_verified"] is False
    meta = client.get("/api/meta").json()
    assert meta["plan_import_formats"] == ["json"]
    assert meta["background_jobs"] is False
    assert meta["engine"]["limitations"]


def test_original_schema_is_served_without_changes(client):
    expected = json.loads((ROOT / "data/schemas/plan.schema.json").read_text())
    assert client.get("/api/schemas/plan").json() == expected
    assert client.get("/api/schemas/no-such-schema").status_code == 422


def test_catalog_reads_source_files_with_provenance(client):
    result = client.get("/api/catalog")
    assert result.status_code == 200, result.text
    data = result.json()
    assert data["read_only"] is True
    assert {item["table_id"] for item in data["tables"]} == {
        "demand", "supply_sources", "storage_options", "investment_options", "constraints"}
    sources = next(item for item in data["tables"] if item["table_id"] == "supply_sources")
    assert sources["rows"][0]["source_id"] == "A"
    assert sources["rows"][0]["capacity_t_per_year"] == "190"
    assert len(sources["sha256"]) == 64
    assert {item["scenario_id"] for item in data["scenarios"]} == {"BASE", "MANDATORY_STRESS"}


def test_validation_errors_keep_fastapi_detail_shape(client):
    response = client.post("/api/calc", json={"decisions": "broken"})
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)
    assert response.json()["detail"][0]["loc"] == ["body", "decisions"]
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert response.json()["request_id"] == response.headers["x-request-id"]


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf"), "Infinity"])
def test_non_finite_values_are_rejected_without_server_error(client, plan, value):
    plan["decisions"]["inventory_policy"]["initial_inventory_t"] = value
    response = client.post("/api/calc", content=json.dumps(plan), headers={"content-type": "application/json"})
    assert response.status_code == 422, response.text
    assert isinstance(response.json()["detail"], list)


def test_duplicate_json_keys_are_not_silently_overwritten(client):
    response = client.post("/api/calc", content='{"decisions": {}, "decisions": {}}',
                           headers={"content-type": "application/json"})
    assert response.status_code == 422


def test_request_id_and_cors_for_frontend(client):
    response = client.get("/api/health", headers={"x-request-id": "ui-request-17", "origin": "http://localhost:5173"})
    assert response.headers["x-request-id"] == "ui-request-17"
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "content-disposition" in response.headers["access-control-expose-headers"].lower()
    blocked = client.get("/api/health", headers={"origin": "https://untrusted.invalid"})
    assert "access-control-allow-origin" not in blocked.headers


def test_request_size_limit_is_enforced_before_parsing(client_factory):
    client = client_factory(max_request_bytes=128, max_upload_bytes=64)
    response = client.post("/api/calc", content=b"x" * 129)
    assert response.status_code == 413
    assert response.json()["code"] == "REQUEST_TOO_LARGE"
    assert response.headers["x-request-id"]


def test_service_failure_is_safe_json_and_not_a_synthetic_success(client_factory, plan):
    class BrokenService:
        def calculate(self, request):
            raise RuntimeError("SECRET_TOKEN=/private/path")
    client = client_factory(calculation_service=BrokenService())
    response = client.post("/api/calc", json=plan)
    assert response.status_code == 500
    assert response.json()["code"] == "CALCULATION_FAILED"
    assert "SECRET_TOKEN" not in response.text
    assert response.headers["x-request-id"] == response.json()["request_id"]


def test_unavailable_model_is_explicit_503(client_factory, plan):
    class NotReadyService:
        def calculate(self, request):
            raise NotImplementedError("not connected")
    response = client_factory(calculation_service=NotReadyService()).post("/api/calc", json=plan)
    assert response.status_code == 503
    assert response.json()["code"] == "ENGINE_NOT_READY"


def test_application_factory_exists():
    from src.app import main
    assert callable(getattr(main, "create_app", None)), "HTTP app factory is missing"


def test_default_app_exposes_health():
    from fastapi.testclient import TestClient
    from src.app.main import app
    with TestClient(app) as session:
        assert session.get("/api/health").status_code == 200
