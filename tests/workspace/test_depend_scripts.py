from pathlib import Path
import subprocess
import tempfile
import os
import signal
import time
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]


class DependBootstrapContractTests(unittest.TestCase):
    def _read_required(self, relative_path: str) -> str:
        path = ROOT / relative_path
        self.assertTrue(path.is_file(), f"missing bootstrap file: {relative_path}")
        return path.read_text(encoding="utf-8") if path.is_file() else ""

    def test_linux_entrypoint_exists(self):
        self._read_required("scripts/prepare.sh")

    def test_shared_recommended_versions_are_declared(self):
        versions = self._read_required("tools/tool-versions.env")
        self.assertIn("PYTHON_VERSION=3.13", versions)
        self.assertIn("NODE_VERSION=22.16.0", versions)
        self.assertIn("UV_VERSION=0.12.17", versions)

    def test_shell_contract_has_check_install_and_manifest_checks(self):
        script = self._read_required("scripts/prepare.sh")
        for expected in (
            "--check",
            "--full-check",
            "uv sync --locked",
            "npm --prefix",
            "ci",
            "docker compose",
            "config --quiet",
        ):
            self.assertIn(expected, script)


    def test_scripts_do_not_install_global_python_packages_or_destroy_state(self):
        shell = self._read_required("scripts/prepare.sh")
        combined = shell.lower()
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
        script = self._read_required("scripts/prepare.sh")
        path_lines = [line for line in script.splitlines() if line.startswith("export PATH=")]
        self.assertTrue(path_lines, "scripts/prepare.sh must define a user-local PATH")
        self.assertEqual(
            path_lines[0],
            'export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"',
        )

    def test_shell_uses_the_available_compose_filename(self):
        script = self._read_required("scripts/prepare.sh")
        self.assertIn('compose_file="$ROOT_DIR/docker/compose.yaml"', script)
        self.assertIn('docker compose -f "$compose_file" --env-file "$compose_env" config --quiet', script)

    def test_shell_has_explicit_linux_distribution_routes(self):
        script = self._read_required("scripts/prepare.sh")
        self.assertIn("ubuntu|debian", script)
        self.assertIn("fedora)", script)
        self.assertIn(
            "https://download.docker.com/linux/fedora/docker-ce.repo",
            script,
        )
        self.assertIn("unsupported Linux distribution", script)




    def test_backend_only_mode_does_not_require_frontend_tools(self):
        for relative in ("scripts/prepare.sh",):
            script = self._read_required(relative)
            self.assertIn("--backend-only", script)
            self.assertIn("requirements/dev.txt", script)
            self.assertIn("uv pip sync", script)
            self.assertIn("-m pytest", script)

    def test_shell_syncs_backend_before_optional_frontend(self):
        script = self._read_required("scripts/prepare.sh")
        sync = script.split("sync_project_if_ready()", 1)[1].split("run_full_checks()", 1)[0]
        # Missing UI manifests must not return before the Python environment exists.
        self.assertLess(sync.index("uv pip sync"), sync.index("frontend/package.json"))
        checks = script.split("run_full_checks()", 1)[1]
        self.assertNotIn('"$G0_PENDING" == 1', checks.split("printf 'Kosmo", 1)[0])

    def test_shell_help_is_available(self):
        script = ROOT / "scripts/prepare.sh"
        self.assertTrue(script.is_file(), "scripts/prepare.sh must exist before invoking it")
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

    def test_run_honors_explicit_python_over_local_venv(self):
        import shutil
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(ROOT / "run.sh", root / "run.sh")
            (root / ".venv/bin").mkdir(parents=True)
            local = root / ".venv/bin/python"
            local.write_text("#!/bin/sh\nexit 42\n")
            local.chmod(0o755)
            selected = root / "selected-python"
            selected.write_text('#!/bin/sh\nprintf "%s\\n" "$@"\n')
            selected.chmod(0o755)
            result = subprocess.run(
                ["bash", str(root / "run.sh"), "local"], capture_output=True, text=True,
                env={**os.environ, "PYTHON": str(selected), "FUEL_FRONTEND_DIR": str(root)},
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("src.app.web:create_web_app", result.stdout)

    def test_local_run_requires_the_vite_dist_without_portable_fallback(self):
        script = self._read_required("run.sh")
        self.assertNotIn("prebuilt", script)
        self.assertNotIn("verify_prebuilt", script)

        import shutil
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(ROOT / "run.sh", root / "run.sh")
            selected = root / "selected-python"
            selected.write_text("#!/bin/sh\nexit 99\n")
            selected.chmod(0o755)
            env = {**os.environ, "PYTHON": str(selected)}
            env.pop("FUEL_FRONTEND_DIR", None)
            result = subprocess.run(
                ["bash", str(root / "run.sh"), "local"],
                cwd=root,
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("npm --prefix frontend run build", result.stderr)

    def test_run_starts_public_compose_and_waits_for_health(self):
        import shutil
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(ROOT / "run.sh", root / "run.sh")
            (root / "docker").mkdir()
            (root / "docker/compose.yaml").touch()
            (root / "docker/.env.example").touch()
            (root / "bin").mkdir()
            log = root / "docker.log"
            docker = root / "bin/docker"
            docker.write_text(
                '#!/bin/sh\nprintf "%s|%s\\n" "$FUEL_BIND_HOST" "$*" >> "$TEST_LOG"\n'
            )
            docker.chmod(0o755)
            env = {
                **os.environ,
                "PATH": str(root / "bin") + ":" + os.environ["PATH"],
                "TEST_LOG": str(log),
            }
            env.pop("FUEL_BIND_HOST", None)
            result = subprocess.run(
                ["bash", str(root / "run.sh")],
                cwd=root,
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                log.read_text().splitlines(),
                [
                    "0.0.0.0|compose --env-file "
                    + str(root / "docker/.env.example")
                    + " -f "
                    + str(root / "docker/compose.yaml")
                    + " up --build -d --wait"
                ],
            )

    def test_run_reports_web_logs_when_public_service_is_not_ready(self):
        import shutil
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(ROOT / "run.sh", root / "run.sh")
            (root / "docker").mkdir()
            (root / "docker/compose.yaml").touch()
            (root / "docker/.env.example").touch()
            (root / "bin").mkdir()
            log = root / "docker.log"
            docker = root / "bin/docker"
            docker.write_text(
                '#!/bin/sh\nprintf "%s\\n" "$*" >> "$TEST_LOG"\n'
                'case "$*" in *" up --build -d --wait") exit 9;; esac\n'
            )
            docker.chmod(0o755)
            result = subprocess.run(
                ["bash", str(root / "run.sh")],
                cwd=root,
                env={
                    **os.environ,
                    "PATH": str(root / "bin") + ":" + os.environ["PATH"],
                    "TEST_LOG": str(log),
                },
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("site did not become ready", result.stderr)
            self.assertEqual(
                log.read_text().splitlines()[-1],
                "compose --env-file "
                + str(root / "docker/.env.example")
                + " -f "
                + str(root / "docker/compose.yaml")
                + " logs --tail=100 web",
            )

    def test_prepare_installs_and_builds_frontend_in_order(self):
        script = self._read_required("scripts/prepare.sh")
        function = "sync_project_if_ready()" + script.split("sync_project_if_ready()", 1)[1].split("run_full_checks()", 1)[0]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "frontend").mkdir()
            (root / "docker").mkdir()
            (root / "requirements").mkdir()
            for name in (
                "pyproject.toml",
                "requirements/dev.txt",
                "frontend/package.json",
                "frontend/package-lock.json",
                "docker/compose.yaml",
                "docker/.env.example",
            ):
                (root / name).touch()
            log = root / "npm.log"
            harness = r'''
MODE=install BACKEND_ONLY=0 BACKEND_READY=0 FRONTEND_READY=0 BLOCKED=0
DOCKER_READY=0 PYTHON_TARGET=3.13
command_exists() { return 0; }
pass() { :; }
warn() { :; }
blocked() { BLOCKED=$((BLOCKED + 1)); }
uv() { return 0; }
npm() { printf '%s\n' "$*" >> "$TEST_LOG"; }
'''
            result = subprocess.run(
                ["bash", "-c", harness + function + '\nsync_project_if_ready\nexit "$BLOCKED"'],
                env={**os.environ, "ROOT_DIR": directory, "TEST_LOG": str(log)},
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                log.read_text().splitlines(),
                [
                    f"--prefix {root / 'frontend'} ci",
                    f"--prefix {root / 'frontend'} run build",
                ],
            )

    def test_dev_launcher_stops_both_children_on_term(self):
        import shutil
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(ROOT / 'run.sh', root / 'run.sh')
            (root / 'frontend').mkdir()
            (root / 'bin').mkdir()
            worker = root / 'worker.py'
            worker.write_text('''import os, signal, sys, time
from pathlib import Path
name = sys.argv[1]
root = Path(os.environ['TEST_ROOT'])
def stop(*args):
    (root / (name + '.stopped')).touch()
    sys.exit(0)
signal.signal(signal.SIGTERM, stop)
(root / (name + '.pid')).write_text(str(os.getpid()))
while True: time.sleep(.05)
''')
            for name in ('backend', 'npm'):
                executable = root / 'bin' / name
                executable.write_text('#!/bin/sh\nexec "$TEST_PYTHON" "$TEST_ROOT/worker.py" ' + name + '\n')
                executable.chmod(0o755)
            proc = subprocess.Popen(
                ['bash', str(root / 'run.sh'), 'dev'], cwd=root, start_new_session=True,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                env={**os.environ, 'PYTHON': str(root / 'bin/backend'),
                     'PATH': str(root / 'bin') + ':' + os.environ['PATH'],
                     'TEST_ROOT': directory, 'TEST_PYTHON': sys.executable},
            )
            try:
                deadline = time.monotonic() + 3
                while not all((root / (name + '.pid')).exists() for name in ('backend', 'npm')):
                    self.assertLess(time.monotonic(), deadline, 'dev children did not start')
                    time.sleep(.02)
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    self.fail('launcher does not handle TERM while frontend is running')
                self.assertEqual(proc.returncode, 143)
                for name in ('backend', 'npm'):
                    self.assertTrue((root / (name + '.stopped')).exists(), name + ' was not stopped')
            finally:
                for name in ('backend', 'npm'):
                    pid_file = root / (name + '.pid')
                    if pid_file.exists():
                        try: os.kill(int(pid_file.read_text()), signal.SIGKILL)
                        except ProcessLookupError: pass
                if proc.poll() is None:
                    os.killpg(proc.pid, signal.SIGKILL)
                proc.wait(timeout=3)

    def test_bootstrap_accepts_supported_versions_and_honors_explicit_pins(self):
        script = self._read_required("scripts/prepare.sh")
        pins = "trim_first_line()" + script.split("trim_first_line()", 1)[1].split("export PATH=", 1)[0]
        helpers = "version_matches()" + script.split("version_matches()", 1)[1].split("sudo_run()", 1)[0]
        python_check = "ensure_python()" + script.split("ensure_python()", 1)[1].split("ensure_node()", 1)[0]
        node_check = "ensure_node()" + script.split("ensure_node()", 1)[1].split("ensure_docker()", 1)[0]
        harness = '''
MODE=check PYTHON_TARGET=3.13 NODE_TARGET=22.16.0
command_exists() { return 0; }
pass() { :; }
blocked() { :; }
python3() { echo "$TEST_VERSION"; }
node() { echo "v$TEST_VERSION"; }
npm() { echo 10.0.0; }
'''
        with tempfile.TemporaryDirectory() as directory:
            cases = [('python', '3.12.3', False), ('python', '3.13.5', True),
                     ('python', '3.14.0', False), ('node', '22.11.0', False),
                     ('node', '22.12.0', True), ('node', '22.17.0', True),
                     ('node', '24.21.0', True), ('node', '25.0.0', False)]
            for pinned in ('absent', 'valid', 'invalid'):
                if pinned != 'absent':
                    (Path(directory) / '.python-version').write_text('3.13' if pinned == 'valid' else 'bad-version')
                    (Path(directory) / '.node-version').write_text('22.16.0' if pinned == 'valid' else 'bad-version')
                for tool, version, accepted in cases:
                    with self.subTest(tool=tool, version=version, pinned=pinned):
                        result = subprocess.run(
                            ['bash', '-c', harness + pins + helpers + python_check + node_check + '\nensure_' + tool],
                            env={**os.environ, 'ROOT_DIR': directory, 'TEST_VERSION': version},
                            capture_output=True, text=True,
                        )
                        expected = (version.startswith('3.13.') if tool == 'python' else version == '22.16.0') if pinned == 'valid' else accepted
                        self.assertEqual(result.returncode == 0, expected, result.stderr)

    def test_shell_selects_site_compose_and_reports_missing_manifests(self):
        # Exercise manifest selection without installing tools or contacting Docker.
        # The Docker boundary checks the selected file; all file discovery is real.
        script = self._read_required("scripts/prepare.sh")
        function = "sync_project_if_ready()" + script.split("sync_project_if_ready()", 1)[1].split("run_full_checks()", 1)[0]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "frontend").mkdir()
            (root / "docker").mkdir()
            (root / "requirements").mkdir()
            for name in ("pyproject.toml", "requirements/dev.txt", "frontend/package.json",
                         "frontend/package-lock.json", "docker/compose.yaml", "docker/.env.example"):
                (root / name).touch()
            harness = '''
MODE=check BACKEND_ONLY=0 DOCKER_READY=1 BLOCKED=0
pass() { :; }
warn() { :; }
blocked() { BLOCKED=$((BLOCKED + 1)); }
docker() { test "$3" = "$ROOT_DIR/docker/compose.yaml"; }
'''
            for missing in (None, "frontend/package-lock.json", "docker/compose.yaml"):
                with self.subTest(missing=missing):
                    if missing:
                        (root / missing).unlink()
                    result = subprocess.run(
                        ["bash", "-c", harness + function + '\nsync_project_if_ready\nexit "$BLOCKED"'],
                        env={**os.environ, "ROOT_DIR": directory}, capture_output=True, text=True,
                    )
                    self.assertEqual(result.returncode, 0 if missing is None else 1, result.stderr)
                    if missing:
                        (root / missing).touch()


if __name__ == "__main__":
    unittest.main()
