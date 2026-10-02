"""
Модуль структур данных и типизации для расчётного ядра.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any


@dataclass
class DemandRecord:
    year: int
    base_total_t: float
    base_critical_t: float
    low_total_t: float
    high_total_t: float


@dataclass
class SupplySource:
    source_id: str
    name: str
    capacity_t_per_year: float
    variable_cost_mln_per_t: float
    reservation_rate: float
    take_or_pay_share: float
    lead_time_min_value: float
    lead_time_max_value: float
    lead_time_unit: str
    reliability_profile: str
    available_from_year: Optional[int] = None
    notes: str = ""


@dataclass
class StorageOption:
    storage_id: str
    name: str
    capacity_t: float
    loss_rate_on_throughput: float
    holding_cost_mln_per_t_year: float
    capex_mln: float
    fixed_opex_mln_per_year: float
    available_from_year: int = 2035


@dataclass
class InvestmentOption:
    investment_id: str
    name: str
    option_fee_mln: float
    exercise_cost_mln: float
    total_capex_mln: float
    commissioning_rule: str
    fixed_opex_mln_per_year: float


@dataclass
class ConstraintRule:
    constraint_id: str
    metric: str
    operator: str
    value: float
    unit: str
    period: str
    scenario: str
    severity: str
    description: str


@dataclass
class DailyTraceRecord:
    day: int
    year: int
    day_of_year: int
    opening_inventory_t: float
    delivered_t: float
    losses_t: float
    net_inflow_t: float
    demand_total_t: float
    demand_critical_t: float
    served_total_t: float
    served_critical_t: float
    shortage_t: float
    closing_inventory_t: float
    storage_capacity_t: float
    spill_t: float = 0.0


@dataclass
class YearlyBalanceRecord:
    year: int
    opening_inventory_t: float
    delivered_t: float
    losses_t: float
    served_t: float
    closing_inventory_t: float
    shortage_t: float
    demand_total_t: float
    demand_critical_t: float
    service_level_total: float
    service_level_critical: float
    reserve_45d_target_t: float
    reserve_45d_met: bool
    spill_t: float = 0.0


@dataclass
class SourceScheduleRecord:
    year: int
    source_id: str
    source_name: str
    reserved_capacity_t: float
    ordered_t: float
    delivered_t: float
    take_or_pay_threshold_t: float
    payable_volume_t: float
    reservation_cost_mln: float
    procurement_cost_mln: float
    batches: List["DeliveryScheduleRecord"] = field(default_factory=list)
    emergency_rescue_procurement_cost_mln: float = 0.0


@dataclass
class DeliveryScheduleRecord:
    batch_id: str
    source_id: str
    source_name: str
    year: int
    order_date: str
    delivery_date: str
    ordered_t: float
    delivered_t: float
    status: str
    parent_batch_id: Optional[str] = None


@dataclass
class FinancialBreakdownRecord:
    year: int
    procurement: float
    reservation: float
    holding: float
    capex: float
    opex: float
    total: float
    cumulative_capex: float


@dataclass
class ConstraintCheckRecord:
    constraint_id: str
    year: int
    passed: bool
    detail: str
    excess: Optional[float] = None


@dataclass
class SimulationResult:
    scenario_id: str
    plan_id: str
    is_feasible: bool
    total_cost_mln: float
    yearly_balance: List[YearlyBalanceRecord] = field(default_factory=list)
    source_schedule: List[SourceScheduleRecord] = field(default_factory=list)
    financial_breakdown: List[FinancialBreakdownRecord] = field(default_factory=list)
    constraint_checks: List[ConstraintCheckRecord] = field(default_factory=list)
    inventory_trace: List[Dict[str, Any]] = field(default_factory=list)
    risk_register: List[Dict[str, Any]] = field(default_factory=list)
