import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRisks } from '../.test-build/lib/risk.js';
test('risk analysis runs two scenarios sequentially on same decisions',async()=>{
 const basis={plan_id:'p',scenario_id:'BASE',decisions:{extra:{keep:1}}};
 const calls=[],received=[],stages=[];
 const pending=calculateRisks(basis,true,p=>new Promise(resolve=>calls.push({p,resolve})),v=>received.push(v),s=>stages.push(s));
 assert.equal(calls.length,1);assert.equal(calls[0].p.scenario_id,'BASE');
 calls[0].resolve({scenario_id:'BASE',risk_register:[{iterations:100}]});await Promise.resolve();await Promise.resolve();
 assert.equal(calls.length,2);assert.equal(calls[1].p.scenario_id,'MANDATORY_STRESS');assert.deepEqual(calls[1].p.decisions,basis.decisions);
 calls[1].resolve({scenario_id:'MANDATORY_STRESS',risk_register:[]});await pending;
 assert.equal(received.length,2);assert.deepEqual(stages,['BASE','MANDATORY_STRESS']);assert.equal(basis.scenario_id,'BASE');
});
test('secondary failure retains already published first analysis',async()=>{
 const received=[];let calls=0;
 await assert.rejects(calculateRisks({plan_id:'p',scenario_id:'BASE',decisions:{}},true,async p=>{if(++calls===2)throw Error('second failed');return {scenario_id:p.scenario_id}},v=>received.push(v),()=>{}),/second failed/);
 assert.equal(received.length,1);assert.equal(received[0].plan.scenario_id,'BASE');
});
test('single mode invokes only selected scenario',async()=>{
 let count=0;await calculateRisks({plan_id:'p',scenario_id:'MANDATORY_STRESS',decisions:{}},false,async()=>{count++;return {}},()=>{},()=>{});assert.equal(count,1);
});
