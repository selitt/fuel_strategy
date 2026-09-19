"""Contract and integration regressions only; no claims about model correctness."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

from src.app.config import Settings
from src.app.dto.web_dto import EngineInfoDTO
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[2]


def test_removed_demo_routes_are_not_advertised_or_exposed(client):
    spec = client.get('/openapi.json').json()
    assert not any(path.startswith('/hello') for path in spec['paths'])
    assert client.get('/hello').status_code == 404


def test_published_openapi_matches_running_application(client):
    saved = json.loads((ROOT / 'docs/api/openapi.json').read_text(encoding='utf-8'))
    assert saved == client.get('/openapi.json').json()


def test_public_adapter_validation_error_reaches_ui(client_factory, plan):
    class Adapter:
        def calculate(self, request):
            raise HTTPException(status_code=422, detail='Unsupported by this adapter')
    response = client_factory(calculation_service=Adapter()).post('/api/calc', json=plan)
    assert response.status_code == 422
    assert response.json()['detail'] == 'Unsupported by this adapter'


@pytest.mark.parametrize('exception', [NotImplementedError, ImportError])
def test_unavailable_template_is_explicit_503(client_factory, exception):
    class Adapter:
        def get_template_plan(self):
            raise exception('private details must not leak')
    response = client_factory(calculation_service=Adapter()).get('/api/calc/template')
    assert response.status_code == 503
    assert response.json()['code'] == 'ENGINE_NOT_READY'
    assert 'private details' not in response.text


def test_template_programming_error_is_not_an_input_error(client_factory):
    class Adapter:
        def get_template_plan(self):
            return {'decisions': 'invalid'}
    response = client_factory(calculation_service=Adapter()).get('/api/calc/template')
    assert response.status_code == 500
    assert response.json()['code'] == 'INVALID_SERVICE_RESULT'


def test_adapter_can_supply_its_own_identity_and_version(tmp_path, plan):
    from src.app.main import create_app
    from src.app.service.calc_service import calculation_service
    settings = Settings(data_dir=tmp_path / 'projects')

    def make(version):
        return create_app(settings=settings, calculation_service=calculation_service,
                          engine_info=EngineInfoDTO(engine_id='team-adapter', version=version,
                                                    status='unverified', limitations=['API test only']))

    with TestClient(make('v1')) as client:
        assert client.get('/api/meta').json()['engine']['engine_id'] == 'team-adapter'
        project = client.post('/api/projects', json={'name': 'Version test', 'plan': plan}).json()
        project_id = project['project_id']
        response = client.post(f'/api/projects/{project_id}/calculate', json={'expected_revision': 1})
        assert response.status_code == 200, response.text
        assert response.json()['last_run']['engine']['version'] == 'v1'
    with TestClient(make('v2')) as client:
        assert client.get(f'/api/projects/{project_id}').json()['result_state'] == 'stale'
        response = client.get(f'/api/projects/{project_id}/result')
        assert response.status_code == 409
        assert response.json()['code'] == 'RESULT_STALE'


def test_cors_preflight_allows_json_and_multipart_client(client):
    response = client.options('/api/projects/import', headers={
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,X-Request-ID',
    })
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'http://localhost:5173'
