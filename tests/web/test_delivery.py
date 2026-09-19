from pathlib import Path
import importlib.util
from fastapi.testclient import TestClient
from src.app.api.main import create_app

ROOT = Path(__file__).resolve().parents[2]

def test_413_descriptions_are_explicit_and_portable():
    schema = create_app().openapi()
    for route in ('validate', 'import', 'export'):
        assert schema['paths'][f'/api/plans/{route}']['post']['responses']['413']['description'] == 'Превышен размер запроса или файла'

def test_frontend_delivery_entrypoint_exists():
    assert importlib.util.find_spec('src.app.web') is not None

def test_frontend_types_exist():
    assert (ROOT/'frontend/src/api/schema.d.ts').is_file()

def fixture_site(tmp_path):
    site = tmp_path / 'site'
    site.mkdir()
    (site / 'index.html').write_text('<!doctype html><title>Контур</title>', encoding='utf-8')
    (site / 'assets').mkdir()
    (site / 'assets' / 'app.abc123.js').write_text('console.log(1)', encoding='utf-8')
    return site

def test_static_site_and_api_are_one_origin(tmp_path, monkeypatch):
    from src.app.web import create_web_app
    monkeypatch.setenv('FUEL_DATA_DIR', str(tmp_path / 'projects'))
    with TestClient(create_web_app(static_dir=fixture_site(tmp_path))) as client:
        index = client.get('/')
        assert index.status_code == 200
        assert 'Контур' in index.text
        assert index.headers['Cache-Control'] == 'no-cache'
        assert "frame-ancestors 'none'" in index.headers['Content-Security-Policy']
        assert client.get('/?view=plan').status_code == 200
        assert client.get('/api/health').status_code == 200
        assert client.get('/api/unknown').status_code == 404
        assert 'text/html' not in client.get('/api/unknown').headers.get('content-type', '')
        assert client.get('/assets/app.abc123.js').headers['Cache-Control'] == 'public, max-age=31536000, immutable'

def test_shared_access_gate_protects_api_and_ui(tmp_path, monkeypatch):
    from src.app.web import create_web_app
    monkeypatch.setenv('FUEL_DATA_DIR', str(tmp_path / 'projects'))
    monkeypatch.setenv('FUEL_HTTP_USER', 'team')
    monkeypatch.setenv('FUEL_HTTP_PASSWORD', 'some-test-secret')
    with TestClient(create_web_app(static_dir=fixture_site(tmp_path))) as client:
        for path in ('/', '/api/projects', '/api/meta', '/openapi.json'):
            assert client.get(path).status_code == 401
            assert client.get(path, auth=('team','wrong')).status_code == 401
            assert client.get(path, auth=('team','some-test-secret')).status_code == 200
        assert client.get('/api/health').status_code == 200
        assert client.get('/', headers={'Authorization':'Basic !!!'}).status_code == 401

def test_partial_access_configuration_fails_closed(tmp_path, monkeypatch):
    import pytest
    from src.app.web import create_web_app
    monkeypatch.setenv('FUEL_HTTP_USER', 'team')
    monkeypatch.delenv('FUEL_HTTP_PASSWORD', raising=False)
    with pytest.raises(RuntimeError, match='both'):
        create_web_app(static_dir=fixture_site(tmp_path))

def test_missing_static_build_is_explicit(tmp_path, monkeypatch):
    import pytest
    from src.app.web import create_web_app
    monkeypatch.delenv('FUEL_HTTP_USER', raising=False)
    monkeypatch.delenv('FUEL_HTTP_PASSWORD', raising=False)
    with pytest.raises(RuntimeError, match='Frontend build'):
        create_web_app(static_dir=tmp_path/'absent')
