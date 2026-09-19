"""Strict, bounded JSON helpers shared by uploads, persistence and HTTP transport."""
import json
import math
from typing import Any


# Leave headroom for ProjectDTO / RunRecordDTO / export metadata around a
# plan or result, below the serializer's recursion boundary. These are web
# transport limits, not constraints on the mathematical model.
MAX_VALUE_DEPTH = 128
MAX_DOCUMENT_DEPTH = 192


class InvalidJSON(ValueError):
    pass


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise InvalidJSON("JSON содержит повторяющееся имя поля")
        result[key] = value
    return result


def _constant(_):
    raise InvalidJSON("NaN и Infinity не являются допустимыми числами JSON")


def ensure_finite(value: Any, *, max_depth: int = MAX_VALUE_DEPTH) -> None:
    """Validate finite numbers, Unicode and nesting before DTO JSON conversion.

    Call with Python-mode values: JSON-mode serialization may replace non-finite
    numbers in extension fields with null before this function can inspect them.
    """
    stack = [(value, 0)]
    while stack:
        item, depth = stack.pop()
        if depth > max_depth:
            raise InvalidJSON(f"JSON превышает допустимую вложенность ({max_depth})")
        if isinstance(item, float) and not math.isfinite(item):
            raise InvalidJSON("Числа должны быть конечными: NaN/Infinity запрещены")
        if isinstance(item, str):
            try:
                item.encode("utf-8")
            except UnicodeEncodeError as exc:
                raise InvalidJSON("Строки и имена полей JSON должны содержать корректный Unicode") from exc
        elif isinstance(item, dict):
            stack.extend((key, depth + 1) for key in item)
            stack.extend((child, depth + 1) for child in item.values())
        elif isinstance(item, (tuple, list)):
            stack.extend((child, depth + 1) for child in item)


def loads(data: bytes | str) -> Any:
    try:
        text = data.decode("utf-8-sig") if isinstance(data, bytes) else data
        value = json.loads(text, object_pairs_hook=_pairs, parse_constant=_constant)
        ensure_finite(value, max_depth=MAX_DOCUMENT_DEPTH)
        return value
    except InvalidJSON:
        raise
    except (ValueError, RecursionError) as exc:
        # ValueError also covers the interpreter's integer-conversion limit,
        # JSONDecodeError and UnicodeDecodeError. Do not disable those limits.
        raise InvalidJSON("Ожидается корректный JSON в UTF-8 с допустимыми числами и вложенностью") from exc


def dumps(value: Any, *, pretty: bool = False) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        allow_nan=False,
        default=lambda o: o.isoformat() if hasattr(o, "isoformat") else str(o),
        indent=2 if pretty else None,
        separators=None if pretty else (",", ":"),
    ).encode("utf-8")


def plan_hash(plan: Any) -> str:
    """Вычисляет детерминированный SHA-256 хэш плана решений."""
    import hashlib
    ensure_finite(plan.model_dump(mode="python"))
    value = plan.model_dump(mode="python")
    canonical = json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
