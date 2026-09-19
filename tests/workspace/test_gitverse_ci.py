from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".gitverse/workflows/ci.yml"


def load_workflow() -> dict:
    assert WORKFLOW.is_file(), "GitVerse CI workflow is missing"
    return yaml.load(WORKFLOW.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)


def commands(job: dict) -> str:
    return "\n".join(step.get("run", "") for step in job["steps"])


def test_gitverse_ci_has_expected_triggers_and_job_graph() -> None:
    workflow = load_workflow()

    assert set(workflow["on"]) == {"push", "pull_request", "workflow_dispatch"}
    assert set(workflow["jobs"]) == {
        "integrity-contracts",
        "python-tests",
        "frontend",
        "public-browser-smoke",
    }
    assert all(job["runs-on"] == "ubuntu-latest" for job in workflow["jobs"].values())


def test_gitverse_ci_runs_each_required_verification_and_cleanup() -> None:
    jobs = load_workflow()["jobs"]

    integrity = commands(jobs["integrity-contracts"])
    assert "tools/workspace.py" not in integrity
    assert "tools/export_openapi.py --check" in integrity
    assert "tools/generate_frontend_types.py --check" in integrity

    python_tests = commands(jobs["python-tests"])
    assert "pytest -q" in python_tests
    assert "--cov=src.app" in python_tests
    assert "--cov-report=term-missing" in python_tests

    frontend = commands(jobs["frontend"])
    assert "npm --prefix frontend ci" in frontend
    assert "npm --prefix frontend test -- --coverage" in frontend
    assert "npm --prefix frontend run build" in frontend
    assert "tools/verify_prebuilt.py" not in frontend

    browser = commands(jobs["public-browser-smoke"])
    assert "requirements/browser.txt" in browser
    assert "playwright install --with-deps chromium" in browser
    assert "npm --prefix frontend run build" in browser
    assert "tests/web/public_smoke.py" in browser
    assert "docker compose" in browser
    assert "config --quiet" in browser
    assert "actions/upload-artifact@v4" in WORKFLOW.read_text(encoding="utf-8")

    serialized = WORKFLOW.read_text(encoding="utf-8")
    assert "submodules:" not in serialized
    assert "prebuilt" not in serialized
    assert "deployment_smoke.py" not in serialized
    assert "daily_smoke.py" not in serialized
    assert "download-artifact" not in serialized
