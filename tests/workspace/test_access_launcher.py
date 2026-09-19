import json
import os
from pathlib import Path
import pty
import select
import shutil
import stat
import subprocess
import sys
import time

import pytest


ROOT = Path(__file__).resolve().parents[2]


def _compose_file(path: Path) -> Path:
    path.write_text(
        """services:
  web:
    image: busybox
    environment:
      FUEL_HTTP_USER: ${FUEL_HTTP_USER:-}
      FUEL_HTTP_PASSWORD: ${FUEL_HTTP_PASSWORD:-}
""",
        encoding="utf-8",
    )
    return path


def _clean_environment():
    return {
        key: value for key, value in os.environ.items()
        if key not in {"FUEL_HTTP_USER", "FUEL_HTTP_PASSWORD"}
    }


@pytest.mark.skipif(shutil.which("docker") is None, reason="Docker Compose CLI is unavailable")
def test_access_setup_preserves_env_and_roundtrips_compose_special_characters(tmp_path):
    from tools.configure_access import configure_access

    compose_file = _compose_file(tmp_path / "compose.yaml")
    template = tmp_path / ".env.example"
    template.write_text(
        "# existing settings\nFUEL_BIND_HOST=127.0.0.1\nFUEL_HTTP_USER=\n"
        "FUEL_HTTP_PASSWORD=\nCUSTOM_SETTING=keep-me\n",
        encoding="utf-8",
    )
    target = tmp_path / ".env"
    username = "team'user"
    password = "one$ two$$ ref${NAME} double\" single' slash\\ trailing\\"

    changed = configure_access(
        compose_file=compose_file,
        source_env=template,
        target_env=target,
        prompt=lambda: (username, password, password),
        environment=_clean_environment(),
    )

    assert changed is True
    assert stat.S_IMODE(target.stat().st_mode) == 0o600
    saved = target.read_text(encoding="utf-8")
    assert "# existing settings" in saved
    assert "FUEL_BIND_HOST=127.0.0.1" in saved
    assert "CUSTOM_SETTING=keep-me" in saved
    result = subprocess.run(
        ["docker", "compose", "--env-file", str(target), "-f", str(compose_file),
         "config", "--format", "json"],
        env=_clean_environment(), capture_output=True, text=True, check=False,
    )
    assert result.returncode == 0, result.stderr
    resolved = json.loads(result.stdout)["services"]["web"]["environment"]
    assert resolved["FUEL_HTTP_USER"] == username
    assert resolved["FUEL_HTTP_PASSWORD"] == password.replace("$", "$$")


@pytest.mark.skipif(shutil.which("docker") is None, reason="Docker Compose CLI is unavailable")
def test_access_setup_skips_prompt_for_existing_file_or_environment_credentials(tmp_path):
    from tools.configure_access import _resolved_credentials, configure_access

    compose_file = _compose_file(tmp_path / "compose.yaml")
    target = tmp_path / ".env"
    target.write_text("FUEL_HTTP_USER=stored\nFUEL_HTTP_PASSWORD=stored-secret\n", encoding="utf-8")
    before = target.read_bytes()

    def unexpected_prompt():
        raise AssertionError("credentials should already be effective")

    assert configure_access(
        compose_file=compose_file,
        source_env=target,
        target_env=target,
        prompt=unexpected_prompt,
        environment=_clean_environment(),
    ) is False
    assert target.read_bytes() == before

    target.unlink()
    template = tmp_path / ".env.example"
    template.write_text("FUEL_HTTP_USER=\nFUEL_HTTP_PASSWORD=\n", encoding="utf-8")
    environment_password = "one$ two$$ ref${NAME}"
    environment = {
        **_clean_environment(),
        "FUEL_HTTP_USER": "from-env",
        "FUEL_HTTP_PASSWORD": environment_password,
    }
    assert _resolved_credentials(compose_file, template, environment) == (
        "from-env", environment_password
    )
    assert configure_access(
        compose_file=compose_file,
        source_env=template,
        target_env=target,
        prompt=unexpected_prompt,
        environment=environment,
    ) is False
    assert not target.exists()


@pytest.mark.skipif(shutil.which("docker") is None, reason="Docker Compose CLI is unavailable")
@pytest.mark.parametrize("prompt", [
    lambda: ("team", "first-password", "second-password"),
    lambda: (_ for _ in ()).throw(KeyboardInterrupt()),
    lambda: (_ for _ in ()).throw(EOFError()),
])
def test_access_setup_mismatch_or_cancel_does_not_change_file(tmp_path, prompt):
    from tools.configure_access import AccessConfigurationError, configure_access

    compose_file = _compose_file(tmp_path / "compose.yaml")
    target = tmp_path / ".env"
    target.write_text("KEEP=this-file\nFUEL_HTTP_USER=\nFUEL_HTTP_PASSWORD=\n", encoding="utf-8")
    before = target.read_bytes()

    with pytest.raises(AccessConfigurationError):
        configure_access(
            compose_file=compose_file,
            source_env=target,
            target_env=target,
            prompt=prompt,
            environment=_clean_environment(),
        )

    assert target.read_bytes() == before


@pytest.mark.skipif(shutil.which("docker") is None, reason="Docker Compose CLI is unavailable")
@pytest.mark.parametrize("credentials", [
    ("", "long-password", "long-password"),
    ("bad:user", "long-password", "long-password"),
    ("bad\tuser", "long-password", "long-password"),
    ("team", "", ""),
])
def test_access_setup_rejects_invalid_basic_credentials_without_writing(tmp_path, credentials):
    from tools.configure_access import AccessConfigurationError, configure_access

    compose_file = _compose_file(tmp_path / "compose.yaml")
    template = tmp_path / ".env.example"
    template.write_text("FUEL_HTTP_USER=\nFUEL_HTTP_PASSWORD=\n", encoding="utf-8")
    target = tmp_path / ".env"
    with pytest.raises(AccessConfigurationError):
        configure_access(
            compose_file=compose_file, source_env=template, target_env=target,
            prompt=lambda: credentials, environment=_clean_environment(),
        )
    assert not target.exists()


@pytest.mark.skipif(shutil.which("docker") is None, reason="Docker Compose CLI is unavailable")
def test_access_setup_rejects_symlink_partial_environment_and_multiline_source(tmp_path):
    from tools.configure_access import AccessConfigurationError, configure_access

    compose_file = _compose_file(tmp_path / "compose.yaml")
    template = tmp_path / ".env.example"
    template.write_text("FUEL_HTTP_USER=\nFUEL_HTTP_PASSWORD=\n", encoding="utf-8")
    outside = tmp_path / "outside"
    outside.write_text("unchanged", encoding="utf-8")
    target = tmp_path / ".env"
    target.symlink_to(outside)
    with pytest.raises(AccessConfigurationError):
        configure_access(
            compose_file=compose_file, source_env=template, target_env=target,
            prompt=lambda: ("team", "long-password", "long-password"),
            environment=_clean_environment(),
        )
    assert outside.read_text(encoding="utf-8") == "unchanged"

    target.unlink()
    partial = {**_clean_environment(), "FUEL_HTTP_USER": "shell-user"}
    with pytest.raises(AccessConfigurationError):
        configure_access(
            compose_file=compose_file, source_env=template, target_env=target,
            prompt=lambda: ("team", "long-password", "long-password"),
            environment=partial,
        )
    assert not target.exists()

    template.write_text(
        "CUSTOM='first line\nFUEL_HTTP_USER=not-a-setting\nlast line'\n"
        "FUEL_HTTP_USER=\nFUEL_HTTP_PASSWORD=\n",
        encoding="utf-8",
    )
    with pytest.raises(AccessConfigurationError):
        configure_access(
            compose_file=compose_file, source_env=template, target_env=target,
            prompt=lambda: ("team", "long-password", "long-password"),
            environment=_clean_environment(),
        )
    assert not target.exists()


@pytest.mark.skipif(shutil.which("docker") is None, reason="Docker Compose CLI is unavailable")
def test_access_cli_without_terminal_aborts_before_writing(tmp_path):
    compose_file = _compose_file(tmp_path / "compose.yaml")
    template = tmp_path / ".env.example"
    template.write_text("FUEL_HTTP_USER=\nFUEL_HTTP_PASSWORD=\n", encoding="utf-8")
    target = tmp_path / ".env"

    result = subprocess.run(
        [sys.executable, str(ROOT / "tools/configure_access.py"),
         "--compose-file", str(compose_file), "--source-env", str(template),
         "--target-env", str(target)],
        cwd=ROOT, env=_clean_environment(), stdin=subprocess.DEVNULL,
        capture_output=True, text=True, check=False, start_new_session=True,
    )

    assert result.returncode != 0
    assert not target.exists()
    assert "password" not in result.stdout.lower()


@pytest.mark.skipif(shutil.which("docker") is None, reason="Docker Compose CLI is unavailable")
def test_access_cli_reads_a_real_tty_without_echoing_password(tmp_path):
    compose_file = _compose_file(tmp_path / "compose.yaml")
    template = tmp_path / ".env.example"
    template.write_text("FUEL_HTTP_USER=\nFUEL_HTTP_PASSWORD=\n", encoding="utf-8")
    target = tmp_path / ".env"
    password = "x"
    command = [
        sys.executable, str(ROOT / "tools/configure_access.py"),
        "--compose-file", str(compose_file), "--source-env", str(template),
        "--target-env", str(target),
    ]
    pid, terminal = pty.fork()
    if pid == 0:
        os.chdir(ROOT)
        os.execve(command[0], command, _clean_environment())

    output = bytearray()

    def answer(marker: str, value: str):
        encoded = marker.encode("utf-8")
        deadline = time.monotonic() + 10
        while encoded not in output:
            assert time.monotonic() < deadline, output.decode("utf-8", errors="replace")
            ready, _, _ = select.select([terminal], [], [], 0.1)
            if ready:
                output.extend(os.read(terminal, 4096))
        os.write(terminal, (value + "\n").encode("utf-8"))

    try:
        answer("Логин: ", "team")
        answer("Пароль: ", password)
        answer("Повторите пароль: ", password)
        _, status = os.waitpid(pid, 0)
        while True:
            ready, _, _ = select.select([terminal], [], [], 0)
            if not ready:
                break
            try:
                output.extend(os.read(terminal, 4096))
            except OSError:
                break
    finally:
        os.close(terminal)

    assert os.waitstatus_to_exitcode(status) == 0, output.decode("utf-8", errors="replace")
    assert password.encode("utf-8") not in output
    assert stat.S_IMODE(target.stat().st_mode) == 0o600
