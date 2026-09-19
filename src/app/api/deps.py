"""
Внедрение зависимостей и хелперы HTTP-слоя.
Содержит провайдеры сервисов для использования в Depends(...) контроллеров.
"""

import logging
from typing import Any, Protocol
from fastapi import HTTPException, Request, Response, UploadFile
from starlette.responses import JSONResponse

from src.app.config.config import Settings
from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO
from src.app.dto.web_dto import ProjectDTO
from src.engine.calendar import PlanValidationError
from src.app.service.calc_service import validate_result
from src.app.service.calculation_admission import AdmittedCalculationService
from src.app.service.json_io import InvalidJSON, dumps, ensure_finite
from src.app.service.project_service import ProjectService, parse_json_file
from src.app.service.plan_tabular_io import parse_plan_file

logger = logging.getLogger("fuel.api")


class CalculationBackend(Protocol):
    """Интерфейс (контракт) расчётного ядра."""
    def get_template_plan(self) -> ParticipantPlanDTO: ...
    def calculate(self, request: ParticipantPlanDTO) -> ResultExportEnvelopeDTO: ...


def get_settings(request: Request) -> Settings:
    """Провайдер конфигурации приложения."""
    return request.app.state.settings


def get_calculation_service(request: Request) -> CalculationBackend:
    """Провайдер сервиса расчёта (может быть переопределен в тестах)."""
    service = request.app.state.calculation_service
    if service is None:
        raise HTTPException(status_code=503, detail="Расчётный сервис ещё не подключён")
    return AdmittedCalculationService(service, request.app.state.calculation_admission)


def get_project_service(request: Request) -> ProjectService:
    """Провайдер сервиса управления проектами."""
    return ProjectService(request.app.state.project_store, request.app.state.engine_info)


def check_plan_finite(plan: ParticipantPlanDTO) -> None:
    """Проверяет конечность чисел и допустимость JSON."""
    try:
        ensure_finite(plan.model_dump(mode="python"))
    except InvalidJSON as exc:
        raise HTTPException(status_code=422, detail=[{"loc": ["body"], "msg": str(exc), "type": "value_error"}]) from exc


async def plan_validation_error_response(
    request: Request, exc: PlanValidationError
) -> JSONResponse:
    """Keep the legacy detail and add machine-readable field diagnostics."""
    content: dict[str, Any] = {"detail": str(exc)}
    if exc.issues:
        content["issues"] = [issue.as_dict() for issue in exc.issues]
    return JSONResponse(status_code=422, content=content)


def call_template(service: CalculationBackend) -> ParticipantPlanDTO:
    """Безопасно запрашивает шаблон плана у сервиса расчёта."""
    try:
        plan = ParticipantPlanDTO.model_validate(service.get_template_plan())
        ensure_finite(plan.model_dump(mode="python"))
        return plan
    except HTTPException:
        raise
    except PlanValidationError:
        raise
    except (NotImplementedError, ImportError) as exc:
        raise HTTPException(status_code=503, detail="Расчётный сервис ещё не подключён") from exc
    except Exception as exc:
        logger.exception("Template loading failed")
        raise HTTPException(status_code=500, detail="Сервис вернул шаблон неправильного формата") from exc


def call_calculation(service: CalculationBackend, plan: ParticipantPlanDTO) -> ResultExportEnvelopeDTO:
    """Выполняет расчёт с проверкой входных данных и результата."""
    check_plan_finite(plan)
    try:
        result = validate_result(service.calculate(plan.model_copy(deep=True)))
        if result.plan_id != plan.plan_id or result.scenario_id != plan.scenario_id:
            raise ValueError("Calculation result identity does not match input")
        return result
    except HTTPException:
        raise
    except PlanValidationError:
        raise
    except (NotImplementedError, ImportError) as exc:
        raise HTTPException(status_code=503, detail="Расчётный сервис ещё не подключён") from exc
    except Exception as exc:
        logger.exception("Calculation failed")
        raise HTTPException(status_code=500, detail="Расчёт завершился ошибкой; результат не заменён") from exc


def call_risk_calculation(service: CalculationBackend, plan: ParticipantPlanDTO) -> ResultExportEnvelopeDTO:
    check_plan_finite(plan)
    runner = getattr(service, "calculate_risk", None)
    if not callable(runner):
        raise HTTPException(
            503,
            "Анализ рисков не подключён",
        )
    try:
        result = validate_result(runner(plan.model_copy(deep=True)))
        if result.plan_id != plan.plan_id or result.scenario_id != plan.scenario_id:
            raise ValueError("Risk result identity does not match input")
        return result
    except HTTPException:
        raise
    except PlanValidationError:
        raise
    except (NotImplementedError, ImportError) as exc:
        raise HTTPException(
            503,
            "Анализ рисков не подключён",
        ) from exc
    except Exception as exc:
        logger.exception("Risk calculation failed")
        raise HTTPException(
            500,
            "Анализ рисков завершился ошибкой; результат не заменён",
        ) from exc


def set_etag(response: Response, project: ProjectDTO) -> None:
    """Проставляет HTTP-заголовки версионирования (ETag)."""
    response.headers["ETag"] = f'"{project.project_id}-r{project.revision}"'
    if project.last_run is not None:
        response.headers["X-Result-Origin"] = project.last_run.origin
        response.headers["X-Engine-Status"] = project.last_run.engine.status
        response.headers["X-Input-Hash"] = project.last_run.input_hash
        response.headers["X-Result-Run-ID"] = str(project.last_run.run_id)


def project_response(project: ProjectDTO, response: Response, status_code: int = 200) -> Response:
    """Сериализует ProjectDTO в JSON-ответ с корректными заголовками."""
    set_etag(response, project)
    return Response(
        content=dumps(project.model_dump(mode="python")),
        media_type="application/json",
        status_code=status_code,
        headers=dict(response.headers),
    )


def read_json_upload(file: UploadFile, settings: Settings) -> Any:
    """Читает и парсит загруженный пользователем JSON-файл."""
    try:
        contents = file.file.read(settings.max_upload_bytes + 1)
        return parse_json_file(contents, file.filename, settings.max_upload_bytes)
    finally:
        file.file.close()


def read_plan_upload(file: UploadFile, settings: Settings) -> Any:
    """Reads a bounded JSON/CSV/XLSX/XLS participant-plan upload."""
    try:
        contents = file.file.read(settings.max_upload_bytes + 1)
        return parse_plan_file(contents, file.filename, settings.max_upload_bytes)
    finally:
        file.file.close()
