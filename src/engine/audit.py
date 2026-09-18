"""
Модуль аудита и проверки нормативных ограничений (Hard Constraints).
Проверяет все 7 правил из constraints.csv и формирует структурированные отчёты об ошибках.
"""

from typing import Dict, List, Any, Tuple
from .models import (
    ConstraintCheckRecord,
    YearlyBalanceRecord,
    FinancialBreakdownRecord,
    SourceScheduleRecord,
)
from .loader import CaseCatalog


def audit_constraints(
    catalog: CaseCatalog,
    scenario_id: str,
    yearly_balances: List[YearlyBalanceRecord],
    financial_breakdowns: List[FinancialBreakdownRecord],
    source_schedules: List[SourceScheduleRecord],
    simulation_violations: List[Dict[str, Any]],
    decisions: Dict[str, Any],
) -> Tuple[List[ConstraintCheckRecord], bool]:
    """
    Выполняет строгий аудит плана.
    Возвращает:
    1. constraint_checks (список проверок)
    2. is_feasible (True, если все жесткие правила выполнены)
    """
    is_stress = scenario_id.upper() == "MANDATORY_STRESS"
    checks: List[ConstraintCheckRecord] = []
    is_feasible = True

    # 1. Добавляем физические нарушения из симуляции (RESERVE_45D, STORAGE_OVERFLOW)
    overflow_reported_years = set()
    for v in simulation_violations:
        c_id = v.get("constraint_id", "PHYSICAL_VIOLATION")
        y = v.get("year", 2035)
        if c_id == "STORAGE_OVERFLOW":
            if y in overflow_reported_years:
                continue
            overflow_reported_years.add(y)

        is_feasible = False
        checks.append(ConstraintCheckRecord(
            constraint_id=c_id,
            year=y,
            passed=False,
            detail=v.get("detail", "Нарушение физического ограничения"),
            excess=v.get("excess"),
        ))

    # 2. Проверка ограничений мощности каналов (CAPACITY_EXCEEDED)
    capacity_reservations = decisions.get("capacity_reservations", [])
    for r in capacity_reservations:
        y = int(r.get("year", 2035))
        s_id = str(r.get("source_id", ""))
        val = float(r.get("reserved_capacity_t", 0.0))
        s_info = catalog.sources.get(s_id)
        if s_info and val > s_info.capacity_t_per_year:
            excess = round(val - s_info.capacity_t_per_year, 2)
            is_feasible = False
            checks.append(ConstraintCheckRecord(
                constraint_id="CAPACITY_EXCEEDED",
                year=y,
                passed=False,
                detail=f"Бронь {val} т превышает предельную мощность канала {s_info.name} ({s_info.capacity_t_per_year} т)",
                excess=excess,
            ))

    # 3. Аудит годовых уровней обслуживания (BASE_TOTAL_SERVICE, BASE_CRITICAL_SERVICE)
    for bal in yearly_balances:
        # Проверка 45-дневного резерва (если уже не добавлено)
        if bal.reserve_45d_met:
            checks.append(ConstraintCheckRecord(
                constraint_id="RESERVE_45D",
                year=bal.year,
                passed=True,
                detail=f"Запас на 1 января ({bal.opening_inventory_t:.2f} т) соответствует норме 45 дней ({bal.reserve_45d_target_t:.2f} т)",
                excess=None,
            ))

        # Уровни обслуживания в BASE
        if not is_stress:
            # Общий SL >= 97%
            sl_total_met = bal.service_level_total >= (0.97 - 1e-5)
            if not sl_total_met:
                is_feasible = False
            checks.append(ConstraintCheckRecord(
                constraint_id="BASE_TOTAL_SERVICE",
                year=bal.year,
                passed=sl_total_met,
                detail=f"Общий SL = {bal.service_level_total * 100:.2f}% (норма >= 97.0%)",
                excess=round(0.97 - bal.service_level_total, 4) if not sl_total_met else None,
            ))

            # Критический SL >= 99%
            sl_crit_met = bal.service_level_critical >= (0.99 - 1e-5)
            if not sl_crit_met:
                is_feasible = False
            checks.append(ConstraintCheckRecord(
                constraint_id="BASE_CRITICAL_SERVICE",
                year=bal.year,
                passed=sl_crit_met,
                detail=f"Критический SL = {bal.service_level_critical * 100:.2f}% (норма >= 99.0%)",
                excess=round(0.99 - bal.service_level_critical, 4) if not sl_crit_met else None,
            ))

        # 4. В стресс-сценарии: ограничение на потери (STRESS_LOSS_LIMIT <= 2%) с 2038 года
        if is_stress and bal.year >= 2038:
            loss_ratio = (bal.losses_t / bal.delivered_t) if bal.delivered_t > 0 else 0.0
            loss_limit_met = loss_ratio <= (0.02 + 1e-5)
            if not loss_limit_met:
                is_feasible = False
            checks.append(ConstraintCheckRecord(
                constraint_id="STRESS_LOSS_LIMIT",
                year=bal.year,
                passed=loss_limit_met,
                detail=f"Доля потерь = {loss_ratio * 100:.2f}% (норма <= 2.0%)",
                excess=round(loss_ratio - 0.02, 4) if not loss_limit_met else None,
            ))

    # 5. Аудит бюджетных лимитов CAPEX (CAPEX_2037 <= 1800, CAPEX_2040 <= 2800)
    cum_capex_2037 = 0.0
    cum_capex_2040 = 0.0
    for fin in financial_breakdowns:
        if fin.year <= 2037:
            cum_capex_2037 = fin.cumulative_capex
        if fin.year <= 2040:
            cum_capex_2040 = fin.cumulative_capex

    capex_2037_met = cum_capex_2037 <= 1800.0
    if not capex_2037_met:
        is_feasible = False
    checks.append(ConstraintCheckRecord(
        constraint_id="CAPEX_2037",
        year=2037,
        passed=capex_2037_met,
        detail=f"Накопленный CAPEX к концу 2037 года = {cum_capex_2037:.2f} млн (лимит 1800 млн)",
        excess=round(cum_capex_2037 - 1800.0, 2) if not capex_2037_met else None,
    ))

    capex_2040_met = cum_capex_2040 <= 2800.0
    if not capex_2040_met:
        is_feasible = False
    checks.append(ConstraintCheckRecord(
        constraint_id="CAPEX_2040",
        year=2040,
        passed=capex_2040_met,
        detail=f"Суммарный CAPEX за 2035–2040 гг. = {cum_capex_2040:.2f} млн (лимит 2800 млн)",
        excess=round(cum_capex_2040 - 2800.0, 2) if not capex_2040_met else None,
    ))

    # 6. Ограничение на Emergency как базовый канал (EMERGENCY_BASE_STREAK <= 2)
    # Считаем, сколько лет подряд Emergency был доминирующим каналом (>50% поставок или макс среди всех)
    consecutive_emergency_years = 0
    max_consecutive_emergency = 0

    years = sorted(catalog.demands.keys())
    for y in years:
        scheds_y = [s for s in source_schedules if s.year == y]
        total_deliv = sum(s.delivered_t for s in scheds_y)
        emer_deliv = sum(s.delivered_t for s in scheds_y if s.source_name == "Emergency" or s.source_id == "E")

        is_base = False
        if total_deliv > 0:
            if emer_deliv / total_deliv > 0.50:
                is_base = True
            elif emer_deliv == max(s.delivered_t for s in scheds_y) and emer_deliv > 0:
                is_base = True

        if is_base:
            consecutive_emergency_years += 1
            max_consecutive_emergency = max(max_consecutive_emergency, consecutive_emergency_years)
        else:
            consecutive_emergency_years = 0

    emer_streak_met = max_consecutive_emergency <= 2
    if not emer_streak_met:
        is_feasible = False
    checks.append(ConstraintCheckRecord(
        constraint_id="EMERGENCY_BASE_STREAK",
        year=years[-1] if years else 2040,
        passed=emer_streak_met,
        detail=f"Emergency использовался как базовый канал {max_consecutive_emergency} лет подряд (норма <= 2)",
        excess=float(max_consecutive_emergency - 2) if not emer_streak_met else None,
    ))

    return checks, is_feasible
