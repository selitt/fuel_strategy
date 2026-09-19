import type { Plan, Result } from '../api/types';
import { otherScenario } from './matrix.js';
import { samePlan, validateDraft } from './plan.js';
export interface RiskRun { plan: Plan; result: Result }
export type RiskAnalysis = {basis:Plan;both:boolean;runs:RiskRun[];createdAt:string;error?:string};
export type RiskAnalysisStatus = 'idle'|'running'|'ready'|'stale'|'error';

export function riskCanRun(name:string,draft:Plan|null):boolean {
 return !!draft&&!validateDraft(name,draft).length;
}

/** Presentation state is current only for the exact plan snapshot and scenario set. */
export function riskAnalysisStatus(
 draft:Plan|null, both:boolean, analysis:RiskAnalysis|null, busy:boolean, error:string,
):RiskAnalysisStatus {
 if(busy)return 'running';
 if(analysis&&(!draft||analysis.both!==both||!samePlan(analysis.basis,draft)))return 'stale';
 if(error||analysis?.error)return 'error';
 if(!analysis||!analysis.runs.length)return 'idle';
 const expected=both?[analysis.basis,otherScenario(analysis.basis)]:[analysis.basis];
 return expected.length===analysis.runs.length&&expected.every(plan=>analysis.runs.some(run=>samePlan(run.plan,plan)&&run.result.plan_id===plan.plan_id&&run.result.scenario_id===plan.scenario_id))?'ready':'idle';
}
/** Explicit request only: never used by the live preview scheduler. */
export async function calculateRisks(
 basis: Plan, both: boolean, calculate: (plan: Plan) => Promise<Result>,
 publish: (run: RiskRun) => void, stage: (scenario: string) => void,
): Promise<void> {
 const plans = both ? [basis, otherScenario(basis)] : [basis];
 for (const plan of plans) {
  stage(plan.scenario_id);
  const result = await calculate(plan);
  if(result.plan_id!==plan.plan_id||result.scenario_id!==plan.scenario_id)throw new Error('API риска вернул результат для другого плана или сценария.');
  publish({plan, result});
 }
}

export type RiskBin = {lower_t:number;upper_t:number;count:number};
export type RiskDistribution = {samples:number[];bins:RiskBin[];iterations:number;median:number;p95:number;maximum:number};
const finite = (v:unknown):v is number => typeof v==='number' && Number.isFinite(v) && v>=0;
export const financialRiskFields = [
 ['probability_of_all_constraints', 'Прогоны с выполнением всех применимых ограничений'],
 ['mean_total_cost_mln', 'Средние затраты в случайных прогонах, млн у.е.'],
 ['p95_total_cost_mln', '95%-уровень затрат, млн у.е.'],
 ['mean_emergency_procurement_mln', 'Средняя стоимость аварийных закупок, млн у.е.'],
 ['p95_emergency_procurement_mln', '95%-уровень аварийных закупок, млн у.е.'],
] as const;
type FinancialRiskKey = typeof financialRiskFields[number][0];
export type RiskFinancialSummary = Record<FinancialRiskKey, number>;
/** Missing historical evidence stays missing; no financial calculation in the UI. */
export function riskFinancialSummary(value:Record<string,unknown>|undefined):RiskFinancialSummary|null {
 if(!value || !financialRiskFields.every(([key])=>finite(value[key])) || (value.probability_of_all_constraints as number)>1)return null;
 return Object.fromEntries(financialRiskFields.map(([key])=>[key,value[key]])) as RiskFinancialSummary;
}
/** Validate returned evidence; the browser never manufactures samples or statistics. */
export function riskDistribution(value:Record<string,unknown>|undefined):RiskDistribution|null {
 if(!value)return null;
 const n=value.iterations, samples=value.shortage_samples_t, bins=value.shortage_histogram;
 if(!finite(n)||!Number.isInteger(n)||n<1||!Array.isArray(samples)||samples.length!==n||!samples.every(finite)||!Array.isArray(bins)||!bins.length)return null;
 if(!bins.every((b:unknown)=>{if(!b||typeof b!=='object')return false;const x=b as Record<string,unknown>;return finite(x.lower_t)&&finite(x.upper_t)&&x.upper_t>=x.lower_t&&finite(x.count)&&Number.isInteger(x.count);}))return null;
 const rows=bins as RiskBin[];
 if(rows.reduce((sum,b)=>sum+b.count,0)!==n || rows.some((b,i)=>i>0&&b.lower_t!==rows[i-1].upper_t))return null;
 const median=value.median_shortage_t,p95=value.p95_shortage_t,maximum=value.max_shortage_t;
 if(!finite(median)||!finite(p95)||!finite(maximum)||median>p95||p95>maximum)return null;
 return {samples:samples as number[],bins:rows,iterations:n,median,p95,maximum};
}

export type RiskMetric = 'inventory_t' | 'shortage_t';
export type RiskDay = {day:number;year:number;day_of_year:number};
export type RiskTrajectory = {run:number;inventory_t:number[];shortage_t:number[];delivered_t:number[]};
export type RiskBand = {p05:number[];median:number[];p95:number[]};
export type RiskTrajectories = {days:RiskDay[];runs:RiskTrajectory[];bands:Record<RiskMetric,RiskBand>};
/** Transport validation only: quantiles and trajectories come from the engine. */
export function riskTrajectories(value:Record<string,unknown>|undefined):RiskTrajectories|null {
 const raw=value?.daily_trajectories;
 if(!raw || typeof raw!=='object')return null;
 const d=raw as RiskTrajectories;
 if(!Array.isArray(d.days)||!d.days.length||!Array.isArray(d.runs)||d.runs.length!==value?.iterations||!d.runs.length||!d.bands)return null;
 if(!d.days.every((v,i)=>v&&Number.isInteger(v.day)&&v.day>=0&&Number.isInteger(v.year)&&Number.isInteger(v.day_of_year)&&v.day_of_year>=1&&v.day_of_year<=365&&(i===0||v.day===d.days[i-1].day+1)))return null;
 const series=(v:unknown):v is number[]=>Array.isArray(v)&&v.length===d.days.length&&v.every(finite);
 if(!d.runs.every((r,i)=>r&&r.run===i+1&&series(r.inventory_t)&&series(r.shortage_t)&&series(r.delivered_t)))return null;
 for(const metric of ['inventory_t','shortage_t'] as const){
  const b=d.bands[metric];
  if(!b||!series(b.p05)||!series(b.median)||!series(b.p95)||b.median.some((v,i)=>v<b.p05[i]||v>b.p95[i]))return null;
 }
 return d;
}
