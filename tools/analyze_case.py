#!/usr/bin/env python3
"""Generate the reproducible competition analysis bundle."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.engine.analysis import generate_analysis_bundle


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run deterministic, sensitivity, research-risk, and Monte Carlo analysis."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("data/analysis/config.yaml"),
        help="analysis config (default: data/analysis/config.yaml)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("reports"),
        help="report directory (default: reports)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    outputs = generate_analysis_bundle(
        config_path=(ROOT / args.config if not args.config.is_absolute() else args.config),
        output_dir=(ROOT / args.output if not args.output.is_absolute() else args.output),
        command=[sys.executable, *sys.argv],
    )
    for name, path in outputs.items():
        print(f"{name}: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
