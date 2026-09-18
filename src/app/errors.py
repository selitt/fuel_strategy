"""Application failures with safe, user-facing messages (never raw tracebacks)."""
from typing import Any


class ApiProblem(Exception):
    def __init__(self, status: int, code: str, detail: str | list[dict[str, Any]]):
        super().__init__(code)
        self.status = status
        self.code = code
        self.detail = detail
