"""Exercise public Compose authentication and offline recovery on an isolated volume."""
import argparse
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
from uuid import uuid4

import httpx
from playwright.sync_api import sync_playwright

from plan_import_fixtures import plan_files, upload_all_plan_formats

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', default='fuel-public-check:local')
    parser.add_argument('--skip-browser', action='store_true', help='Run container/API checks when host browser dependencies are unavailable')
    args = parser.parse_args()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    project_name = 'fuel-check-' + uuid4().hex[:12]
    password = secrets.token_urlsafe(24)
    env = {**os.environ, 'FUEL_BIND_HOST': '127.0.0.1', 'FUEL_WEB_PORT': str(port),
           'FUEL_HTTP_USER': 'smoke', 'FUEL_HTTP_PASSWORD': password,
           'FUEL_PUBLIC_ORIGIN': ''}
    with tempfile.TemporaryDirectory(prefix='fuel-docker-check-') as temporary:
        override = Path(temporary) / 'compose.json'
        override.write_text(json.dumps({'services': {'web': {'image': args.image}}}))
        command = ['docker', 'compose', '-p', project_name, '--env-file',
                   str(ROOT/'docker/.env.example'), '-f', str(ROOT/'docker/compose.yaml'),
                   '-f', str(override)]

        def compose(*arguments):
            return subprocess.run([*command, *arguments], env=env, cwd=ROOT,
                                  check=True, capture_output=True, text=True).stdout

        try:
            compose('up', '--no-build', '-d', '--wait', '--wait-timeout', '60')
            with httpx.Client(base_url=f'http://127.0.0.1:{port}', timeout=30) as client:
                assert client.get('/api/health').status_code == 200
                assert client.get('/').status_code == 401
                client.auth = ('smoke', password)
                assert client.get('/').status_code == 200
                plan = client.get('/api/calc/template').json()
                for filename, content_type, contents in plan_files(plan):
                    imported = client.post('/api/plans/import', files={'file': (filename, contents, content_type)})
                    assert imported.status_code == 200, f'{filename}: {imported.text}'
                assert client.post('/api/projects', json={'name': 'Forbidden', 'plan': plan},
                                   headers={'Origin': 'https://other.invalid'}).status_code == 403
                created = client.post('/api/projects', json={'name': 'Recovery smoke', 'plan': plan})
                assert created.status_code == 201, created.text
                project = created.json()
                calculated = client.post(f"/api/projects/{project['project_id']}/calculate",
                                         json={'expected_revision': project['revision']})
                assert calculated.status_code == 200, calculated.text
                saved = calculated.json()
            if not args.skip_browser:
                with sync_playwright() as playwright:
                    browser = playwright.chromium.launch(headless=True)
                    context = browser.new_context(http_credentials={'username': 'smoke', 'password': password})
                    page = context.new_page()
                    response = page.goto(f'http://127.0.0.1:{port}/', wait_until='networkidle', timeout=120_000)
                    assert response is not None and response.ok
                    upload_all_plan_formats(page, f'http://127.0.0.1:{port}/', plan)
                    context.close()
                    browser.close()
            compose('stop', 'web')
            compose('run', '--rm', '--no-deps', 'web', 'python', 'tools/project_archive.py',
                    'export', '--store', '/data/projects', '--output', '/data/projects-backup.zip')
            archive = Path(temporary) / 'projects-backup.zip'
            compose('cp', 'web:/data/projects-backup.zip', str(archive))
            assert archive.stat().st_size > 0
            compose('run', '--rm', '--no-deps', 'web', 'python', 'tools/project_archive.py',
                    'restore', '--input', '/data/projects-backup.zip', '--store', '/data/restored')
            restored = compose('run', '--rm', '--no-deps', 'web', 'python', '-c',
                               'from pathlib import Path; print(next(Path("/data/restored").glob("*.json")).read_text())')
            assert json.loads(restored)['last_run'] == saved['last_run']
            compose('up', '--no-build', '-d', '--wait', '--wait-timeout', '60')
            with httpx.Client(base_url=f'http://127.0.0.1:{port}', auth=('smoke', password)) as client:
                reopened = client.get(f"/api/projects/{project['project_id']}")
                assert reopened.status_code == 200 and reopened.json() == saved
            browser_note = 'browser and API upload formats, ' if not args.skip_browser else 'API upload formats, '
            print(f'PASS: public Compose access, four {browser_note}origin rejection, calculation, restart, archive download and restore')
        finally:
            compose('down', '--volumes', '--remove-orphans')


if __name__ == '__main__':
    main()
