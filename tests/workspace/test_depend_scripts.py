from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[2]


class DependBootstrapContractTests(unittest.TestCase):
    def _read_required(self, relative_path: str) -> str:
        path = ROOT / relative_path
        self.assertTrue(path.is_file(), f"missing bootstrap file: {relative_path}")
        return path.read_text(encoding="utf-8") if path.is_file() else ""

    def test_both_platform_entrypoints_exist(self):
        self._read_required("depend.sh")
        self._read_required("depend.ps1")

    def test_shared_provisional_versions_are_declared(self):
        versions = self._read_required("tools/tool-versions.env")
        self.assertIn("PYTHON_VERSION=3.12", versions)
        self.assertIn("NODE_VERSION=24.21.0", versions)
        self.assertIn("UV_VERSION=0.12.17", versions)

    def test_shell_contract_has_check_install_and_g0_gate(self):
        script = self._read_required("depend.sh")
        for expected in (
            "--check",
            "--full-check",
            "G0_PENDING",
            "uv sync --locked",
            "npm --prefix",
            "ci",
            "docker compose",
            "config --quiet",
        ):
            self.assertIn(expected, script)

    def test_powershell_contract_has_check_install_and_g0_gate(self):
        script = self._read_required("depend.ps1")
        for expected in (
            "--check",
            "--full-check",
            "G0_PENDING",
            "uv sync --locked",
            "npm --prefix",
            "ci",
            "docker compose",
            "config --quiet",
        ):
            self.assertIn(expected, script)

    def test_scripts_do_not_install_global_python_packages_or_destroy_state(self):
        shell = self._read_required("depend.sh")
        powershell = self._read_required("depend.ps1")
        combined = f"{shell}\n{powershell}".lower()
        for forbidden in (
            "pip install",
            "pip3 install",
            "git reset --hard",
            "git clean -fd",
            "chmod 666",
            "docker compose down -v",
        ):
            self.assertNotIn(forbidden, combined)

    def test_shell_prefers_managed_node_over_legacy_user_bin(self):
        script = self._read_required("depend.sh")
        path_lines = [line for line in script.splitlines() if line.startswith("export PATH=")]
        self.assertTrue(path_lines, "depend.sh must define a user-local PATH")
        self.assertEqual(
            path_lines[0],
            'export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"',
        )

    def test_shell_uses_the_available_compose_filename(self):
        script = self._read_required("depend.sh")
        self.assertIn('compose_file="$ROOT_DIR/docker/compose.yaml"', script)
        self.assertIn('compose_file="$ROOT_DIR/compose.yaml"', script)
        self.assertIn('compose_file="$ROOT_DIR/docker-compose.yml"', script)
        self.assertIn('docker compose -f "$compose_file" config --quiet', script)

    def test_shell_has_explicit_linux_distribution_routes(self):
        script = self._read_required("depend.sh")
        self.assertIn("ubuntu|debian", script)
        self.assertIn("fedora)", script)
        self.assertIn(
            "https://download.docker.com/linux/fedora/docker-ce.repo",
            script,
        )
        self.assertIn("unsupported Linux distribution", script)

    def test_powershell_checks_docker_exit_codes_explicitly(self):
        script = self._read_required("depend.ps1")
        self.assertIn('$null = & docker info 2>$null', script)
        self.assertIn('$null = & docker compose version 2>$null', script)
        self.assertIn('$LASTEXITCODE -eq 0', script)

    def test_powershell_reports_node_install_path_failures(self):
        script = self._read_required("depend.ps1")
        self.assertIn("Node.js is still missing after installation", script)

    def test_powershell_refreshes_path_after_winget(self):
        script = self._read_required("depend.ps1")
        self.assertIn("Refresh-SessionPath", script)
        self.assertIn("GetEnvironmentVariable(\"Path\"", script)

    def test_backend_only_mode_does_not_require_frontend_tools(self):
        for relative in ("depend.sh", "depend.ps1"):
            script = self._read_required(relative)
            self.assertIn("--backend-only", script)
            self.assertIn("requirements-dev.txt", script)
            self.assertIn("uv pip sync", script)
            self.assertIn("-m pytest", script)

    def test_shell_syncs_backend_before_optional_frontend(self):
        script = self._read_required("depend.sh")
        sync = script.split("sync_project_if_ready()", 1)[1].split("run_full_checks()", 1)[0]
        # Missing UI manifests must not return before the Python environment exists.
        self.assertLess(sync.index("uv pip sync"), sync.index("frontend/package.json"))
        checks = script.split("run_full_checks()", 1)[1]
        self.assertNotIn('"$G0_PENDING" == 1', checks.split("printf 'Kosmo", 1)[0])

    def test_shell_help_is_available(self):
        script = ROOT / "depend.sh"
        self.assertTrue(script.is_file(), "depend.sh must exist before invoking it")
        if not script.is_file():
            return
        result = subprocess.run(
            ["bash", str(script), "--help"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--check", result.stdout)


if __name__ == "__main__":
    unittest.main()
