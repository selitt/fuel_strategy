from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
from threading import Event
from uuid import UUID, uuid4

import pytest

from conftest import create_project


def test_validate_is_structure_only_and_keeps_extension_fields(client, plan):
    plan["decisions"]["supply_orders"][0]["delivery_date"] = "2035-05-01"
    response = client.post("/api/plans/validate", json=plan)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["validation_scope"] == "structure_only"
    assert result["model_checked"] is False
    assert result["plan"]["team_notes"] == plan["team_notes"]
    assert result["plan"]["decisions"]["supply_orders"][0]["delivery_date"] == "2035-05-01"
    assert result["warnings"]


def test_json_import_preserves_plan_and_is_not_a_calculation(client, plan):
    response = client.post("/api/plans/import", files={"file": ("план.json", json.dumps(plan).encode(), "application/json")})
    assert response.status_code == 200, response.text
    assert response.json()["plan"] == plan
    assert response.json()["model_checked"] is False


@pytest.mark.parametrize("filename,contents,status,cause", [
    ("script.py", b"{}", 415, "Поддерживается JSON-файл"),
    ("plan.json", b"not json", 422, "Ожидается корректный JSON"),
    ("plan.json", b'{"decisions": []}', 422, "decisions"),
    ("plan.json", b'{"decisions": {}, "decisions": {}}', 422, "повторяющееся имя поля"),
])
def test_invalid_uploads_have_user_facing_errors(client, filename, contents, status, cause):
    response = client.post("/api/plans/import", files={"file": (filename, contents)})
    assert response.status_code == status, response.text
    assert set(response.json()) == {"detail"}
    assert cause in str(response.json()["detail"])
    assert response.headers["x-request-id"]


def test_uploaded_file_limit_is_separate_from_total_request_limit(client_factory):
    client = client_factory(max_upload_bytes=32, max_request_bytes=2048)
    response = client.post("/api/plans/import", files={"file": ("plan.json", b" " * 33)})
    assert response.status_code == 413


def test_missing_default_fields_are_disclosed_not_called_organizer_decisions(client):
    response = client.post("/api/plans/import", files={"file": ("empty.json", b'{"decisions": {}}')})
    assert response.status_code == 200
    assert response.json()["normalized"] is True
    assert response.json()["warnings"]
    assert response.json()["plan"]["decisions"]["inventory_policy"]["initial_inventory_t"] == 12.33


def test_project_roundtrip_and_listing(client, plan):
    project = create_project(client, plan)
    UUID(project["project_id"])
    assert project["revision"] == 1
    assert project["result_state"] == "not_calculated"
    assert project["last_run"] is None
    assert project["plan"] == plan
    assert client.get(f'/api/projects/{project["project_id"]}').json() == project
    listing = client.get("/api/projects", params={"limit": 1, "offset": 0}).json()
    assert listing["total"] == 1
    assert listing["items"][0]["project_id"] == project["project_id"]
    assert "plan" not in listing["items"][0]  # List is metadata, not all result arrays.


def test_projects_survive_app_restart(client_factory, tmp_path, plan):
    directory = tmp_path / "persistent"
    first = client_factory(data_dir=directory)
    project = create_project(first, plan)
    second = client_factory(data_dir=directory)
    assert second.get(f'/api/projects/{project["project_id"]}').json()["plan"] == plan


def test_update_uses_optimistic_revision_and_keeps_other_project_isolated(client, plan):
    first = create_project(client, plan)
    second = create_project(client, plan, "Другой проект")
    updated_plan = deepcopy(plan)
    updated_plan["team_notes"]["text"] = "Новый текст"
    url = f'/api/projects/{first["project_id"]}'
    body = {"name": "Изменённый", "plan": updated_plan, "expected_revision": 1}
    updated = client.put(url, json=body)
    assert updated.status_code == 200, updated.text
    assert updated.json()["revision"] == 2
    assert client.put(url, json=body).status_code == 409
    assert client.get(f'/api/projects/{second["project_id"]}').json()["plan"] == plan


def test_two_writers_do_not_silently_lose_updates(client, plan):
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    def update(i):
        return client.put(url, json={"name": f"writer-{i}", "plan": plan, "expected_revision": 1}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(update, (1, 2))) == [200, 409]


def test_calculation_snapshot_and_stale_state(client, plan):
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    response = client.post(url + "/calculate", json={"expected_revision": 1})
    assert response.status_code == 200, response.text
    calculated = response.json()
    assert calculated["revision"] == 2
    assert calculated["result_state"] == "current"
    run = calculated["last_run"]
    assert run["plan_snapshot"] == plan
    assert run["origin"] == "server"
    assert run["engine"]["model_verified"] is False
    assert len(run["input_hash"]) == 64
    result = client.get(url + "/result")
    assert result.status_code == 200
    assert result.json() == run["result"]
    changed = deepcopy(plan)
    changed["decisions"]["supply_orders"][0]["order_t"] += 10
    response = client.put(url, json={"name": "Changed", "plan": changed, "expected_revision": 2})
    assert response.status_code == 200
    assert response.json()["result_state"] == "stale"
    assert response.json()["last_run"] == run
    assert client.get(url + "/result").status_code == 409


def test_renaming_does_not_invalidate_identical_inputs(client, plan):
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    calc = client.post(url + "/calculate", json={"expected_revision": 1}).json()
    response = client.put(url, json={"name": "Новое имя", "plan": plan, "expected_revision": calc["revision"]})
    assert response.json()["result_state"] == "current"


def test_failed_calculation_keeps_last_good_snapshot(client_factory, plan):
    from src.app.service.calc_service import CalculationService
    class Service:
        fail = False
        def calculate(self, request):
            if self.fail:
                raise RuntimeError("private details")
            return CalculationService().calculate(request)
    service = Service()
    client = client_factory(calculation_service=service)
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    good = client.post(url + "/calculate", json={"expected_revision": 1}).json()
    service.fail = True
    response = client.post(url + "/calculate", json={"expected_revision": good["revision"]})
    assert response.status_code == 500
    assert client.get(url).json() == good


def test_slow_response_cannot_overwrite_a_new_plan(client_factory, plan):
    from src.app.service.calc_service import CalculationService
    started, release = Event(), Event()
    class SlowService:
        def calculate(self, request):
            started.set()
            assert release.wait(5)
            return CalculationService().calculate(request)
    client = client_factory(calculation_service=SlowService())
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    with ThreadPoolExecutor(max_workers=1) as pool:
        pending = pool.submit(client.post, url + "/calculate", json={"expected_revision": 1})
        try:
            assert started.wait(5)
            assert client.get("/api/health").status_code == 200
            updated = client.put(url, json={"name": "new", "plan": plan, "expected_revision": 1})
            assert updated.status_code == 200
        finally:
            release.set()
        assert pending.result().status_code == 409
    current = client.get(url).json()
    assert current["name"] == "new"
    assert current["last_run"] is None


def test_missing_result_and_unknown_project_are_not_empty_successes(client, plan):
    project = create_project(client, plan)
    assert client.get(f'/api/projects/{project["project_id"]}/result').status_code == 409
    assert client.get(f"/api/projects/{uuid4()}").status_code == 404
    assert client.get("/api/projects/not-a-uuid").status_code == 422


def test_delete_requires_current_revision(client, plan):
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    assert client.delete(url, params={"expected_revision": 9}).status_code == 409
    assert client.delete(url, params={"expected_revision": 1}).status_code == 204
    assert client.get(url).status_code == 404


def test_corrupt_saved_file_is_not_replaced_by_an_empty_project(client_factory, tmp_path, plan):
    directory = tmp_path / "corrupt-case"
    client = client_factory(data_dir=directory)
    project = create_project(client, plan)
    (directory / f'{project["project_id"]}.json').write_text("private broken text")
    response = client.get(f'/api/projects/{project["project_id"]}')
    assert response.status_code == 500
    assert response.json() == {"detail": "Сохранённый проект повреждён или несовместим; файл не изменён"}
    assert "private broken text" not in response.text
