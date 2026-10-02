import type { schemas } from '../api/schema';
import type { Plan } from '../api/types';
import { supplyDateIssue } from './matrix.js';

/** Presentation metadata only. Capacity and financial rules remain in the engine. */
export type PlanIssue = schemas['ValidationIssueDTO'];
export function readIssues(value: unknown): PlanIssue[] {
 if (!Array.isArray(value)) return [];
 return value.filter((item): item is PlanIssue => !!item && typeof item==='object'
  && typeof item.code==='string' && typeof item.message==='string'
  && Array.isArray(item.loc) && item.loc.every((part:unknown)=>typeof part==='string'||typeof part==='number'));
}
export function draftIssues(plan: Plan): PlanIssue[] {
 const issues: PlanIssue[]=[];
 const add=(loc:PlanIssue['loc'],message:string)=>issues.push({code:'invalid_input',loc:['decisions',...loc],message});
 const good=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
 if(!good(plan.decisions.inventory_policy.initial_inventory_t)) add(['inventory_policy','initial_inventory_t'],'Начальный запас: введите число не меньше нуля.');
 for(const kind of ['supply_orders','capacity_reservations'] as const) {
  plan.decisions[kind].forEach((row,index)=>{
   const field=kind==='supply_orders'?'order_t':'reserved_capacity_t';
   if(!good(row[field])) add([kind,index,field],`${kind==='supply_orders'?'Топливо':'Резерв'}: введите число не меньше нуля.`);
   if(!Number.isInteger(row.year)||row.year<1) add([kind,index,'year'],'Укажите целый год.');
   if(!row.source_id?.trim()) add([kind,index,'source_id'],'Укажите источник поставки.');
  });
 }
 const positive=plan.decisions.supply_orders.filter(row=>Number(row.order_t)>0);
 plan.decisions.supply_orders.forEach((row,index)=>{
  if(!(Number(row.order_t)>0)) return;
  const dateIssue=supplyDateIssue(row.delivery_date,row.year);
  if(dateIssue) add(['supply_orders',index,'delivery_date'],dateIssue);
  const id=String(row.batch_id??'').trim();
  if(!id) add(['supply_orders',index,'batch_id'],'Назначьте ID партии.');
  else if(positive.filter(other=>String(other.batch_id??'').trim()===id).length>1)
   add(['supply_orders',index,'batch_id'],`ID «${id}» повторяется. Укажите уникальный ID партии.`);
 });
 return issues;
}
export function issueTarget(issue:PlanIssue,plan:Plan) {
 const loc=issue.loc.filter(part=>part!=='body');
 const offset=loc.indexOf('decisions');
 const kind=String(loc[offset+1]??'');
 const index=typeof loc[offset+2]==='number'?loc[offset+2] as number:undefined;
 const field=typeof loc[offset+3]==='string'?loc[offset+3] as string:undefined;
 const rows=kind==='supply_orders'?plan.decisions.supply_orders:kind==='capacity_reservations'?plan.decisions.capacity_reservations:[];
 const row=index===undefined?undefined:rows[index];
 const investment=kind==='investments'&&index!==undefined?plan.decisions.investments[index]:undefined;
 const investmentSources:Record<string,string>={LUNAR_ISRU:'Lunar-ISRU',EARTH_NEW:'Earth-New'};
 const investmentSource=investment?investmentSources[investment.investment_id]:undefined;
 const date=kind==='supply_orders'&&row&&typeof row.delivery_date==='string'?row.delivery_date:'';
 const month=date&&!supplyDateIssue(date,row!.year)?Number(date.slice(5,7)):undefined;
 return {source:issue.source_id??row?.source_id??investmentSource,year:issue.year??row?.year??investment?.year,kind,index,field,month};
}
