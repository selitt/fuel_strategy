from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import sys
import threading


ROOT = Path(__file__).resolve().parents[2]


class DeploymentFixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - stdlib callback name
        if self.path == "/":
            self._send(
                200,
                b'<!doctype html><div id="root"></div><script src="/assets/app.js"></script>',
                "text/html; charset=utf-8",
            )
        elif self.path == "/assets/app.js":
            self._send(200, b"window.fixtureReady = true;", "text/javascript")
        elif self.path == "/api/health":
            self._json(200, {"status": "ok", "engine": {"status": "prototype", "model_verified": False}})
        elif self.path == "/api/calc/template":
            self._json(
                200,
                {
                    "plan_id": "ci-smoke",
                    "scenario_id": "BASE",
                    "decisions": {"supply_orders": [], "capacity_reservations": []},
                },
            )
        else:
            self._send(404, b"not found", "text/plain")

    def do_POST(self) -> None:  # noqa: N802 - stdlib callback name
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length))
        if self.path == "/api/calc" and payload.get("plan_id") == "ci-smoke":
            self._json(
                200,
                {
                    "plan_id": "ci-smoke",
                    "scenario_id": "BASE",
                    "yearly_balance": [{"year": 2035}],
                    "financial_breakdown": [],
                    "constraint_checks": [],
                    "source_schedule": [],
                },
            )
        else:
            self._json(400, {"error": "unexpected request"})

    def log_message(self, _format: str, *_args: object) -> None:
        return

    def _json(self, status: int, value: object) -> None:
        self._send(status, json.dumps(value).encode(), "application/json")

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class BrokenAssetHandler(DeploymentFixtureHandler):
    def do_GET(self) -> None:  # noqa: N802 - stdlib callback name
        if self.path == "/assets/app.js":
            self._send(404, b"missing", "text/plain")
            return
        super().do_GET()


def run_smoke(handler: type[BaseHTTPRequestHandler], artifacts: Path) -> subprocess.CompletedProcess[str]:
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        return subprocess.run(
            [
                sys.executable,
                "tests/web/deployment_smoke.py",
                "--base-url",
                f"http://127.0.0.1:{server.server_port}",
                "--artifacts",
                str(artifacts),
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_deployment_smoke_checks_served_ui_health_and_calculation(tmp_path: Path) -> None:
    artifacts = tmp_path / "artifacts"
    result = run_smoke(DeploymentFixtureHandler, artifacts)

    assert result.returncode == 0, result.stdout + result.stderr
    report = json.loads((artifacts / "report.json").read_text())
    assert report["status"] == "passed"
    assert report["checks"] == [
        "frontend HTML",
        "frontend assets",
        "API health",
        "calculation template",
        "stateless calculation",
    ]
    assert "5 deployment checks passed" in result.stdout


def test_deployment_smoke_records_failure_for_missing_asset(tmp_path: Path) -> None:
    artifacts = tmp_path / "artifacts"
    result = run_smoke(BrokenAssetHandler, artifacts)

    assert result.returncode == 1
    report = json.loads((artifacts / "report.json").read_text())
    assert report["status"] == "failed"
    assert report["checks"] == ["frontend HTML"]
    assert "/assets/app.js" in report["error"]
