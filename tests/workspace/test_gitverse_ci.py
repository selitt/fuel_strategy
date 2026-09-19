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
        "server-browser",
    }
    assert workflow["jobs"]["server-browser"]["needs"] == [
        "integrity-contracts",
        "python-tests",
        "frontend",
    ]
    assert all(job["runs-on"] == "ubuntu-latest" for job in workflow["jobs"].values())


def test_gitverse_ci_runs_each_required_verification_and_cleanup() -> None:
    jobs = load_workflow()["jobs"]

    integrity = commands(jobs["integrity-contracts"])
    assert "tools/workspace.py check" in integrity
    assert "tools/export_openapi.py --check" in integrity
    assert "tools/generate_frontend_types.py --check" in integrity

    assert "pytest -q" in commands(jobs["python-tests"])

    frontend = commands(jobs["frontend"])
    assert "npm --prefix frontend ci" in frontend
    assert "npm --prefix frontend test" in frontend
    assert "npm --prefix frontend run build" in frontend
    assert "tools/verify_prebuilt.py" in frontend

    server = commands(jobs["server-browser"])
    assert "docker compose" in server
    assert "tests/web/deployment_smoke.py" in server
    assert "tests/web/daily_smoke.py" in server
    assert any(
        step.get("if") == "always()" and "down -v --remove-orphans" in step.get("run", "")
        for step in jobs["server-browser"]["steps"]
    )


def test_gitverse_ci_transfers_frontend_and_keeps_failure_artifacts() -> None:
    jobs = load_workflow()["jobs"]

    assert any(
        step.get("uses", "").startswith("actions/upload-artifact@")
        and step.get("with", {}).get("name") == "frontend-dist"
        for step in jobs["frontend"]["steps"]
    )
    assert any(
        step.get("uses", "").startswith("actions/download-artifact@")
        and step.get("with", {}).get("name") == "frontend-dist"
        for step in jobs["server-browser"]["steps"]
    )
    assert any(
        step.get("if") == "always()"
        and step.get("uses", "").startswith("actions/upload-artifact@")
        and step.get("with", {}).get("name") == "server-browser-artifacts"
        for step in jobs["server-browser"]["steps"]
    )
