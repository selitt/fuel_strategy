"""
REST-контроллер для расчёта.
Принимает входные параметры, передаёт их в сервис и возвращает результат.
"""

from fastapi import APIRouter

try:
    from ..dto.calc_dto import CalculationRequest, CalculationResponse
    from ..service.calc_service import calculation_service
except (ImportError, ValueError):
    from src.app.dto.calc_dto import CalculationRequest, CalculationResponse
    from src.app.service.calc_service import calculation_service

router = APIRouter(prefix="/api/calc", tags=["Расчёт"])


@router.post("", response_model=CalculationResponse, summary="Запуск расчёта точек")
async def calculate(request: CalculationRequest):
    """
    Принимает JSON с параметрами {"a": ..., "b": ..., "c": ...}
    и возвращает {"points": [...]}.
    """
    return calculation_service.calculate(request)
