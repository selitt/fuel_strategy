"""Configure shared HTTP credentials without exposing them in process arguments."""

import argparse
import getpass
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from typing import Callable, Mapping
import warnings


class AccessConfigurationError(RuntimeError):
    pass


def _resolved_credentials(
    compose_file: Path,
    env_file: Path,
    environment: Mapping[str, str] | None,
) -> tuple[str, str]:
    try:
        result = subprocess.run(
            ["docker", "compose", "--env-file", str(env_file), "-f", str(compose_file),
             "config", "--format", "json"],
            env=None if environment is None else dict(environment),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
    except OSError as exc:
        raise AccessConfigurationError("Docker Compose недоступен для проверки настроек") from exc
    if result.returncode != 0:
        raise AccessConfigurationError("Docker Compose не смог проверить настройки доступа")
    try:
        values = json.loads(result.stdout)["services"]["web"]["environment"]
        username = values.get("FUEL_HTTP_USER") or ""
        password = values.get("FUEL_HTTP_PASSWORD") or ""
    except (json.JSONDecodeError, KeyError, AttributeError, TypeError) as exc:
        raise AccessConfigurationError("Docker Compose вернул неизвестный формат настроек") from exc
    if not isinstance(username, str) or not isinstance(password, str):
        raise AccessConfigurationError("Docker Compose вернул неверные настройки доступа")
    # Compose's canonical model doubles literal dollars for its final interpolation pass.
    return username.replace("$$", "$"), password.replace("$$", "$")


def _terminal_prompt() -> tuple[str, str, str]:
    try:
        with (open("/dev/tty", "r", encoding="utf-8") as terminal_input,
              open("/dev/tty", "w", encoding="utf-8", buffering=1) as terminal_output):
            terminal_output.write("Первый публичный запуск: создайте общий доступ.\nЛогин: ")
            username = terminal_input.readline()
            if username == "":
                raise EOFError
            username = username.rstrip("\r\n")
            with warnings.catch_warnings():
                warnings.simplefilter("error", getpass.GetPassWarning)
                password = getpass.getpass(
                    "Пароль: ", stream=terminal_output
                )
                confirmation = getpass.getpass("Повторите пароль: ", stream=terminal_output)
            return username, password, confirmation
    except (OSError, EOFError, KeyboardInterrupt, getpass.GetPassWarning) as exc:
        raise AccessConfigurationError("Настройка доступа отменена; docker/.env не изменён") from exc


def _validate_credentials(username: str, password: str, confirmation: str) -> None:
    if not username or ":" in username:
        raise AccessConfigurationError("Логин должен быть непустым и не содержать двоеточие")
    if any(ord(char) < 32 or ord(char) == 127 for char in username + password):
        raise AccessConfigurationError("Логин и пароль не должны содержать управляющие символы")
    if not password:
        raise AccessConfigurationError("Пароль не должен быть пустым")
    if password != confirmation:
        raise AccessConfigurationError("Пароли не совпали; docker/.env не изменён")


def _compose_value(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("$", "$$")
    return f'"{escaped}"'


def _updated_env(source: str, username: str, password: str) -> str:
    credential = re.compile(r"^[ \t]*(?:export[ \t]+)?FUEL_HTTP_(?:USER|PASSWORD)[ \t]*=")
    assignment = re.compile(r"^[ \t]*(?:export[ \t]+)?[A-Za-z_][A-Za-z0-9_]*[ \t]*=")
    lines = source.splitlines(keepends=True)
    for line in lines:
        match = assignment.match(line)
        if match:
            value = line[match.end():].strip()
            if value[:1] in {"'", '"'} and not (len(value) >= 2 and value.endswith(value[0])):
                raise AccessConfigurationError(
                    "Многострочные значения в docker/.env нельзя безопасно сохранить"
                )
    kept = [line for line in lines if not credential.match(line)]
    if kept and not kept[-1].endswith(("\n", "\r")):
        kept[-1] += "\n"
    kept.extend([
        f"FUEL_HTTP_USER={_compose_value(username)}\n",
        f"FUEL_HTTP_PASSWORD={_compose_value(password)}\n",
    ])
    return "".join(kept)


def configure_access(
    *,
    compose_file: Path,
    source_env: Path,
    target_env: Path,
    prompt: Callable[[], tuple[str, str, str]] = _terminal_prompt,
    environment: Mapping[str, str] | None = None,
) -> bool:
    if target_env.is_symlink():
        raise AccessConfigurationError("docker/.env не может быть символической ссылкой")
    if source_env.is_symlink() or not source_env.is_file():
        raise AccessConfigurationError("Файл настроек Docker отсутствует или небезопасен")
    current_username, current_password = _resolved_credentials(compose_file, source_env, environment)
    if current_username and current_password:
        return False

    try:
        username, password, confirmation = prompt()
    except (EOFError, KeyboardInterrupt) as exc:
        raise AccessConfigurationError("Настройка доступа отменена; docker/.env не изменён") from exc
    _validate_credentials(username, password, confirmation)
    try:
        source = source_env.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise AccessConfigurationError("Не удалось прочитать настройки Docker") from exc
    candidate = _updated_env(source, username, password).encode("utf-8")

    temporary = None
    try:
        if not target_env.parent.is_dir():
            raise AccessConfigurationError("Каталог для docker/.env отсутствует")
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=target_env.parent, prefix=".env-access-", delete=False
        ) as handle:
            temporary = Path(handle.name)
            os.fchmod(handle.fileno(), 0o600)
            handle.write(candidate)
            handle.flush()
            os.fsync(handle.fileno())
        resolved_username, resolved_password = _resolved_credentials(
            compose_file, temporary, environment
        )
        if (resolved_username, resolved_password) != (username, password):
            raise AccessConfigurationError(
                "Переменные окружения конфликтуют с новым доступом; docker/.env не изменён"
            )
        os.replace(temporary, target_env)
        temporary = None
        return True
    except AccessConfigurationError:
        raise
    except OSError as exc:
        raise AccessConfigurationError("Не удалось безопасно сохранить docker/.env") from exc
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Настроить общий пароль публичного запуска")
    parser.add_argument("--compose-file", type=Path, required=True)
    parser.add_argument("--source-env", type=Path, required=True)
    parser.add_argument("--target-env", type=Path, required=True)
    args = parser.parse_args()
    try:
        changed = configure_access(
            compose_file=args.compose_file,
            source_env=args.source_env,
            target_env=args.target_env,
        )
    except AccessConfigurationError as exc:
        print(f"ERROR: {exc}", file=os.sys.stderr)
        return 2
    if changed:
        print("Доступ сохранён в docker/.env (права 0600).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
