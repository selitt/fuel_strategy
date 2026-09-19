"""Export or restore the JSON project store while the application is stopped."""

import argparse
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.app.persistence.project_backup import (
    ArchiveError,
    export_store_archive,
    restore_store_archive,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Offline export and restore for the shared project store. Stop the application first."
    )
    commands = parser.add_subparsers(dest="command", required=True)
    export = commands.add_parser("export", help="Export active projects and retained backups")
    export.add_argument("--store", type=Path, required=True, help="Project store directory")
    export.add_argument("--output", type=Path, required=True, help="Destination ZIP archive")
    restore = commands.add_parser("restore", help="Restore a validated archive into an empty store")
    restore.add_argument("--input", type=Path, required=True, help="Source ZIP archive")
    restore.add_argument("--store", type=Path, required=True, help="Empty destination store directory")
    args = parser.parse_args()

    try:
        if args.command == "export":
            summary = export_store_archive(args.store, args.output)
            location = args.output
        else:
            summary = restore_store_archive(args.input, args.store)
            location = args.store
    except (ArchiveError, OSError) as exc:
        print(f"Ошибка: {exc}", file=sys.stderr)
        return 1

    print(
        f"Готово: projects={summary.project_count}, backups={summary.backup_count}, path={location}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
