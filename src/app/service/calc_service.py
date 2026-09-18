"""
Сервисный слой расчёта.
Связывает REST-контроллер с псевдо-движком (engine).
"""

try:
    from ..dto.calc_dto import CalculationRequest, CalculationResponse
    from ...engine.pseudo_engine import run_pseudo_engine
except (ImportError, ValueError):
    from src.app.dto.calc_dto import CalculationRequest, CalculationResponse
    from src.engine.pseudo_engine import run_pseudo_engine


class CalculationService:
    """Сервис для обработки запросов расчёта."""

    def calculate(self, request: CalculationRequest) -> CalculationResponse:
        """
        Принимает DTO запроса, передаёт числа в движок и формирует DTO ответа.
        """
        points = run_pseudo_engine(request.a, request.b, request.c)
        return CalculationResponse(points=points)


calculation_service = CalculationService()
