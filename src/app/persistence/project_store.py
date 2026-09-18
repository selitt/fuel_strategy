"""Atomic JSON persistence, with revision checks under a single-process lock.

Use one Uvicorn worker. This is a local hackathon store, not multi-process DB locking.
"""
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import tempfile
from threading import RLock
from uuid import UUID, uuid4

from pydantic import ValidationError

from src.app.dto.web_dto import ProjectDTO, RunRecordDTO
from src.app.errors import ApiProblem
from src.app.service.json_io import InvalidJSON, dumps, loads
from src.app.service.plan_io import plan_hash
from src.app.service.result_validation import validate_result

logger = logging.getLogger("fuel.api")


def now():
    return datetime.now(timezone.utc)


class ProjectStore:
    def __init__(self, directory: Path):
        self.directory = directory.resolve()
        self.lock = RLock()

    def _path(self, project_id: UUID) -> Path:
        return self.directory / f"{UUID(str(project_id))}.json"

    def _read(self, project_id: UUID) -> ProjectDTO:
        path = self._path(project_id)
        if path.is_symlink():
            raise ApiProblem(500, "PROJECT_STORAGE_INVALID", "Файл проекта не может быть символической ссылкой")
        try:
            raw = path.read_bytes()
            project = ProjectDTO.model_validate(loads(raw))
            if project.project_id != project_id:
                raise ValueError("Project ID mismatch")
            plan_hash(project.plan)
            if project.last_run is not None:
                validate_result(project.last_run.result)
                if project.last_run.input_hash != plan_hash(project.last_run.plan_snapshot):
                    raise ValueError("Saved input hash mismatch")
            return project
        except FileNotFoundError as exc:
            raise ApiProblem(404, "PROJECT_NOT_FOUND", "Проект не найден") from exc
        except (InvalidJSON, ValidationError, ValueError) as exc:
            logger.exception("Invalid saved project %s", project_id)
            raise ApiProblem(500, "PROJECT_STORAGE_INVALID", "Сохранённый проект повреждён или несовместим; файл не изменён") from exc
        except OSError as exc:
            logger.exception("Cannot read project %s", project_id)
            raise ApiProblem(500, "PROJECT_STORAGE_IO", "Не удалось прочитать сохранённый проект") from exc

    def _write(self, project: ProjectDTO) -> None:
        temporary = None
        try:
            self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
            data = dumps(project.model_dump(mode="json"), pretty=True)
            with tempfile.NamedTemporaryFile(mode="wb", dir=self.directory, prefix=".project-", suffix=".tmp", delete=False) as handle:
                temporary = Path(handle.name)
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self._path(project.project_id))
        except OSError as exc:
            logger.exception("Cannot save project %s", project.project_id)
            raise ApiProblem(500, "PROJECT_STORAGE_IO", "Не удалось сохранить проект; проверьте доступ к хранилищу") from exc
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

    @staticmethod
    def require_revision(project: ProjectDTO, expected: int):
        if project.revision != expected:
            raise ApiProblem(409, "REVISION_CONFLICT", "Проект изменился. Загрузите актуальную ревизию перед повтором операции")

    def create(self, name: str, plan, *, last_run: RunRecordDTO | None = None) -> ProjectDTO:
        with self.lock:
            timestamp = now()
            project = ProjectDTO(project_id=uuid4(), name=name, revision=1, plan=plan.model_copy(deep=True),
                                 created_at=timestamp, updated_at=timestamp, last_run=last_run)
            self._write(project)
            return project

    def get(self, project_id: UUID) -> ProjectDTO:
        with self.lock:
            return self._read(project_id)

    def list_all(self) -> list[ProjectDTO]:
        with self.lock:
            projects = []
            for path in self.directory.glob("*.json"):
                try:
                    project_id = UUID(path.stem)
                except ValueError:
                    continue
                projects.append(self._read(project_id))
            return sorted(projects, key=lambda item: (item.updated_at, str(item.project_id)), reverse=True)

    def update(self, project_id: UUID, *, expected_revision: int, name: str, plan) -> ProjectDTO:
        with self.lock:
            project = self._read(project_id)
            self.require_revision(project, expected_revision)
            project.name = name
            project.plan = plan.model_copy(deep=True)
            project.revision += 1
            project.updated_at = now()
            self._write(project)
            return project

    def save_run(self, project_id: UUID, expected_revision: int, run: RunRecordDTO) -> ProjectDTO:
        with self.lock:
            project = self._read(project_id)
            self.require_revision(project, expected_revision)
            if plan_hash(project.plan) != run.input_hash:
                raise ApiProblem(409, "REVISION_CONFLICT", "Результат относится к другим входным данным")
            project.last_run = run
            project.revision += 1
            project.updated_at = now()
            self._write(project)
            return project

    def delete(self, project_id: UUID, expected_revision: int) -> None:
        with self.lock:
            project = self._read(project_id)
            self.require_revision(project, expected_revision)
            try:
                self._path(project_id).unlink()
            except OSError as exc:
                raise ApiProblem(500, "PROJECT_STORAGE_IO", "Не удалось удалить проект") from exc
