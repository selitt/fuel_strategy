#!/usr/bin/env python3
"""Inspect this preparation workspace, never calculate a fuel supply plan.

Standard library only. No network, no installs, no writes, no automatic repairs.
A successful check is not product validation or a jury score.
"""
from __future__ import annotations

import argparse
import configparser
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

SCOPE = "workspace_only_not_product"


def safe_path(root: Path, relative: str) -> Path:
    """Reject absolute/traversing paths and symlink-backed protected references."""
    if not isinstance(relative, str) or not relative or "\\" in relative:
        raise ValueError(f"unsafe path: {relative!r}")
    part = Path(relative)
    if part.is_absolute() or ".." in part.parts or re.match(r"^[A-Za-z]:", relative):
        raise ValueError(f"unsafe path: {relative!r}")
    candidate = root / part
    current = root
    for item in part.parts:
        current = current / item
        if current.is_symlink():
            raise ValueError(f"unsafe path (symlink): {relative}")
    try:
        candidate.resolve().relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError(f"unsafe path: {relative}") from exc
    return candidate


def load_json(root: Path, relative: str):
    file = safe_path(root, relative)
    try:
        return json.loads(file.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"JSON {relative}: {exc}") from exc


def inspect_workspace(root: Path) -> dict:
    root = Path(root).resolve()
    errors: list[str] = []
    warnings = [
        "Product NOT implemented: these checks do not run V01-V10 or verify K01-K20.",
        "Known source gaps: original XLSX / source DOCX / ERRATA are absent; see OPEN_QUESTIONS.",
        "Original organizer Markdown links and legacy notes are preserved, not silently repaired.",
    ]
    checks: list[dict] = []

    def bucket(name, fn):
        before = len(errors)
        try:
            fn()
        except (OSError, ValueError, TypeError, KeyError, AttributeError, configparser.Error) as exc:
            errors.append(f"{name}: {exc}")
        checks.append({"name": name, "ok": len(errors) == before})

    meta = {}
    try:
        meta = load_json(root, "workspace.json")
    except ValueError as exc:
        errors.append(str(exc))

    def required():
        for rel in meta["required_paths"]:
            file = safe_path(root, rel)
            if not file.is_file():
                errors.append(f"missing required file: {rel}")
            elif file.stat().st_size == 0:
                errors.append(f"empty required file: {rel}")
        if meta.get("check_scope") != SCOPE:
            errors.append("workspace check_scope must distinguish preparation from product checks")
        if meta.get("team_size") != 5:
            errors.append("team size differs from the confirmed team of five")

    bucket("workspace structure", required)

    def original_files():
        source_lock = load_json(root, "sources.lock.json")
        seen = set()
        for record in source_lock["files"]:
            rel = record["path"]
            if rel in seen:
                errors.append(f"duplicate locked path: {rel}")
            seen.add(rel)
            file = safe_path(root, rel)
            if not file.is_file():
                errors.append(f"missing locked source: {rel}")
                continue
            digest = hashlib.sha256(file.read_bytes()).hexdigest()
            if digest != record["sha256"] or file.stat().st_size != record["bytes"]:
                errors.append(f"hash mismatch: {rel}; inspect the change, do not regenerate the lock silently")
        if not seen:
            errors.append("empty source lock")
        base = "fuel-hackathon/test_oil"
        for rel in ["data/demand.csv", "data/supply_sources.csv", "data/storage_options.csv",
                    "data/investment_options.csv", "data/constraints.csv",
                    "scenarios/base.yaml", "scenarios/mandatory_stress.yaml"]:
            if not safe_path(root, f"{base}/{rel}").is_file():
                errors.append(f"missing organizer input: {rel}")

    bucket("original file hashes", original_files)

    def nested_git():
        expected = set(meta["reference_paths"])
        registered = set()
        module_file = root / ".gitmodules"
        if module_file.exists():
            parser = configparser.ConfigParser(interpolation=None)
            parser.read_string(module_file.read_text(encoding="utf-8"))
            for section in parser.sections():
                rel = parser.get(section, "path", fallback="")
                url = parser.get(section, "url", fallback="")
                safe_path(root, rel)
                if rel in expected and url.strip():
                    registered.add(rel)
        for parent, dirs, files in os.walk(root, followlinks=False):
            folder = Path(parent)
            for name in dirs + files:
                candidate = folder / name
                if candidate.is_symlink():
                    errors.append(f"symlink not supported in portable workspace: {candidate.relative_to(root)}")
            if ".git" in dirs or ".git" in files:
                if folder != root:
                    rel = folder.relative_to(root).as_posix()
                    if rel not in registered:
                        errors.append(f"unregistered nested Git: {rel}/.git")
                if ".git" in dirs:
                    dirs.remove(".git")
        if registered:
            warnings.append("Registered reference Git metadata detected: this does not verify submodule remotes or fresh clone.")

    bucket("portable paths and nested Git", nested_git)

    task_index = {}
    criterion_ids = set()

    def task_graph():
        values = load_json(root, "tasks/index.json")["tasks"]
        for item in values:
            tid = item["id"]
            if tid in task_index:
                errors.append(f"duplicate task ID: {tid}")
            task_index[tid] = item
            if not safe_path(root, item["file"]).is_file():
                errors.append(f"missing task card: {item['file']}")
            for rel in item["scope_paths"]:
                if not safe_path(root, rel).exists():
                    errors.append(f"missing task scope: {tid} -> {rel}")
        for tid, item in task_index.items():
            for dep in item["depends_on"]:
                if dep not in task_index:
                    errors.append(f"unknown task dependency: {tid} -> {dep}")
        state = {}
        def visit(tid):
            if state.get(tid) == 1:
                raise ValueError(f"dependency cycle at {tid}")
            if state.get(tid) == 2:
                return
            state[tid] = 1
            for dep in task_index[tid]["depends_on"]:
                if dep in task_index:
                    visit(dep)
            state[tid] = 2
        for tid in task_index:
            visit(tid)
        if meta.get("next_task") not in task_index:
            errors.append("next_task does not exist")

    bucket("task cards and dependency graph", task_graph)

    def criteria_check():
        registry = load_json(root, "docs/regulation/criteria.json")
        items = registry["criteria"]
        ids = [c["id"] for c in items]
        criterion_ids.update(ids)
        if len(ids) != 20 or set(ids) != {f"K{i:02}" for i in range(1, 21)}:
            errors.append("criterion IDs must be exactly K01-K20")
        if sum(c["max_points"] for c in items) != 100 or any(c["max_points"] != 5 for c in items):
            errors.append("the main rubric must retain 20 x 5 = 100 points")
        bonus = registry["bonus"]
        if bonus["max_points"] != 5 or bonus["optional"] is not True:
            errors.append("bonus must stay separate and optional, maximum 5")
        for criterion in items + [bonus]:
            if not safe_path(root, criterion["source"]["path"]).is_file():
                errors.append(f"missing criterion source: {criterion['id']}")
            for tid in criterion["tasks"]:
                if tid not in task_index:
                    errors.append(f"unknown criterion task: {criterion['id']} -> {tid}")
        for tid, item in task_index.items():
            for cid in item["criteria"]:
                if cid not in criterion_ids:
                    errors.append(f"unknown criterion mapping: {tid} -> {cid}")
        members = load_json(root, "tasks/team.json")
        streams = {w["id"] for w in members["workstreams"]}
        if len(streams) != 5:
            errors.append("expected five workstreams")
        for item in task_index.values():
            if item["owner"] not in streams:
                errors.append(f"unknown workstream: {item['id']}")

    bucket("rubric and workstream references", criteria_check)

    def acceptance():
        catalog = load_json(root, "tests/acceptance/catalog.json")
        seen = set()
        for case in catalog["cases"]:
            if case["id"] in seen:
                errors.append(f"duplicate acceptance ID: {case['id']}")
            seen.add(case["id"])
            for tid in case["tasks"]:
                if tid not in task_index:
                    errors.append(f"unknown acceptance task: {case['id']} -> {tid}")
            for cid in case["criteria"]:
                if cid not in criterion_ids:
                    errors.append(f"unknown acceptance criterion: {case['id']} -> {cid}")
        for question in load_json(root, "docs/open_questions.json")["questions"]:
            for tid in question["affected_tasks"]:
                if tid not in task_index:
                    errors.append(f"unknown question task: {question['id']} -> {tid}")

    bucket("acceptance and open-question references", acceptance)

    def json_syntax():
        for parent, dirs, files in os.walk(root, followlinks=False):
            dirs[:] = [d for d in dirs if d not in {".git", ".venv", "node_modules", "__pycache__"}]
            for name in files:
                if name.endswith(".json"):
                    rel = (Path(parent) / name).relative_to(root).as_posix()
                    load_json(root, rel)

    bucket("JSON syntax (not business schema validation)", json_syntax)

    def links():
        legacy = set(meta["legacy_note_paths"])
        reference_paths = [p.rstrip("/") + "/" for p in meta["reference_paths"]]
        for parent, dirs, files in os.walk(root, followlinks=False):
            dirs[:] = [d for d in dirs if d not in {".git", ".venv", "node_modules", "__pycache__"}]
            for name in files:
                if not name.endswith(".md"):
                    continue
                file = Path(parent) / name
                rel = file.relative_to(root).as_posix()
                if rel in legacy or any(rel.startswith(p) for p in reference_paths):
                    continue
                text = file.read_text(encoding="utf-8")
                text = re.sub(r"```.*?```", "", text, flags=re.S)
                for target in re.findall(r"\[[^\]\n]*\]\(([^)\n]+)\)", text):
                    target = target.strip().strip("<>")
                    if not target or target.startswith("#"):
                        continue
                    parsed = urlsplit(target)
                    if parsed.scheme or parsed.netloc:
                        continue
                    local = unquote(parsed.path)
                    destination = (file.parent / local).resolve()
                    try:
                        destination.relative_to(root)
                    except ValueError:
                        errors.append(f"broken local link (outside root): {rel} -> {target}")
                        continue
                    if local and not destination.exists():
                        errors.append(f"broken local link: {rel} -> {target}")

    bucket("new local Markdown navigation", links)
    return {
        "ok": not errors, "scope": SCOPE, "root": str(root),
        "application_implemented": meta.get("application_implemented", False),
        "stage": meta.get("stage", "unknown"), "checks": checks,
        "errors": errors, "warnings": warnings
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["check", "status", "sources"])
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--json", action="store_true", help="Machine-readable output; no file is written.")
    args = parser.parse_args(argv)
    try:
        if args.command == "check":
            report = inspect_workspace(args.root)
            if args.json:
                print(json.dumps(report, ensure_ascii=False, indent=2))
            else:
                print("WORKSPACE CHECK ONLY — not a fuel model or jury acceptance")
                for check in report["checks"]:
                    print(f"{'PASS' if check['ok'] else 'FAIL'} {check['name']}")
                for error in report["errors"]:
                    print(f"ERROR {error}")
                for warning in report["warnings"]:
                    print(f"NOTE {warning}")
                print("Workspace integrity OK; product not validated." if report["ok"] else "Workspace check FAILED.")
            return 0 if report["ok"] else 1
        if args.command == "status":
            meta = load_json(args.root, "workspace.json")
            report = {key: meta.get(key) for key in [
                "project_name", "team_size", "stage", "application_implemented",
                "application_stack", "next_task", "check_scope"]}
            report["tasks"] = [{"id": t["id"], "status": t["status"], "owner": t["owner"]}
                               for t in load_json(args.root, "tasks/index.json")["tasks"]]
        else:
            lock = load_json(args.root, "sources.lock.json")
            report = {"repositories": lock["repositories"], "source_archive": lock["source_archive"],
                      "locked_files": len(lock["files"]), "basis": lock["basis"]}
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, TypeError, KeyError) as exc:
        if args.json:
            print(json.dumps({"ok": False, "error": str(exc), "scope": SCOPE}, ensure_ascii=False))
        else:
            print(f"ERROR {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
