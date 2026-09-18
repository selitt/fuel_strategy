import json


from conftest import create_project


def test_incomplete_service_result_cannot_become_default_green_numbers(client_factory, plan):
    class IncompleteService:
        def calculate(self, request):
            # Never accept a superficially typed envelope with default success/zeros.
            return {"plan_id": request.plan_id, "scenario_id": request.scenario_id}
    response = client_factory(calculation_service=IncompleteService()).post("/api/calc", json=plan)
    assert response.status_code == 500
    assert response.json()["code"] == "CALCULATION_FAILED"


def test_typed_but_incomplete_result_is_also_not_a_success(client_factory, plan):
    from src.app.dto.calc_dto import ResultExportEnvelopeDTO
    class IncompleteService:
        def calculate(self, request):
            return ResultExportEnvelopeDTO(plan_id=request.plan_id, scenario_id=request.scenario_id)
    response = client_factory(calculation_service=IncompleteService()).post("/api/calc", json=plan)
    assert response.status_code == 500


def test_http_validation_discloses_default_normalization(client):
    response = client.post("/api/plans/validate", json={"decisions": {}})
    assert response.status_code == 200
    assert response.json()["normalized"] is True


def test_result_from_another_plan_is_rejected_without_persisting(client_factory, plan):
    from src.app.service.calc_service import CalculationService
    class WrongService:
        def calculate(self, request):
            result = CalculationService().calculate(request)
            result.plan_id = "another-plan"
            return result
    client = client_factory(calculation_service=WrongService())
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    assert client.post(url + "/calculate", json={"expected_revision": 1}).status_code == 500
    assert client.get(url).json()["last_run"] is None


def test_model_version_change_marks_a_saved_result_stale(client, plan):
    project = create_project(client, plan)
    url = f'/api/projects/{project["project_id"]}'
    assert client.post(url + "/calculate", json={"expected_revision": 1}).status_code == 200
    client.app.state.engine_info = client.app.state.engine_info.model_copy(update={"version": "new-model"})
    assert client.get(url).json()["result_state"] == "stale"
    assert client.get(url + "/result").status_code == 409


def test_imported_result_is_labeled_in_http_headers(client, plan):
    project = create_project(client, plan)
    project = client.post(f'/api/projects/{project["project_id"]}/calculate', json={"expected_revision": 1}).json()
    imported = client.post("/api/projects/import", files={"file": ("project.json", json.dumps(project).encode())}).json()
    response = client.get(f'/api/projects/{imported["project_id"]}/result')
    assert response.status_code == 200
    assert response.headers["x-result-origin"] == "imported"
    assert response.headers["x-engine-status"] == "unverified"


def test_string_infinity_inside_extra_data_is_text_but_numeric_overflow_is_rejected(client, plan):
    plan["comment"] = "Infinity is only text here"
    assert client.post("/api/plans/validate", json=plan).status_code == 200
    raw = json.dumps(plan)[:-1] + ',"extra_number":1e9999}'
    assert client.post("/api/plans/validate", content=raw, headers={"Content-Type": "application/json"}).status_code == 422


def test_chunked_request_cannot_bypass_total_size_limit(client_factory):
    client = client_factory(max_request_bytes=128, max_upload_bytes=64)
    response = client.post("/api/calc", content=iter([b"x" * 64, b"x" * 65]))
    assert response.status_code == 413


def test_traversal_filename_never_becomes_storage_path(client_factory, tmp_path, plan):
    directory = tmp_path / "store"
    client = client_factory(data_dir=directory)
    response = client.post("/api/plans/import", files={"file": ("../../outside.json", json.dumps(plan).encode())})
    assert response.status_code == 200
    assert not (tmp_path / "outside.json").exists()
    assert not directory.exists()  # Importing a plan alone performs no disk writes.


def test_symlink_project_file_is_never_read(client_factory, tmp_path, plan):
    directory = tmp_path / "store"
    client = client_factory(data_dir=directory)
    project = create_project(client, plan)
    target = tmp_path / "sensitive.json"
    target.write_text("private-sensitive-content")
    path = directory / f'{project["project_id"]}.json'
    path.unlink()
    path.symlink_to(target)
    response = client.get(f'/api/projects/{project["project_id"]}')
    assert response.status_code == 500
    assert "private-sensitive-content" not in response.text
    assert target.read_text() == "private-sensitive-content"


def test_download_routes_have_concrete_openapi_response_schemas(client):
    spec = client.get("/openapi.json").json()
    for path, method in [("/api/plans/export", "post"), ("/api/projects/{project_id}/export", "get"),
                         ("/api/projects/{project_id}/result/export", "get")]:
        content = spec["paths"][path][method]["responses"]["200"]["content"]
        assert "$ref" in content["application/json"]["schema"], path
    content = spec["paths"]["/api/projects/{project_id}/result/export"]["get"]["responses"]["200"]["content"]
    assert content["application/zip"]["schema"]["format"] == "binary"


def test_all_openapi_references_resolve_and_operation_ids_are_unique(client):
    spec = client.get("/openapi.json").json()
    stack = [spec]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            ref = node.get("$ref")
            if ref:
                assert ref.startswith("#/"), ref
                target = spec
                for segment in ref[2:].split("/"):
                    target = target[segment]
            stack.extend(node.values())
        elif isinstance(node, list):
            stack.extend(node)
    ids = [op["operationId"] for route in spec["paths"].values() for op in route.values() if "operationId" in op]
    assert len(ids) == len(set(ids))


def test_imported_result_must_include_its_tables_not_default_zeros(client, plan):
    project = create_project(client, plan)
    project = client.post(f'/api/projects/{project["project_id"]}/calculate', json={"expected_revision": 1}).json()
    del project["last_run"]["result"]["financial_breakdown"]
    response = client.post("/api/projects/import", files={"file": ("project.json", json.dumps(project).encode())})
    assert response.status_code == 422


def test_damaged_stored_result_cannot_gain_defaults_when_reopened(client_factory, tmp_path, plan):
    directory = tmp_path / "store"
    client = client_factory(data_dir=directory)
    project = create_project(client, plan)
    project = client.post(f'/api/projects/{project["project_id"]}/calculate', json={"expected_revision": 1}).json()
    del project["last_run"]["result"]["total_cost_mln"]
    (directory / f'{project["project_id"]}.json').write_text(json.dumps(project))
    assert client.get(f'/api/projects/{project["project_id"]}').status_code == 500


def test_advertised_export_formats_are_accepted_by_the_export_endpoint(client, plan):
    project = create_project(client, plan)
    project = client.post(f'/api/projects/{project["project_id"]}/calculate', json={"expected_revision": 1}).json()
    for format in client.get("/api/meta").json()["result_export_formats"]:
        response = client.get(f'/api/projects/{project["project_id"]}/result/export', params={"format": format})
        assert response.status_code == 200, (format, response.text)
