"""
Корневой роутер API приложения «Топливный космоконтур 2035».
Объединяет контроллеры расчёта, справочников, планов и проектов.
"""

from fastapi import APIRouter

from .routes.calc_routes import router as calc_router
from .routes.system_routes import router as system_router
from .routes.project_routes import plan_router, project_router

api_router = APIRouter()
api_router.include_router(calc_router)
api_router.include_router(system_router)
api_router.include_router(plan_router)
api_router.include_router(project_router)
