import type { Comparison } from '../api/types';
import { csvCell } from './format.js';
/** Flatten the API snapshot for export. No alternative calculation or scoring. */
export function comparisonCsv(comparison:Comparison):string {
 const columns=['project_id','name','plan_id','scenario_id','input_revision','input_hash','engine_id','engine_version','origin','units','assumptions_reference','year','demand_total_t','demand_critical_t','delivered_t','served_t','shortage_t','opening_inventory_t','closing_inventory_t','service_level_total','service_level_critical','annual_cost_mln','total_cost_mln'];
 const rows:unknown[][]=[columns];
 for(const item of comparison.items){const run=item.run,r=run.result;
  for(const b of r.yearly_balance||[]){const f=r.financial_breakdown?.find(f=>f.year===b.year);
   rows.push([item.project_id,item.name,r.plan_id,r.scenario_id,run.input_revision,run.input_hash,run.engine.engine_id,run.engine.version,run.origin,r.units,r.assumptions_reference,b.year,b.demand_total_t,b.demand_critical_t,b.delivered_t,b.served_t,b.shortage_t,b.opening_inventory_t,b.closing_inventory_t,b.service_level_total,b.service_level_critical,f?.total,r.total_cost_mln]);
  }
 }
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function comparabilityWarnings(comparison:Comparison):string[]{
 const issues:string[]=[];
 const differs=(fn:(item:Comparison['items'][number])=>unknown)=>new Set(comparison.items.map(i=>JSON.stringify(fn(i)))).size>1;
 if(differs(i=>(i.run.result.yearly_balance||[]).map(b=>b.year)))issues.push('Горизонты различаются. Отсутствующие годы не заменены нулями.');
 if(differs(i=>i.run.result.units))issues.push('Единицы измерения различаются. Прямое числовое сравнение требует согласования.');
 if(differs(i=>[i.run.engine.engine_id,i.run.engine.version]))issues.push('Результаты получены разными версиями модели.');
 if(differs(i=>i.run.result.assumptions_reference))issues.push('Ссылки на допущения различаются. Проверьте сопоставимость планов.');
 if(comparison.items.some(i=>i.run.origin==='imported'))issues.push('Есть импортированные результаты без повторного расчёта на сервере.');
 return issues;
}
