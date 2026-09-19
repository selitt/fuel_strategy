import test from 'node:test';
import assert from 'node:assert/strict';
import { strategyStatus } from '../.test-build/lib/strategy.js';
const complete = () => ({ units:{fuel:'t',currency:'mln_units'}, is_feasible:true, total_cost_mln:120,
 yearly_balance:Array.from({length:6},(_,i)=>({year:2035+i,service_level_total:1,service_level_critical:1,shortage_t:0})),
 constraint_checks:[{constraint_id:'synthetic',passed:true}] });
test('strategy status requires six years and explicit checks, never empty success',()=>{
 assert.equal(strategyStatus(null).kind,'missing');
 assert.equal(strategyStatus({...complete(),yearly_balance:[]}).kind,'incomplete');
 assert.equal(strategyStatus({...complete(),constraint_checks:[]}).kind,'incomplete');
 assert.equal(strategyStatus(complete()).kind,'feasible');
});
test('failed checks override feasible flag; no invented successful score',()=>{
 const result={...complete(),constraint_checks:[{passed:false},{passed:true},{passed:false}]};
 assert.deepEqual(strategyStatus(result),{kind:'violations',failed:2});
 assert.equal(strategyStatus({...complete(),is_feasible:false}).kind,'violations');
});
test('duplicate/missing annual records, nonfinite data and unsupported units do not claim readiness',()=>{
 for (const key of ['service_level_total','service_level_critical','shortage_t']) {
  const r=complete();r.yearly_balance[2][key]=NaN;assert.equal(strategyStatus(r).kind,'incomplete');
 }
 const r=complete();r.yearly_balance[5].year=2035;assert.equal(strategyStatus(r).kind,'incomplete');
 assert.equal(strategyStatus({...complete(),total_cost_mln:Infinity}).kind,'incomplete');
 assert.equal(strategyStatus({...complete(),is_feasible:undefined}).kind,'incomplete');
 assert.equal(strategyStatus({...complete(),units:{fuel:'kg',currency:'usd'}}).kind,'unsupported');
});
