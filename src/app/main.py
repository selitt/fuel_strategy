"""ASGI entrypoint. Build an independent application instance for each workspace/test."""
import hashlib
from pathlib import Path
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from src.app.config.config import Settings, ROOT
from src.app.dto.web_dto import EngineInfoDTO
from src.app.api.router import api_router
from src.app.api.transport import RequestBoundaryMiddleware, validation_error_response
from src.app.dto.web_dto import ErrorDTO
from src.app.persistence.project_store import ProjectStore
from src.app.service.calc_service import CalculationService
from src.app.service.calculation_admission import CalculationAdmission


def _default_engine_version(reference_dir: Path) -> str:
    digest = hashlib.sha256()
    files = [
        *((ROOT / "src" / "engine").glob("*.py")),
        ROOT / "src/app/service/calc_service.py",
        ROOT / "src/app/dto/calc_dto.py",
        *reference_dir.glob("*.csv"),
        *(reference_dir / "scenarios").glob("*.yaml"),
    ]
    for path in sorted(files, key=lambda item: str(item)):
        if path.is_relative_to(ROOT / "src" / "engine"):
            label = f"engine/{path.name}"
        elif path.is_relative_to(ROOT / "src"):
            label = path.relative_to(ROOT).as_posix()
        else:
            label = f"reference/{path.relative_to(reference_dir).as_posix()}"
        digest.update(label.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def create_app(
    *, settings: Settings | None = None, calculation_service=None,
    engine_info: EngineInfoDTO | None = None,
) -> FastAPI:
    config = settings or Settings.from_env()
    application = FastAPI(
        title="Топливный космоконтур 2035 — REST API",
        description="REST API для управления проектами и расчётами материального баланса.",
        version="1.1.0",
        responses={status: {"model": ErrorDTO, **({"headers": {"Retry-After": {
            "description": "Секунды до повторной попытки при ограничении запросов или занятом расчётном сервисе",
            "schema": {"type": "integer"},
        }}} if status in (429, 503) else {})} for status in (400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 503)},
    )
    application.state.settings = config
    application.state.calculation_admission = CalculationAdmission()
    uses_default_service = calculation_service is None
    application.state.calculation_service = CalculationService(config.reference_dir) if uses_default_service else calculation_service
    application.state.project_store = ProjectStore(config.data_dir)
    version = _default_engine_version(config.reference_dir) if uses_default_service else "unversioned"
    application.state.engine_info = engine_info.model_copy(deep=True) if engine_info is not None else EngineInfoDTO(
        engine_id="src.engine.engine.SimulationEngine" if uses_default_service else "injected_service",
        version=version,
        status="prototype" if uses_default_service else "unverified",
        limitations=[
            "API-тесты проверяют транспорт и сохранение, а не V01–V10/все ограничения кейса.",
            "Посуточный календарь использует 365 дней в каждом году; математическая приёмка не завершена.",
            "Монте-Карло запускается отдельно и возвращает сводку без истории случайных событий.",
            "assumptions_reference унаследован из engine и требует проверки владельцем модели.",
        ],
    )
    application.include_router(api_router)
    application.add_exception_handler(RequestValidationError, validation_error_response)
    application.add_middleware(RequestBoundaryMiddleware, max_request_bytes=config.max_request_bytes)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.cors_origins),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition", "ETag", "X-Request-ID", "X-Engine-Status", "X-Model-Verified", "X-Result-Origin", "X-Input-Hash", "X-Result-Run-ID"],
    )
    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.app.main:app", host="127.0.0.1", port=8000)
