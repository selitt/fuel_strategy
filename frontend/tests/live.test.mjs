import test from 'node:test';
import assert from 'node:assert/strict';
import { LatestCalculation, calculatePreview } from '../.test-build/lib/live.js';
function fixture() {
 let now=0, task=null; const calls=[], values=[], errors=[];
 const clock={now:()=>now, set:(fn,delay)=>{task={fn,at:now+delay};return 1}, clear:()=>{task=null}};
 const queue=new LatestCalculation(input=>new Promise((resolve,reject)=>calls.push({input,resolve,reject,at:now})),v=>values.push(v),e=>errors.push(e),clock);
 const tick=async n=>{now+=n;if(task&&task.at<=now){const f=task.fn;task=null;f();}await Promise.resolve();await Promise.resolve();await Promise.resolve();};
 return {queue,calls,values,errors,tick};
}
test('continuous edits send latest input at most every 100ms; stale reply never wins',async()=>{
 const f=fixture();f.queue.update('a');await f.tick(0);assert.equal(f.calls.length,1);
 f.queue.update('b');f.queue.update('c');f.calls[0].resolve('old');await f.tick(0);
 assert.deepEqual(f.values,[]);await f.tick(99);assert.equal(f.calls.length,1);
 await f.tick(1);assert.equal(f.calls[1].input,'c');f.calls[1].resolve('current');await f.tick(0);assert.deepEqual(f.values,['current']);
});
test('slow backend has one in-flight cycle and only one latest pending input',async()=>{
 const f=fixture();f.queue.update(1);await f.tick(0);
 for(let i=2;i<=30;i++){f.queue.update(i);await f.tick(100)}
 assert.equal(f.calls.length,1);f.calls[0].resolve(1);await f.tick(0);await f.tick(0);
 assert.equal(f.calls.length,2);assert.equal(f.calls[1].input,30);
});
test('invalid input or project switch invalidates reply; failures do not loop',async()=>{
 const f=fixture();f.queue.update('old');await f.tick(0);f.queue.update(null);f.calls[0].resolve('old');await f.tick(100);assert.deepEqual(f.values,[]);
 f.queue.update('new');await f.tick(0);f.calls[1].reject(new Error('offline'));await f.tick(0);await f.tick(1000);assert.equal(f.errors.length,1);assert.equal(f.calls.length,2);
 f.queue.update('fixed');await f.tick(0);f.queue.dispose();f.calls[2].resolve('late');await f.tick(0);assert.deepEqual(f.values,[]);
});
test('pause waits for active calculation before a saved calculation starts',async()=>{
 const f=fixture();f.queue.update('a');await f.tick(0);let idle=false;
 const waiting=f.queue.pause().then(()=>idle=true);await f.tick(0);assert.equal(idle,false);
 f.calls[0].resolve('a');await waiting;assert.equal(idle,true);assert.deepEqual(f.values,[]);
});
test('both scenarios publish one matching pair and wait for both even on failure',async()=>{
 const plan={plan_id:'p',scenario_id:'BASE',decisions:{}};
 const calls=[];const simulate=p=>new Promise((resolve,reject)=>calls.push({p,resolve,reject}));
 const pending=calculatePreview({plan,both:true},simulate);let ended=false;pending.catch(()=>{ended=true});
 assert.deepEqual(calls.map(c=>c.p.scenario_id),['BASE','MANDATORY_STRESS']);
 calls[0].reject(new Error('failed'));await Promise.resolve();await Promise.resolve();assert.equal(ended,false);
 calls[1].resolve({plan_id:'p',scenario_id:'MANDATORY_STRESS'});await assert.rejects(pending,/failed/);
 const result=await calculatePreview({plan,both:true},async p=>({plan_id:p.plan_id,scenario_id:p.scenario_id}));
 assert.equal(result.primary.scenario_id,'BASE');assert.equal(result.other.scenario_id,'MANDATORY_STRESS');assert.equal(result.basis,plan);
});
