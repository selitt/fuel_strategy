import type { Result } from '../api/types';
import { supportedUnits } from './format.js';
export const strategyYears = [2035, 2036, 2037, 2038, 2039, 2040] as const;
export type StrategyStatus = { kind: 'missing' | 'unsupported' | 'incomplete' | 'violations' | 'feasible'; failed: number };
/** Presentation completeness only: never calculates a model KPI or overrides its feasibility. */
export function strategyStatus(result: Result | null | undefined): StrategyStatus {
 if (!result) return {kind:'missing',failed:0};
 const failed = (result.constraint_checks || []).filter(c => c.passed === false).length;
 if (!supportedUnits(result.units)) return {kind:'unsupported',failed};
 const rows = result.yearly_balance || [];
 const complete = strategyYears.every(year => {
  const matching = rows.filter(r => r.year === year);
  return matching.length === 1 && [matching[0].service_level_total, matching[0].service_level_critical, matching[0].shortage_t].every(v => typeof v === 'number' && Number.isFinite(v));
 });
 if (!complete || !Number.isFinite(result.total_cost_mln) || typeof result.is_feasible !== 'boolean' || !result.constraint_checks?.length || result.constraint_checks.some(c => typeof c.passed !== 'boolean')) return {kind:'incomplete',failed};
 return {kind:failed || result.is_feasible === false ? 'violations' : 'feasible',failed};
}
