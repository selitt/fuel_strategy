"""Plan validation/import only. It never evaluates a mathematical model."""
import hashlib
import json
from pathlib import PurePosixPath

from pydantic import ValidationError

from src.app.dto.calc_dto import ParticipantPlanDTO
from src.app.dto.web_dto import PlanValidationDTO
from src.app.errors import ApiProblem
from src.app.service.json_io import InvalidJSON, ensure_finite, loads


PLAN_WARNINGS = [
    "Проверены только DTO и JSON-структура; допустимость плана и ограничения модели здесь не рассчитываются.",
    "Defaults, включая initial_inventory_t=12.33, унаследованы из DTO Васи; это не новые условия организатора.",
    "Дополнительные поля сохраняются, но их поддержку расчётным модулем должен подтвердить его владелец.",
]


def plan_hash(plan: ParticipantPlanDTO) -> str:
    ensure_finite(plan.model_dump(mode="python"))
    value = plan.model_dump(mode="json")
    canonical = json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def validation_problem(exc: ValidationError) -> ApiProblem:
    return ApiProblem(422, "VALIDATION_ERROR", [
        {"loc": ["body", *item["loc"]], "msg": item["msg"], "type": item["type"]}
        for item in exc.errors()
    ])


def validate_plan(value) -> PlanValidationDTO:
    raw = value.model_dump(mode="python") if isinstance(value, ParticipantPlanDTO) else value
    try:
        ensure_finite(raw)
        plan = ParticipantPlanDTO.model_validate(raw)
        ensure_finite(plan.model_dump(mode="python"))
    except ValidationError as exc:
        raise validation_problem(exc) from exc
    except InvalidJSON as exc:
        raise ApiProblem(422, "VALIDATION_ERROR", [{"loc": ["body"], "msg": str(exc), "type": "value_error.json_value"}]) from exc
    return PlanValidationDTO(plan=plan, normalized=plan.model_dump(mode="json") != raw, warnings=list(PLAN_WARNINGS))


def parse_json_file(contents: bytes, filename: str | None, limit: int):
    # Filenames are never used as filesystem paths; only an extension is inspected.
    name = (filename or "").replace("\\", "/")
    if PurePosixPath(name).suffix.lower() != ".json":
        raise ApiProblem(415, "UNSUPPORTED_FILE_TYPE", "Поддерживается JSON-файл (.json), не Python/CSV/XLSX")
    if len(contents) > limit:
        raise ApiProblem(413, "FILE_TOO_LARGE", "Файл превышает разрешённый размер")
    try:
        return loads(contents)
    except InvalidJSON as exc:
        raise ApiProblem(422, "VALIDATION_ERROR", [{"loc": ["body", "file"], "msg": str(exc), "type": "json_invalid"}]) from exc
