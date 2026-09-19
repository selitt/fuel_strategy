"""Validation and normalization for explicitly dated supply batches."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, Iterable, List, Mapping, Tuple

from .loader import CaseCatalog
from .models import SupplySource


class PlanValidationError(ValueError):
    """The submitted plan cannot be simulated without inventing decisions."""


_MONTH_LENGTHS = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)


@dataclass(frozen=True)
class DatedBatch:
    batch_id: str
    source: SupplySource
    source_alias: str
    year: int
    delivery_date: date
    model_day: int
    order_date: date
    ordered_t: float


def _number(value: Any, field: str) -> float:
    if isinstance(value, bool):
        raise PlanValidationError(
            f"Поле {field} должно быть конечным неотрицательным числом"
        )
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise PlanValidationError(
            f"Поле {field} должно быть конечным неотрицательным числом"
        ) from exc
    if not math.isfinite(number) or number < 0:
        raise PlanValidationError(
            f"Поле {field} должно быть конечным неотрицательным числом"
        )
    return number


def _year(value: Any, field: str = "year") -> int:
    if isinstance(value, bool):
        raise PlanValidationError(f"Поле {field} должно быть целым годом")
    try:
        result = int(value)
    except (TypeError, ValueError) as exc:
        raise PlanValidationError(f"Поле {field} должно быть целым годом") from exc
    if str(value).strip() not in {str(result), f"{result}.0"}:
        raise PlanValidationError(f"Поле {field} должно быть целым годом")
    return result


def _source(catalog: CaseCatalog, raw_source_id: Any) -> Tuple[str, SupplySource]:
    alias = str(raw_source_id or "").strip()
    source = catalog.sources.get(alias)
    if source is None:
        raise PlanValidationError(
            f"Неизвестный источник (unknown source): {alias or '<пусто>'}"
        )
    return alias, source


def _parse_model_date(raw: Any, field: str) -> date:
    if not isinstance(raw, str) or not raw.strip():
        raise PlanValidationError(
            f"Для положительной поставки укажите {field} — дату получения партии"
        )
    try:
        parsed = date.fromisoformat(raw)
    except ValueError as exc:
        raise PlanValidationError(f"Поле {field} должно иметь формат YYYY-MM-DD") from exc
    if raw != parsed.isoformat():
        raise PlanValidationError(f"{field}: укажите дату в формате YYYY-MM-DD")
    if parsed.month == 2 and parsed.day == 29:
        raise PlanValidationError(
            "29 February (29 февраля) отсутствует в 365-дневном календаре модели"
        )
    return parsed


def _day_of_year(value: date) -> int:
    return sum(_MONTH_LENGTHS[: value.month - 1]) + value.day - 1


def _from_model_ordinal(ordinal: int) -> date:
    year, day_of_year = divmod(ordinal, 365)
    month = 1
    for length in _MONTH_LENGTHS:
        if day_of_year < length:
            return date(year, month, day_of_year + 1)
        day_of_year -= length
        month += 1
    raise AssertionError("invalid model ordinal")


def _subtract_months(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 - months
    year, zero_based_month = divmod(month_index, 12)
    month = zero_based_month + 1
    day = min(value.day, _MONTH_LENGTHS[month - 1])
    return date(year, month, day)


def _preparation_date(source: SupplySource, delivery_date: date) -> date:
    lead = source.lead_time_max_value
    if not float(lead).is_integer() or lead < 0:
        raise ValueError(
            f"catalog lead time for {source.source_id} must be a non-negative integer"
        )
    amount = int(lead)
    unit = source.lead_time_unit.strip().lower()
    if unit in {"month", "months"}:
        return _subtract_months(delivery_date, amount)
    if unit in {"week", "weeks"}:
        ordinal = delivery_date.year * 365 + _day_of_year(delivery_date)
        return _from_model_ordinal(ordinal - amount * 7)
    if unit in {"day", "days"}:
        ordinal = delivery_date.year * 365 + _day_of_year(delivery_date)
        return _from_model_ordinal(ordinal - amount)
    raise ValueError(f"unsupported catalog lead time unit for {source.source_id}: {unit}")


def _investment_years(
    catalog: CaseCatalog,
    decisions: Mapping[str, Any],
) -> Dict[str, int]:
    result: Dict[str, int] = {}
    for index, investment in enumerate(decisions.get("investments", [])):
        investment_id = str(investment.get("investment_id", "")).strip().upper()
        if not investment_id:
            raise PlanValidationError(
                f"В строке инвестиции {index + 1} не указан investment_id"
            )
        if investment_id not in catalog.investments:
            raise PlanValidationError(f"неизвестная инвестиция: {investment_id}")
        if investment_id in result:
            raise PlanValidationError(
                f"Инвестиция {investment_id} повторяется; оставьте одно решение"
            )
        year = investment.get("year")
        commissioning_year = investment.get("commissioning_year")
        if year is not None and commissioning_year is not None:
            if _year(year) != _year(commissioning_year):
                raise PlanValidationError(
                    f"В строке инвестиции {index + 1} расходятся year и commissioning_year"
                )
        raw_year = year if year is not None else commissioning_year
        if raw_year is not None:
            result[investment_id] = _year(raw_year, "год инвестиционного решения")
        else:
            raise PlanValidationError(
                f"Для инвестиции {investment_id} укажите год решения"
            )
        decision_year = result[investment_id]
        if decision_year not in catalog.demands:
            raise PlanValidationError(f"Год решения {decision_year} вне горизонта модели")
        if investment_id == "LUNAR_ISRU":
            available = catalog.sources["Lunar-ISRU"].available_from_year
            if available is not None and decision_year >= available:
                raise PlanValidationError(f"LUNAR_ISRU требуется профинансировать до {available} года")
        for alias in ("option_year", "exercise_year"):
            if investment.get(alias) is not None and _year(investment[alias]) != decision_year:
                raise PlanValidationError(f"Инвестиция {investment_id}: {alias} расходится с годом решения; уточните импортированный план")
        schedule = investment.get("capex_schedule")
        if schedule is not None:
            expected = {str(decision_year): catalog.investments[investment_id].total_capex_mln}
            if not isinstance(schedule, dict) or {str(k): v for k,v in schedule.items()} != expected:
                raise PlanValidationError(f"Инвестиция {investment_id}: capex_schedule расходится с оплатой в год решения")
    return result


def normalize_reservations(
    catalog: CaseCatalog,
    decisions: Mapping[str, Any],
) -> Dict[Tuple[int, str], float]:
    years = set(catalog.demands)
    normalized: Dict[Tuple[int, str], float] = {}
    aliases: Dict[Tuple[int, str], str] = {}
    for index, reservation in enumerate(decisions.get("capacity_reservations", [])):
        year = _year(reservation.get("year"))
        if year not in years:
            raise PlanValidationError(
                f"Год брони {year} находится вне горизонта модели"
            )
        alias, source = _source(catalog, reservation.get("source_id"))
        key = (year, source.source_id)
        if key in normalized:
            previous = aliases[key]
            if previous != alias:
                raise PlanValidationError(
                    f"conflicting aliases: источник {source.name} в {year} году "
                    f"записан как {previous} и {alias}; используйте одно обозначение"
                )
            raise PlanValidationError(
                f"Бронь {source.name} за {year} год повторяется; оставьте одну строку"
            )
        value = _number(
            reservation.get("reserved_capacity_t", 0.0),
            f"capacity_reservations[{index}].reserved_capacity_t",
        )
        if value > source.capacity_t_per_year + 1e-9:
            raise PlanValidationError(
                f"reserved capacity {value:g} т превышает source capacity "
                f"{source.capacity_t_per_year:g} т/год канала {source.name} в {year}"
            )
        normalized[key] = value
        aliases[key] = alias
    return normalized


def _order_volume(order: Mapping[str, Any], index: int) -> float:
    canonical = order.get("order_t")
    legacy = order.get("order_volume_t")
    if canonical is not None and legacy is not None:
        canonical_number = _number(canonical, f"supply_orders[{index}].order_t")
        legacy_number = _number(legacy, f"supply_orders[{index}].order_volume_t")
        if abs(canonical_number - legacy_number) > 1e-9:
            raise PlanValidationError(
                f"В supply_orders[{index}] расходятся order_t and order_volume_t"
            )
        return canonical_number
    value = canonical if canonical is not None else legacy
    return _number(value or 0.0, f"supply_orders[{index}].order_t")


def normalize_batches(
    catalog: CaseCatalog,
    decisions: Mapping[str, Any],
    reservations: Mapping[Tuple[int, str], float] | None = None,
) -> List[DatedBatch]:
    years = sorted(catalog.demands)
    if not years:
        return []
    year_indexes = {year: index for index, year in enumerate(years)}
    investment_years = _investment_years(catalog, decisions)
    normalized: List[DatedBatch] = []
    batch_ids = set()
    aliases: Dict[Tuple[int, str], str] = {}

    for index, order in enumerate(decisions.get("supply_orders", [])):
        volume = _order_volume(order, index)
        year = _year(order.get("year"))
        if year not in year_indexes:
            raise PlanValidationError(
                f"receipt year {year} (год получения) находится вне горизонта модели"
            )
        alias, source = _source(catalog, order.get("source_id"))
        if volume == 0:
            continue
        alias_key = (year, source.source_id)
        previous_alias = aliases.setdefault(alias_key, alias)
        if previous_alias != alias:
            raise PlanValidationError(
                f"conflicting aliases: источник {source.name} в {year} году "
                f"записан как {previous_alias} и {alias}; используйте одно обозначение"
            )

        delivery_date = _parse_model_date(order.get("delivery_date"), "delivery_date")
        batch_id = str(order.get("batch_id") or "").strip()
        if not batch_id:
            raise PlanValidationError(
                "Для каждой положительной поставки укажите непустой batch_id"
            )
        if batch_id in batch_ids:
            raise PlanValidationError(
                f"duplicate batch_id: партия {batch_id} повторяется"
            )
        batch_ids.add(batch_id)

        if delivery_date.year != year:
            raise PlanValidationError(
                f"delivery_date {delivery_date.isoformat()} не совпадает с receipt year "
                f"(годом получения) {year}"
            )
        if source.available_from_year is not None and year < source.available_from_year:
            raise PlanValidationError(
                f"Канал {source.name} доступен только с {source.available_from_year} года"
            )

        if source.source_id == "C":
            decision_year = investment_years.get("EARTH_NEW")
            if decision_year is None:
                raise PlanValidationError(
                    "Поставка Earth-New требует инвестиционного решения EARTH_NEW"
                )
            ready_date = date(decision_year, 1, 1)
            ready_date = _subtract_months(ready_date, -int(source.lead_time_max_value))
            if delivery_date < ready_date:
                raise PlanValidationError(
                    f"Партия Earth-New {batch_id} приходит раньше завершения подготовки "
                    f"{ready_date.isoformat()}"
                )
        elif source.source_id == "D":
            decision_year = investment_years.get("LUNAR_ISRU")
            if decision_year is None:
                raise PlanValidationError(
                    "Поставка Lunar-ISRU требует инвестиционного решения LUNAR_ISRU"
                )
            if source.available_from_year is not None and decision_year >= source.available_from_year:
                raise PlanValidationError(
                    f"LUNAR_ISRU необходимо профинансировать до {source.available_from_year} года"
                )

        model_day = year_indexes[year] * 365 + _day_of_year(delivery_date)
        normalized.append(
            DatedBatch(
                batch_id=batch_id,
                source=source,
                source_alias=alias,
                year=year,
                delivery_date=delivery_date,
                model_day=model_day,
                order_date=_preparation_date(source, delivery_date),
                ordered_t=volume,
            )
        )

    reservations = reservations or {}
    annual_orders: Dict[Tuple[int, str], float] = {}
    for batch in normalized:
        key = (batch.year, batch.source.source_id)
        annual_orders[key] = annual_orders.get(key, 0.0) + batch.ordered_t
    for (year, source_id), ordered_t in annual_orders.items():
        source = catalog.sources[source_id]
        if ordered_t > source.capacity_t_per_year + 1e-9:
            raise PlanValidationError(
                f"Заказано {ordered_t:g} т — это превышает source capacity "
                f"{source.capacity_t_per_year:g} т/год канала {source.name} в {year}"
            )
        if source.reservation_rate > 0:
            reserved_t = reservations.get((year, source_id), 0.0)
            if ordered_t > reserved_t + 1e-9:
                raise PlanValidationError(
                    f"Заказано {ordered_t:g} т — это превышает reserved capacity "
                    f"{reserved_t:g} т/год канала {source.name} в {year}; "
                    "увеличьте бронь или уменьшите поставки"
                )

    return normalized


def normalize_plan(
    catalog: CaseCatalog,
    decisions: Mapping[str, Any],
) -> Tuple[List[DatedBatch], Dict[Tuple[int, str], float]]:
    reservations = normalize_reservations(catalog, decisions)
    return normalize_batches(catalog, decisions, reservations), reservations


def first_operating_years(batches: Iterable[DatedBatch]) -> Dict[str, int]:
    result: Dict[str, int] = {}
    for batch in batches:
        current = result.get(batch.source.source_id)
        if current is None or batch.year < current:
            result[batch.source.source_id] = batch.year
    return result


def source_operating_years(
    catalog: CaseCatalog,
    decisions: Mapping[str, Any],
    batches: Iterable[DatedBatch],
) -> Dict[str, int]:
    """Return the first year a channel can operate, independent of first use."""
    investment_years = _investment_years(catalog, decisions)
    first_shipments = first_operating_years(batches)
    result: Dict[str, int] = {}
    for source in {item.source_id: item for item in catalog.sources.values()}.values():
        if source.source_id == "C" and "EARTH_NEW" in investment_years:
            ready = _subtract_months(
                date(investment_years["EARTH_NEW"], 1, 1),
                -int(source.lead_time_max_value),
            )
            result[source.source_id] = ready.year
        elif getattr(source, "available_from_year", None) is not None:
            result[source.source_id] = source.available_from_year
        elif source.source_id in first_shipments:
            result[source.source_id] = first_shipments[source.source_id]
    return result
