"""ASGI entrypoint. Build an independent application instance for each workspace/test."""
import hashlib
from pathlib import Path
import sys

_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.app.config.config import Settings, ROOT
from src.app.dto.web_dto import EngineInfoDTO
from src.app.api.router import api_router
from src.app.persistence.project_store import ProjectStore


def create_app(
    *, settings: Settings | None = None, calculation_service=None,
    engine_info: EngineInfoDTO | None = None,
) -> FastAPI:
    config = settings or Settings.from_env()
    application = FastAPI(
        title="Топливный космоконтур 2035 — REST API",
        description="REST API для управления проектами и расчётами материального баланса.",
        version="1.1.0",
    )
    application.state.settings = config
    application.state.calculation_service = calculation_service
    application.state.project_store = ProjectStore(config.data_dir)
    engine_path = ROOT / "src/engine/engine.py"
    version = hashlib.sha256(engine_path.read_bytes()).hexdigest() if engine_path.is_file() else "unavailable"
    application.state.engine_info = engine_info.model_copy(deep=True) if engine_info is not None else EngineInfoDTO(
        engine_id="engine.run_engine" if calculation_service is None else "injected_service",
        version=version if calculation_service is None else "unversioned",
        status="prototype" if calculation_service is None else "unverified",
        limitations=[
            "API-тесты проверяют транспорт и сохранение, а не V01–V10/все ограничения кейса.",
            "В исходном модуле годовой расчёт; внутригодовые сроки и полный регламент не подтверждены.",
            "Пустые inventory_trace/risk_register не означают отсутствие риска или дефицита внутри года.",
            "assumptions_reference унаследован из engine и требует проверки владельцем модели.",
        ],
    )
    application.include_router(api_router)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.cors_origins),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition", "ETag"],
    )
    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.app.main:app", host="127.0.0.1", port=8000)
