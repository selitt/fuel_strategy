"""
Модуль финансовых расчетов и экономики контрактов.
Рассчитывает Take-or-pay, плату за бронирование, хранение от среднего запаса,
CAPEX, OPEX, оплату стартового предзапаса и итоговые совокупные затраты.
"""

from typing import Dict, List, Any, Tuple
from .models import FinancialBreakdownRecord, SourceScheduleRecord
from .loader import CaseCatalog


def calculate_finances(
    catalog: CaseCatalog,
    source_schedules: List[SourceScheduleRecord],
    avg_inventory_by_year: Dict[int, float],
    investments: List[Dict[str, Any]],
    initial_inventory_t: float = 0,
    initial_stock_source_price: float | None = None,
    holding_cost_rate: float | None = None,
) -> Tuple[List[FinancialBreakdownRecord], float, float]:
    """
    Рассчитывает финансовые потоки по годам.
    Возвращает:
    1. financial_breakdown (список годовых затрат)
    2. total_cost_all_years (суммарные затраты за 6 лет)
    3. final_cumulative_capex (накопленный CAPEX на конец горизонта)
    """
    if initial_stock_source_price is None:
        initial_stock_source_price = catalog.sources["Earth-Core"].variable_cost_mln_per_t
    # 1. Извлечение параметров инвестиций
    zbo_year = None
    lunar_year = None
    earth_new_option_year = None
    earth_new_exercise_year = None
    custom_isru_schedule = {}

    for inv in investments:
        inv_id = str(inv.get("investment_id", "")).upper()
        y = inv.get("year", inv.get("commissioning_year"))
        if "ZBO" in inv_id and y:
            zbo_year = int(y)
        elif "LUNAR" in inv_id:
            if y:
                lunar_year = int(y)
            sched = inv.get("capex_schedule")
            if isinstance(sched, dict):
                custom_isru_schedule = {int(k): float(v) for k, v in sched.items()}
        elif "EARTH_NEW" in inv_id:
            opt_y = inv.get("option_year")
            ex_y = inv.get("exercise_year")
            if opt_y:
                earth_new_option_year = int(opt_y)
            if ex_y:
                earth_new_exercise_year = int(ex_y)
            if y and not ex_y:
                earth_new_exercise_year = int(y)
            if not opt_y:
                earth_new_option_year = earth_new_exercise_year

    # Группировка procurement и reservation по годам
    procurement_by_year: Dict[int, float] = {}
    reservation_by_year: Dict[int, float] = {}

    for sched in source_schedules:
        procurement_by_year[sched.year] = round(
            procurement_by_year.get(sched.year, 0.0) + sched.procurement_cost_mln, 2
        )
        reservation_by_year[sched.year] = round(
            reservation_by_year.get(sched.year, 0.0) + sched.reservation_cost_mln, 2
        )

    financial_records: List[FinancialBreakdownRecord] = []
    total_cost_all = 0.0
    cum_capex = 0.0

    years = sorted(catalog.demands.keys())

    for y_idx, year in enumerate(years):
        proc_cost = procurement_by_year.get(year, 0.0)

        # Оплата стартового предзапаса на 01.01.2035 относится к затратам 2035 года
        if y_idx == 0 and initial_inventory_t > 0:
            pre_start_cost = round(initial_inventory_t * initial_stock_source_price, 2)
            proc_cost = round(proc_cost + pre_start_cost, 2)

        res_cost = reservation_by_year.get(year, 0.0)

        # Holding cost по среднему физическому остатку года
        avg_inv = avg_inventory_by_year.get(year, 0.0)
        zbo_active = zbo_year is not None and year >= max(zbo_year, catalog.storages["ZBO"].available_from_year)
        storage = catalog.storages["ZBO" if zbo_active else "BASE"]
        rate = holding_cost_rate if holding_cost_rate is not None else storage.holding_cost_mln_per_t_year
        holding_cost = round(rate * avg_inv, 2)

        # CAPEX года
        capex_year = 0.0
        if zbo_year == year:
            capex_year += catalog.investments["ZBO"].total_capex_mln

        if custom_isru_schedule:
            capex_year += custom_isru_schedule.get(year, 0.0)
        elif year == lunar_year:
            capex_year += catalog.investments["LUNAR_ISRU"].total_capex_mln

        if earth_new_option_year == year:
            capex_year += catalog.investments["EARTH_NEW"].option_fee_mln
        if earth_new_exercise_year == year:
            capex_year += catalog.investments["EARTH_NEW"].exercise_cost_mln

        cum_capex = round(cum_capex + capex_year, 2)

        # OPEX года
        opex_year = 0.0
        if zbo_active:
            opex_year += catalog.investments["ZBO"].fixed_opex_mln_per_year
        if lunar_year is not None and year >= max(lunar_year, catalog.sources["Lunar-ISRU"].available_from_year or lunar_year):
            opex_year += catalog.investments["LUNAR_ISRU"].fixed_opex_mln_per_year

        year_total = round(proc_cost + res_cost + holding_cost + capex_year + opex_year, 2)
        total_cost_all = round(total_cost_all + year_total, 2)

        financial_records.append(FinancialBreakdownRecord(
            year=year,
            procurement=proc_cost,
            reservation=res_cost,
            holding=holding_cost,
            capex=capex_year,
            opex=opex_year,
            total=year_total,
            cumulative_capex=cum_capex,
        ))

    return financial_records, total_cost_all, cum_capex
