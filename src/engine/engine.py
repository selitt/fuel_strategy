"""
Главный диспетчер расчётного ядра «Топливный космоконтур 2035».
Объединяет загрузчик, посуточный имитационный движок, финансовый расчёт,
аудит 7 ограничений и вероятностный модуль Монте-Карло.
"""

from typing import Dict, Any, Optional
from .loader import CaseCatalog
from .simulation import simulate_daily
from .finance import calculate_finances
from .audit import audit_constraints
from .monte_carlo import run_monte_carlo


class SimulationEngine:
    """Модульный расчётный движок моделирования орбитального узла."""

    def __init__(self, catalog: Optional[CaseCatalog] = None):
        self.catalog = catalog or CaseCatalog()

    def run(
        self,
        plan_id: str,
        scenario_id: str,
        decisions: Dict[str, Any],
        run_risk_analysis: bool = False,
    ) -> Dict[str, Any]:
        """
        Выполняет полный расчёт плана участника.
        Возвращает структуру, строго совместимую с export.schema.json и ResultExportEnvelopeDTO.
        """
        # 1. Посуточная симуляция материального баланса (2190 дней)
        yearly_bal, source_sched, daily_trace, violations, avg_inv = simulate_daily(
            catalog=self.catalog,
            scenario_id=scenario_id,
            decisions=decisions,
        )

        # 2. Финансово-экономический расчёт
        investments = decisions.get("investments", [])
        inv_policy = decisions.get("inventory_policy", {})
        initial_inv = float(inv_policy.get("initial_inventory_t", 12.33))

        financial_breakdown, total_cost, cum_capex = calculate_finances(
            catalog=self.catalog,
            source_schedules=source_sched,
            avg_inventory_by_year=avg_inv,
            investments=investments,
            initial_inventory_t=initial_inv,
        )

        # 3. Аудит 7 ограничений
        constraint_checks, is_feasible = audit_constraints(
            catalog=self.catalog,
            scenario_id=scenario_id,
            yearly_balances=yearly_bal,
            financial_breakdowns=financial_breakdown,
            source_schedules=source_sched,
            simulation_violations=violations,
            decisions=decisions,
        )

        # 4. Анализ рисков Монте-Карло (опционально)
        risk_register = []
        if run_risk_analysis:
            mc_result = run_monte_carlo(
                catalog=self.catalog,
                scenario_id=scenario_id,
                decisions=decisions,
                iterations=100,
            )
            risk_register.append(mc_result)

        # 5. Преобразование результатов в DTO-совместимый словарь
        yearly_balance_dicts = [
            {
                "year": b.year,
                "opening_inventory_t": b.opening_inventory_t,
                "delivered_t": b.delivered_t,
                "losses_t": b.losses_t,
                "served_t": b.served_t,
                "closing_inventory_t": b.closing_inventory_t,
                "shortage_t": b.shortage_t,
                "demand_total_t": b.demand_total_t,
                "demand_critical_t": b.demand_critical_t,
                "service_level_total": b.service_level_total,
                "service_level_critical": b.service_level_critical,
                "reserve_45d_target_t": b.reserve_45d_target_t,
                "reserve_45d_met": b.reserve_45d_met,
            }
            for b in yearly_bal
        ]

        source_schedule_dicts = [
            {
                "year": s.year,
                "source_id": s.source_name,
                "reserved_capacity_t": s.reserved_capacity_t,
                "ordered_t": s.ordered_t,
                "delivered_t": s.delivered_t,
                "take_or_pay_threshold_t": s.take_or_pay_threshold_t,
                "payable_volume_t": s.payable_volume_t,
                "reservation_cost_mln": s.reservation_cost_mln,
                "procurement_cost_mln": s.procurement_cost_mln,
            }
            for s in source_sched
        ]

        financial_breakdown_dicts = [
            {
                "year": f.year,
                "procurement": f.procurement,
                "reservation": f.reservation,
                "holding": f.holding,
                "capex": f.capex,
                "opex": f.opex,
                "total": f.total,
            }
            for f in financial_breakdown
        ]

        constraint_check_dicts = [
            {
                "constraint_id": c.constraint_id,
                "year": c.year,
                "passed": c.passed,
                "detail": c.detail,
                "excess": c.excess,
            }
            for c in constraint_checks
        ]

        inventory_trace_dicts = [
            {
                "day": t.day,
                "year": t.year,
                "day_of_year": t.day_of_year,
                "opening_inventory_t": t.opening_inventory_t,
                "delivered_t": t.delivered_t,
                "losses_t": t.losses_t,
                "net_inflow_t": t.net_inflow_t,
                "demand_total_t": t.demand_total_t,
                "demand_critical_t": t.demand_critical_t,
                "served_total_t": t.served_total_t,
                "served_critical_t": t.served_critical_t,
                "shortage_t": t.shortage_t,
                "closing_inventory_t": t.closing_inventory_t,
                "storage_capacity_t": t.storage_capacity_t,
            }
            for t in daily_trace
        ]

        return {
            "scenario_id": scenario_id,
            "plan_id": plan_id,
            "units": {"fuel": "t", "currency": "mln_units"},
            "assumptions_reference": "docs/MODEL.md",
            "yearly_balance": yearly_balance_dicts,
            "source_schedule": source_schedule_dicts,
            "inventory_trace": inventory_trace_dicts,
            "financial_breakdown": financial_breakdown_dicts,
            "constraint_checks": constraint_check_dicts,
            "risk_register": risk_register,
            "is_feasible": is_feasible,
            "total_cost_mln": total_cost,
        }


# Глобальный синглтон движка
_engine_instance = None


def get_engine() -> SimulationEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = SimulationEngine()
    return _engine_instance


def run_engine(
    plan_id: str,
    scenario_id: str,
    decisions: Dict[str, Any],
    run_risk_analysis: bool = False,
) -> Dict[str, Any]:
    """Точка входа для вызова движка."""
    engine = get_engine()
    return engine.run(
        plan_id=plan_id,
        scenario_id=scenario_id,
        decisions=decisions,
        run_risk_analysis=run_risk_analysis,
    )
