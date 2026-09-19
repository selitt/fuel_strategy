import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRisks,riskAnalysisStatus,riskCanRun,riskDistribution} from '../.test-build/lib/risk.js';
import * as riskModule from '../.test-build/lib/risk.js';
test('risk analysis runs two scenarios sequentially on same decisions',async()=>{
 const basis={plan_id:'p',scenario_id:'BASE',decisions:{extra:{keep:1}}};
 const calls=[],received=[],stages=[];
 const pending=calculateRisks(basis,true,p=>new Promise(resolve=>calls.push({p,resolve})),v=>received.push(v),s=>stages.push(s));
 assert.equal(calls.length,1);assert.equal(calls[0].p.scenario_id,'BASE');
 calls[0].resolve({plan_id:'p',scenario_id:'BASE',risk_register:[{iterations:100}]});await Promise.resolve();await Promise.resolve();
 assert.equal(calls.length,2);assert.equal(calls[1].p.scenario_id,'MANDATORY_STRESS');assert.deepEqual(calls[1].p.decisions,basis.decisions);
 calls[1].resolve({plan_id:'p',scenario_id:'MANDATORY_STRESS',risk_register:[]});await pending;
 assert.equal(received.length,2);assert.deepEqual(stages,['BASE','MANDATORY_STRESS']);assert.equal(basis.scenario_id,'BASE');
});
test('secondary failure retains already published first analysis',async()=>{
 const received=[];let calls=0;
 await assert.rejects(calculateRisks({plan_id:'p',scenario_id:'BASE',decisions:{}},true,async p=>{if(++calls===2)throw Error('second failed');return {plan_id:p.plan_id,scenario_id:p.scenario_id}},v=>received.push(v),()=>{}),/second failed/);
 assert.equal(received.length,1);assert.equal(received[0].plan.scenario_id,'BASE');
});
test('single mode invokes only selected scenario',async()=>{
 let count=0;await calculateRisks({plan_id:'p',scenario_id:'MANDATORY_STRESS',decisions:{}},false,async p=>{count++;return {plan_id:p.plan_id,scenario_id:p.scenario_id}},()=>{},()=>{});assert.equal(count,1);
});
test('risk analysis rejects a response for another plan or scenario before publishing',async()=>{
 const basis={plan_id:'p',scenario_id:'BASE',decisions:{}},received=[];
 await assert.rejects(calculateRisks(basis,false,async()=>({plan_id:'other',scenario_id:'BASE'}),run=>received.push(run),()=>{}),/другого плана или сценария/);
 await assert.rejects(calculateRisks(basis,false,async()=>({plan_id:'p',scenario_id:'MANDATORY_STRESS'}),run=>received.push(run),()=>{}),/другого плана или сценария/);
 assert.deepEqual(received,[]);
});

test('risk launch status stays bound to the exact decisions and scenario mode',()=>{
 const basis={plan_id:'p',scenario_id:'BASE',decisions:{supply_orders:[]}};
 const analysis={basis, both:false, runs:[{plan:basis,result:{plan_id:'p',scenario_id:'BASE'}}],createdAt:'now'};
 assert.equal(riskAnalysisStatus(basis,false,null,false,''),'idle');
 assert.equal(riskAnalysisStatus(basis,false,analysis,true,''),'running');
 assert.equal(riskAnalysisStatus(basis,false,analysis,false,''),'ready');
 assert.equal(riskAnalysisStatus({...basis,decisions:{supply_orders:[{source_id:'A',year:2035,order_t:1}]}},false,analysis,false,''),'stale');
 assert.equal(riskAnalysisStatus({...basis,source_overrides:{A:{capacity_t_per_year:175}}},false,analysis,false,''),'stale');
 assert.equal(riskAnalysisStatus(basis,true,analysis,false,''),'stale');
 assert.equal(riskAnalysisStatus({...basis,scenario_id:'MANDATORY_STRESS'},false,analysis,false,''),'stale');
 assert.equal(riskAnalysisStatus(basis,false,{...analysis,runs:[]},false,''),'idle');
 assert.equal(riskAnalysisStatus(basis,false,analysis,false,'backend failed'),'error');
 const partialFailure={...analysis,both:true,error:'second scenario failed'};
 assert.equal(riskAnalysisStatus(basis,true,partialFailure,false,''),'error');
 assert.equal(riskAnalysisStatus({...basis,decisions:{supply_orders:[{source_id:'A',year:2035,order_t:1}]}},true,partialFailure,false,''),'stale');
 assert.equal(riskAnalysisStatus(basis,false,partialFailure,false,''),'stale');
 assert.equal(riskAnalysisStatus(basis,false,{...analysis,runs:[{plan:basis,result:{plan_id:'other',scenario_id:'BASE'}}]},false,''),'idle');
});
test('risk launch uses the same strategy name validation as execution',()=>{
 const plan={plan_id:'p',scenario_id:'BASE',decisions:{supply_orders:[],capacity_reservations:[],investments:[],inventory_policy:{initial_inventory_t:0}}};
 assert.equal(riskCanRun('Стратегия',plan),true);
 assert.equal(riskCanRun('   ',plan),false);
 assert.equal(riskCanRun('Стратегия',null),false);
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

test('financial risk uses server evidence and does not turn old results into zero costs',()=>{
 assert.equal(typeof riskModule.riskFinancialSummary,'function');
 const read=riskModule.riskFinancialSummary;
 assert.equal(read(undefined),null);
 assert.equal(read({iterations:100,probability_of_no_shortage:1}),null);
 const fields={probability_of_all_constraints:.75,mean_total_cost_mln:125,p95_total_cost_mln:140,mean_emergency_procurement_mln:5,p95_emergency_procurement_mln:20};
 assert.deepEqual(read(fields),fields);
 for(const patch of [{probability_of_all_constraints:1.01},{mean_total_cost_mln:NaN},{mean_emergency_procurement_mln:-1},{p95_emergency_procurement_mln:undefined}])assert.equal(read({...fields,...patch}),null);
 // A rare expensive tail can put the mean above p95; do not reject valid statistics.
 assert.ok(read({...fields,mean_emergency_procurement_mln:25,p95_emergency_procurement_mln:0}));
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
