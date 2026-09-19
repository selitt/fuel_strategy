import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, errorText } from '../api/client';
import type { Catalog, Meta, Plan, Project, Result, Summary } from '../api/types';
import { normalizedPlan, samePlan, validateDraft, newPlanId } from '../lib/plan';
import { otherScenario } from '../lib/matrix';
import { calculateRisks } from '../lib/risk';
import { inspectPlanImport, planImportName } from '../lib/import';
import { makeStrategy, updateStrategy, strategyDirty, strategyRunFresh, scenarioPlan, importStrategyFiles, acceptStrategyRun, acceptSavedStrategy, savedStrategyIsCalculated } from '../lib/strategies';
import type { StrategyTab } from '../lib/strategies';
import { StrategyCalculationQueue } from '../lib/strategyQueue';
import type { StrategyJob } from '../lib/strategyQueue';
import { comparisonEditorContext, updateEditorUi } from '../lib/comparisonView';

export type ScenarioPair = {basis:Plan;otherPlan:Plan;other:Result;createdAt:string};
export type View = 'overview' | 'plan' | 'compare' | 'data';
export type ComparisonSettings = {year:number;scenario:'BASE'|'MANDATORY_STRESS';metric:'inventory'|'shortage'|'cost';range:'all'|'year';referenceId:string|null};
export function useWorkspace() {
 const [tabs,setTabsState]=useState<StrategyTab[]>([]), tabsRef=useRef<StrategyTab[]>([]);
 const [activeId,setActiveId]=useState(''), nextId=useRef(0);
 const [view,setViewState]=useState<View>('plan');
 const [selectedIds,setSelectedIds]=useState<string[]>([]), initializedComparison=useRef(false);
 const [comparison,setComparisonState]=useState<ComparisonSettings>({year:2035,scenario:'BASE',metric:'inventory',range:'all',referenceId:null});
 const [projects,setProjects]=useState<Summary[]>([]),[catalog,setCatalog]=useState<Catalog|null>(null),[meta,setMeta]=useState<Meta|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState<unknown>(null),[message,setMessage]=useState('');
 const [riskBusy,setRiskBusy]=useState(false),[riskStage,setRiskStage]=useState(''),[riskError,setRiskError]=useState('');
 const [imports,setImports]=useState<{filename:string;value?:{id:string;warning?:string};error?:string}[]>([]);
 const lock=useRef(false),mounted=useRef(false),queue=useRef<StrategyCalculationQueue|null>(null);
 const changeTabs=useCallback((change:(tabs:StrategyTab[])=>StrategyTab[])=>{
  const next=change(tabsRef.current);tabsRef.current=next;setTabsState(next);
 },[]);
 const patch=useCallback((id:string,change:(tab:StrategyTab)=>StrategyTab)=>changeTabs(tabs=>updateStrategy(tabs,id,change)),[changeTabs]);
 const addTab=useCallback((name:string,plan:Plan,project:Project|null=null)=>{
  const existing=project&&tabsRef.current.find(tab=>tab.project?.project_id===project.project_id);
  if(existing){setActiveId(existing.id);setViewState('plan');return existing.id;}
  const id='strategy-'+nextId.current++;
  changeTabs(tabs=>[...tabs,makeStrategy(id,name,normalizedPlan(plan),project)]);
  setActiveId(id);setViewState('plan');return id;
 },[changeTabs]);
 const refreshList=useCallback(async()=>{setProjects(await api.list());},[]);
 useEffect(()=>{
  mounted.current=true;let active=true;let engine:Meta['engine']|undefined;
  const instance=new StrategyCalculationQueue(job=>api.simulate(job.plan),(job,result)=>{
   patch(job.tabId,tab=>acceptStrategyRun(tab,{basis:job.plan,result,createdAt:new Date().toISOString(),engine}));
  },(job,cause)=>patch(job.tabId,tab=>samePlan(scenarioPlan(tab,job.plan.scenario_id),job.plan)?{...tab,errors:{...tab.errors,[job.plan.scenario_id]:{basis:job.plan,message:errorText(cause)}}}:tab));
  queue.current=instance;
  (async()=>{
   try{
    const [m,c,list]=await Promise.all([api.meta(),api.catalog(),api.list()]);if(!active)return;
    engine=m.engine;setMeta(m);setCatalog(c);setProjects(list);
    const requested=new URLSearchParams(location.search).get('project');
    if(requested||list.length){const p=await api.project(requested||list[0].project_id);if(active)addTab(p.name,p.plan as Plan,p);}
    else {const p=await api.template();if(active)addTab('Новая стратегия',p);}
   }catch(cause){if(active)setError(cause);}finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;mounted.current=false;instance.dispose();queue.current=null;};
 },[addTab,patch]);
 const tab=tabs.find(t=>t.id===activeId)??tabs[0];
 const project=tab?.project??null,draft=tab?.plan??null,name=tab?.name??'Новая стратегия',both=tab?.both??false;
 const dirty=!!tab&&strategyDirty(tab),inputChanged=!!tab&&(!project||!samePlan(tab.plan,project.plan));
 const current=!!project&&project.result_state==='current'&&!inputChanged;
 useEffect(()=>{
  if(loading)return;
  const url=new URL(location.href);url.searchParams.set('view',view);
  if(project)url.searchParams.set('project',project.project_id);else url.searchParams.delete('project');
  history.replaceState(null,'',url);
 },[view,project?.project_id,loading]);
 useEffect(()=>{
  const listener=(e:BeforeUnloadEvent)=>{if(tabsRef.current.some(strategyDirty)){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',listener);return()=>window.removeEventListener('beforeunload',listener);
 },[]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),4500);return()=>clearTimeout(timer);},[message]);
 useEffect(()=>{
  if(loading||busy||riskBusy||lock.current){queue.current?.reconcile([]);return;}
  const jobs:StrategyJob[]=[];
  for(const item of tabs){
   const selected=selectedIds.includes(item.id);
   if(item.id!==activeId&&!selected)continue;
   if(validateDraft('preview',item.plan).length)continue;
   const scenarios=new Set(selected?['BASE','MANDATORY_STRESS']:[]);
   if(item.id===activeId){scenarios.add(item.plan.scenario_id);if(item.both)scenarios.add(otherScenario(item.plan).scenario_id);}
   for(const scenario of scenarios){
    const plan=scenarioPlan(item,scenario),failure=item.errors[scenario];
    if(strategyRunFresh(item,scenario)||(failure&&samePlan(failure.basis,plan)))continue;
    jobs.push({tabId:item.id,plan,priority:item.id===activeId?0:1});
   }
  }
  queue.current?.reconcile(jobs);
 },[tabs,activeId,selectedIds,loading,busy,riskBusy]);
 function activateTab(id:string){if(lock.current||!tabsRef.current.some(t=>t.id===id))return;setActiveId(id);setViewState('plan');setError(null);setRiskError('');}
 function editComparedTab(id:string){
  if(lock.current)return;
  patch(id,t=>({...t,both:true,ui:comparisonEditorContext(comparison,t.ui,t.plan.scenario_id)}));
  activateTab(id);
 }
 function setView(value:View){
  if(value==='compare'&&!initializedComparison.current){setSelectedIds(tabsRef.current.slice(0,6).map(t=>t.id));initializedComparison.current=true;}
  setViewState(value);
 }
 function toggleComparison(id:string){setSelectedIds(ids=>ids.includes(id)?ids.filter(i=>i!==id):ids.length<6?[...ids,id]:ids);}
 function retryTab(id:string){patch(id,t=>({...t,errors:{}}));queue.current?.retry(id);}
 function closeTab(id:string){
  if(lock.current)return;
  const left=tabsRef.current.filter(t=>t.id!==id);changeTabs(()=>left);setSelectedIds(ids=>ids.filter(i=>i!==id));
  if(id===activeId)setActiveId(left[0]?.id??'');
 }
 async function execute<T>(label:string,work:()=>Promise<T>):Promise<T|undefined>{
  if(lock.current)return;lock.current=true;setBusy(label);setError(null);setMessage('');
  try{await queue.current?.pause();return await work();}
  catch(cause){setError(cause);return undefined;}
  finally{lock.current=false;if(mounted.current)setBusy('');}
 }
 function requireTab(id=activeId){const t=tabsRef.current.find(t=>t.id===id);if(!t)throw new Error('Сначала создайте или откройте стратегию.');return t;}
 function assertValid(t:StrategyTab){const errors=validateDraft(t.name,t.plan);if(errors.length)throw new Error(errors.join('\n'));return t.plan;}
 async function persist(t:StrategyTab):Promise<Project>{
  const plan=assertValid(t);
  if(t.project&&!strategyDirty(t))return t.project;
  const saved=t.project?await api.update(t.project.project_id,t.name.trim(),plan,t.project.revision):await api.create(t.name.trim(),plan);
  patch(t.id,now=>acceptSavedStrategy(now,t,saved));return saved;
 }
 async function listAfterSuccess(){try{await refreshList();}catch{setMessage('Изменение сохранено. Не удалось обновить список стратегий.');}}
 async function save(id=activeId){return execute('Сохраняем…',async()=>{
  const t=requireTab(id),saved=await persist(t);
  const calculated=savedStrategyIsCalculated(saved)?saved:await api.calculate(saved.project_id,saved.revision);
  patch(id,now=>{const updated={...now,project:calculated},run=calculated.last_run;return run?acceptStrategyRun(updated,{basis:normalizedPlan(run.plan_snapshot),result:run.result,createdAt:run.created_at,engine:run.engine}):updated;});
  await listAfterSuccess();setMessage('Стратегия и результат сохранены');return calculated;
 });}
 async function calculate(){retryTab(activeId);}
 async function load(id:string){
  const existing=tabsRef.current.find(t=>t.project?.project_id===id);
  if(existing){activateTab(existing.id);return existing.project;}
  return execute('Открываем…',async()=>{const loaded=await api.project(id);addTab(loaded.name,loaded.plan as Plan,loaded);return loaded;});
 }
 async function reload(){return execute('Открываем версию с сервера…',async()=>{
  const t=requireTab();if(!t.project)return;
  const loaded=await api.project(t.project.project_id);
  patch(t.id,()=>makeStrategy(t.id,loaded.name,normalizedPlan(loaded.plan),loaded));return loaded;
 });}
 async function newPlan(){return execute('Создаём…',async()=>{const p=normalizedPlan(await api.template());return addTab('Новая стратегия',{...p,plan_id:newPlanId()});});}
 async function copy(copyName:string,scenarioId:string){return execute('Создаём копию…',async()=>{
  const t=requireTab(),p=assertValid(t);return addTab(copyName.trim(),{...structuredClone(p),plan_id:newPlanId(),scenario_id:scenarioId});
 });}
 async function remove(){return execute('Удаляем…',async()=>{
  const t=requireTab();if(!t.project)return;
  await api.remove(t.project.project_id,t.project.revision);
  const left=tabsRef.current.filter(item=>item.id!==t.id);changeTabs(()=>left);setActiveId(left[0]?.id??'');setSelectedIds(ids=>ids.filter(id=>id!==t.id));
  await listAfterSuccess();setMessage('Сохранённая стратегия удалена');
 });}
 async function importFiles(files:File[]){return execute('Загружаем стратегии…',async()=>{
  setImports([]);
  const outcomes=await importStrategyFiles(files,async file=>{
   const inspected=await inspectPlanImport(file,meta?.max_upload_bytes||2097152);
   if(inspected.kind==='project'){
    const imported=await api.importProject(file);return {id:addTab(imported.name,normalizedPlan(imported.plan),imported)};
   }
   const validated=await api.importPlan(file),messages=[...(validated.normalized?['API дополнил отсутствующие значения.']:[]),...(validated.warnings||[])];
   return {id:addTab(planImportName(file.name),normalizedPlan(validated.plan)),warning:messages.join(' ')||undefined};
  });
  setImports(outcomes);await listAfterSuccess();setMessage('Загружено стратегий: '+outcomes.filter(r=>!r.error).length+' из '+files.length);return outcomes;
 });}
 async function downloadTemplate(format:'csv'|'xlsx'){return execute('Готовим шаблон…',()=>api.downloadPlanTemplate(format));}
 async function analyzeRisk(){return execute('Проверяем сбои…',async()=>{
  const t=requireTab(),basis=structuredClone(assertValid(t)),pairMode=t.both;
  setRiskBusy(true);setRiskError('');patch(t.id,now=>({...now,risk:{basis,both:pairMode,runs:[],createdAt:new Date().toISOString()}}));
  try{await calculateRisks(basis,pairMode,api.analyzeRisk,run=>patch(t.id,now=>({...now,risk:now.risk?{...now.risk,runs:[...now.risk.runs,run]}:null})),setRiskStage);}
  catch(cause){setRiskError(errorText(cause));}
  finally{setRiskBusy(false);setRiskStage('');}
 });}
 async function saveOther(){return execute('Создаём второй сценарий…',async()=>{
  const t=requireTab(),other=otherScenario(assertValid(t));
  const saved=await api.create(t.name+' — '+(other.scenario_id==='BASE'?'BASE':'STRESS'),{...other,plan_id:newPlanId()});
  const id=addTab(saved.name,normalizedPlan(saved.plan),saved);
  await listAfterSuccess();
  const calculated=await api.calculate(saved.project_id,saved.revision);
  patch(id,()=>makeStrategy(id,calculated.name,normalizedPlan(calculated.plan),calculated));
  await listAfterSuccess();setMessage('Второй сценарий сохранён отдельной стратегией');return calculated;
 });}
 async function exportFile(kind:'plan'|'project'|'json'|'csv'){return execute('Готовим файл…',async()=>{
  const t=requireTab();
  if(kind==='plan'){await api.exportPlan(assertValid(t));return;}
  if(kind==='project'){
   const saved=await persist(t),calculated=savedStrategyIsCalculated(saved)?saved:await api.calculate(saved.project_id,saved.revision);
   patch(t.id,now=>{const updated={...now,project:calculated},run=calculated.last_run;return run?acceptStrategyRun(updated,{basis:normalizedPlan(run.plan_snapshot),result:run.result,createdAt:run.created_at,engine:run.engine}):updated;});
   await listAfterSuccess();await api.exportProject(calculated.project_id);return;
  }
  if(!t.project||t.project.result_state!=='current'||strategyDirty(t))throw new Error('Сначала сохраните и пересчитайте текущий план.');
  await api.exportResult(t.project.project_id,kind);
 });}
 const primary=draft&&tab?.results[draft.scenario_id],other=draft&&tab?.results[otherScenario(draft).scenario_id];
 const displayResult=primary?.result??null;
 const displayOther=both?other?.result??null:null;
 const preview=primary?{basis:primary.basis,primary:primary.result,createdAt:primary.createdAt,other:both?other?.result:undefined,otherPlan:both?other?.basis:undefined}:null;
 const previewFresh=!!tab&&strategyRunFresh(tab,tab.plan.scenario_id)&&(!both||strategyRunFresh(tab,otherScenario(tab.plan).scenario_id));
 // The legacy single-plan export uses project.last_run as its primary record.
 // Do not pair that saved record with an unsaved preview of another revision.
 const savedPrimary=current&&project?.last_run&&primary&&samePlan(project.last_run.plan_snapshot,draft)&&samePlan(project.last_run.result,primary.result);
 const pair:ScenarioPair|null=savedPrimary&&previewFresh&&both&&other&&draft?{basis:draft,otherPlan:other.basis,other:other.result,createdAt:other.createdAt}:null;
 const currentFailure=tab&&[tab.plan.scenario_id,...(both?[otherScenario(tab.plan).scenario_id]:[])].map(s=>tab.errors[s]).find(e=>e&&samePlan(e.basis,scenarioPlan(tab,e.basis.scenario_id)));
 const invalid=draft?validateDraft('preview',draft):[];
 const reportedError=error||currentFailure?.message||(invalid.length?invalid.join('\n'):null);
 function setUi<T>(key:string,value:T|((old:T)=>T),fallback:T){patch(activeId,t=>({...t,ui:updateEditorUi(t.ui,key,typeof value==='function'?(value as (old:T)=>T)((t.ui[key] as T)??fallback):value)}));}
 return {
  tabs,activeId,selectedIds,comparison,setComparison:(change:Partial<ComparisonSettings>)=>setComparisonState(old=>({...old,...change})),
  activateTab,editComparedTab,closeTab,toggleComparison,retryTab,imports,clearImports:()=>setImports([]),
  ui:tab?.ui??{},setUi,
  risk:tab?.risk??null,riskBusy,riskStage,riskError,analyzeRisk,displayResult,displayOther,preview,previewFresh,displayRun:savedPrimary?project?.last_run:null,
  selection:tab?.selection??null,setSelection:(selection:StrategyTab['selection'])=>patch(activeId,t=>({...t,selection})),
  both,setBoth:(value:boolean)=>patch(activeId,t=>({...t,both:value})),pair,saveOther,view,setView,project,draft,name,projects,catalog,meta,loading,busy,error,message,dirty,inputChanged,current,
  setDraft:(plan:Plan)=>patch(activeId,t=>({...t,plan,edited:true})),setName:(value:string)=>patch(activeId,t=>({...t,name:value,edited:true})),
  setError,clearError:()=>{setError(null);},setMessage,execute,save,calculate,load,reload,newPlan,copy,remove,importFiles,downloadTemplate,exportFile,refreshList,
  errorMessage:reportedError?errorText(reportedError):'',requestId:reportedError instanceof ApiError?reportedError.requestId:'',
 };
}
export type Workspace=ReturnType<typeof useWorkspace>;
