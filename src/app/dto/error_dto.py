"""Structured API errors that can point the UI to editable plan fields."""

from typing import Any

from pydantic import BaseModel, ConfigDict


class ErrorDTOBase(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ValidationIssueDTO(ErrorDTOBase):
    code: str
    message: str
    loc: list[str | int]
    source_id: str | None = None
    year: int | None = None
    actual: float | None = None
    limit: float | None = None


class ErrorDTO(ErrorDTOBase):
    detail: str | list[dict[str, Any]]
    issues: list[ValidationIssueDTO] | None = None
