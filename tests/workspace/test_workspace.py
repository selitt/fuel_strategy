"""Tests for workspace integrity tooling only; no business calculations are tested."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("fuel_workspace_tool", ROOT / "tools/workspace.py")
workspace = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(workspace)


class WorkspaceChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="fuel workspace ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "copy"
        shutil.copytree(ROOT, self.root, ignore=shutil.ignore_patterns(".git", "__pycache__", "*.pyc", ".venv", "venv", "node_modules", ".local", ".pytest_cache", "dist", "build"))

    def edit_json(self, path, edit):
        file = self.root / path
        value = json.loads(file.read_text(encoding="utf-8"))
        edit(value)
        file.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")

    def assertFailure(self, expected):
        report = workspace.inspect_workspace(self.root)
        self.assertFalse(report["ok"], report)
        self.assertIn(expected, "\n".join(report["errors"]))
        return report

    def test_clean_workspace_passes_but_is_not_product_verification(self):
        report = workspace.inspect_workspace(self.root)
        self.assertTrue(report["ok"], report)
        self.assertEqual(report["scope"], "workspace_only_not_product")
        self.assertGreater(len(report["warnings"]), 0)
        self.assertFalse(report["application_implemented"])

    def test_local_environments_and_runtime_files_are_not_source_materials(self):
        for relative in (".venv", "venv", "node_modules", ".local", ".pytest_cache"):
            local = self.root / relative
            local.mkdir(exist_ok=True)
            (local / "broken.json").write_text("not JSON", encoding="utf-8")
            (local / "README.md").write_text("[missing](does-not-exist.md)", encoding="utf-8")
        # POSIX virtualenvs legitimately contain symlinks to the interpreter.
        # Windows' default venv uses copies and may require admin for symlinks.
        if sys.platform != "win32":
            (self.root / ".venv" / "python").symlink_to(sys.executable)
        report = workspace.inspect_workspace(self.root)
        self.assertTrue(report["ok"], report)

    def test_modified_original_is_rejected(self):
        target = self.root / "fuel-hackathon/test_oil/data/demand.csv"
        target.write_bytes(target.read_bytes() + b"\n")
        self.assertFailure("hash mismatch")

    def test_missing_required_file_is_rejected(self):
        (self.root / "docs/PRODUCT.md").unlink()
        self.assertFailure("missing")

    def test_unsafe_manifest_path_is_rejected(self):
        self.edit_json("sources.lock.json", lambda x: x["files"][0].update(path="../escape.txt"))
        self.assertFailure("unsafe path")

    def test_empty_required_document_is_rejected(self):
        (self.root / "docs/PRODUCT.md").write_text("", encoding="utf-8")
        self.assertFailure("empty")

    def test_broken_local_navigation_is_rejected(self):
        with (self.root / "START_HERE.md").open("a", encoding="utf-8") as handle:
            handle.write("\n[broken](docs/no-such-file.md)\n")
        self.assertFailure("broken local link")

    def test_unknown_dependency_is_rejected(self):
        self.edit_json("tasks/index.json", lambda x: x["tasks"][0].update(depends_on=["UNKNOWN"]))
        self.assertFailure("unknown task dependency")

    def test_dependency_cycle_is_rejected(self):
        self.edit_json("tasks/index.json", lambda x: x["tasks"][0].update(depends_on=["T01"]))
        self.assertFailure("dependency cycle")

    def test_duplicate_criterion_is_rejected(self):
        self.edit_json("docs/regulation/criteria.json", lambda x: x["criteria"][1].update(id="K01"))
        self.assertFailure("criterion IDs")

    def test_criterion_points_are_not_silently_changed(self):
        self.edit_json("docs/regulation/criteria.json", lambda x: x["criteria"][0].update(max_points=10))
        self.assertFailure("100 points")

    def test_missing_acceptance_task_is_rejected(self):
        self.edit_json("tests/acceptance/catalog.json", lambda x: x["cases"][0].update(tasks=["UNKNOWN"]))
        self.assertFailure("acceptance")

    def test_invalid_json_produces_diagnostic(self):
        (self.root / "configs/team_assumptions.template.json").write_text("{invalid", encoding="utf-8")
        self.assertFailure("JSON")

    def test_unregistered_nested_git_is_rejected(self):
        (self.root / "src/.git").mkdir()
        self.assertFailure("unregistered nested Git")

    def test_registered_reference_git_is_allowed_for_existing_repo_overlay(self):
        (self.root / ".gitmodules").write_text(
            '[submodule "fuel-hackathon/test_oil"]\n'
            'path = fuel-hackathon/test_oil\n'
            'url = https://github.com/SpaceEconomyPolicy/test_oil.git\n',
            encoding="utf-8")
        (self.root / "fuel-hackathon/test_oil/.git").mkdir()
        report = workspace.inspect_workspace(self.root)
        self.assertTrue(report["ok"], report)

    def test_empty_plan_is_not_marked_feasible(self):
        plan = json.loads((self.root / "plans/templates/empty_plan.json").read_text(encoding="utf-8"))
        self.assertEqual(plan["decisions"]["supply_orders"], [])
        assumptions = json.loads((self.root / "configs/team_assumptions.template.json").read_text(encoding="utf-8"))
        self.assertFalse(assumptions["ready_for_calculation"])
        self.assertIsNotNone(json.loads((self.root / "workspace.json").read_text())["application_stack"])

    def test_cli_handles_root_with_spaces_and_json_output(self):
        run = subprocess.run(
            [sys.executable, "-S", str(self.root / "tools/workspace.py"), "check", "--root", str(self.root), "--json"],
            capture_output=True, text=True, encoding="utf-8", timeout=30)
        self.assertEqual(run.returncode, 0, run.stderr + run.stdout)
        self.assertTrue(json.loads(run.stdout)["ok"])

    def test_cli_returns_failure_on_missing_required_file(self):
        (self.root / "docs/PRODUCT.md").unlink()
        run = subprocess.run(
            [sys.executable, "-S", str(self.root / "tools/workspace.py"), "check", "--root", str(self.root), "--json"],
            capture_output=True, text=True, encoding="utf-8", timeout=30)
        self.assertEqual(run.returncode, 1)
        self.assertFalse(json.loads(run.stdout)["ok"])


if __name__ == "__main__":
    unittest.main()
