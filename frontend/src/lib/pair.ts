import type { Plan, Result, Run } from '../api/types';
import { csvCell } from './format.js';
/** Flatten two actual responses. A stateless result is never labelled a saved run. */
export function scenarioPairCsv(primary: Pick<Run, 'plan_snapshot' | 'result'>, otherPlan: Plan, otherResult: Result): string {
    const columns = ['scenario_id', 'plan_id', 'origin', 'year', 'demand_total_t', 'demand_critical_t', 'delivered_t', 'served_t', 'shortage_t', 'opening_inventory_t', 'closing_inventory_t', 'service_level_total', 'service_level_critical', 'annual_cost_mln', 'total_cost_mln', 'units', 'assumptions_reference', 'plan_snapshot_json'];
    const rows: unknown[][] = [columns];
    for (const { result, plan, origin } of [
        { result: primary.result, plan: primary.plan_snapshot, origin: 'server-saved' },
        { result: otherResult, plan: otherPlan, origin: 'stateless-api-calc' },
    ]) {
        for (const b of result.yearly_balance || []) {
            rows.push([result.scenario_id, result.plan_id, origin, b.year, b.demand_total_t, b.demand_critical_t, b.delivered_t, b.served_t, b.shortage_t, b.opening_inventory_t, b.closing_inventory_t, b.service_level_total, b.service_level_critical, result.financial_breakdown?.find(f => f.year === b.year)?.total, result.total_cost_mln, result.units, result.assumptions_reference, plan]);
        }
    }
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
