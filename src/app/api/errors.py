import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from src.app.errors import ApiProblem

logger = logging.getLogger("fuel.api")


def problem_response(request: Request, status: int, code: str, detail):
    return JSONResponse(status_code=status, content={
        "code": code, "detail": detail,
        "request_id": getattr(request.state, "request_id", "unknown"),
    })


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiProblem)
    async def application_error(request, exc):
        return problem_response(request, exc.status, exc.code, exc.detail)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        # Preserve the documented FastAPI detail[] shape. Do not echo uploaded
        # content, non-finite values, exception objects or secrets back to clients.
        detail = [{"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
                  for error in exc.errors()]
        return problem_response(request, 422, "VALIDATION_ERROR", detail)

    @app.exception_handler(ResponseValidationError)
    async def invalid_response(request, exc):
        logger.error("Response validation failed: %s", type(exc).__name__)
        return problem_response(request, 500, "INVALID_SERVICE_RESULT", "Сервис вернул результат неправильного формата")

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        response = problem_response(request, exc.status_code, f"HTTP_{exc.status_code}", exc.detail)
        if exc.headers:
            response.headers.update(exc.headers)
        return response
