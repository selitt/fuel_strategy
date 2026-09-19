"""Short production-browser smoke for the shared password deployment path.

The test uses a real Chromium context, the built frontend, the real API and a
temporary project store. It does not replace the calculation backend.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import socket
import subprocess
import sys
import tempfile
from threading import Thread
import time
from urllib.parse import parse_qs, urlparse, urlsplit

import httpx
from playwright.sync_api import Page, expect, sync_playwright

from plan_import_fixtures import upload_all_plan_formats


ROOT = Path(__file__).resolve().parents[2]
USERNAME = "public-smoke"
PASSWORD = "public-smoke-password"
PROXY_PREFIX = "/proxy/8080"


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _wait_until_ready(base_url: str, process: subprocess.Popen, log_path: Path) -> None:
    with httpx.Client(base_url=base_url, timeout=1) as client:
        for _ in range(200):
            if process.poll() is not None:
                raise RuntimeError(f"Web process stopped early:\n{log_path.read_text(errors='replace')}")
            try:
                if client.get("/api/health").status_code == 200:
                    return
            except httpx.HTTPError:
                pass
            time.sleep(0.1)
    raise TimeoutError(f"Web process did not become ready:\n{log_path.read_text(errors='replace')}")


def _start_reverse_proxy(
    *, backend_url: str, port: int, observed_paths: list[str]
) -> tuple[ThreadingHTTPServer, Thread]:
    """Start a test-only prefix-stripping proxy that preserves browser metadata."""
    hop_by_hop = {
        "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
        "te", "trailer", "transfer-encoding", "upgrade",
    }

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def _forward(self) -> None:
            parsed = urlsplit(self.path)
            observed_paths.append(parsed.path)
            if not parsed.path.startswith(f"{PROXY_PREFIX}/"):
                body = b"outside proxy prefix"
                self.send_response(404)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(body)
                return

            upstream_path = parsed.path[len(PROXY_PREFIX):]
            upstream_url = f"{backend_url}{upstream_path}"
            if parsed.query:
                upstream_url = f"{upstream_url}?{parsed.query}"
            size = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(size) if size else None
            headers = {
                key: value for key, value in self.headers.items()
                if key.lower() not in hop_by_hop and key.lower() != "content-length"
            }
            headers["Accept-Encoding"] = "identity"
            try:
                response = httpx.request(
                    self.command,
                    upstream_url,
                    headers=headers,
                    content=body,
                    timeout=120,
                    follow_redirects=False,
                )
            except httpx.HTTPError as error:
                payload = f"reverse proxy failure: {type(error).__name__}".encode()
                self.send_response(502)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(payload)
                return

            payload = response.content
            self.send_response(response.status_code)
            for key, value in response.headers.multi_items():
                if key.lower() not in hop_by_hop and key.lower() not in {"content-length", "content-encoding"}:
                    self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)

        do_DELETE = _forward
        do_GET = _forward
        do_HEAD = _forward
        do_OPTIONS = _forward
        do_POST = _forward
        do_PUT = _forward

        def log_message(self, _format: str, *_args) -> None:
            return

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    thread = Thread(target=server.serve_forever, name="public-smoke-proxy", daemon=True)
    thread.start()
    return server, thread


def _wait_for_saved(page: Page) -> None:
    expect(page.locator(".calculate-button")).to_be_enabled(timeout=120_000)
    expect(page.get_by_text("Стратегия и результат сохранены", exact=True)).to_be_visible(timeout=120_000)


def _earth_core_january_order(page: Page):
    month = page.locator('button[aria-label^="Earth-Core, Янв 2035:"]')
    if month.get_attribute("aria-expanded") != "true":
        month.click()
    editor = page.get_by_role("region", name="Партии Earth-Core: Янв 2035", exact=True)
    expect(editor).to_be_visible(timeout=30_000)
    return editor.get_by_label("Топливо, т", exact=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--artifacts",
        type=Path,
        default=ROOT / "frontend" / "test-results" / "public-smoke",
    )
    args = parser.parse_args()
    artifacts = args.artifacts.resolve()
    artifacts.mkdir(parents=True, exist_ok=True)
    frontend = ROOT / "frontend" / "dist"
    if not (frontend / "index.html").is_file():
        raise RuntimeError("Production frontend is missing; run npm --prefix frontend run build")

    with tempfile.TemporaryDirectory(prefix="fuel-public-browser-") as temporary:
        temporary_path = Path(temporary)
        backend_port = _free_port()
        proxy_port = _free_port()
        while proxy_port == backend_port:
            proxy_port = _free_port()
        backend_url = f"http://127.0.0.1:{backend_port}"
        public_base_url = f"http://127.0.0.1:{proxy_port}"
        public_url = f"{public_base_url}{PROXY_PREFIX}/"
        log_path = artifacts / "server.log"
        env = {
            **os.environ,
            "FUEL_BIND_HOST": "127.0.0.1",
            "FUEL_DATA_DIR": str(temporary_path / "projects"),
            "FUEL_FRONTEND_DIR": str(frontend),
            "FUEL_HTTP_USER": USERNAME,
            "FUEL_HTTP_PASSWORD": PASSWORD,
            "FUEL_PUBLIC_MODE": "1",
            "FUEL_PUBLIC_ORIGIN": "",
        }
        env.pop("FUEL_ALLOW_UNAUTHENTICATED_LOCAL", None)
        with log_path.open("w", encoding="utf-8") as log:
            process = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "src.app.web:create_web_app",
                    "--factory",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(backend_port),
                    "--workers",
                    "1",
                    "--no-proxy-headers",
                ],
                cwd=ROOT,
                env=env,
                stdout=log,
                stderr=subprocess.STDOUT,
            )
            proxy_server = None
            proxy_thread = None
            try:
                _wait_until_ready(backend_url, process, log_path)
                browser_paths: list[str] = []
                proxy_server, proxy_thread = _start_reverse_proxy(
                    backend_url=backend_url, port=proxy_port, observed_paths=browser_paths
                )
                with httpx.Client(base_url=public_base_url, timeout=10) as client:
                    assert client.get(f"{PROXY_PREFIX}/api/health").status_code == 200
                    assert client.get(f"{PROXY_PREFIX}/").status_code == 401
                    assert client.get(
                        f"{PROXY_PREFIX}/api/meta", auth=(USERNAME, "wrong")
                    ).status_code == 401
                    assert client.get(
                        f"{PROXY_PREFIX}/", auth=(USERNAME, PASSWORD)
                    ).status_code == 200

                with sync_playwright() as playwright:
                    browser = playwright.chromium.launch(headless=True)
                    context = browser.new_context(
                        accept_downloads=True,
                        http_credentials={"username": USERNAME, "password": PASSWORD},
                    )
                    page = context.new_page()
                    browser_errors: list[str] = []
                    page.on("pageerror", lambda error: browser_errors.append(f"primary: {error}"))

                    response = page.goto(public_url, wait_until="networkidle", timeout=120_000)
                    assert response is not None and response.ok
                    with httpx.Client(base_url=backend_url, auth=(USERNAME, PASSWORD)) as client:
                        import_plan = client.get("/api/calc/template").json()
                    upload_all_plan_formats(page, public_url, import_plan)
                    order = _earth_core_january_order(page)
                    order.wait_for(state="visible")
                    page.locator("#plan-name").fill("Public browser smoke")

                    with page.expect_response(
                        lambda candidate: candidate.url == f"{public_url}api/calc"
                        and candidate.request.method == "POST",
                        timeout=120_000,
                    ) as preview_info:
                        order.fill("9")
                    assert preview_info.value.ok
                    assert order.input_value() == "9"

                    with page.expect_response(
                        lambda candidate: candidate.url.endswith("/calculate")
                        and candidate.request.method == "POST",
                        timeout=120_000,
                    ) as first_save_info:
                        page.locator(".calculate-button").click()
                    assert first_save_info.value.ok
                    _wait_for_saved(page)
                    project_id = parse_qs(urlparse(page.url).query).get("project", [""])[0]
                    assert project_id

                    second = context.new_page()
                    second.on("pageerror", lambda error: browser_errors.append(f"secondary: {error}"))
                    second.goto(page.url, wait_until="networkidle", timeout=120_000)
                    second_order = _earth_core_january_order(second)
                    second_order.wait_for(state="visible")
                    assert second_order.input_value() == "9"

                    order.fill("10")
                    with page.expect_response(
                        lambda candidate: candidate.url.endswith("/calculate")
                        and candidate.request.method == "POST",
                        timeout=120_000,
                    ) as second_save_info:
                        page.locator(".calculate-button").click()
                    assert second_save_info.value.ok
                    _wait_for_saved(page)
                    page.screenshot(path=artifacts / "saved.png", full_page=True)

                    second_order.fill("11")
                    second.locator(".calculate-button").click()
                    second.locator(".error-banner").get_by_text(
                        "План изменён в другом окне", exact=False
                    ).wait_for(timeout=120_000)
                    second.screenshot(path=artifacts / "revision-conflict.png", full_page=True)

                    page.reload(wait_until="networkidle", timeout=120_000)
                    order = _earth_core_january_order(page)
                    order.wait_for(state="visible")
                    assert order.input_value() == "10"
                    assert page.locator("#plan-name").input_value() == "Public browser smoke"

                    page.get_by_role("button", name="Выгрузить", exact=True).click()
                    result_download = page.get_by_role("button", name="Результат JSON", exact=True)
                    assert result_download.is_enabled()
                    with page.expect_download(timeout=120_000) as download_info:
                        result_download.click()
                    download = download_info.value
                    destination = artifacts / download.suggested_filename
                    download.save_as(destination)
                    exported = json.loads(destination.read_text(encoding="utf-8"))
                    assert exported["plan_id"]
                    assert exported["scenario_id"] == "BASE"
                    assert exported["_web_export"]["origin"] == "server"
                    assert browser_paths
                    assert all(path.startswith(f"{PROXY_PREFIX}/") for path in browser_paths)
                    assert not browser_errors, browser_errors
                    page.screenshot(path=artifacts / "reloaded-and-exported.png", full_page=True)
                    (artifacts / "report.json").write_text(
                        json.dumps(
                            {
                                "checks": [
                                    "health remains public",
                                    "shared Basic Auth protects UI and API",
                                    "assets and API stay inside the reverse-proxy prefix",
                                    "live preview uses the production API",
                                    "JSON, CSV, XLSX and XLS plans pass through the production UI and API",
                                    "save and reload preserve the edited plan",
                                    "stale second tab gets a revision conflict",
                                    "result JSON is downloaded by the browser",
                                ],
                                "project_id": project_id,
                                "browser_errors": browser_errors,
                            },
                            ensure_ascii=False,
                            indent=2,
                        ),
                        encoding="utf-8",
                    )
                    context.close()
                    browser.close()
            except Exception:
                log.flush()
                try:
                    if "page" in locals() and not page.is_closed():
                        page.screenshot(path=artifacts / "failure.png", full_page=True)
                except Exception:
                    pass
                print(log_path.read_text(encoding="utf-8", errors="replace"), file=sys.stderr)
                raise
            finally:
                if proxy_server is not None:
                    proxy_server.shutdown()
                    proxy_server.server_close()
                if proxy_thread is not None:
                    proxy_thread.join(timeout=5)
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)

    print("PASS: authenticated production browser save/reload/conflict/export smoke")


if __name__ == "__main__":
    main()
