"""Exercise the shipped bash entrypoint over native HTTP, including process restart.

This is not a browser test. Only a temporary project store is used.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import time
from urllib.parse import urljoin

import httpx

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifacts', type=Path, default=ROOT / 'results/launch-smoke')
    args = parser.parse_args()
    out = args.artifacts.resolve()
    out.mkdir(parents=True, exist_ok=True)
    checks: list[str] = []

    def verify(label: str, condition: bool) -> None:
        if not condition:
            raise AssertionError(label)
        checks.append(label)
        print('PASS:', label, flush=True)

    with tempfile.TemporaryDirectory(prefix='fuel-launch-') as store:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        env = {**os.environ, 'PYTHON': sys.executable, 'FUEL_BIND_HOST': '127.0.0.1',
               'FUEL_WEB_PORT': str(port), 'FUEL_DATA_DIR': store,
               'FUEL_HTTP_USER': '', 'FUEL_HTTP_PASSWORD': ''}
        env.pop('FUEL_FRONTEND_DIR', None)
        saved = None
        with httpx.Client(base_url=base, timeout=30) as client:
            for iteration in range(2):
                with (out / f'process-{iteration}.log').open('w') as log:
                    proc = subprocess.Popen(['bash', 'run.sh', 'local'], cwd=ROOT, env=env,
                                            stdout=log, stderr=log)
                    try:
                        for _ in range(150):
                            if proc.poll() is not None:
                                raise RuntimeError('Entrypoint stopped; see process log')
                            try:
                                if client.get('/api/health').status_code == 200:
                                    break
                            except httpx.HTTPError:
                                pass
                            time.sleep(.1)
                        else:
                            raise TimeoutError('Entrypoint did not become ready')
                        html = client.get('/')
                        verify(f'Process {iteration}: HTML served by bash run.sh local', html.status_code == 200 and '<div id="root"' in html.text)
                        if iteration == 0:
                            assets = re.findall(r'(?:src|href)="([^\"]*assets/[^\"]+)"', html.text)
                            verify(
                                'Production assets served through native HTTP',
                                bool(assets) and all(client.get(urljoin('/', asset)).status_code == 200 for asset in assets),
                            )
                            template = client.get('/api/calc/template').json()
                            created = client.post('/api/projects', json={'name': 'Restart smoke', 'plan': template})
                            verify('Project created through native HTTP', created.status_code in (200, 201))
                            project = created.json()
                            calculated = client.post(f"/api/projects/{project['project_id']}/calculate", json={'expected_revision': project['revision']})
                            verify('Calculation persisted through native HTTP', calculated.status_code == 200 and calculated.json()['result_state'] == 'current')
                            saved = calculated.json()
                            # Result export is checked independently by API and browser suites.
                            verify('Unknown API routes are not replaced by SPA HTML', client.get('/api/not-a-route').status_code == 404)
                        else:
                            assert saved is not None
                            restored = client.get('/api/projects/' + saved['project_id'])
                            verify('Plan and run survive a new OS process', restored.status_code == 200 and restored.json() == saved)
                    finally:
                        proc.terminate()
                        proc.wait(timeout=10)
    (out / 'report.json').write_text(json.dumps({'checks': checks, 'count': len(checks)}, ensure_ascii=False, indent=2))
    print(f'{len(checks)} native HTTP / launch checks passed')


if __name__ == '__main__':
    main()
