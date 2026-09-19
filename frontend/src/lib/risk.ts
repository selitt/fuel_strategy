import type { Plan, Result } from '../api/types';
import { otherScenario } from './matrix.js';
export interface RiskRun { plan: Plan; result: Result }
/** Explicit request only: never used by the live preview scheduler. */
export async function calculateRisks(
 basis: Plan, both: boolean, calculate: (plan: Plan) => Promise<Result>,
 publish: (run: RiskRun) => void, stage: (scenario: string) => void,
): Promise<void> {
 const plans = both ? [basis, otherScenario(basis)] : [basis];
 for (const plan of plans) {
  stage(plan.scenario_id);
  const result = await calculate(plan);
  publish({plan, result});
 }
}
