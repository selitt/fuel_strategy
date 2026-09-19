"""Verify a deployed Fuel Contour HTTP endpoint without changing stored projects."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def request_bytes(base_url: str, path: str, *, payload: object | None = None) -> bytes:
    body = None if payload is None else json.dumps(payload).encode()
    request = Request(
        urljoin(base_url.rstrip("/") + "/", path.lstrip("/")),
        data=body,
        headers={"Content-Type": "application/json"} if body is not None else {},
        method="POST" if body is not None else "GET",
    )
    try:
        with urlopen(request, timeout=30) as response:
            if response.status != 200:
                raise RuntimeError(f"{path} returned HTTP {response.status}")
            return response.read()
    except HTTPError as error:
        raise RuntimeError(f"{path} returned HTTP {error.code}") from error


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--artifacts", type=Path, required=True)
    args = parser.parse_args()
    args.artifacts.mkdir(parents=True, exist_ok=True)
    checks: list[str] = []

    try:
        html = request_bytes(args.base_url, "/").decode("utf-8")
        if '<div id="root"' not in html:
            raise AssertionError("frontend root element is missing")
        checks.append("frontend HTML")

        assets = sorted(set(re.findall(r'(?:src|href)=["\'](/assets/[^"\']+)', html)))
        if not assets:
            raise AssertionError("frontend HTML does not reference built assets")
        for asset in assets:
            request_bytes(args.base_url, asset)
        checks.append("frontend assets")

        health = json.loads(request_bytes(args.base_url, "/api/health"))
        if health.get("status") != "ok" or not isinstance(health.get("engine"), dict):
            raise AssertionError("health response is not ready")
        checks.append("API health")

        template = json.loads(request_bytes(args.base_url, "/api/calc/template"))
        if not {"plan_id", "scenario_id", "decisions"} <= template.keys():
            raise AssertionError("calculation template is incomplete")
        checks.append("calculation template")

        result = json.loads(request_bytes(args.base_url, "/api/calc", payload=template))
        required = {"plan_id", "scenario_id", "yearly_balance", "financial_breakdown", "constraint_checks", "source_schedule"}
        if not required <= result.keys() or not result["yearly_balance"]:
            raise AssertionError("calculation result is incomplete")
        checks.append("stateless calculation")
    except Exception as error:
        report = {
            "status": "failed",
            "base_url": args.base_url,
            "checks": checks,
            "error": str(error),
        }
        (args.artifacts / "report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"deployment smoke failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    (args.artifacts / "report.json").write_text(
        json.dumps({"status": "passed", "base_url": args.base_url, "checks": checks}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(checks)} deployment checks passed")


if __name__ == "__main__":
    main()
