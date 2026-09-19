"""Regression tests for the web boundary; no mathematical rules are asserted."""
from copy import deepcopy
import json

import pytest

from conftest import create_project
from src.app.dto.calc_dto import ParticipantPlanDTO
from src.app.service.calc_service import CalculationService


@pytest.mark.parametrize("endpoint", ["/api/calc", "/api/plans/validate", "/api/plans/export"])
@pytest.mark.parametrize(("raw", "cause"), [
    ('{"decisions":{},"scenario_id":"BASE","scenario_id":"MANDATORY_STRESS"}', "повторяющееся имя поля"),
    ('{"decisions":{},"extra":NaN}', "NaN и Infinity"),
    ('{"decisions":{},"extra":Infinity}', "NaN и Infinity"),
    ('{"decisions":{},"extra":-Infinity}', "NaN и Infinity"),
    ('{"decisions":{},"extra":1e9999}', "конечными"),
])
def test_missing_content_type_cannot_bypass_strict_json(client, endpoint, raw, cause):
    response = client.post(endpoint, content=raw)
    assert "content-type" not in response.request.headers
    assert response.status_code == 422, response.text
    assert set(response.json()) == {"detail"}
    assert cause in str(response.json()["detail"])
    assert response.headers["x-request-id"]


def test_valid_json_without_content_type_remains_compatible(client, plan):
    response = client.post("/api/plans/validate", content=json.dumps(plan))
    assert response.status_code == 200, response.text
    assert response.json()["plan"] == plan


@pytest.mark.parametrize("transport", ["json", "upload"])
@pytest.mark.parametrize(("raw", "cause"), [
    ('{"decisions":{},"extra":' + "1" * 5000 + "}", "корректный JSON"),
    ('{"decisions":{},"extra":' + "[" * 300 + "0" + "]" * 300 + "}", "вложенность (192)"),
    ('{"decisions":{},"extra":' + "[" * 150 + "0" + "]" * 150 + "}", "вложенность (128)"),
    ('{"decisions":{},"extra":"\\ud800"}', "корректный Unicode"),
    ('{"decisions":{},"extra":{"\\ud800":"value"}}', "корректный Unicode"),
], ids=["integer-limit", "document-depth", "plan-depth", "surrogate-value", "surrogate-key"])
def test_unserializable_input_is_a_client_error(client, transport, raw, cause):
    if transport == "upload":
        response = client.post("/api/plans/import", files={"file": ("plan.json", raw.encode(), "application/json")})
    else:
        response = client.post("/api/plans/validate", content=raw, headers={"Content-Type": "application/json"})
    assert response.status_code == 422, response.text
    assert set(response.json()) == {"detail"}
    assert cause in str(response.json()["detail"])
    assert response.headers["x-request-id"]


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
@pytest.mark.parametrize("location", ["extension", "risk_register", "declared_float"])
def test_nonfinite_adapter_output_cannot_turn_into_null(client_factory, plan, value, location):
    class Adapter:
        def calculate(self, request):
            result = CalculationService().calculate(request)
            if location == "extension":
                result.extra = {"value": value}
            elif location == "risk_register":
                result.risk_register = [{"value": value}]
            else:
                result.total_cost_mln = value
            return result

    response = client_factory(calculation_service=Adapter()).post("/api/calc", json=plan)
    assert response.status_code == 500, response.text
    assert response.json() == {"detail": "Расчёт завершился ошибкой; результат не заменён"}


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
def test_nonfinite_template_extension_is_an_invalid_service_result(client_factory, value):
    class Adapter:
        def get_template_plan(self):
            return ParticipantPlanDTO.model_validate({"decisions": {}, "extra": {"value": value}})

    response = client_factory(calculation_service=Adapter()).get("/api/calc/template")
    assert response.status_code == 500, response.text
    assert response.json() == {"detail": "Сервис вернул шаблон неправильного формата"}


def test_nonfinite_result_does_not_replace_last_good_run(client_factory, plan):
    class Adapter:
        broken = False

        def calculate(self, request):
            result = CalculationService().calculate(request)
            if self.broken:
                result.risk_register = [{"value": float("nan")}]
            return result

    adapter = Adapter()
    client = client_factory(calculation_service=adapter)
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    first = client.post(url + "/calculate", json={"expected_revision": 1})
    assert first.status_code == 200, first.text
    saved = first.json()
    adapter.broken = True
    second = client.post(url + "/calculate", json={"expected_revision": saved["revision"]})
    assert second.status_code == 500, second.text
    assert client.get(url).json() == saved
    exported = client.get(url + "/result/export").json()
    exported.pop("_web_export")
    assert exported == saved["last_run"]["result"]


def test_nested_valid_extensions_and_unicode_roundtrip(client, plan):
    value = {"message": "Кириллица и космос 🚀", "nullable": None, "text": "NaN is text"}
    for _ in range(120):
        value = [value]
    extended = deepcopy(plan)
    extended["extra"] = value
    project = create_project(client, extended)
    url = f'/api/projects/{project["project_id"]}'
    calculated = client.post(url + "/calculate", json={"expected_revision": 1})
    assert calculated.status_code == 200, calculated.text
    assert client.get(url).json()["plan"] == extended
    snapshot = client.get(url + "/export")
    assert snapshot.status_code == 200
    imported = client.post("/api/projects/import", files={"file": ("project.json", snapshot.content, "application/json")})
    assert imported.status_code == 201, imported.text
    assert imported.json()["plan"] == extended
    assert imported.json()["last_run"]["result"] == calculated.json()["last_run"]["result"]


@pytest.mark.parametrize("content_type", ["application/octet-stream", "text/plain"])
@pytest.mark.parametrize("endpoint", ["/api/calc", "/api/calc/risk", "/api/plans/validate"])
def test_non_utf8_non_json_body_is_a_validation_error(client, content_type, endpoint):
    response = client.post(endpoint, content=b'\xff', headers={"content-type": content_type})
    assert response.status_code == 422, response.text
    assert set(response.json()) == {"detail"}
    error = response.json()["detail"][0]
    assert error["loc"] == ["body"]
    assert error["type"] == "model_attributes_type"
    assert error["msg"]
    assert "input" not in error and "ctx" not in error
    assert response.headers["x-request-id"]
