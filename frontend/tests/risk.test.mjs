import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRisks,riskDistribution} from '../.test-build/lib/risk.js';
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

const valid=()=>({iterations:4,shortage_samples_t:[1,3,2,4],shortage_histogram:[{lower_t:1,upper_t:3,count:2},{lower_t:3,upper_t:4,count:2}],median_shortage_t:2.5,p95_shortage_t:4,max_shortage_t:4});
test('risk evidence preserves samples and server bins, including zero distribution',()=>{
 const v=valid();assert.deepEqual(riskDistribution(v).samples,[1,3,2,4]);assert.deepEqual(riskDistribution(v).bins,v.shortage_histogram);
 assert.ok(riskDistribution({iterations:2,shortage_samples_t:[0,0],shortage_histogram:[{lower_t:0,upper_t:0,count:2}],median_shortage_t:0,p95_shortage_t:0,max_shortage_t:0}));
});
test('legacy or incomplete risk results cannot become invented distributions',()=>{
 assert.equal(riskDistribution(undefined),null);assert.equal(riskDistribution({iterations:100,median_shortage_t:1}),null);
 for(const patch of [{shortage_samples_t:[1,2]},{shortage_samples_t:[1,2,NaN,4]},{shortage_histogram:[{lower_t:4,upper_t:1,count:4}]},{shortage_histogram:[{lower_t:1,upper_t:4,count:3}]},{median_shortage_t:5},{iterations:0}])assert.equal(riskDistribution({...valid(),...patch}),null);
});

const paths = () => ({iterations:2,daily_trajectories:{
 days:[{day:0,year:2035,day_of_year:1},{day:1,year:2035,day_of_year:2}],
 runs:[{run:1,inventory_t:[10,8],shortage_t:[0,1],delivered_t:[2,0]}, {run:2,inventory_t:[20,18],shortage_t:[0,0],delivered_t:[3,0]}],
 bands:{inventory_t:{p05:[10,8],median:[15,13],p95:[20,18]},shortage_t:{p05:[0,0],median:[0,.5],p95:[0,1]}}}
});
test('daily trajectories preserve engine evidence and reject broken axes or bands',async()=>{
 const {riskTrajectories}=await import('../.test-build/lib/risk.js');
 const p=paths();assert.deepEqual(riskTrajectories(p),p.daily_trajectories);
 assert.equal(riskTrajectories({iterations:100}),null);
 const bad=paths();bad.daily_trajectories.runs[0].inventory_t.pop();assert.equal(riskTrajectories(bad),null);
 const order=paths();order.daily_trajectories.days[1].day=0;assert.equal(riskTrajectories(order),null);
 const band=paths();band.daily_trajectories.bands.inventory_t.median[0]=30;assert.equal(riskTrajectories(band),null);
 const id=paths();id.daily_trajectories.runs[1].run=1;assert.equal(riskTrajectories(id),null);
 const nan=paths();nan.daily_trajectories.runs[0].shortage_t[0]=NaN;assert.equal(riskTrajectories(nan),null);
});
