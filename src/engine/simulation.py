"""
Посуточный имитационный движок материального баланса орбитального узла.
Моделирует 2190 дней (2035–2040), проверяет баки на переполнение,
списывает потери строго 1 раз при приеме и обеспечивает приоритет критического спроса.
"""

from datetime import date
from typing import Dict, List, Any, Tuple
from .calendar import PlanValidationError, normalize_plan
from .models import (
    DailyTraceRecord,
    DeliveryScheduleRecord,
    YearlyBalanceRecord,
    SourceScheduleRecord,
)
from .loader import CaseCatalog
from .finance import reservation_payment


_MONTH_LENGTHS = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)


def _day_of_year(value: date) -> int:
    return sum(_MONTH_LENGTHS[: value.month - 1]) + value.day - 1


def _date_for_model_day(years: List[int], model_day: int) -> date:
    year_index, day_of_year = divmod(model_day, 365)
    month = 1
    for length in _MONTH_LENGTHS:
        if day_of_year < length:
            return date(years[year_index], month, day_of_year + 1)
        day_of_year -= length
        month += 1
    raise AssertionError("invalid model day")


def _emergency_arrival(
    batch: Any,
    emergency_source: Any,
    years: List[int],
) -> Tuple[int, date] | None:
    lead = emergency_source.lead_time_max_value
    if lead < 0 or not float(lead).is_integer():
        raise ValueError("Emergency catalog max lead time must be a non-negative integer")
    amount = int(lead)
    unit = emergency_source.lead_time_unit.strip().lower()

    if unit in {"week", "weeks"}:
        arrival_day = batch.model_day + amount * 7
    elif unit in {"day", "days"}:
        arrival_day = batch.model_day + amount
    elif unit in {"month", "months"}:
        month_index = batch.delivery_date.year * 12 + batch.delivery_date.month - 1 + amount
        arrival_year, zero_based_month = divmod(month_index, 12)
        if arrival_year not in years:
            return None
        arrival_month = zero_based_month + 1
        arrival_date = date(
            arrival_year,
            arrival_month,
            min(batch.delivery_date.day, _MONTH_LENGTHS[arrival_month - 1]),
        )
        arrival_day = years.index(arrival_year) * 365 + _day_of_year(arrival_date)
    else:
        raise ValueError(
            f"unsupported Emergency catalog lead time unit: {emergency_source.lead_time_unit}"
        )

    if not 0 <= arrival_day < len(years) * 365:
        return None
    return arrival_day, _date_for_model_day(years, arrival_day)


def _rescue_batch_id(batch: Any, original_batch_ids: set[str]) -> str:
    source_id = batch.source.source_id
    parent_id = batch.batch_id
    base = (
        f"emergency-rescue:{len(source_id)}:{source_id}:"
        f"{len(parent_id)}:{parent_id}"
    )
    candidate = base
    suffix = 1
    while candidate in original_batch_ids:
        candidate = f"{base}:{suffix}"
        suffix += 1
    return candidate


def simulate_daily(
    catalog: CaseCatalog,
    scenario_id: str,
    decisions: Dict[str, Any],
    monte_carlo_failures: Dict[Tuple[Any, ...], bool] = None,
    emergency_enabled: bool = True,
) -> Tuple[List[YearlyBalanceRecord], List[SourceScheduleRecord], List[DailyTraceRecord], List[Dict[str, Any]], Dict[int, float]]:
    """
    Выполняет посуточное моделирование.
    Возвращает:
    1. yearly_balance (список годовых балансов)
    2. source_schedule (детализация поставок по источникам)
    3. daily_trace (посуточный лог для графиков)
    4. violations (выявленные физические нарушения: OVERFLOW, RESERVE_45D)
    5. avg_inventory_by_year (средний физический остаток по годам для Holding Cost)
    """
    if scenario_id not in {"BASE", "MANDATORY_STRESS"} or scenario_id not in catalog.scenarios:
        raise PlanValidationError(f"Неизвестный или неподдерживаемый сценарий: {scenario_id}")
    is_stress = scenario_id == "MANDATORY_STRESS"
    monte_carlo_failures = monte_carlo_failures or {}

    # 1. Извлечение решений
    investments = decisions.get("investments", [])
    inventory_policy = decisions.get("inventory_policy", {})
    initial_inv = float(inventory_policy.get("initial_inventory_t", 0.0))
    batches, reservations_map = normalize_plan(catalog, decisions)

    # Года инвестиций
    zbo_year = None
    for inv in investments:
        inv_id = str(inv.get("investment_id", "")).upper()
        y = inv.get("year")
        if y is None:
            y = inv.get("commissioning_year")
        if "ZBO" in inv_id and y:
            zbo_year = max(int(y), catalog.storages["ZBO"].available_from_year)

    # 2. Построение календаря прихода поставок по явно заданным датам.
    deliveries_calendar: Dict[int, List[Dict[str, Any]]] = {}

    years = sorted(catalog.demands.keys())
    unique_sources = {source.source_id: source for source in catalog.sources.values()}
    all_sources = sorted(unique_sources.values(), key=lambda source: source.source_id)

    batches_by_year_source: Dict[Tuple[int, str], List[Any]] = {}
    for batch in batches:
        batches_by_year_source.setdefault(
            (batch.year, batch.source.source_id), []
        ).append(batch)

    schedule_state: Dict[Tuple[int, str], Dict[str, Any]] = {}
    for year in years:
        for source in all_sources:
            schedule_state[(year, source.source_id)] = {
                "ordered_t": 0.0,
                "delivered_t": 0.0,
                "emergency_rescue_ordered_t": 0.0,
                "batches": [],
            }

    batch_indexes: Dict[Tuple[int, str, str], int] = {}
    for (year, source_id), source_batches in batches_by_year_source.items():
        for index, batch in enumerate(source_batches):
            batch_indexes[(year, source_id, batch.batch_id)] = index

    emergency_source = unique_sources.get("E")
    planned_emergency_by_year = {
        year: sum(
            batch.ordered_t
            for batch in batches_by_year_source.get((year, "E"), [])
        )
        for year in years
    }
    remaining_emergency_reservation = {
        year: max(
            0.0,
            reservations_map.get((year, "E"), 0.0)
            - planned_emergency_by_year[year],
        )
        for year in years
    }
    remaining_emergency_capacity = {
        year: max(
            0.0,
            (emergency_source.capacity_t_per_year if emergency_source else 0.0)
            - planned_emergency_by_year[year],
        )
        for year in years
    }

    # Failure is observed at the original planned arrival. Allocation then follows
    # calendar order, with IDs providing a stable tie-break independent of input order.
    ordered_batches = sorted(
        batches,
        key=lambda batch: (batch.model_day, batch.source.source_id, batch.batch_id),
    )
    original_batch_ids = {batch.batch_id for batch in batches}
    for batch in ordered_batches:
        year = batch.year
        source = batch.source
        source_id = source.source_id
        state = schedule_state[(year, source_id)]
        batch_index = batch_indexes[(year, source_id, batch.batch_id)]
        is_failed = bool(
            monte_carlo_failures.get((year, source_id, batch.batch_id), False)
            or monte_carlo_failures.get((year, source_id, batch_index), False)
        )
        delivery_multiplier = catalog.multiplier(
            scenario_id,
            "actual_delivery_share",
            year,
            source.name,
        )
        delivered_t = 0.0 if is_failed else batch.ordered_t * delivery_multiplier
        state["ordered_t"] += batch.ordered_t
        state["delivered_t"] += delivered_t
        state["batches"].append(
            DeliveryScheduleRecord(
                batch_id=batch.batch_id,
                source_id=source_id,
                source_name=source.name,
                year=year,
                order_date=batch.order_date.isoformat(),
                delivery_date=batch.delivery_date.isoformat(),
                ordered_t=round(batch.ordered_t, 2),
                delivered_t=round(delivered_t, 2),
                status="failed" if is_failed else "delivered",
            )
        )
        if delivered_t > 0:
            deliveries_calendar.setdefault(batch.model_day, []).append(
                {
                    "source_id": source_id,
                    "source_name": source.name,
                    "volume": delivered_t,
                }
            )

        if (
            not emergency_enabled
            or not is_failed
            or source_id == "E"
            or emergency_source is None
        ):
            continue
        arrival = _emergency_arrival(batch, emergency_source, years)
        if arrival is None:
            continue
        arrival_day, arrival_date = arrival
        arrival_year = arrival_date.year
        dispatch_t = min(
            batch.ordered_t,
            remaining_emergency_reservation[arrival_year],
            remaining_emergency_capacity[arrival_year],
        )
        if dispatch_t <= 0:
            continue
        remaining_emergency_reservation[arrival_year] -= dispatch_t
        remaining_emergency_capacity[arrival_year] -= dispatch_t

        rescue_failed = bool(
            monte_carlo_failures.get(
                ("emergency_rescue", year, source_id, batch.batch_id),
                False,
            )
        )
        rescue_multiplier = catalog.multiplier(
            scenario_id,
            "actual_delivery_share",
            arrival_year,
            emergency_source.name,
        )
        rescue_delivered_t = 0.0 if rescue_failed else dispatch_t * rescue_multiplier
        emergency_state = schedule_state[(arrival_year, "E")]
        emergency_state["ordered_t"] += dispatch_t
        emergency_state["delivered_t"] += rescue_delivered_t
        emergency_state["emergency_rescue_ordered_t"] += dispatch_t
        emergency_state["batches"].append(
            DeliveryScheduleRecord(
                batch_id=_rescue_batch_id(batch, original_batch_ids),
                source_id="E",
                source_name=emergency_source.name,
                year=arrival_year,
                order_date=batch.delivery_date.isoformat(),
                delivery_date=arrival_date.isoformat(),
                ordered_t=round(dispatch_t, 2),
                delivered_t=round(rescue_delivered_t, 2),
                status="failed" if rescue_failed else "delivered",
                parent_batch_id=batch.batch_id,
            )
        )
        if rescue_delivered_t > 0:
            deliveries_calendar.setdefault(arrival_day, []).append(
                {
                    "source_id": "E",
                    "source_name": emergency_source.name,
                    "volume": rescue_delivered_t,
                }
            )

    source_schedule_records: List[SourceScheduleRecord] = []
    for year in years:
        for source in all_sources:
            source_id = source.source_id
            state = schedule_state[(year, source_id)]
            ordered_t = state["ordered_t"]
            delivered_t = state["delivered_t"]
            reserved_t = reservations_map.get((year, source_id), 0.0)
            take_or_pay_threshold = round(source.take_or_pay_share * reserved_t, 2)
            payable_volume = max(ordered_t, take_or_pay_threshold)
            price_multiplier = catalog.multiplier(
                scenario_id,
                "variable_price_multiplier",
                year,
                source.name,
            )
            procurement_cost = round(
                payable_volume * source.variable_cost_mln_per_t * price_multiplier,
                2,
            )
            source_schedule_records.append(
                SourceScheduleRecord(
                    year=year,
                    source_id=source_id,
                    source_name=source.name,
                    reserved_capacity_t=round(reserved_t, 2),
                    ordered_t=round(ordered_t, 2),
                    delivered_t=round(delivered_t, 2),
                    take_or_pay_threshold_t=take_or_pay_threshold,
                    payable_volume_t=round(payable_volume, 2),
                    reservation_cost_mln=reservation_payment(
                        reserved_t,
                        source.reservation_rate,
                    ),
                    procurement_cost_mln=procurement_cost,
                    emergency_rescue_procurement_cost_mln=round(
                        state["emergency_rescue_ordered_t"]
                        * source.variable_cost_mln_per_t
                        * price_multiplier,
                        2,
                    ),
                    batches=sorted(
                        state["batches"],
                        key=lambda record: (
                            record.delivery_date,
                            record.parent_batch_id or "",
                            record.batch_id,
                        ),
                    ),
                )
            )

    # 3. Посуточный цикл симуляции
    daily_trace: List[DailyTraceRecord] = []
    violations: List[Dict[str, Any]] = []

    current_inv = initial_inv
    yearly_balance_records: List[YearlyBalanceRecord] = []
    avg_inventory_by_year: Dict[int, float] = {}

    for y_idx, year in enumerate(years):
        dem_rec = catalog.demands[year]
        dem_mult = catalog.multiplier(scenario_id, "demand_multiplier", year)
        critical_mult = catalog.multiplier(scenario_id, "critical_demand_multiplier", year) if "critical_demand_multiplier" in catalog.scenarios[scenario_id] else dem_mult
        dem_total_year = round(dem_rec.base_total_t * dem_mult, 2)
        dem_crit_year = round(dem_rec.base_critical_t * critical_mult, 2)

        daily_dem_total = dem_total_year / 365.0
        daily_dem_crit = dem_crit_year / 365.0
        daily_dem_reg = daily_dem_total - daily_dem_crit

        # Проверка 45-дневного резерва на 1 января
        r_45d_target = round(dem_total_year * catalog.constraint_value("RESERVE_45D") / 365.0, 2)
        reserve_met = current_inv >= (r_45d_target - 1e-5)
        if not reserve_met:
            violations.append({
                "constraint_id": "RESERVE_45D",
                "year": year,
                "passed": False,
                "detail": f"Запас на 1 января {current_inv:.2f} т при норме 45 дней {r_45d_target:.2f} т",
                "excess": round(r_45d_target - current_inv, 2),
            })

        # Режим хранилища текущего года
        zbo_active = (zbo_year is not None and year >= zbo_year)
        storage = catalog.storages["ZBO" if zbo_active else "BASE"]
        storage_cap = storage.capacity_t
        loss_rate = storage.loss_rate_on_throughput

        year_start_inv = current_inv
        year_delivered_sum = 0.0
        year_losses_sum = 0.0
        year_spill_sum = 0.0
        year_served_total_sum = 0.0
        year_served_crit_sum = 0.0
        year_shortage_sum = 0.0
        daily_inv_sum = 0.0

        for d in range(365):
            abs_day = y_idx * 365 + d
            opening_d = current_inv

            # 1. Прибытие поставок
            arrivals_today = deliveries_calendar.get(abs_day, [])
            deliv_today = 0.0
            losses_today = 0.0

            for arrival in arrivals_today:
                vol = arrival["volume"]
                loss = vol * loss_rate
                deliv_today += vol
                losses_today += loss

            net_inflow = deliv_today - losses_today
            year_delivered_sum += deliv_today
            year_losses_sum += losses_today

            spill_today = max(0.0, current_inv + net_inflow - storage_cap)
            year_spill_sum += spill_today
            # Проверка переполнения бака
            if current_inv + net_inflow > storage_cap:
                overflow_excess = round(current_inv + net_inflow - storage_cap, 2)
                violations.append({
                    "constraint_id": "STORAGE_OVERFLOW",
                    "year": year,
                    "day": abs_day,
                    "passed": False,
                    "detail": f"Переполнение бака {storage_cap} т (попытка залить {current_inv + net_inflow:.2f} т)",
                    "excess": overflow_excess,
                })
                # В реальном баке излишек сбрасывается/стравливается
                current_inv = storage_cap
            else:
                current_inv += net_inflow

            # 2. Выдача топлива потребителям (критический спрос в приоритете)
            if current_inv >= daily_dem_crit:
                served_crit = daily_dem_crit
                current_inv -= daily_dem_crit
            else:
                served_crit = current_inv
                current_inv = 0.0

            # Обычный коммерческий спрос
            if current_inv >= daily_dem_reg:
                served_reg = daily_dem_reg
                current_inv -= daily_dem_reg
            else:
                served_reg = current_inv
                current_inv = 0.0

            served_total = served_crit + served_reg
            shortage = daily_dem_total - served_total
            if shortage < 1e-9:
                shortage = 0.0

            year_served_total_sum += served_total
            year_served_crit_sum += served_crit
            year_shortage_sum += shortage
            daily_inv_sum += current_inv

            daily_trace.append(DailyTraceRecord(
                day=abs_day,
                year=year,
                day_of_year=d + 1,
                opening_inventory_t=round(opening_d, 2),
                delivered_t=round(deliv_today, 2),
                losses_t=round(losses_today, 2),
                net_inflow_t=round(net_inflow, 2),
                demand_total_t=round(daily_dem_total, 2),
                demand_critical_t=round(daily_dem_crit, 2),
                served_total_t=round(served_total, 2),
                served_critical_t=round(served_crit, 2),
                shortage_t=round(shortage, 2),
                closing_inventory_t=round(current_inv, 2),
                storage_capacity_t=storage_cap,
                spill_t=round(spill_today, 2),
            ))

        avg_inventory_by_year[year] = daily_inv_sum / 365.0

        sl_total = round(year_served_total_sum / dem_total_year, 4) if dem_total_year > 0 else 1.0
        sl_crit = round(year_served_crit_sum / dem_crit_year, 4) if dem_crit_year > 0 else 1.0

        yearly_balance_records.append(YearlyBalanceRecord(
            year=year,
            opening_inventory_t=round(year_start_inv, 2),
            delivered_t=round(year_delivered_sum, 2),
            losses_t=round(year_losses_sum, 2),
            served_t=round(year_served_total_sum, 2),
            closing_inventory_t=round(current_inv, 2),
            shortage_t=round(year_shortage_sum, 2),
            demand_total_t=dem_total_year,
            demand_critical_t=dem_crit_year,
            service_level_total=sl_total,
            service_level_critical=sl_crit,
            reserve_45d_target_t=r_45d_target,
            reserve_45d_met=reserve_met,
            spill_t=round(year_spill_sum, 2),
        ))

    return yearly_balance_records, source_schedule_records, daily_trace, violations, avg_inventory_by_year
