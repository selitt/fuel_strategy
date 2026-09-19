import test from 'node:test';
import assert from 'node:assert/strict';
const m=await import('../.test-build/lib/pair.js').catch(()=>({}));
const plan={plan_id:'p',scenario_id:'BASE',decisions:{supply_orders:[],capacity_reservations:[],investments:[],inventory_policy:{initial_inventory_t:0}},custom:'keep'};
const result=(scenario,volume)=>({plan_id:'p',scenario_id:scenario,units:{fuel:'t',currency:'mln_units'},assumptions_reference:'docs/rules',yearly_balance:[{year:2035,delivered_t:volume}],financial_breakdown:[],total_cost_mln:42});
test('on-demand comparison CSV keeps each scenario, its exact input and real output',()=>{assert.equal(typeof m.scenarioPairCsv,'function');const csv=m.scenarioPairCsv({plan_snapshot:plan,result:result('BASE',0)},{...plan,scenario_id:'MANDATORY_STRESS'},result('MANDATORY_STRESS',3));assert.ok(csv.startsWith('\uFEFFscenario_id'));assert.ok(csv.includes('BASE,p,server-saved'));assert.ok(csv.includes('MANDATORY_STRESS,p,stateless-api-calc'));assert.ok(csv.includes('keep'));assert.ok(csv.includes('mln_units'));});
test('comparison export leaves missing measurements blank, rather than manufacturing zero',()=>{const csv=m.scenarioPairCsv({plan_snapshot:plan,result:result('BASE',0)},{...plan,scenario_id:'MANDATORY_STRESS'},result('MANDATORY_STRESS',3));const lines=csv.split('\r\n');assert.ok(lines[1].startsWith('BASE,p,server-saved,2035,,,0,'));});
