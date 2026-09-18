"""
Посуточный имитационный движок материального баланса орбитального узла.
Моделирует 2190 дней (2035–2040), проверяет баки на переполнение,
списывает потери строго 1 раз при приеме и обеспечивает приоритет критического спроса.
"""

from typing import Dict, List, Any, Tuple
from .models import (
    DailyTraceRecord,
    YearlyBalanceRecord,
    SourceScheduleRecord,
)
from .loader import CaseCatalog


def simulate_daily(
    catalog: CaseCatalog,
    scenario_id: str,
    decisions: Dict[str, Any],
    monte_carlo_failures: Dict[Tuple[int, str, int], bool] = None,
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
    is_stress = scenario_id.upper() == "MANDATORY_STRESS"
    monte_carlo_failures = monte_carlo_failures or {}

    # 1. Извлечение решений
    supply_orders = decisions.get("supply_orders", [])
    capacity_reservations = decisions.get("capacity_reservations", [])
    investments = decisions.get("investments", [])
    inventory_policy = decisions.get("inventory_policy", {})
    initial_inv = float(inventory_policy.get("initial_inventory_t", 12.33))

    # Года инвестиций
    zbo_year = None
    lunar_year = None
    earth_new_year = None
    for inv in investments:
        inv_id = str(inv.get("investment_id", "")).upper()
        y = inv.get("commissioning_year", inv.get("year"))
        if "ZBO" in inv_id and y:
            zbo_year = int(y)
        elif "LUNAR" in inv_id and y:
            lunar_year = int(y)
        elif "EARTH_NEW" in inv_id and y:
            earth_new_year = int(y)

    # Карта заказов и резервов
    orders_map: Dict[int, Dict[str, float]] = {}
    for o in supply_orders:
        y = int(o.get("year", 2035))
        s_id = str(o.get("source_id", ""))
        val = float(o.get("order_volume_t", o.get("order_t", 0.0)))
        orders_map.setdefault(y, {})[s_id] = val

    reservations_map: Dict[int, Dict[str, float]] = {}
    for r in capacity_reservations:
        y = int(r.get("year", 2035))
        s_id = str(r.get("source_id", ""))
        val = float(r.get("reserved_capacity_t", 0.0))
        reservations_map.setdefault(y, {})[s_id] = val

    # 2. Построение календаря прихода поставок по дням (день 0 .. 2189)
    # Разбиваем годовой заказ каждого источника на регулярные партии (например, ежемесячно на 15-й день месяца),
    # чтобы не переполнять 70-тонный бак станции разовым вбросом всего годового объема.
    deliveries_calendar: Dict[int, List[Dict[str, Any]]] = {}

    years = sorted(catalog.demands.keys())
    start_year = years[0] if years else 2035
    total_days = len(years) * 365

    # Уникальные имена каналов
    unique_sources = set()
    for s_key, s_obj in catalog.sources.items():
        unique_sources.add(s_obj.name)
    all_sources = sorted(list(unique_sources))

    source_schedule_records: List[SourceScheduleRecord] = []

    for y_idx, year in enumerate(years):
        year_orders = orders_map.get(year, {})
        year_res = reservations_map.get(year, {})

        for s_name in all_sources:
            s_info = catalog.sources[s_name]
            s_id = s_info.source_id

            ord_t = year_orders.get(s_name, year_orders.get(s_id, 0.0))
            res_t = year_res.get(s_name, year_res.get(s_id, 0.0))

            # Фактическая доля поставки (для Луны в стрессе)
            delivery_multiplier = 1.0
            if is_stress and s_name == "Lunar-ISRU":
                if year == 2038:
                    delivery_multiplier = 0.55
                elif year == 2039:
                    delivery_multiplier = 0.75

            # Доступность канала
            is_available = True
            if s_name == "Lunar-ISRU" and (lunar_year is None or year < lunar_year):
                is_available = False
            if s_name == "Earth-New" and (earth_new_year is None or year < earth_new_year):
                is_available = False

            if not is_available:
                ord_t = 0.0

            actual_deliv_t = ord_t * delivery_multiplier

            # Take-or-pay объем
            top_threshold = round(s_info.take_or_pay_share * res_t, 2)
            payable_volume = max(ord_t, top_threshold)

            # Переменная цена (в стрессе +25% для Core и Flex в 2038-2039)
            price_mult = 1.0
            if is_stress and year in (2038, 2039) and s_name in ("Earth-Core", "Earth-Flex"):
                price_mult = 1.25
            unit_price = s_info.variable_cost_mln_per_t * price_mult

            procurement_cost = round(payable_volume * unit_price, 2)
            reservation_cost = round(res_t * s_info.reservation_rate, 2)

            source_schedule_records.append(SourceScheduleRecord(
                year=year,
                source_id=s_id,
                source_name=s_name,
                reserved_capacity_t=round(res_t, 2),
                ordered_t=round(ord_t, 2),
                delivered_t=round(actual_deliv_t, 2),
                take_or_pay_threshold_t=top_threshold,
                payable_volume_t=round(payable_volume, 2),
                reservation_cost_mln=reservation_cost,
                procurement_cost_mln=procurement_cost,
            ))

            # Если объем > 0, планируем поставки партиями внутри года
            if actual_deliv_t > 0:
                # 6 партий в год (каждые 60 дней)
                num_batches = 6
                batch_vol = actual_deliv_t / num_batches
                for b_idx in range(num_batches):
                    # Проверка Монте-Карло на срыв партии
                    is_failed = monte_carlo_failures.get((year, s_id, b_idx), False)
                    if is_failed:
                        continue

                    # День отправки
                    dispatch_day_in_year = b_idx * 60 + 15
                    dispatch_day = y_idx * 365 + dispatch_day_in_year
                    if dispatch_day < total_days:
                        deliveries_calendar.setdefault(dispatch_day, []).append({
                            "source_id": s_id,
                            "source_name": s_name,
                            "volume": batch_vol,
                        })

    # 3. Посуточный цикл симуляции
    daily_trace: List[DailyTraceRecord] = []
    violations: List[Dict[str, Any]] = []

    current_inv = initial_inv
    yearly_balance_records: List[YearlyBalanceRecord] = []
    avg_inventory_by_year: Dict[int, float] = {}

    for y_idx, year in enumerate(years):
        dem_rec = catalog.demands[year]
        dem_mult = 1.15 if (is_stress and year >= 2038) else 1.0
        dem_total_year = round(dem_rec.base_total_t * dem_mult, 2)
        dem_crit_year = round(dem_rec.base_critical_t * dem_mult, 2)

        daily_dem_total = dem_total_year / 365.0
        daily_dem_crit = dem_crit_year / 365.0
        daily_dem_reg = daily_dem_total - daily_dem_crit

        # Проверка 45-дневного резерва на 1 января
        r_45d_target = round(dem_total_year * 45.0 / 365.0, 2)
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
        storage_cap = 120.0 if zbo_active else 70.0
        loss_rate = 0.012 if zbo_active else 0.045

        year_start_inv = current_inv
        year_delivered_sum = 0.0
        year_losses_sum = 0.0
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
        ))

    return yearly_balance_records, source_schedule_records, daily_trace, violations, avg_inventory_by_year
