"""Generate the live web API spec without replacing Vasya's original KosmoAPI.yaml."""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.app.api.main import create_app


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "docs/api/openapi.json")
    parser.add_argument("--check", action="store_true", help="Verify the snapshot without changing it")
    args = parser.parse_args()
    document = create_app().openapi()
    if args.check:
        try:
            current = json.loads(args.output.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError):
            current = None
        if current != document:
            print(f"OpenAPI snapshot is missing or out of date: {args.output}", file=sys.stderr)
            return 1
        print(f"OpenAPI snapshot is current: {args.output}")
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    raise SystemExit(main())
