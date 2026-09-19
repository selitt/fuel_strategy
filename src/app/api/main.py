"""ASGI entrypoint. Build an independent application instance for each workspace/test."""
import hashlib
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.app.config import ROOT, Settings
from src.app.dto.web_dto import EngineInfoDTO
from src.app.api.calc_controller import router as calc_router
from src.app.api.system_controller import router as system_router
from src.app.api.plan_controller import router as plan_router
from src.app.api.project_controller import router as project_router
from src.app.persistence.project_store import ProjectStore
from src.app.api.errors import ERROR_RESPONSES, install_error_handlers
from src.app.api.middleware import RequestContextMiddleware


def _default_engine_version(reference_dir: Path) -> str:
    digest = hashlib.sha256()
    files = [
        *((ROOT / "src" / "engine").glob("*.py")),
        *reference_dir.glob("*.csv"),
        *(reference_dir / "scenarios").glob("*.yaml"),
    ]
    for path in sorted(files, key=lambda item: str(item)):
        if path.is_relative_to(ROOT / "src" / "engine"):
            label = f"engine/{path.name}"
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
    """Wire a synchronous calculation adapter into the same HTTP/storage layer.

    A replacement adapter should supply a stable identity/version so existing
    results become stale when its calculation contract or implementation changes.
    """
    config = settings or Settings.from_env()
    app = FastAPI(
        title="Топливный космоконтур 2035 — REST API",
        description=("Совместимый API Васи + отдельные веб-операции. "
                     "Расчётный модуль — prototype, не подтверждённая конкурсная модель."),
        version="1.1.0",
        responses=ERROR_RESPONSES,
    )
    uses_default_service = calculation_service is None
    if uses_default_service:
        from src.app.service.calc_service import CalculationService
        calculation_service = CalculationService(config.reference_dir)
    app.state.settings = config
    app.state.calculation_service = calculation_service
    app.state.project_store = ProjectStore(config.data_dir)
    version = _default_engine_version(config.reference_dir) if uses_default_service else "unversioned"
    app.state.engine_info = engine_info.model_copy(deep=True) if engine_info is not None else EngineInfoDTO(
        engine_id="src.engine.engine.SimulationEngine" if uses_default_service else "injected_service",
        version=version,
        status="prototype" if uses_default_service else "unverified",
        limitations=[
            "API-тесты проверяют транспорт и сохранение, а не V01–V10/все ограничения кейса.",
            "Посуточный календарь движка условно использует 365 дней в каждом году; полный регламент не подтверждён.",
            "Монте-Карло возвращает только сводку и не передаёт историю отдельных аварий.",
            "assumptions_reference унаследован из engine и требует проверки владельцем модели.",
        ],
    )
    install_error_handlers(app)
    app.include_router(calc_router)
    app.include_router(system_router)
    app.include_router(plan_router)
    app.include_router(project_router)
    app.add_middleware(RequestContextMiddleware, max_request_bytes=config.max_request_bytes)
    app.add_middleware(
        CORSMiddleware, allow_origins=list(config.cors_origins), allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Request-ID"],
        expose_headers=["Content-Disposition", "X-Request-ID", "X-Engine-Status", "X-Model-Verified", "ETag", "X-Result-Origin", "X-Input-Hash", "X-Result-Run-ID"],
    )
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.app.api.main:app", host="127.0.0.1", port=8000)
