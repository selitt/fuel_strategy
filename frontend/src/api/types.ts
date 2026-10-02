import type { schemas } from './schema';
export type Order = schemas['SupplyOrderDTO'];
export type Reservation = schemas['CapacityReservationDTO'];
export type Investment = schemas['InvestmentDecisionDTO'];
type GeneratedSourceOverride = schemas['SourceOverrideDTO'];
export type SourceOverride = {
  [K in keyof GeneratedSourceOverride]?: K extends 'available_from_year'
    ? GeneratedSourceOverride[K]
    : NonNullable<GeneratedSourceOverride[K]>;
};
export type Plan = schemas['ParticipantPlanDTO'] & {
  plan_id: string;
  scenario_id: string;
  source_overrides?: Record<string, SourceOverride>;
  decisions: schemas['PlanDecisionsDTO'] & {
    supply_orders: Order[];
    capacity_reservations: Reservation[];
    investments: Investment[];
    inventory_policy: schemas['InventoryPolicyDTO'] & {initial_inventory_t: number};
  };
};
export type Project = schemas['ProjectDTO'];
export type Summary = schemas['ProjectSummaryDTO'];
export type Catalog = schemas['CatalogDTO'];
export type Meta = schemas['MetaDTO'];
export type Result = schemas['ResultExportEnvelopeDTO'];
export type Balance = schemas['YearlyBalanceDTO'];
export type Finance = schemas['FinancialBreakdownDTO'];
export type Check = schemas['ConstraintCheckDTO'];
export type Comparison = schemas['ComparisonDTO'];
export type Run = schemas['RunRecordDTO'];
export type ReferenceTable = schemas['ReferenceTableDTO'];
export type Validation = schemas['PlanValidationDTO'];
export type BuiltinStrategy = schemas['BuiltinStrategyDTO'];
