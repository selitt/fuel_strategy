from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from uuid import UUID
import zipfile

import pytest
from fastapi import HTTPException

from src.app.dto.calc_dto import ParticipantPlanDTO
from src.app.persistence import project_backup
from src.app.persistence.project_backup import (
    ArchiveError,
    export_store_archive,
    restore_store_archive,
)
from src.app.persistence.project_store import ProjectStore
from src.app.service.json_io import loads


ROOT = Path(__file__).resolve().parents[2]


def _store_with_project(tmp_path, plan):
    store = ProjectStore(tmp_path / "store")
    project = store.create("Исходный", ParticipantPlanDTO.model_validate(plan))
    return store, project


def _backup_documents(store: ProjectStore, project_id: UUID):
    directory = store.directory / ".backups" / str(project_id)
    return [loads(path.read_bytes()) for path in sorted(directory.glob("*.json"))]


def test_update_and_delete_keep_last_ten_valid_project_versions(tmp_path, plan):
    store, project = _store_with_project(tmp_path, plan)

    for revision in range(1, 13):
        changed = deepcopy(plan)
        changed["team_notes"]["seed"] = revision
        project = store.update(
            project.project_id,
            expected_revision=project.revision,
            name=f"Версия {revision}",
            plan=ParticipantPlanDTO.model_validate(changed),
        )

    assert [item["revision"] for item in _backup_documents(store, project.project_id)] == list(range(3, 13))

    store.delete(project.project_id, expected_revision=project.revision)

    assert [item["revision"] for item in _backup_documents(store, project.project_id)] == list(range(4, 14))
    with pytest.raises(HTTPException) as missing:
        store.get(project.project_id)
    assert missing.value.status_code == 404


def test_rotation_keeps_the_new_backup_when_filesystem_time_moves_back(tmp_path, plan):
    store, project = _store_with_project(tmp_path, plan)
    store.backups.max_per_project = 1
    project = store.update(
        project.project_id,
        expected_revision=1,
        name="Версия 2",
        plan=ParticipantPlanDTO.model_validate(plan),
    )
    old_backup = next((store.directory / ".backups" / str(project.project_id)).glob("*.json"))
    future = 4_102_444_800
    os.utime(old_backup, (future, future))

    store.update(
        project.project_id,
        expected_revision=2,
        name="Версия 3",
        plan=ParticipantPlanDTO.model_validate(plan),
    )

    assert [item["revision"] for item in _backup_documents(store, project.project_id)] == [2]


def test_global_backup_size_limit_evicts_the_oldest_project_version(tmp_path, plan):
    store, first = _store_with_project(tmp_path, plan)
    first = store.update(
        first.project_id,
        expected_revision=1,
        name="Обновлённый первый",
        plan=ParticipantPlanDTO.model_validate(plan),
    )
    first_backup = next((store.directory / ".backups" / str(first.project_id)).glob("*.json"))
    second = store.create("Исходный", ParticipantPlanDTO.model_validate(plan))
    second_source = store.directory / f"{second.project_id}.json"
    store.backups.max_total_bytes = max(first_backup.stat().st_size, second_source.stat().st_size)

    store.update(
        second.project_id,
        expected_revision=1,
        name="Обновлённый второй",
        plan=ParticipantPlanDTO.model_validate(plan),
    )

    assert _backup_documents(store, first.project_id) == []
    assert [item["revision"] for item in _backup_documents(store, second.project_id)] == [1]


def test_backup_path_failure_aborts_project_update(tmp_path, plan):
    store, project = _store_with_project(tmp_path, plan)
    outside = tmp_path / "outside"
    outside.mkdir()
    (store.directory / ".backups").symlink_to(outside, target_is_directory=True)

    with pytest.raises(HTTPException) as failed:
        store.update(
            project.project_id,
            expected_revision=1,
            name="Не должно сохраниться",
            plan=ParticipantPlanDTO.model_validate(plan),
        )

    assert failed.value.status_code == 500
    current = store.get(project.project_id)
    assert current.revision == 1
    assert current.name == "Исходный"
    assert list(outside.iterdir()) == []


def test_saving_calculation_keeps_the_previous_project_version(client_factory, tmp_path, plan):
    directory = tmp_path / "calculated-store"
    client = client_factory(data_dir=directory)
    created = client.post("/api/projects", json={"name": "До расчёта", "plan": plan}).json()

    response = client.post(
        f'/api/projects/{created["project_id"]}/calculate',
        json={"expected_revision": 1},
    )

    assert response.status_code == 200, response.text
    documents = _backup_documents(ProjectStore(directory), UUID(created["project_id"]))
    assert len(documents) == 1
    assert documents[0]["revision"] == 1
    assert documents[0]["last_run"] is None


def test_archive_roundtrip_includes_projects_and_backups_but_not_other_files(tmp_path, plan):
    store, first = _store_with_project(tmp_path, plan)
    first = store.update(
        first.project_id,
        expected_revision=1,
        name="Обновлённый",
        plan=ParticipantPlanDTO.model_validate(plan),
    )
    deleted = store.create("Удаляемый", ParticipantPlanDTO.model_validate(plan))
    store.delete(deleted.project_id, expected_revision=1)
    (store.directory / ".env").write_text("FUEL_HTTP_PASSWORD=secret", encoding="utf-8")

    archive = tmp_path / "projects.zip"
    exported = export_store_archive(store.directory, archive)

    assert exported.project_count == 1
    assert exported.backup_count == 2
    with zipfile.ZipFile(archive) as bundle:
        names = bundle.namelist()
        assert ".env" not in names
        assert "manifest.json" in names
        manifest = json.loads(bundle.read("manifest.json"))
        assert manifest["format"] == "fuel-project-store-archive"
        assert manifest["format_version"] == 1
        for item in manifest["files"]:
            payload = bundle.read(item["path"])
            assert item["sha256"] == hashlib.sha256(payload).hexdigest()
            assert item["size"] == len(payload)

    restored_directory = tmp_path / "restored"
    restored_directory.mkdir()
    restored = restore_store_archive(archive, restored_directory)

    assert restored == exported
    restored_store = ProjectStore(restored_directory)
    assert restored_store.get(first.project_id).name == "Обновлённый"
    assert _backup_documents(restored_store, first.project_id)[0]["revision"] == 1
    assert _backup_documents(restored_store, deleted.project_id)[0]["revision"] == 1


def test_export_does_not_create_an_archive_that_restore_size_limits_reject(tmp_path, plan, monkeypatch):
    store, _ = _store_with_project(tmp_path, plan)
    project_path = next(store.directory.glob("*.json"))
    monkeypatch.setattr(project_backup, "MAX_ARCHIVE_MEMBER_BYTES", project_path.stat().st_size - 1)

    with pytest.raises(ArchiveError):
        export_store_archive(store.directory, tmp_path / "too-large.zip")

    assert not (tmp_path / "too-large.zip").exists()


def test_restore_rejects_unsafe_or_corrupt_archive_before_writing(tmp_path):
    archive = tmp_path / "unsafe.zip"
    payload = b"{}"
    manifest = {
        "format": "fuel-project-store-archive",
        "format_version": 1,
        "created_at": "2026-09-19T00:00:00+00:00",
        "files": [{
            "path": "projects/../escaped.json",
            "size": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
        }],
    }
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr("manifest.json", json.dumps(manifest))
        bundle.writestr("projects/../escaped.json", payload)
    destination = tmp_path / "empty-store"
    destination.mkdir()

    with pytest.raises(ArchiveError):
        restore_store_archive(archive, destination)

    assert list(destination.iterdir()) == []
    assert not (tmp_path / "escaped.json").exists()


def test_restore_rejects_noncanonical_uuid_paths_that_can_overwrite_each_other(tmp_path, plan):
    store, project = _store_with_project(tmp_path, plan)
    payload = (store.directory / f"{project.project_id}.json").read_bytes()
    canonical = f"projects/{project.project_id}.json"
    alternate = f"projects/{str(project.project_id).upper()}.json"
    manifest = {
        "format": "fuel-project-store-archive",
        "format_version": 1,
        "created_at": "2026-09-19T00:00:00+00:00",
        "files": [
            {"path": name, "size": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}
            for name in (canonical, alternate)
        ],
    }
    archive = tmp_path / "uuid-alias.zip"
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr("manifest.json", json.dumps(manifest))
        bundle.writestr(canonical, payload)
        bundle.writestr(alternate, payload)
    destination = tmp_path / "empty-alias-store"
    destination.mkdir()

    with pytest.raises(ArchiveError):
        restore_store_archive(archive, destination)

    assert list(destination.iterdir()) == []


def test_archive_cli_exports_and_restores_an_offline_store(tmp_path, plan):
    store, project = _store_with_project(tmp_path, plan)
    archive = tmp_path / "cli-export.zip"
    destination = tmp_path / "cli-restored"
    script = ROOT / "tools" / "project_archive.py"

    exported = subprocess.run(
        [sys.executable, str(script), "export", "--store", str(store.directory), "--output", str(archive)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    restored = subprocess.run(
        [sys.executable, str(script), "restore", "--input", str(archive), "--store", str(destination)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert exported.returncode == 0, exported.stderr
    assert restored.returncode == 0, restored.stderr
    assert ProjectStore(destination).get(project.project_id).name == "Исходный"
