"""Refuse to serve the supplied bundle after source files changed."""
import hashlib
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'frontend/prebuilt/build-manifest.json'
if not manifest_path.exists():
    sys.exit('No prebuilt manifest. Build the frontend: cd frontend && npm ci && npm run build')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
errors = []
for relative, expected in {**manifest['source_sha256'], **manifest['asset_sha256']}.items():
    file = ROOT / relative
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != expected:
        errors.append(relative)
# Detect newly added source files as well as modifications/deletions.
actual = {str(p.relative_to(ROOT)) for p in (ROOT/'frontend/src').rglob('*') if p.is_file()}
known = {p for p in manifest['source_sha256'] if p.startswith('frontend/src/')}
errors.extend(sorted(actual - known))
if errors:
    sys.exit('Supplied frontend is stale: ' + ', '.join(errors) + '\nRun: cd frontend && npm ci && npm run build')
print('Prebuilt bundle matches the supplied UI sources and asset hashes')
