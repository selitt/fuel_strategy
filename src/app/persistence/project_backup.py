"""Versioned project backups and offline store archive operations."""

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import tempfile
import time
from uuid import UUID, uuid4
import zipfile

from pydantic import ValidationError

from src.app.dto.web_dto import ProjectDTO
from src.app.service.calc_service import validate_result
from src.app.service.json_io import InvalidJSON, dumps, loads, plan_hash


ARCHIVE_FORMAT = "fuel-project-store-archive"
ARCHIVE_FORMAT_VERSION = 1
DEFAULT_BACKUPS_PER_PROJECT = 10
DEFAULT_BACKUP_BYTES = 200 * 1024 * 1024
MAX_ARCHIVE_FILES = 20_000
MAX_ARCHIVE_MEMBER_BYTES = 64 * 1024 * 1024
MAX_ARCHIVE_TOTAL_BYTES = 512 * 1024 * 1024
MAX_MANIFEST_BYTES = 2 * 1024 * 1024
ALLOWED_COMPRESSION = {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED}


class BackupError(RuntimeError):
    """A backup could not be created or retained safely."""


class ArchiveError(RuntimeError):
    """An offline store archive is unsafe, corrupt, or incompatible."""


@dataclass(frozen=True)
class ArchiveSummary:
    project_count: int
    backup_count: int


def validate_project_document(raw: bytes, expected_id: UUID) -> ProjectDTO:
    """Parse a persisted project and validate the invariants used by ProjectStore."""
    project = ProjectDTO.model_validate(loads(raw))
    if project.project_id != expected_id:
        raise ValueError("Project ID mismatch")
    plan_hash(project.plan)
    if project.last_run is not None:
        validate_result(project.last_run.result)
        if project.last_run.input_hash != plan_hash(project.last_run.plan_snapshot):
            raise ValueError("Saved input hash mismatch")
    return project


def _reject_symlink(path: Path, *, error_type: type[RuntimeError], label: str) -> None:
    if path.is_symlink():
        raise error_type(f"{label} не может быть символической ссылкой: {path}")


def _atomic_write(directory: Path, destination: Path, data: bytes, *, prefix: str) -> None:
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=directory, prefix=prefix, suffix=".tmp", delete=False
        ) as handle:
            temporary = Path(handle.name)
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


class BackupManager:
    def __init__(
        self,
        store_directory: Path,
        *,
        max_per_project: int = DEFAULT_BACKUPS_PER_PROJECT,
        max_total_bytes: int = DEFAULT_BACKUP_BYTES,
    ):
        if max_per_project < 1 or max_total_bytes < 1:
            raise ValueError("Backup retention limits must be positive")
        self.store_directory = store_directory
        self.backup_root = store_directory / ".backups"
        self.max_per_project = max_per_project
        self.max_total_bytes = max_total_bytes

    def create(self, project_id: UUID, source: Path) -> Path:
        """Copy one validated current project before its mutation."""
        try:
            _reject_symlink(source, error_type=BackupError, label="Файл проекта")
            _reject_symlink(self.backup_root, error_type=BackupError, label="Каталог резервов")
            raw = source.read_bytes()
            project = validate_project_document(raw, project_id)
            if len(raw) > self.max_total_bytes:
                raise BackupError("Версия проекта превышает общий лимит резервов")

            self.backup_root.mkdir(parents=True, exist_ok=True, mode=0o700)
            project_directory = self.backup_root / str(project_id)
            _reject_symlink(project_directory, error_type=BackupError, label="Каталог резервов проекта")
            project_directory.mkdir(mode=0o700, exist_ok=True)
            timestamp = time.time_ns()
            destination = project_directory / (
                f"{timestamp:020d}-r{project.revision:010d}-{uuid4().hex}.json"
            )
            _atomic_write(project_directory, destination, raw, prefix=".backup-")
            self._prune(protected=destination)
            return destination
        except BackupError:
            raise
        except (InvalidJSON, ValidationError, ValueError, OSError) as exc:
            raise BackupError("Не удалось создать безопасную резервную версию проекта") from exc

    def _inventory(self) -> list[Path]:
        _reject_symlink(self.backup_root, error_type=BackupError, label="Каталог резервов")
        if not self.backup_root.exists():
            return []
        result: list[Path] = []
        for project_directory in self.backup_root.iterdir():
            _reject_symlink(project_directory, error_type=BackupError, label="Каталог резервов проекта")
            if not project_directory.is_dir():
                continue
            try:
                UUID(project_directory.name)
            except ValueError as exc:
                raise BackupError("В каталоге резервов найден неизвестный проект") from exc
            for path in project_directory.iterdir():
                _reject_symlink(path, error_type=BackupError, label="Резервная версия")
                if path.suffix == ".json":
                    mode = path.stat(follow_symlinks=False).st_mode
                    if not stat.S_ISREG(mode):
                        raise BackupError("Резервная версия не является обычным файлом")
                    result.append(path)
        return result

    @staticmethod
    def _oldest_first(paths: list[Path]) -> list[Path]:
        return sorted(paths, key=lambda path: (path.stat().st_mtime_ns, path.name))

    def _prune(self, *, protected: Path) -> None:
        paths = self._inventory()
        by_project: dict[Path, list[Path]] = {}
        for path in paths:
            by_project.setdefault(path.parent, []).append(path)
        for project_paths in by_project.values():
            excess = len(project_paths) - self.max_per_project
            candidates = [path for path in self._oldest_first(project_paths) if path != protected]
            for path in candidates[:max(0, excess)]:
                path.unlink()

        paths = self._inventory()
        total = sum(path.stat().st_size for path in paths)
        for path in (candidate for candidate in self._oldest_first(paths) if candidate != protected):
            if total <= self.max_total_bytes:
                break
            size = path.stat().st_size
            path.unlink()
            total -= size
        if total > self.max_total_bytes:
            raise BackupError("Не удалось соблюсти общий лимит резервов")


def _archive_path(path: str) -> tuple[str, UUID]:
    if "\\" in path or "\x00" in path:
        raise ArchiveError("Архив содержит небезопасный путь")
    pure = PurePosixPath(path)
    if (pure.as_posix() != path or pure.is_absolute()
            or any(part in {"", ".", ".."} for part in pure.parts)):
        raise ArchiveError("Архив содержит небезопасный путь")
    parts = pure.parts
    if len(parts) == 2 and parts[0] == "projects" and parts[1].endswith(".json"):
        try:
            project_id = UUID(parts[1][:-5])
        except ValueError as exc:
            raise ArchiveError("Архив содержит неверное имя проекта") from exc
        if str(project_id) != parts[1][:-5]:
            raise ArchiveError("Имя проекта должно содержать канонический UUID")
        return "project", project_id
    if len(parts) == 3 and parts[0] == "backups" and parts[2].endswith(".json"):
        try:
            project_id = UUID(parts[1])
        except ValueError as exc:
            raise ArchiveError("Архив содержит неверный каталог резервов") from exc
        if str(project_id) != parts[1]:
            raise ArchiveError("Каталог резервов должен содержать канонический UUID")
        return "backup", project_id
    raise ArchiveError("Архив содержит путь вне хранилища проектов")


def _read_zip_member(bundle: zipfile.ZipFile, info: zipfile.ZipInfo, limit: int) -> bytes:
    """Read at most limit bytes even if a malformed ZIP header understates size."""
    with bundle.open(info) as handle:
        raw = handle.read(limit + 1)
    if len(raw) > limit:
        raise ArchiveError("Распакованный файл архива превышает допустимый размер")
    return raw


def _collect_store_files(store_directory: Path) -> list[tuple[str, bytes]]:
    _reject_symlink(store_directory, error_type=ArchiveError, label="Хранилище")
    if not store_directory.exists():
        return []
    if not store_directory.is_dir():
        raise ArchiveError("Путь хранилища не является каталогом")

    entries: list[tuple[str, bytes]] = []
    for path in sorted(store_directory.glob("*.json")):
        _reject_symlink(path, error_type=ArchiveError, label="Файл проекта")
        try:
            if not stat.S_ISREG(path.stat(follow_symlinks=False).st_mode):
                raise ValueError("Project path is not a regular file")
            project_id = UUID(path.stem)
            if str(project_id) != path.stem:
                raise ValueError("Project filename is not canonical")
            raw = path.read_bytes()
            validate_project_document(raw, project_id)
        except (InvalidJSON, ValidationError, ValueError, OSError) as exc:
            raise ArchiveError(f"Нельзя экспортировать повреждённый проект: {path.name}") from exc
        entries.append((f"projects/{path.name}", raw))

    backup_root = store_directory / ".backups"
    _reject_symlink(backup_root, error_type=ArchiveError, label="Каталог резервов")
    if backup_root.exists():
        for project_directory in sorted(backup_root.iterdir()):
            _reject_symlink(project_directory, error_type=ArchiveError, label="Каталог резервов проекта")
            if not project_directory.is_dir():
                continue
            try:
                project_id = UUID(project_directory.name)
            except ValueError as exc:
                raise ArchiveError("Каталог резервов содержит неизвестный проект") from exc
            for path in sorted(project_directory.iterdir()):
                _reject_symlink(path, error_type=ArchiveError, label="Резервная версия")
                if path.suffix != ".json":
                    continue
                try:
                    if not stat.S_ISREG(path.stat(follow_symlinks=False).st_mode):
                        raise ValueError("Backup path is not a regular file")
                    raw = path.read_bytes()
                    validate_project_document(raw, project_id)
                except (InvalidJSON, ValidationError, ValueError, OSError) as exc:
                    raise ArchiveError(f"Нельзя экспортировать повреждённый резерв: {path.name}") from exc
                entries.append((f"backups/{project_id}/{path.name}", raw))
    return entries


def export_store_archive(store_directory: Path, archive_path: Path) -> ArchiveSummary:
    """Export active projects and retained backups, excluding all other files."""
    entries = _collect_store_files(Path(store_directory))
    if len(entries) > MAX_ARCHIVE_FILES:
        raise ArchiveError("В хранилище слишком много файлов для одного архива")
    if any(len(raw) > MAX_ARCHIVE_MEMBER_BYTES for _, raw in entries):
        raise ArchiveError("Файл проекта превышает допустимый размер архива")
    if sum(len(raw) for _, raw in entries) > MAX_ARCHIVE_TOTAL_BYTES:
        raise ArchiveError("Хранилище превышает допустимый размер архива")
    manifest = {
        "format": ARCHIVE_FORMAT,
        "format_version": ARCHIVE_FORMAT_VERSION,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "files": [
            {"path": name, "size": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
            for name, raw in entries
        ],
    }
    manifest_raw = dumps(manifest, pretty=True)
    if len(manifest_raw) > MAX_MANIFEST_BYTES:
        raise ArchiveError("Манифест архива слишком велик")
    output = Path(archive_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w+b", dir=output.parent, prefix=".project-archive-", suffix=".tmp", delete=False
        ) as handle:
            temporary = Path(handle.name)
        with zipfile.ZipFile(temporary, mode="w", compression=zipfile.ZIP_DEFLATED) as bundle:
            bundle.writestr("manifest.json", manifest_raw)
            for name, raw in entries:
                bundle.writestr(name, raw)
        with temporary.open("rb") as handle:
            os.fsync(handle.fileno())
        os.replace(temporary, output)
    except (OSError, zipfile.BadZipFile) as exc:
        raise ArchiveError("Не удалось записать архив проектов") from exc
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return ArchiveSummary(
        project_count=sum(name.startswith("projects/") for name, _ in entries),
        backup_count=sum(name.startswith("backups/") for name, _ in entries),
    )


def _read_archive(archive_path: Path) -> tuple[list[tuple[str, bytes]], ArchiveSummary]:
    _reject_symlink(archive_path, error_type=ArchiveError, label="Архив")
    try:
        with zipfile.ZipFile(archive_path) as bundle:
            infos = bundle.infolist()
            names = [info.filename for info in infos]
            if len(names) != len(set(names)):
                raise ArchiveError("Архив содержит повторяющиеся пути")
            if "manifest.json" not in names:
                raise ArchiveError("В архиве отсутствует manifest.json")
            manifest_info = bundle.getinfo("manifest.json")
            if manifest_info.file_size > MAX_MANIFEST_BYTES:
                raise ArchiveError("Манифест архива слишком велик")
            if any(info.compress_type not in ALLOWED_COMPRESSION for info in infos):
                raise ArchiveError("Архив использует неподдерживаемое сжатие")
            if any(info.flag_bits & 0x1 for info in infos):
                raise ArchiveError("Зашифрованные архивы не поддерживаются")
            if any(stat.S_ISLNK((info.external_attr >> 16) & 0xFFFF) for info in infos):
                raise ArchiveError("Архив содержит символическую ссылку")

            manifest = loads(_read_zip_member(bundle, manifest_info, MAX_MANIFEST_BYTES))
            if not isinstance(manifest, dict) or set(manifest) != {
                "format", "format_version", "created_at", "files"
            }:
                raise ArchiveError("Манифест архива имеет неверную структуру")
            if manifest["format"] != ARCHIVE_FORMAT or manifest["format_version"] != ARCHIVE_FORMAT_VERSION:
                raise ArchiveError("Формат архива не поддерживается")
            try:
                created_at = datetime.fromisoformat(manifest["created_at"])
            except (TypeError, ValueError) as exc:
                raise ArchiveError("Манифест содержит неверную дату") from exc
            if created_at.tzinfo is None or not isinstance(manifest["files"], list):
                raise ArchiveError("Манифест архива имеет неверную структуру")
            if len(manifest["files"]) > MAX_ARCHIVE_FILES:
                raise ArchiveError("Архив содержит слишком много файлов")

            declared: list[tuple[str, int, str, str, UUID]] = []
            declared_names: set[str] = set()
            total = 0
            for item in manifest["files"]:
                if not isinstance(item, dict) or set(item) != {"path", "size", "sha256"}:
                    raise ArchiveError("Манифест содержит неверное описание файла")
                name, size, digest = item["path"], item["size"], item["sha256"]
                if not isinstance(name, str) or not isinstance(size, int) or isinstance(size, bool):
                    raise ArchiveError("Манифест содержит неверное описание файла")
                if size < 0 or size > MAX_ARCHIVE_MEMBER_BYTES:
                    raise ArchiveError("Файл архива превышает допустимый размер")
                if not isinstance(digest, str) or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
                    raise ArchiveError("Манифест содержит неверную контрольную сумму")
                kind, project_id = _archive_path(name)
                if name in declared_names:
                    raise ArchiveError("Манифест содержит повторяющийся путь")
                declared_names.add(name)
                total += size
                declared.append((name, size, digest, kind, project_id))
            if total > MAX_ARCHIVE_TOTAL_BYTES:
                raise ArchiveError("Архив превышает допустимый общий размер")
            if set(names) != declared_names | {"manifest.json"}:
                raise ArchiveError("Состав архива не совпадает с манифестом")

            payloads: list[tuple[str, bytes]] = []
            projects = backups = 0
            for name, size, digest, kind, project_id in declared:
                info = bundle.getinfo(name)
                if info.file_size != size:
                    raise ArchiveError("Размер файла не совпадает с манифестом")
                raw = _read_zip_member(bundle, info, size)
                if len(raw) != size or hashlib.sha256(raw).hexdigest() != digest:
                    raise ArchiveError("Контрольная сумма файла не совпадает с манифестом")
                try:
                    validate_project_document(raw, project_id)
                except (InvalidJSON, ValidationError, ValueError) as exc:
                    raise ArchiveError("Архив содержит повреждённый проект") from exc
                payloads.append((name, raw))
                if kind == "project":
                    projects += 1
                else:
                    backups += 1
            return payloads, ArchiveSummary(project_count=projects, backup_count=backups)
    except ArchiveError:
        raise
    except (OSError, zipfile.BadZipFile, InvalidJSON) as exc:
        raise ArchiveError("Не удалось прочитать архив проектов") from exc


def restore_store_archive(archive_path: Path, store_directory: Path) -> ArchiveSummary:
    """Validate an entire archive, then install it into an empty offline store."""
    destination = Path(store_directory)
    _reject_symlink(destination, error_type=ArchiveError, label="Хранилище")
    if destination.exists() and (not destination.is_dir() or any(destination.iterdir())):
        raise ArchiveError("Восстановление возможно только в пустое хранилище")

    payloads, summary = _read_archive(Path(archive_path))

    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{destination.name}-restore-", dir=destination.parent))
    installed = False
    removed_existing_destination = False
    try:
        for name, raw in payloads:
            kind, project_id = _archive_path(name)
            source_name = PurePosixPath(name).name
            if kind == "project":
                target_directory = staging
                target = target_directory / f"{project_id}.json"
            else:
                target_directory = staging / ".backups" / str(project_id)
                target_directory.mkdir(parents=True, exist_ok=True, mode=0o700)
                target = target_directory / source_name
            _atomic_write(target_directory, target, raw, prefix=".restore-")

        _reject_symlink(destination, error_type=ArchiveError, label="Хранилище")
        if destination.exists():
            if not destination.is_dir() or any(destination.iterdir()):
                raise ArchiveError("Хранилище перестало быть пустым во время восстановления")
            destination.rmdir()
            removed_existing_destination = True
        os.replace(staging, destination)
        installed = True
        return summary
    except ArchiveError:
        raise
    except OSError as exc:
        raise ArchiveError("Не удалось восстановить хранилище проектов") from exc
    finally:
        if not installed:
            shutil.rmtree(staging, ignore_errors=True)
            if removed_existing_destination and not destination.exists():
                destination.mkdir(mode=0o700)
