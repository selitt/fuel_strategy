import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStrategy, updateStrategy, strategyDirty, strategyRunFresh, strategyComparisonExport, strategyComparisonCsv, importStrategyFiles, acceptStrategyRun, acceptSavedStrategy, savedStrategyIsCalculated } from '../.test-build/lib/strategies.js';
import { StrategyCalculationQueue } from '../.test-build/lib/strategyQueue.js';
import { errorText } from '../.test-build/api/client.js';

test('stored calculation errors retain their actionable message',()=>{
 assert.equal(errorText('Дата получения не указана'),'Дата получения не указана');
});
test('save immediately after import cannot reuse a current imported snapshot',()=>{
 const p=plan(),project={plan:p,result_state:'current',last_run:{origin:'imported',plan_snapshot:p,result:{plan_id:'p',scenario_id:'BASE'}}};
 assert.equal(savedStrategyIsCalculated(project),false);
 assert.equal(savedStrategyIsCalculated({...project,last_run:{...project.last_run,origin:'server'}}),true);
 assert.equal(savedStrategyIsCalculated({...project,last_run:null}),false);
});

const plan = (id='p') => ({plan_id:id,scenario_id:'BASE',extra:{owner:'team'},decisions:{supply_orders:[],capacity_reservations:[],investments:[],inventory_policy:{initial_inventory_t:0}}});
test('saved server runs are reusable but imported snapshots require a fresh calculation',()=>{
 const p=plan(),result={plan_id:'p',scenario_id:'BASE',total_cost_mln:10};
 const project={name:'A',plan:p,result_state:'current',last_run:{origin:'server',plan_snapshot:p,result,created_at:'now'}};
 assert.equal(strategyRunFresh(makeStrategy('a','A',p,project),'BASE'),true);
 assert.equal(strategyRunFresh(makeStrategy('a','A',p,{...project,last_run:{...project.last_run,origin:'imported'}}),'BASE'),false);
});
test('export retains saved engine provenance rather than attributing old results to current engine',()=>{
 const p=plan(),engine={engine_id:'model',version:'old',model_verified:false};
 const project={name:'A',plan:p,result_state:'current',last_run:{origin:'server',plan_snapshot:p,result:{plan_id:'p',scenario_id:'BASE'},created_at:'then',engine}};
 const exported=strategyComparisonExport([makeStrategy('a','A',p,project)],{...engine,version:'new'});
 assert.deepEqual(exported.items[0].scenarios.BASE.run.engine,engine);
});
test('successful retry clears the matching error; late and mismatched results do not overwrite current input',()=>{
 const basis=plan(),result={plan_id:'p',scenario_id:'BASE',total_cost_mln:10};
 const tab={...makeStrategy('a','A',basis),errors:{BASE:{basis,message:'offline'}}};
 const current=acceptStrategyRun(tab,{basis,result,createdAt:'now'});
 assert.equal(current.errors.BASE,undefined);assert.equal(strategyRunFresh(current,'BASE'),true);
 const changed={...tab,plan:{...basis,extra:{owner:'new'}}};
 assert.equal(acceptStrategyRun(changed,{basis,result,createdAt:'old'}),changed);
 assert.equal(acceptStrategyRun(tab,{basis,result:{...result,scenario_id:'MANDATORY_STRESS'},createdAt:'old'}),tab);
});
test('save response updates revision without replacing edits made while request was pending',()=>{
 const original=makeStrategy('a','A',plan());
 const now={...original,name:'new name',plan:{...original.plan,extra:{owner:'new'}}};
 const saved={project_id:'saved',revision:8,name:'A',plan:original.plan};
 const accepted=acceptSavedStrategy(now,original,saved);
 assert.equal(accepted.project.revision,8);assert.equal(accepted.name,'new name');assert.deepEqual(accepted.plan.extra,{owner:'new'});assert.equal(strategyDirty(accepted),true);
});
test('editing one tab preserves other drafts, unknown fields and the saved revision',()=>{
 const a=makeStrategy('a','First',plan()), b=makeStrategy('b','Second',plan());
 const project={project_id:'saved',revision:7,name:a.name,plan:a.plan};
 const tabs=[{...a,project},b];
 const changed=updateStrategy(tabs,'a',t=>({...t,plan:{...t.plan,decisions:{...t.plan.decisions,inventory_policy:{initial_inventory_t:5}}},edited:true}));
 assert.equal(changed[1],b);assert.equal(tabs[0].plan.decisions.inventory_policy.initial_inventory_t,0);
 assert.deepEqual(changed[0].plan.extra,{owner:'team'});assert.equal(changed[0].project.revision,7);assert.equal(strategyDirty(changed[0]),true);
 assert.deepEqual(updateStrategy(changed,'missing',t=>({...t,name:'late'})),changed);
});
test('freshness follows input and scenario, exports preserve stale and missing values',()=>{
 let tab=makeStrategy('a','Same name',plan());
 const result={plan_id:'p',scenario_id:'BASE',total_cost_mln:123,yearly_balance:[{year:2035,shortage_t:4}],units:{mass:'t',money:'mln'},constraint_checks:[]};
 tab={...tab,results:{BASE:{basis:tab.plan,result,createdAt:'now'}}};
 assert.equal(strategyRunFresh(tab,'BASE'),true);assert.equal(strategyRunFresh(tab,'MANDATORY_STRESS'),false);
 const changed={...tab,plan:{...tab.plan,extra:{owner:'changed'}}};
 assert.equal(strategyRunFresh(changed,'BASE'),false);
 const exported=strategyComparisonExport([changed],undefined);
 assert.equal(exported.items[0].scenarios.BASE.current,false);
 assert.equal(exported.items[0].scenarios.BASE.run.result.total_cost_mln,123);
 assert.equal(exported.items[0].scenarios.MANDATORY_STRESS.run,null);
 const csv=strategyComparisonCsv([changed],undefined);
 assert.match(csv,/123/);assert.match(csv,/MANDATORY_STRESS/);assert.match(csv,/input_snapshot/);
});
test('batch import continues after a bad file and preserves equal filenames as separate entries',async()=>{
 const files=[{name:'same.json'},{name:'bad.json'},{name:'same.json'}];
 let count=0;
 const results=await importStrategyFiles(files,async file=>{if(file.name==='bad.json')throw new Error('invalid');return ++count;});
 assert.deepEqual(results.map(r=>r.value),[1,undefined,2]);assert.equal(results[1].error,'invalid');assert.equal(results[0].filename,results[2].filename);
});
function fixture(){
 let task=null;const calls=[],values=[],errors=[];
 const clock={set:fn=>{task=fn;return 1;},clear:()=>{task=null;}};
 const queue=new StrategyCalculationQueue(job=>new Promise((resolve,reject)=>calls.push({job,resolve,reject})),(job,value)=>values.push({job,value}),(job,error)=>errors.push({job,error}),clock);
 const tick=async()=>{const f=task;task=null;f?.();for(let i=0;i<5;i++)await Promise.resolve();};
 return {queue,calls,values,errors,tick};
}
const job=(tabId,value=0,scenario_id='BASE',priority=1)=>({tabId,plan:{...plan(tabId),scenario_id,value},priority});
test('queue serializes tabs, replaces queued edits and gives active strategy priority',async()=>{
 const f=fixture();f.queue.reconcile([job('a'),job('b')]);await f.tick();assert.equal(f.calls.length,1);
 f.queue.reconcile([job('a',2),job('b'),job('c',0,'BASE',0)]);f.calls[0].resolve('old');await f.tick();
 assert.equal(f.values.length,0);await f.tick();assert.equal(f.calls[1].job.tabId,'c');
 f.calls[1].resolve('c');await f.tick();await f.tick();assert.equal(f.calls[2].job.plan.value,2);
});
test('one scenario failure preserves the other and never retries without new input',async()=>{
 const f=fixture();const jobs=[job('a'),job('a',0,'MANDATORY_STRESS')];f.queue.reconcile(jobs);await f.tick();
 f.calls[0].reject(new Error('offline'));await f.tick();await f.tick();assert.equal(f.calls.length,2);
 f.calls[1].resolve('stress');await f.tick();f.queue.reconcile(jobs);await f.tick();
 assert.equal(f.calls.length,2);assert.equal(f.errors.length,1);assert.equal(f.values[0].value,'stress');
});
test('closing a tab discards late replies; pause drains active request before explicit actions',async()=>{
 const f=fixture();f.queue.reconcile([job('a')]);await f.tick();let paused=false;
 const waiting=f.queue.pause().then(()=>{paused=true;});await f.tick();assert.equal(paused,false);
 f.calls[0].resolve('late');await waiting;assert.equal(f.values.length,0);
 f.queue.reconcile([job('b')]);await f.tick();f.queue.dispose();f.calls[1].resolve('closed');await f.tick();assert.equal(f.values.length,0);
});
