"""Validation and normalization for explicitly dated supply batches."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, Iterable, List, Mapping, Tuple

from .loader import CaseCatalog
from .models import SupplySource


PlanLocation = Tuple[str | int, ...]


@dataclass(frozen=True)
class PlanValidationIssue:
    """Machine-readable context for one actionable plan validation failure."""

    code: str
    message: str
    loc: PlanLocation
    source_id: str | None = None
    year: int | None = None
    actual: float | None = None
    limit: float | None = None

    def as_dict(self) -> Dict[str, Any]:
        values = {
            "code": self.code,
            "message": self.message,
            "loc": list(self.loc),
            "source_id": self.source_id,
            "year": self.year,
            "actual": self.actual,
            "limit": self.limit,
        }
        return {key: value for key, value in values.items() if value is not None}


class PlanValidationError(ValueError):
    """The submitted plan cannot be simulated without inventing decisions."""

    def __init__(
        self,
        detail: str,
        *,
        issue: PlanValidationIssue | None = None,
        issues: Iterable[PlanValidationIssue] = (),
    ) -> None:
        super().__init__(detail)
        self.issues = tuple(issues) + ((issue,) if issue is not None else ())


def _error(
    detail: str,
    *,
    code: str,
    message: str,
    loc: PlanLocation,
    source_id: str | None = None,
    year: int | None = None,
    actual: float | None = None,
    limit: float | None = None,
) -> PlanValidationError:
    return PlanValidationError(
        detail,
        issue=PlanValidationIssue(
            code=code,
            message=message,
            loc=loc,
            source_id=source_id,
            year=year,
            actual=actual,
            limit=limit,
        ),
    )


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


def _number(value: Any, field: str, loc: PlanLocation) -> float:
    detail = f"Поле {field} должно быть конечным неотрицательным числом"
    issue = dict(
        code="invalid_number",
        message="Введите конечное неотрицательное число.",
        loc=loc,
    )
    if isinstance(value, bool):
        raise _error(detail, **issue)
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise _error(detail, **issue) from exc
    if not math.isfinite(number) or number < 0:
        raise _error(detail, **issue)
    return number


def _year(
    value: Any,
    field: str = "year",
    loc: PlanLocation = ("decisions",),
) -> int:
    detail = f"Поле {field} должно быть целым годом"
    issue = dict(
        code="invalid_year",
        message="Укажите год целым числом.",
        loc=loc,
    )
    if isinstance(value, bool):
        raise _error(detail, **issue)
    try:
        result = int(value)
    except (TypeError, ValueError) as exc:
        raise _error(detail, **issue) from exc
    if str(value).strip() not in {str(result), f"{result}.0"}:
        raise _error(detail, **issue)
    return result


def _source(
    catalog: CaseCatalog,
    raw_source_id: Any,
    loc: PlanLocation,
) -> Tuple[str, SupplySource]:
    alias = str(raw_source_id or "").strip()
    source = catalog.sources.get(alias)
    if source is None:
        detail = f"Неизвестный источник (unknown source): {alias or '<пусто>'}"
        raise _error(
            detail,
            code="unknown_source",
            message="Выберите источник из справочника доступных каналов.",
            loc=loc,
        )
    return alias, source


def _parse_model_date(raw: Any, field: str, loc: PlanLocation) -> date:
    if not isinstance(raw, str) or not raw.strip():
        detail = f"Для положительной поставки укажите {field} — дату получения партии"
        raise _error(
            detail,
            code="missing_delivery_date",
            message="Укажите дату получения положительной поставки в формате YYYY-MM-DD.",
            loc=loc,
        )
    try:
        parsed = date.fromisoformat(raw)
    except ValueError as exc:
        detail = f"Поле {field} должно иметь формат YYYY-MM-DD"
        raise _error(
            detail,
            code="invalid_date",
            message="Укажите дату в формате YYYY-MM-DD.",
            loc=loc,
        ) from exc
    if raw != parsed.isoformat():
        detail = f"{field}: укажите дату в формате YYYY-MM-DD"
        raise _error(
            detail,
            code="invalid_date",
            message="Укажите дату в формате YYYY-MM-DD.",
            loc=loc,
        )
    if parsed.month == 2 and parsed.day == 29:
        detail = "29 February (29 февраля) отсутствует в 365-дневном календаре модели"
        raise _error(
            detail,
            code="unsupported_model_date",
            message="Выберите другую дату: календарь модели не содержит 29 февраля.",
            loc=loc,
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
        row_loc = ("decisions", "investments", index)
        investment_id = str(investment.get("investment_id", "")).strip().upper()
        if not investment_id:
            detail = f"В строке инвестиции {index + 1} не указан investment_id"
            raise _error(
                detail,
                code="missing_investment_id",
                message="Выберите инвестицию для этой строки.",
                loc=(*row_loc, "investment_id"),
            )
        if investment_id not in catalog.investments:
            detail = f"неизвестная инвестиция: {investment_id}"
            raise _error(
                detail,
                code="unknown_investment",
                message="Выберите инвестицию из справочника.",
                loc=(*row_loc, "investment_id"),
            )
        if investment_id in result:
            detail = f"Инвестиция {investment_id} повторяется; оставьте одно решение"
            raise _error(
                detail,
                code="duplicate_investment",
                message=f"Инвестиция {investment_id} повторяется. Оставьте одну строку.",
                loc=(*row_loc, "investment_id"),
            )
        year = investment.get("year")
        commissioning_year = investment.get("commissioning_year")
        if year is not None and commissioning_year is not None:
            if _year(year, loc=(*row_loc, "year")) != _year(
                commissioning_year,
                "commissioning_year",
                (*row_loc, "commissioning_year"),
            ):
                detail = f"В строке инвестиции {index + 1} расходятся year и commissioning_year"
                raise _error(
                    detail,
                    code="inconsistent_investment_year",
                    message="Укажите одинаковый год решения во всех полях этой инвестиции.",
                    loc=row_loc,
                )
        raw_year = year if year is not None else commissioning_year
        if raw_year is not None:
            year_field = "year" if year is not None else "commissioning_year"
            result[investment_id] = _year(
                raw_year,
                "год инвестиционного решения",
                (*row_loc, year_field),
            )
        else:
            detail = f"Для инвестиции {investment_id} укажите год решения"
            raise _error(
                detail,
                code="missing_investment_year",
                message=f"Укажите год решения для инвестиции {investment_id}.",
                loc=(*row_loc, "year"),
            )
        decision_year = result[investment_id]
        if decision_year not in catalog.demands:
            detail = f"Год решения {decision_year} вне горизонта модели"
            raise _error(
                detail,
                code="year_out_of_horizon",
                message="Выберите год в пределах горизонта модели.",
                loc=(*row_loc, "year"),
                year=decision_year,
            )
        if investment_id == "LUNAR_ISRU":
            available = catalog.sources["Lunar-ISRU"].available_from_year
            if available is not None and decision_year >= available:
                detail = f"LUNAR_ISRU требуется профинансировать до {available} года"
                raise _error(
                    detail,
                    code="investment_too_late",
                    message=f"Профинансируйте LUNAR_ISRU раньше {available} года.",
                    loc=(*row_loc, "year"),
                    source_id="Lunar-ISRU",
                    year=decision_year,
                )
        for alias in ("option_year", "exercise_year"):
            if investment.get(alias) is not None and _year(
                investment[alias], alias, (*row_loc, alias)
            ) != decision_year:
                detail = f"Инвестиция {investment_id}: {alias} расходится с годом решения; уточните импортированный план"
                raise _error(
                    detail,
                    code="inconsistent_investment_year",
                    message="Укажите одинаковый год решения во всех полях этой инвестиции.",
                    loc=(*row_loc, alias),
                )
        schedule = investment.get("capex_schedule")
        if schedule is not None:
            expected = {str(decision_year): catalog.investments[investment_id].total_capex_mln}
            if not isinstance(schedule, dict) or {str(k): v for k,v in schedule.items()} != expected:
                detail = f"Инвестиция {investment_id}: capex_schedule расходится с оплатой в год решения"
                raise _error(
                    detail,
                    code="inconsistent_capex_schedule",
                    message="Синхронизируйте график CAPEX с годом инвестиционного решения.",
                    loc=(*row_loc, "capex_schedule"),
                )
    return result


def normalize_reservations(
    catalog: CaseCatalog,
    decisions: Mapping[str, Any],
) -> Dict[Tuple[int, str], float]:
    years = set(catalog.demands)
    normalized: Dict[Tuple[int, str], float] = {}
    aliases: Dict[Tuple[int, str], str] = {}
    for index, reservation in enumerate(decisions.get("capacity_reservations", [])):
        row_loc = ("decisions", "capacity_reservations", index)
        year = _year(reservation.get("year"), loc=(*row_loc, "year"))
        if year not in years:
            detail = f"Год брони {year} находится вне горизонта модели"
            raise _error(
                detail,
                code="year_out_of_horizon",
                message="Выберите год бронирования в пределах горизонта модели.",
                loc=(*row_loc, "year"),
                year=year,
            )
        alias, source = _source(
            catalog,
            reservation.get("source_id"),
            (*row_loc, "source_id"),
        )
        key = (year, source.source_id)
        if key in normalized:
            previous = aliases[key]
            if previous != alias:
                detail = (
                    f"conflicting aliases: источник {source.name} в {year} году "
                    f"записан как {previous} и {alias}; используйте одно обозначение"
                )
                raise _error(
                    detail,
                    code="conflicting_source_alias",
                    message=f"Используйте одно обозначение для {source.name} в {year} году.",
                    loc=(*row_loc, "source_id"),
                    source_id=source.name,
                    year=year,
                )
            detail = f"Бронь {source.name} за {year} год повторяется; оставьте одну строку"
            raise _error(
                detail,
                code="duplicate_reservation",
                message=f"Оставьте одну строку брони {source.name} за {year} год.",
                loc=row_loc,
                source_id=source.name,
                year=year,
            )
        value = _number(
            reservation.get("reserved_capacity_t", 0.0),
            f"capacity_reservations[{index}].reserved_capacity_t",
            (*row_loc, "reserved_capacity_t"),
        )
        if value > source.capacity_t_per_year + 1e-9:
            detail = (
                f"reserved capacity {value:g} т превышает source capacity "
                f"{source.capacity_t_per_year:g} т/год канала {source.name} в {year}"
            )
            raise _error(
                detail,
                code="reservation_capacity_exceeded",
                message=(
                    f"{source.name}: бронь на {year} год составляет {value:g} т "
                    f"при мощности {source.capacity_t_per_year:g} т/год. Уменьшите бронь."
                ),
                loc=(*row_loc, "reserved_capacity_t"),
                source_id=source.name,
                year=year,
                actual=value,
                limit=source.capacity_t_per_year,
            )
        normalized[key] = value
        aliases[key] = alias
    return normalized


def _order_volume(order: Mapping[str, Any], index: int) -> float:
    row_loc = ("decisions", "supply_orders", index)
    canonical = order.get("order_t")
    legacy = order.get("order_volume_t")
    if canonical is not None and legacy is not None:
        canonical_number = _number(
            canonical,
            f"supply_orders[{index}].order_t",
            (*row_loc, "order_t"),
        )
        legacy_number = _number(
            legacy,
            f"supply_orders[{index}].order_volume_t",
            (*row_loc, "order_volume_t"),
        )
        if abs(canonical_number - legacy_number) > 1e-9:
            detail = f"В supply_orders[{index}] расходятся order_t and order_volume_t"
            raise _error(
                detail,
                code="inconsistent_order_volume",
                message="Укажите одинаковый объём поставки во всех полях этой строки.",
                loc=row_loc,
            )
        return canonical_number
    value = canonical if canonical is not None else legacy
    field = "order_t" if canonical is not None or legacy is None else "order_volume_t"
    return _number(
        value or 0.0,
        f"supply_orders[{index}].order_t",
        (*row_loc, field),
    )


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
        row_loc = ("decisions", "supply_orders", index)
        volume = _order_volume(order, index)
        year = _year(order.get("year"), loc=(*row_loc, "year"))
        if year not in year_indexes:
            detail = f"receipt year {year} (год получения) находится вне горизонта модели"
            raise _error(
                detail,
                code="year_out_of_horizon",
                message="Выберите год поставки в пределах горизонта модели.",
                loc=(*row_loc, "year"),
                year=year,
            )
        alias, source = _source(
            catalog,
            order.get("source_id"),
            (*row_loc, "source_id"),
        )
        if volume == 0:
            continue
        alias_key = (year, source.source_id)
        previous_alias = aliases.setdefault(alias_key, alias)
        if previous_alias != alias:
            detail = (
                f"conflicting aliases: источник {source.name} в {year} году "
                f"записан как {previous_alias} и {alias}; используйте одно обозначение"
            )
            raise _error(
                detail,
                code="conflicting_source_alias",
                message=f"Используйте одно обозначение для {source.name} в {year} году.",
                loc=(*row_loc, "source_id"),
                source_id=source.name,
                year=year,
            )

        delivery_date = _parse_model_date(
            order.get("delivery_date"),
            "delivery_date",
            (*row_loc, "delivery_date"),
        )
        batch_id = str(order.get("batch_id") or "").strip()
        if not batch_id:
            detail = "Для каждой положительной поставки укажите непустой batch_id"
            raise _error(
                detail,
                code="missing_batch_id",
                message="Укажите уникальный идентификатор положительной поставки.",
                loc=(*row_loc, "batch_id"),
            )
        if batch_id in batch_ids:
            detail = f"duplicate batch_id: партия {batch_id} повторяется"
            raise _error(
                detail,
                code="duplicate_batch_id",
                message=f"Идентификатор партии {batch_id} уже используется. Укажите уникальный batch_id.",
                loc=(*row_loc, "batch_id"),
            )
        batch_ids.add(batch_id)

        if delivery_date.year != year:
            detail = (
                f"delivery_date {delivery_date.isoformat()} не совпадает с receipt year "
                f"(годом получения) {year}"
            )
            raise _error(
                detail,
                code="delivery_year_mismatch",
                message=f"Дата получения должна относиться к {year} году.",
                loc=(*row_loc, "delivery_date"),
                source_id=source.name,
                year=year,
            )
        if source.available_from_year is not None and year < source.available_from_year:
            detail = f"Канал {source.name} доступен только с {source.available_from_year} года"
            raise _error(
                detail,
                code="source_unavailable",
                message=f"Перенесите поставку {source.name} на {source.available_from_year} год или позже.",
                loc=(*row_loc, "year"),
                source_id=source.name,
                year=year,
            )

        if source.source_id == "C":
            decision_year = investment_years.get("EARTH_NEW")
            if decision_year is None:
                detail = "Поставка Earth-New требует инвестиционного решения EARTH_NEW"
                raise _error(
                    detail,
                    code="missing_required_investment",
                    message="Добавьте инвестиционное решение EARTH_NEW для этой поставки.",
                    loc=("decisions", "investments"),
                    source_id=source.name,
                    year=year,
                )
            ready_date = date(decision_year, 1, 1)
            ready_date = _subtract_months(ready_date, -int(source.lead_time_max_value))
            if delivery_date < ready_date:
                detail = (
                    f"Партия Earth-New {batch_id} приходит раньше завершения подготовки "
                    f"{ready_date.isoformat()}"
                )
                raise _error(
                    detail,
                    code="source_not_ready",
                    message=f"Перенесите поставку на {ready_date.isoformat()} или позже.",
                    loc=(*row_loc, "delivery_date"),
                    source_id=source.name,
                    year=year,
                )
        elif source.source_id == "D":
            decision_year = investment_years.get("LUNAR_ISRU")
            if decision_year is None:
                detail = "Поставка Lunar-ISRU требует инвестиционного решения LUNAR_ISRU"
                raise _error(
                    detail,
                    code="missing_required_investment",
                    message="Добавьте инвестиционное решение LUNAR_ISRU для этой поставки.",
                    loc=("decisions", "investments"),
                    source_id=source.name,
                    year=year,
                )
            if source.available_from_year is not None and decision_year >= source.available_from_year:
                detail = f"LUNAR_ISRU необходимо профинансировать до {source.available_from_year} года"
                raise _error(
                    detail,
                    code="investment_too_late",
                    message=f"Профинансируйте LUNAR_ISRU раньше {source.available_from_year} года.",
                    loc=("decisions", "investments"),
                    source_id=source.name,
                    year=decision_year,
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
            detail = (
                f"Заказано {ordered_t:g} т — это превышает source capacity "
                f"{source.capacity_t_per_year:g} т/год канала {source.name} в {year}"
            )
            raise _error(
                detail,
                code="source_capacity_exceeded",
                message=(
                    f"{source.name}: в {year} году заказано {ordered_t:g} т при "
                    f"доступной мощности {source.capacity_t_per_year:g} т/год. "
                    "Уменьшите поставки этого источника."
                ),
                loc=("decisions", "supply_orders"),
                source_id=source.name,
                year=year,
                actual=ordered_t,
                limit=source.capacity_t_per_year,
            )
        if source.reservation_rate > 0:
            reserved_t = reservations.get((year, source_id), 0.0)
            if ordered_t > reserved_t + 1e-9:
                detail = (
                    f"Заказано {ordered_t:g} т — это превышает reserved capacity "
                    f"{reserved_t:g} т/год канала {source.name} в {year}; "
                    "увеличьте бронь или уменьшите поставки"
                )
                raise _error(
                    detail,
                    code="reserved_capacity_exceeded",
                    message=(
                        f"{source.name}: в {year} году заказано {ordered_t:g} т при "
                        f"броне {reserved_t:g} т/год. Увеличьте бронь или уменьшите поставки."
                    ),
                    loc=("decisions", "capacity_reservations"),
                    source_id=source.name,
                    year=year,
                    actual=ordered_t,
                    limit=reserved_t,
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
