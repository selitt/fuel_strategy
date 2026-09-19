from pathlib import Path
import importlib.util
from fastapi.testclient import TestClient
from src.app.main import create_app

ROOT = Path(__file__).resolve().parents[2]

def test_413_responses_use_the_python_313_standard_description():
    schema = create_app().openapi()
    for route in ('validate', 'import', 'export'):
        response = schema['paths'][f'/api/plans/{route}']['post']['responses']['413']
        assert response['description'] == 'Content Too Large'
        assert response['content']['application/json']['schema']['$ref'].endswith('/ErrorDTO')

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

def enable_unauthenticated_local(monkeypatch):
    monkeypatch.delenv('FUEL_HTTP_USER', raising=False)
    monkeypatch.delenv('FUEL_HTTP_PASSWORD', raising=False)
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '0')
    monkeypatch.setenv('FUEL_ALLOW_UNAUTHENTICATED_LOCAL', '1')
    monkeypatch.setenv('FUEL_BIND_HOST', '127.0.0.1')

def test_static_site_and_api_are_one_origin(tmp_path, monkeypatch):
    from src.app.web import create_web_app
    enable_unauthenticated_local(monkeypatch)
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
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '0')
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
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '0')
    with pytest.raises(RuntimeError, match='both'):
        create_web_app(static_dir=fixture_site(tmp_path))

def test_missing_static_build_is_explicit(tmp_path, monkeypatch):
    import pytest
    from src.app.web import create_web_app
    monkeypatch.delenv('FUEL_HTTP_USER', raising=False)
    monkeypatch.delenv('FUEL_HTTP_PASSWORD', raising=False)
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '0')
    monkeypatch.setenv('FUEL_ALLOW_UNAUTHENTICATED_LOCAL', '1')
    monkeypatch.setenv('FUEL_BIND_HOST', '127.0.0.1')
    with pytest.raises(RuntimeError, match='npm --prefix frontend run build') as error:
        create_web_app(static_dir=tmp_path/'absent')
    assert 'prebuilt' not in str(error.value)

def test_unauthenticated_delivery_requires_explicit_loopback_mode(tmp_path, monkeypatch):
    import pytest
    from src.app.web import create_web_app
    monkeypatch.delenv('FUEL_HTTP_USER', raising=False)
    monkeypatch.delenv('FUEL_HTTP_PASSWORD', raising=False)
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '0')
    monkeypatch.delenv('FUEL_ALLOW_UNAUTHENTICATED_LOCAL', raising=False)
    site = fixture_site(tmp_path)
    with pytest.raises(RuntimeError, match='FUEL_ALLOW_UNAUTHENTICATED_LOCAL'):
        create_web_app(static_dir=site)

    monkeypatch.setenv('FUEL_ALLOW_UNAUTHENTICATED_LOCAL', '1')
    monkeypatch.setenv('FUEL_BIND_HOST', '0.0.0.0')
    with pytest.raises(RuntimeError, match='loopback'):
        create_web_app(static_dir=site)

def test_public_mode_requires_credentials_but_origin_is_optional(tmp_path, monkeypatch):
    import pytest
    from src.app.web import create_web_app
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '1')
    monkeypatch.delenv('FUEL_HTTP_USER', raising=False)
    monkeypatch.delenv('FUEL_HTTP_PASSWORD', raising=False)
    monkeypatch.delenv('FUEL_PUBLIC_ORIGIN', raising=False)
    site = fixture_site(tmp_path)
    with pytest.raises(RuntimeError, match='credentials'):
        create_web_app(static_dir=site)

    monkeypatch.setenv('FUEL_HTTP_USER', 'team')
    monkeypatch.setenv('FUEL_HTTP_PASSWORD', 'some-test-secret')
    with TestClient(create_web_app(static_dir=site)) as client:
        assert client.get('/').status_code == 401
        assert client.get('/', auth=('team', 'some-test-secret')).status_code == 200

    monkeypatch.setenv('FUEL_PUBLIC_ORIGIN', 'http://public.example')
    with pytest.raises(RuntimeError, match='HTTPS'):
        create_web_app(static_dir=site)

    monkeypatch.setenv('FUEL_PUBLIC_ORIGIN', 'https://public.example')
    with TestClient(create_web_app(static_dir=site)) as client:
        assert client.get('/api/health').status_code == 200
        assert client.get('/').status_code == 401
        assert client.get('/', auth=('team', 'some-test-secret')).status_code == 200

def test_mutating_browser_requests_require_the_configured_origin(tmp_path, monkeypatch):
    from src.app.web import create_web_app
    monkeypatch.setenv('FUEL_DATA_DIR', str(tmp_path / 'projects'))
    monkeypatch.setenv('FUEL_HTTP_USER', 'team')
    monkeypatch.setenv('FUEL_HTTP_PASSWORD', 'some-test-secret')
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '0')
    monkeypatch.setenv('FUEL_PUBLIC_ORIGIN', 'http://127.0.0.1:8080')
    auth = ('team', 'some-test-secret')
    with TestClient(create_web_app(static_dir=fixture_site(tmp_path))) as client:
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={
                'Origin': 'https://attacker.invalid',
                'Sec-Fetch-Site': 'same-origin',
            },
        ).status_code == 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={'Sec-Fetch-Site': 'cross-site'},
        ).status_code == 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={'Sec-Fetch-Site': 'same-site'},
        ).status_code == 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={
                'Origin': 'http://127.0.0.1:8080',
                'Sec-Fetch-Site': 'same-origin',
            },
        ).status_code != 403
        assert client.post('/api/plans/validate', json={}, auth=auth).status_code != 403
        assert client.get(
            '/api/meta', auth=auth, headers={'Origin': 'https://attacker.invalid'},
        ).status_code == 200

def test_unconfigured_origin_uses_https_host_and_ignores_forwarded_headers(tmp_path, monkeypatch):
    from src.app.web import create_web_app
    monkeypatch.setenv('FUEL_DATA_DIR', str(tmp_path / 'projects'))
    monkeypatch.setenv('FUEL_HTTP_USER', 'team')
    monkeypatch.setenv('FUEL_HTTP_PASSWORD', 'some-test-secret')
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '1')
    monkeypatch.delenv('FUEL_PUBLIC_ORIGIN', raising=False)
    auth = ('team', 'some-test-secret')
    with TestClient(create_web_app(static_dir=fixture_site(tmp_path))) as client:
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={'Origin': 'https://testserver'},
        ).status_code != 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={
                'Origin': 'https://testserver',
                'X-Forwarded-Host': 'attacker.invalid',
                'X-Forwarded-Proto': 'http',
            },
        ).status_code != 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={'Origin': 'https://attacker.invalid'},
        ).status_code == 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={'Origin': 'http://testserver'},
        ).status_code == 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={'Sec-Fetch-Site': 'same-site'},
        ).status_code == 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={'Sec-Fetch-Site': 'same-origin'},
        ).status_code != 403
        assert client.post(
            '/api/plans/validate', json={}, auth=auth,
            headers={
                'Origin': 'http://browser.internal:7777',
                'Sec-Fetch-Site': 'same-origin',
            },
        ).status_code != 403
        assert client.post('/api/plans/validate', json={}, auth=auth).status_code != 403

def test_failed_authentication_is_rate_limited_by_socket_peer(tmp_path, monkeypatch):
    from src.app.web import create_web_app
    monkeypatch.setenv('FUEL_DATA_DIR', str(tmp_path / 'projects'))
    monkeypatch.setenv('FUEL_HTTP_USER', 'team')
    monkeypatch.setenv('FUEL_HTTP_PASSWORD', 'some-test-secret')
    monkeypatch.setenv('FUEL_PUBLIC_MODE', '0')
    with TestClient(create_web_app(static_dir=fixture_site(tmp_path))) as client:
        for attempt in range(10):
            response = client.get(
                '/', auth=('team', 'wrong'),
                headers={'X-Forwarded-For': f'198.51.100.{attempt}'},
            )
            assert response.status_code == 401
        limited = client.get(
            '/', auth=('team', 'wrong'),
            headers={'X-Forwarded-For': '203.0.113.200'},
        )
        assert limited.status_code == 429
        assert limited.headers['Retry-After'].isdigit()
        assert client.get('/', auth=('team', 'some-test-secret')).status_code == 200
