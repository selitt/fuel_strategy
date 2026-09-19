import type { BuiltinStrategy, Meta, Plan, Project, Result } from '../api/types';
import { samePlan } from './plan.js';
import { csvCell } from './format.js';
import type { PlanIssue } from './validation';
import type { RiskRun } from './risk.js';

export type StrategyRun = { basis: Plan; result: Result; createdAt: string; engine?:Meta['engine'] };
export type StrategyTab = {
 id: string; name: string; plan: Plan; project: Project | null; edited: boolean; both: boolean;
 builtin: {id:string;description:string;preferredScenario:string} | null;
 viewScenario: string | null;
 results: Record<string, StrategyRun | undefined>;
 errors: Record<string, {basis: Plan; message: string; issues?: PlanIssue[]} | undefined>;
 ui: Record<string, unknown>;
 selection: {source: string; year: number} | null;
 risk: {basis: Plan; both: boolean; runs: RiskRun[]; createdAt: string} | null;
};
export const comparisonScenarios = ['BASE','MANDATORY_STRESS'] as const;
export function savedStrategyIsCalculated(project:Project):boolean {
 const run=project.last_run;
 return project.result_state==='current'&&run?.origin==='server'&&samePlan(run.plan_snapshot,project.plan)
  &&run.result.plan_id===project.plan.plan_id&&run.result.scenario_id===project.plan.scenario_id;
}
export function makeStrategy(id: string, name: string, plan: Plan, project: Project | null = null): StrategyTab {
 const tab:StrategyTab={id,name,plan:structuredClone(plan),project,edited:!project,both:false,builtin:null,viewScenario:null,results:{},errors:{},ui:{},selection:null,risk:null};
 const run=project?.last_run;
 return project&&run&&savedStrategyIsCalculated(project)
  ?acceptStrategyRun(tab,{basis:run.plan_snapshot as Plan,result:run.result,createdAt:run.created_at,engine:run.engine}):tab;
}
export function makeBuiltinStrategy(id:string,source:BuiltinStrategy):StrategyTab {
 const plan=source.plan as Plan,tab=makeStrategy(id,source.name,plan);
 return {...tab,edited:false,builtin:{id:source.id,description:source.description,preferredScenario:plan.scenario_id}};
}
export function acceptStrategyRun(tab:StrategyTab,run:StrategyRun):StrategyTab {
 const scenario=run.basis.scenario_id;
 if(run.result.scenario_id!==scenario||run.result.plan_id!==run.basis.plan_id||!samePlan(run.basis,scenarioPlan(tab,scenario)))return tab;
 return {...tab,results:{...tab.results,[scenario]:run},errors:{...tab.errors,[scenario]:undefined}};
}
export function acceptSavedStrategy(now:StrategyTab,submitted:StrategyTab,project:Project):StrategyTab {
 const unchanged=samePlan(now.plan,submitted.plan);
 return {...now,project,plan:unchanged?structuredClone(project.plan) as Plan:now.plan,name:now.name===submitted.name?project.name:now.name,edited:!unchanged};
}
export function updateStrategy(tabs: StrategyTab[], id: string, change: (tab: StrategyTab) => StrategyTab): StrategyTab[] {
 return tabs.map(tab => tab.id === id ? change(tab) : tab);
}
export function updateStrategyPlan(tab:StrategyTab,plan:Plan):StrategyTab {
 return tab.builtin?tab:{...tab,plan,edited:true};
}
export function renameStrategy(tab:StrategyTab,name:string):StrategyTab {
 return tab.builtin?tab:{...tab,name,edited:true};
}
export function removeStrategyTab(tabs:StrategyTab[],id:string):StrategyTab[] {
 return tabs.some(tab=>tab.id===id&&tab.builtin)?tabs:tabs.filter(tab=>tab.id!==id);
}
export function toggleStrategySelection(ids:string[],id:string):string[] {
 return ids.includes(id)?ids.filter(item=>item!==id):[...ids,id];
}
export function nextStrategyCopyName(tabs:StrategyTab[],sourceName:string):string {
 const base=`${sourceName} — моя копия`,names=new Set(tabs.map(tab=>tab.name));
 if(!names.has(base))return base;
 let suffix=2;while(names.has(`${base} (${suffix})`))suffix++;
 return `${base} (${suffix})`;
}
export function strategyDirty(tab: StrategyTab): boolean {
 return tab.builtin?false:tab.project ? tab.name !== tab.project.name || !samePlan(tab.plan,tab.project.plan) : tab.edited;
}
export function scenarioPlan(tab: StrategyTab, scenario: string): Plan { return {...tab.plan,scenario_id:scenario}; }
export function strategyRunFresh(tab: StrategyTab, scenario: string): boolean {
 const run=tab.results[scenario];
 return !!run && samePlan(run.basis,scenarioPlan(tab,scenario));
}
export function strategyColor(id: string): string {
 const builtinColors:Record<string,string>={
  'builtin-strategy_earth_fortress':'#83c9b2',
  'builtin-strategy_lunar_pioneer':'#d9b990',
  'builtin-strategy_balanced_dual':'#a9c9ff',
  'builtin-strategy_optimal_resilient_mc90':'#baabe0',
  'builtin-strategy_mandatory_stress_resilient':'#d49fa9',
 };
 if(builtinColors[id])return builtinColors[id];
 const colors=['#83c9b2','#a9c9ff','#d9b990','#baabe0','#d49fa9','#91c9d6'];
 const index=Number(id.replace(/^strategy-/,''));
 return colors[Number.isInteger(index)?index%colors.length:Math.abs([...id].reduce((h,c)=>((h*31)+c.charCodeAt(0))|0,0))%colors.length];
}
export async function importStrategyFiles<F extends {name:string},T>(files: F[], load: (file:F)=>Promise<T>): Promise<{filename:string;value?:T;error?:string}[]> {
 const output: {filename:string;value?:T;error?:string}[]=[];
 for(const file of files){
  try {output.push({filename:file.name,value:await load(file)});}
  catch(error){output.push({filename:file.name,error:error instanceof Error?error.message:'Не удалось загрузить файл'});}
 }
 return output;
}
export function strategyComparisonExport(tabs: StrategyTab[], engine: Meta['engine'] | undefined) {
 return {format:'fuel-strategy-comparison-v1',created_at:new Date().toISOString(),engine,items:tabs.map(tab=>({
  id:tab.id,name:tab.name,project_id:tab.project?.project_id??null,revision:tab.project?.revision??null,
  unsaved:strategyDirty(tab),plan:tab.plan,
  scenarios:Object.fromEntries(comparisonScenarios.map(scenario=>[scenario,{
   current:strategyRunFresh(tab,scenario),run:tab.results[scenario]??null,
   error:tab.errors[scenario]&&samePlan(tab.errors[scenario]!.basis,scenarioPlan(tab,scenario))?tab.errors[scenario]!.message:null,
  }])) as Record<typeof comparisonScenarios[number],{current:boolean;run:StrategyRun|null;error:string|null}>,
 }))};
}
export function strategyComparisonCsv(tabs: StrategyTab[], engine: Meta['engine'] | undefined): string {
 const rows: unknown[][]=[['strategy_id','name','project_id','revision','unsaved','scenario_id','current','created_at','engine','units','assumptions_reference','input_snapshot','current_plan','error','year','total_cost_mln','annual_cost_mln','shortage_t','service_level_total','service_level_critical','closing_inventory_t']];
 for(const item of strategyComparisonExport(tabs,engine).items)for(const scenario of comparisonScenarios){
  const entry=item.scenarios[scenario],r=entry.run?.result;
  for(const b of r?.yearly_balance?.length?r.yearly_balance:[undefined]){
   rows.push([item.id,item.name,item.project_id,item.revision,item.unsaved,scenario,entry.current,entry.run?.createdAt,entry.run?.engine,r?.units,r?.assumptions_reference,entry.run?.basis,item.plan,entry.error,b?.year,r?.total_cost_mln,r?.financial_breakdown?.find(f=>f.year===b?.year)?.total,b?.shortage_t,b?.service_level_total,b?.service_level_critical,b?.closing_inventory_t]);
  }
 }
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
