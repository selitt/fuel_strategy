"""ASGI entrypoint. Build an independent application instance for each workspace/test."""
import hashlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.app.config import ROOT, Settings
from src.app.dto.web_dto import EngineInfoDTO
from src.app.api.HelloController import router as hello_router
from src.app.api.calc_controller import router as calc_router
from src.app.api.system_controller import router as system_router
from src.app.api.plan_controller import router as plan_router
from src.app.api.project_controller import router as project_router
from src.app.persistence.project_store import ProjectStore
from src.app.api.errors import install_error_handlers
from src.app.api.middleware import RequestContextMiddleware


def create_app(*, settings: Settings | None = None, calculation_service=None) -> FastAPI:
    config = settings or Settings.from_env()
    app = FastAPI(
        title="Топливный космоконтур 2035 — REST API",
        description=("Совместимый API Васи + отдельные веб-операции. "
                     "Расчётный модуль из 6.zip — prototype, не подтверждённая конкурсная модель."),
        version="1.1.0",
    )
    app.state.settings = config
    app.state.calculation_service = calculation_service
    app.state.project_store = ProjectStore(config.data_dir)
    engine_path = ROOT / "src/engine/pseudo_engine.py"
    version = hashlib.sha256(engine_path.read_bytes()).hexdigest() if engine_path.is_file() else "unavailable"
    app.state.engine_info = EngineInfoDTO(
        engine_id="pseudo_engine.run_pseudo_engine" if calculation_service is None else "injected_service",
        version=version if calculation_service is None else "unversioned",
        status="prototype" if calculation_service is None else "unverified",
        limitations=[
            "API-тесты проверяют транспорт и сохранение, а не V01–V10/все ограничения кейса.",
            "В исходном модуле годовой расчёт; внутригодовые сроки и полный регламент не подтверждены.",
            "Пустые inventory_trace/risk_register не означают отсутствие риска или дефицита внутри года.",
            "assumptions_reference унаследован из engine и требует проверки владельцем модели.",
        ],
    )
    install_error_handlers(app)
    app.include_router(hello_router)
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
