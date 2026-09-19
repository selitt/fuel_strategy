import type { Plan, Result } from '../api/types';
import { samePlan } from './plan.js';

export type StrategyJob = {tabId:string;plan:Plan;priority:number};
type Clock = {set:(fn:()=>void,ms:number)=>unknown;clear:(id:unknown)=>void};
const clock:Clock={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)};
const key=(job:StrategyJob)=>`${job.tabId}:${job.plan.scenario_id}`;
const matches=(a:StrategyJob,b:StrategyJob)=>key(a)===key(b)&&samePlan(a.plan,b.plan);
/** One request across all strategies. A completed/failed snapshot never retries itself. */
export class StrategyCalculationQueue {
 private desired:StrategyJob[]=[];
 private attempted=new Map<string,StrategyJob>();
 private running:StrategyJob|null=null;
 private timer:unknown=null;
 private stopped=false;
 private waiters:(()=>void)[]=[];
 constructor(private run:(job:StrategyJob)=>Promise<Result>,private publish:(job:StrategyJob,result:Result)=>void,private fail:(job:StrategyJob,error:unknown)=>void,private time:Clock=clock){}
 reconcile(jobs:StrategyJob[]){
  if(this.stopped)return;
  this.desired=jobs;
  for(const [id] of this.attempted)if(!jobs.some(job=>key(job)===id))this.attempted.delete(id);
  this.schedule();
 }
 retry(tabId:string){for(const [id,job] of this.attempted)if(job.tabId===tabId)this.attempted.delete(id);this.schedule();}
 private schedule(){
  if(this.stopped||this.running||this.timer!==null)return;
  if(!this.desired.some(job=>!this.attempted.has(key(job))||!matches(this.attempted.get(key(job))!,job)))return;
  this.timer=this.time.set(()=>{this.timer=null;void this.start();},100);
 }
 private async start(){
  const job=[...this.desired].sort((a,b)=>a.priority-b.priority).find(job=>!this.attempted.has(key(job))||!matches(this.attempted.get(key(job))!,job));
  if(!job||this.stopped)return;
  this.running=job;this.attempted.set(key(job),job);
  try {const result=await this.run(job);if(!this.stopped&&this.desired.some(next=>matches(next,job)))this.publish(job,result);}
  catch(error){if(!this.stopped&&this.desired.some(next=>matches(next,job)))this.fail(job,error);}
  finally {this.running=null;this.waiters.splice(0).forEach(resolve=>resolve());this.schedule();}
 }
 pause():Promise<void>{
  this.desired=[];this.attempted.clear();
  if(this.timer!==null){this.time.clear(this.timer);this.timer=null;}
  return this.running?new Promise(resolve=>this.waiters.push(resolve)):Promise.resolve();
 }
 dispose(){void this.pause();this.stopped=true;}
}
