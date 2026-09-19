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
    }
    assert all(job["runs-on"] == "ubuntu-latest" for job in workflow["jobs"].values())


def test_gitverse_ci_runs_each_required_verification_and_cleanup() -> None:
    jobs = load_workflow()["jobs"]

    integrity = commands(jobs["integrity-contracts"])
    assert "tools/workspace.py" not in integrity
    assert "tools/export_openapi.py --check" in integrity
    assert "tools/generate_frontend_types.py --check" in integrity

    assert "pytest -q" in commands(jobs["python-tests"])

    frontend = commands(jobs["frontend"])
    assert "npm --prefix frontend ci" in frontend
    assert "npm --prefix frontend test" in frontend
    assert "npm --prefix frontend run build" in frontend
    assert "tools/verify_prebuilt.py" not in frontend

    serialized = WORKFLOW.read_text(encoding="utf-8")
    assert "submodules:" not in serialized
    assert "prebuilt" not in serialized
    assert "docker compose" not in serialized
    assert "playwright" not in serialized.lower()
    assert "deployment_smoke.py" not in serialized
    assert "daily_smoke.py" not in serialized
    assert "upload-artifact" not in serialized
    assert "download-artifact" not in serialized
