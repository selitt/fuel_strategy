"""
DTO контракты для взаимодействия с API планирования и моделирования.
Основаны на схемах организатора:
- ParticipantPlan (data/schemas/plan.schema.json)
- ResultExportEnvelope (data/schemas/export.schema.json)
"""

from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, ConfigDict


# === ВХОДНЫЕ КОНТРАКТЫ (plan.schema.json) ===

class SupplyOrderDTO(BaseModel):
    """Заказ топлива у канала снабжения."""
    model_config = ConfigDict(extra="allow")

    year: int = Field(..., description="Год поставки (2035-2040)")
    source_id: str = Field(..., description="Идентификатор канала (A, B, C, D, E или Earth-Core и т.д.)")
    order_t: float = Field(..., ge=0, description="Заказанный объём, тонн")
    delivery_date: Optional[str] = Field(default=None, description="Дата получения партии YYYY-MM-DD; модельный год содержит 365 дней, без 29 февраля. Старому плану дату назначает оператор.")
    batch_id: Optional[str] = Field(default=None, description="Уникальный идентификатор партии в плане")


class CapacityReservationDTO(BaseModel):
    """Резервирование мощности канала снабжения."""
    model_config = ConfigDict(extra="allow")

    year: int = Field(..., description="Год резервирования (2035-2040)")
    source_id: str = Field(..., description="Идентификатор канала")
    reserved_capacity_t: float = Field(..., ge=0, description="Зарезервированная мощность, тонн/год")


class InvestmentDecisionDTO(BaseModel):
    """Инвестиционное решение."""
    model_config = ConfigDict(extra="allow")

    investment_id: str = Field(..., description="Идентификатор опциона: ZBO, LUNAR_ISRU, EARTH_NEW")
    year: int = Field(..., description="Год принятия решения или ввода")


class InventoryPolicyDTO(BaseModel):
    """Политика складских запасов."""
    model_config = ConfigDict(extra="allow")

    initial_inventory_t: float = Field(
        default=0,
        ge=0,
        description="Начальный физический запас на 1 января 2035, тонн",
    )


class PlanDecisionsDTO(BaseModel):
    """Набор решений оператора."""
    model_config = ConfigDict(extra="allow")

    supply_orders: List[SupplyOrderDTO] = Field(
        default_factory=list, description="Заказы топлива"
    )
    capacity_reservations: List[CapacityReservationDTO] = Field(
        default_factory=list, description="Резервирование мощностей"
    )
    investments: List[InvestmentDecisionDTO] = Field(
        default_factory=list, description="Инвестиции"
    )
    inventory_policy: InventoryPolicyDTO = Field(
        default_factory=InventoryPolicyDTO, description="Политика запасов"
    )


class ParticipantPlanDTO(BaseModel):
    """Входной контракт: план участника (по plan.schema.json)."""
    model_config = ConfigDict(extra="allow")

    plan_id: str = Field(default="plan-base", min_length=1, description="Идентификатор плана")
    scenario_id: str = Field(
        default="BASE",
        min_length=1,
        description="Идентификатор сценария: BASE или MANDATORY_STRESS",
    )
    decisions: PlanDecisionsDTO = Field(..., description="Решения оператора")



# === ВЫХОДНЫЕ КОНТРАКТЫ (export.schema.json) ===

class YearlyBalanceDTO(BaseModel):
    """Материальный баланс за один год."""
    model_config = ConfigDict(extra="allow")

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


class SourceScheduleDTO(BaseModel):
    """График работы источника снабжения за год."""
    model_config = ConfigDict(extra="allow")

    year: int
    source_id: str
    reserved_capacity_t: float
    ordered_t: float
    delivered_t: float


class DeliveryScheduleDTO(BaseModel):
    """Calculated dates and actual delivery of one batch."""
    model_config = ConfigDict(extra="allow")
    batch_id: str
    source_id: str
    year: int
    order_date: str
    delivery_date: str
    ordered_t: float
    delivered_t: float
    status: str


class FinancialBreakdownDTO(BaseModel):
    """Финансовая разбивка затрат за год (в млн у.е.)."""
    model_config = ConfigDict(extra="allow")

    year: int
    procurement: float
    reservation: float
    holding: float
    capex: float
    opex: float
    total: float


class ConstraintCheckDTO(BaseModel):
    """Результат проверки ограничения."""
    model_config = ConfigDict(extra="allow")

    constraint_id: str
    year: int
    passed: bool
    detail: str
    excess: Optional[float] = None


class ResultExportEnvelopeDTO(BaseModel):
    """Выходной контракт: результат моделирования и выгрузки (по export.schema.json)."""
    model_config = ConfigDict(extra="allow")

    scenario_id: str
    plan_id: str
    units: Dict[str, str] = Field(
        default_factory=lambda: {"fuel": "t", "currency": "mln_units"}
    )
    assumptions_reference: Union[str, Dict[str, Any]] = "docs/MODEL.md"
    yearly_balance: List[YearlyBalanceDTO] = Field(default_factory=list)
    source_schedule: List[SourceScheduleDTO] = Field(default_factory=list)
    inventory_trace: List[Dict[str, Any]] = Field(default_factory=list)
    delivery_schedule: List[DeliveryScheduleDTO] = Field(default_factory=list, description="Партии: дата заказа и получения, объём и фактический статус из engine")
    financial_breakdown: List[FinancialBreakdownDTO] = Field(default_factory=list)
    constraint_checks: List[ConstraintCheckDTO] = Field(default_factory=list)
    risk_register: List[Dict[str, Any]] = Field(default_factory=list)

    # Сводные показатели
    is_feasible: bool = True
    total_cost_mln: float = 0.0
