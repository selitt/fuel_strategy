"""Upload every supported plan format through a running production UI."""
from __future__ import annotations

import argparse
from urllib.parse import parse_qs, urlparse

import httpx
from playwright.sync_api import expect, sync_playwright

from plan_import_fixtures import upload_all_plan_formats


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/") + "/"
    auth = (args.username, args.password)
    with httpx.Client(base_url=base_url, auth=auth, timeout=30) as client:
        plan = client.get("api/calc/template").json()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(http_credentials={"username": args.username, "password": args.password})
        page = context.new_page()
        response = page.goto(base_url, wait_until="networkidle", timeout=120_000)
        assert response is not None and response.ok
        upload_all_plan_formats(page, base_url, plan)
        with page.expect_response(
            lambda candidate: candidate.url.endswith("/calculate") and candidate.request.method == "POST",
            timeout=120_000,
        ) as save_info:
            page.locator(".calculate-button").click()
        assert save_info.value.ok
        expect(page.get_by_text("План и результат сохранены", exact=True)).to_be_visible(timeout=120_000)
        project_id = parse_qs(urlparse(page.url).query).get("project", [""])[0]
        assert project_id
        page.reload(wait_until="networkidle", timeout=120_000)
        expect(page.locator("#plan-name")).to_have_value("browser-plan", timeout=30_000)
        with httpx.Client(base_url=base_url, auth=auth, timeout=30) as client:
            saved = client.get(f"api/projects/{project_id}")
            assert saved.status_code == 200
            assert saved.json()["plan"] == plan
        context.close()
        browser.close()
    print("PASS: Docker production UI imported JSON, CSV, XLSX and XLS, then saved and reloaded the plan")


if __name__ == "__main__":
    main()
