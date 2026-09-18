"""Generated contract checking must not silently rewrite the frontend's input."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'tools/export_openapi.py'


def run(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *args], cwd=ROOT,
                          capture_output=True, text=True, timeout=20)


def test_export_and_read_only_check(tmp_path):
    target = tmp_path / 'openapi.json'
    assert run('--output', str(target)).returncode == 0
    assert run('--output', str(target), '--check').returncode == 0
    target.write_text('{}\n')
    result = run('--output', str(target), '--check')
    assert result.returncode == 1
    assert target.read_text() == '{}\n'
    assert 'out of date' in result.stderr


def test_missing_snapshot_fails_without_creating_it(tmp_path):
    target = tmp_path / 'missing.json'
    result = run('--output', str(target), '--check')
    assert result.returncode == 1
    assert not target.exists()
