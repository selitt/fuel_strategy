"""Strict, bounded JSON helpers shared by uploads, persistence and HTTP transport."""
import json
import math
from typing import Any


class InvalidJSON(ValueError):
    pass


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise InvalidJSON("JSON содержит повторяющееся имя поля")
        result[key] = value
    return result


def _constant(value):
    raise InvalidJSON("NaN и Infinity не являются допустимыми числами JSON")


def ensure_finite(value: Any) -> None:
    """Includes numbers in extensible DTO fields, not only declared float fields."""
    stack = [value]
    while stack:
        item = stack.pop()
        if isinstance(item, float) and not math.isfinite(item):
            raise InvalidJSON("Числа должны быть конечными: NaN/Infinity запрещены")
        if isinstance(item, dict):
            stack.extend(item.values())
        elif isinstance(item, (tuple, list)):
            stack.extend(item)


def loads(data: bytes | str) -> Any:
    try:
        text = data.decode("utf-8-sig") if isinstance(data, bytes) else data
        value = json.loads(text, object_pairs_hook=_pairs, parse_constant=_constant)
        ensure_finite(value)
        return value
    except (UnicodeDecodeError, json.JSONDecodeError, RecursionError) as exc:
        raise InvalidJSON("Ожидается корректный JSON в UTF-8 без чрезмерной вложенности") from exc


def dumps(value: Any, *, pretty: bool = False) -> bytes:
    return json.dumps(value, ensure_ascii=False, allow_nan=False,
                      indent=2 if pretty else None,
                      separators=None if pretty else (",", ":")).encode("utf-8")
