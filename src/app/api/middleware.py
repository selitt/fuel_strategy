"""Bounded request buffering for this small, local prototype (including chunked HTTP)."""
import logging
import re
from time import perf_counter
from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse

from src.app.service.json_io import InvalidJSON, loads

logger = logging.getLogger("fuel.api")
_SAFE_ID = re.compile(r"^[A-Za-z0-9._-]{1,80}$")


class RequestContextMiddleware:
    def __init__(self, app, max_request_bytes: int):
        self.app = app
        self.limit = max_request_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = Headers(scope=scope)
        candidate = headers.get("x-request-id", "")
        request_id = candidate if _SAFE_ID.fullmatch(candidate) else str(uuid4())
        scope.setdefault("state", {})["request_id"] = request_id
        started = perf_counter()
        response_started = False
        status = 500

        async def observed_send(message):
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                response_started = True
                status = message["status"]
                output_headers = MutableHeaders(scope=message)
                output_headers["X-Request-ID"] = request_id
                engine = scope["app"].state.engine_info
                if "x-engine-status" not in output_headers:
                    output_headers["X-Engine-Status"] = engine.status
                output_headers["X-Model-Verified"] = "false"
            await send(message)

        async def reject(status_code, code, detail):
            await JSONResponse(status_code=status_code, content={
                "code": code, "detail": detail, "request_id": request_id,
            })(scope, receive, observed_send)

        try:
            if headers.get("content-encoding", "identity").lower() != "identity":
                return await reject(415, "UNSUPPORTED_ENCODING", "Сжатые тела запросов не поддерживаются")
            declared = headers.get("content-length")
            if declared is not None:
                try:
                    length = int(declared)
                    if length < 0:
                        raise ValueError
                except ValueError:
                    return await reject(400, "INVALID_CONTENT_LENGTH", "Некорректный Content-Length")
                if length > self.limit:
                    return await reject(413, "REQUEST_TOO_LARGE", "Запрос превышает разрешённый размер")
            parts = []
            size = 0
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                part = message.get("body", b"")
                size += len(part)
                if size > self.limit:
                    return await reject(413, "REQUEST_TOO_LARGE", "Запрос превышает разрешённый размер")
                parts.append(part)
                if not message.get("more_body", False):
                    break
            body = b"".join(parts)
            content_type = headers.get("content-type", "").split(";")[0].strip().lower()
            if body and (content_type == "application/json" or content_type.endswith("+json")):
                try:
                    loads(body)
                except InvalidJSON as exc:
                    return await reject(422, "VALIDATION_ERROR", [{
                        "loc": ["body"], "msg": str(exc), "type": "json_invalid",
                    }])
            consumed = False

            async def replay():
                nonlocal consumed
                if not consumed:
                    consumed = True
                    return {"type": "http.request", "body": body, "more_body": False}
                return await receive()

            await self.app(scope, replay, observed_send)
        except Exception:
            logger.exception("Unhandled HTTP failure request_id=%s", request_id)
            if response_started:
                raise
            await reject(500, "INTERNAL_ERROR", "Внутренняя ошибка API; используйте request_id для диагностики")
        finally:
            logger.info("%s %s status=%s elapsed_ms=%.1f request_id=%s",
                        scope["method"], scope["path"], status,
                        (perf_counter() - started) * 1000, request_id)
