"""Check the prebuilt Docker COPY graph without pretending to execute Docker."""
from pathlib import Path
import shlex
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def test_prebuilt_docker_copies_every_verified_input(tmp_path: Path) -> None:
    staged = tmp_path / 'app'
    staged.mkdir()
    for line in (ROOT / 'docker/Dockerfile.web-prebuilt').read_text().splitlines():
        if not line.startswith('COPY '):
            continue
        _, source, destination = shlex.split(line)
        src, dst = ROOT / source, staged / destination.removeprefix('./')
        if src.is_dir():
            shutil.copytree(src, dst, dirs_exist_ok=True,
                            ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            if destination.endswith('/'):
                dst.mkdir(parents=True, exist_ok=True)
                dst /= src.name
            shutil.copy2(src, dst)
    result = subprocess.run([sys.executable, 'tools/verify_prebuilt.py'], cwd=staged,
                            capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
