"""
Расчётный движок планирования снабжения.
Реализует контрольные правила кейса (CALCULATION_RULES.md):
- Материальный баланс: I_end = I_start + delivered - losses - served
- Потери: throughput * loss_rate (4.5% базовый, 1.2% при ZBO)
- Финансы: Procurement (с учётом Take-or-pay), Reservation, Holding, CAPEX, OPEX
- Проверка ограничений (45-дневный резерв, вместимость хранилища, мощности каналов)
"""

from typing import Dict, Any


DEMAND_CATALOG: Dict[int, Dict[str, float]] = {
    2035: {"total": 100.0, "critical": 80.0},
    2036: {"total": 140.0, "critical": 105.0},
    2037: {"total": 190.0, "critical": 135.0},
    2038: {"total": 250.0, "critical": 170.0},
    2039: {"total": 320.0, "critical": 210.0},
    2040: {"total": 390.0, "critical": 250.0},
}

# Справочник каналов снабжения (CASE_INPUT)
SOURCE_CATALOG: Dict[str, Dict[str, Any]] = {
    "Earth-Core": {"id": "A", "capacity": 190.0, "var_price": 6.2, "res_rate": 0.45, "top_share": 0.70},
    "Earth-Flex": {"id": "B", "capacity": 110.0, "var_price": 8.9, "res_rate": 0.15, "top_share": 0.00},
    "Earth-New":  {"id": "C", "capacity": 130.0, "var_price": 7.1, "res_rate": 0.30, "top_share": 0.50},
    "Lunar-ISRU": {"id": "D", "capacity": 120.0, "var_price": 3.0, "res_rate": 0.00, "top_share": 0.00},
    "Emergency":  {"id": "E", "capacity": 80.0,  "var_price": 13.8, "res_rate": 0.35, "top_share": 0.00},
}
for name, data in list(SOURCE_CATALOG.items()):
    SOURCE_CATALOG[data["id"]] = {**data, "name": name}


def run_pseudo_engine(
    plan_id: str,
    scenario_id: str,
    decisions: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Основной метод моделирования.
    Принимает решения плана оператора и сценарий, возвращает результат по ResultExportEnvelope.
    """
    is_stress = scenario_id.upper() == "MANDATORY_STRESS"

    supply_orders = decisions.get("supply_orders", [])
    capacity_reservations = decisions.get("capacity_reservations", [])
    investments = decisions.get("investments", [])
    inventory_policy = decisions.get("inventory_policy", {})
    initial_inv = float(inventory_policy.get("initial_inventory_t", 12.33))

    zbo_year = None
    lunar_year = None
    earth_new_year = None
    for inv in investments:
        inv_id = str(inv.get("investment_id", "")).upper()
        y = inv.get("year")
        if "ZBO" in inv_id and y:
            zbo_year = int(y)
        elif "LUNAR" in inv_id and y:
            lunar_year = int(y)
        elif "EARTH_NEW" in inv_id and y:
            earth_new_year = int(y)

    orders_map: Dict[int, Dict[str, float]] = {}
    for o in supply_orders:
        y = int(o.get("year", 2035))
        s_id = str(o.get("source_id", ""))
        orders_map.setdefault(y, {})[s_id] = float(o.get("order_t", 0.0))

    reservations_map: Dict[int, Dict[str, float]] = {}
    for r in capacity_reservations:
        y = int(r.get("year", 2035))
        s_id = str(r.get("source_id", ""))
        reservations_map.setdefault(y, {})[s_id] = float(r.get("reserved_capacity_t", 0.0))

    yearly_balance = []
    financial_breakdown = []
    source_schedule = []
    constraint_checks = []

    current_inv = initial_inv
    total_cost_all = 0.0
    all_feasible = True

    cum_capex = 0.0

    for year in range(2035, 2041):
        dem_base = DEMAND_CATALOG[year]
        dem_mult = 1.15 if (is_stress and year >= 2038) else 1.0
        dem_total = round(dem_base["total"] * dem_mult, 2)
        dem_crit = round(dem_base["critical"] * dem_mult, 2)

        r_45d_target = round(dem_total * 45.0 / 365.0, 2)
        reserve_met = current_inv >= (r_45d_target - 1e-4)
        constraint_checks.append({
            "constraint_id": "RESERVE_45D",
            "year": year,
            "passed": reserve_met,
            "detail": f"Запас на 1 января {current_inv:.2f} т при норме {r_45d_target:.2f} т",
            "excess": round(r_45d_target - current_inv, 2) if not reserve_met else None,
        })
        if not reserve_met:
            all_feasible = False

        # 3. Режим хранилища
        zbo_active = (zbo_year is not None and year >= zbo_year)
        storage_cap = 120.0 if zbo_active else 70.0
        loss_rate = 0.012 if zbo_active else 0.045

        year_orders = orders_map.get(year, {})
        year_res = reservations_map.get(year, {})

        year_delivered = 0.0
        year_procurement = 0.0
        year_reservation = 0.0

        all_sources = ["Earth-Core", "Earth-Flex", "Earth-New", "Lunar-ISRU", "Emergency"]
        for s_name in all_sources:
            s_info = SOURCE_CATALOG[s_name]
            s_id = s_info["id"]

            ord_t = year_orders.get(s_name, year_orders.get(s_id, 0.0))
            res_t = year_res.get(s_name, year_res.get(s_id, 0.0))

            if res_t > s_info["capacity"]:
                excess = round(res_t - s_info["capacity"], 2)
                constraint_checks.append({
                    "constraint_id": "CAPACITY_EXCEEDED",
                    "year": year,
                    "passed": False,
                    "detail": f"Резерв {res_t} т превышает мощность канала {s_name} ({s_info['capacity']} т)",
                    "excess": excess,
                })
                all_feasible = False

            # Фактическая поставка (с учётом долей в стрессе для ISRU)
            actual_share = 1.0
            if is_stress and s_name == "Lunar-ISRU":
                if year == 2038:
                    actual_share = 0.55
                elif year == 2039:
                    actual_share = 0.75

            deliv_t = ord_t * actual_share
            year_delivered += deliv_t

            price_mult = 1.0
            if is_stress and year in (2038, 2039) and s_name in ("Earth-Core", "Earth-Flex"):
                price_mult = 1.25

            unit_price = s_info["var_price"] * price_mult
            payable_volume = max(ord_t, s_info["top_share"] * res_t)
            var_pay = payable_volume * unit_price
            res_pay = res_t * s_info["res_rate"]

            year_procurement += var_pay
            year_reservation += res_pay

            source_schedule.append({
                "year": year,
                "source_id": s_name,
                "reserved_capacity_t": round(res_t, 2),
                "ordered_t": round(ord_t, 2),
                "delivered_t": round(deliv_t, 2),
            })

        losses = round(year_delivered * loss_rate, 2)
        available = current_inv + year_delivered - losses
        served = min(dem_total, available)
        shortage = round(max(0.0, dem_total - served), 2)
        closing_inv = round(max(0.0, available - served), 2)

        if closing_inv > storage_cap:
            excess = round(closing_inv - storage_cap, 2)
            constraint_checks.append({
                "constraint_id": "STORAGE_OVERFLOW",
                "year": year,
                "passed": False,
                "detail": f"Остаток {closing_inv} т превышает вместимость склада {storage_cap} т",
                "excess": excess,
            })
            all_feasible = False

        holding_cost = round(0.72 * ((current_inv + closing_inv) / 2.0), 2)

        capex = 0.0
        if zbo_year == year:
            capex += 180.0
        if year == 2037 and lunar_year == 2038:
            capex += 1250.0
        if earth_new_year == year:
            capex += 360.0

        cum_capex += capex

        opex = 0.0
        if zbo_active:
            opex += 12.0
        if lunar_year and year >= lunar_year:
            opex += 70.0

        year_total_cost = round(year_procurement + year_reservation + holding_cost + capex + opex, 2)
        total_cost_all += year_total_cost

        # Уровень сервиса
        sl_total = round(served / dem_total, 4) if dem_total > 0 else 1.0
        crit_served = min(dem_crit, served)
        sl_crit = round(crit_served / dem_crit, 4) if dem_crit > 0 else 1.0

        if not is_stress:
            if sl_total < 0.97 or sl_crit < 0.99:
                all_feasible = False

        yearly_balance.append({
            "year": year,
            "opening_inventory_t": round(current_inv, 2),
            "delivered_t": round(year_delivered, 2),
            "losses_t": losses,
            "served_t": round(served, 2),
            "closing_inventory_t": closing_inv,
            "shortage_t": shortage,
            "demand_total_t": dem_total,
            "demand_critical_t": dem_crit,
            "service_level_total": sl_total,
            "service_level_critical": sl_crit,
            "reserve_45d_target_t": r_45d_target,
            "reserve_45d_met": reserve_met,
        })

        financial_breakdown.append({
            "year": year,
            "procurement": round(year_procurement, 2),
            "reservation": round(year_reservation, 2),
            "holding": holding_cost,
            "capex": capex,
            "opex": opex,
            "total": year_total_cost,
        })

        current_inv = closing_inv

    if cum_capex > 2800.0:
        all_feasible = False
        constraint_checks.append({
            "constraint_id": "CAPEX_2040",
            "year": 2040,
            "passed": False,
            "detail": f"Суммарный CAPEX {cum_capex} млн превышает лимит 2800 млн",
            "excess": round(cum_capex - 2800.0, 2),
        })

    return {
        "scenario_id": scenario_id,
        "plan_id": plan_id,
        "units": {"fuel": "t", "currency": "mln_units"},
        "assumptions_reference": "docs/CASE_RULES.md",
        "yearly_balance": yearly_balance,
        "source_schedule": source_schedule,
        "inventory_trace": [],
        "financial_breakdown": financial_breakdown,
        "constraint_checks": constraint_checks,
        "risk_register": [],
        "is_feasible": all_feasible,
        "total_cost_mln": round(total_cost_all, 2),
    }
