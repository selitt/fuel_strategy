"""The integration seam for Vasya: replace the service, not routes or DTO names."""
import logging
from typing import Protocol

from fastapi import Request

from src.app.config import Settings
from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO
from src.app.errors import ApiProblem
from src.app.service.json_io import InvalidJSON, ensure_finite
from src.app.service.result_validation import validate_result

logger = logging.getLogger("fuel.api")


class CalculationBackend(Protocol):
    def get_template_plan(self) -> ParticipantPlanDTO: ...
    def calculate(self, request: ParticipantPlanDTO) -> ResultExportEnvelopeDTO: ...


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_calculation_service(request: Request) -> CalculationBackend:
    service = request.app.state.calculation_service
    if service is not None:
        return service
    try:
        from src.app.service.calc_service import calculation_service
        return calculation_service
    except ImportError as exc:
        logger.exception("Calculation service import failed")
        raise ApiProblem(503, "ENGINE_NOT_READY", "Расчётный сервис ещё не подключён") from exc


def check_plan_finite(plan: ParticipantPlanDTO) -> None:
    try:
        ensure_finite(plan.model_dump(mode="python"))
    except InvalidJSON as exc:
        raise ApiProblem(422, "VALIDATION_ERROR", [{
            "loc": ["body"], "msg": str(exc), "type": "value_error.json_value",
        }]) from exc


def call_template(service: CalculationBackend) -> ParticipantPlanDTO:
    """Use the same availability/error boundary for template loading as calculation."""
    try:
        plan = ParticipantPlanDTO.model_validate(service.get_template_plan())
        ensure_finite(plan.model_dump(mode="python"))
        return plan
    except ApiProblem:
        raise
    except (NotImplementedError, ImportError) as exc:
        raise ApiProblem(503, "ENGINE_NOT_READY", "Расчётный сервис ещё не подключён") from exc
    except Exception as exc:
        logger.exception("Template loading failed")
        raise ApiProblem(500, "INVALID_SERVICE_RESULT", "Сервис вернул шаблон неправильного формата") from exc


def call_calculation(service: CalculationBackend, plan: ParticipantPlanDTO) -> ResultExportEnvelopeDTO:
    check_plan_finite(plan)
    try:
        result = validate_result(service.calculate(plan.model_copy(deep=True)))
        if result.plan_id != plan.plan_id or result.scenario_id != plan.scenario_id:
            raise ValueError("Calculation result identity does not match input")
        return result
    except ApiProblem:
        # Only explicit, public adapter errors are safe to expose to the UI.
        raise
    except (NotImplementedError, ImportError) as exc:
        raise ApiProblem(503, "ENGINE_NOT_READY", "Расчётный сервис ещё не подключён") from exc
    except Exception as exc:
        # ValidationError here is an OUTPUT/programming error, not a client's 422.
        logger.exception("Calculation failed")
        raise ApiProblem(500, "CALCULATION_FAILED", "Расчёт завершился ошибкой; результат не заменён") from exc


def get_project_service(request: Request):
    from src.app.service.project_service import ProjectService
    return ProjectService(request.app.state.project_store, request.app.state.engine_info)
