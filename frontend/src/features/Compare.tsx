import { useEffect, useState } from 'react';
import type { Workspace } from '../state/useWorkspace';
import type { Comparison } from '../api/types';
import { api } from '../api/client';
import { Button, Notice } from '../components/Ui';
import { Icon } from '../components/Icon';
import { Chart } from '../components/Chart';
import { date, downloadBlob, jsonDownload, number, percent, scenario, supportedUnits } from '../lib/format';
import { comparabilityWarnings, comparisonCsv } from '../lib/comparison';
const colors=['#a9c9ff','#83c9b2','#d9b990','#baabe0','#d49fa9','#9fbabd'];
export function Compare({w}:{w:Workspace}){
 const [selected,setSelected]=useState<string[]>([]);const [comparison,setComparison]=useState<Comparison|null>(null);
 useEffect(()=>{setComparison(null);},[w.projects]);
 const ready=w.projects.filter(p=>p.result_state==='current');
 const years=[...new Set(comparison?.items.flatMap(i=>(i.run.result.yearly_balance||[]).map(b=>b.year))||[])].sort((a,b)=>a-b);
 const warnings=comparison?comparabilityWarnings(comparison):[];
 const sameUnits=!warnings.some(s=>s.startsWith('Единицы'));
 const supported=comparison?.items.every(i=>supportedUnits(i.run.result.units))??false;
 function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<6?[...s,id]:s);setComparison(null);}
 return <section className="page-enter"><div className="page-intro"><div><h1>Сравнение планов</h1><p>Сопоставьте сохранённые расчёты. Решение остаётся за вами.</p></div></div>
  <div className="comparison-picker"><div className="section-heading"><h2>Выберите от 2 до 6 планов</h2><Button kind="ghost" disabled={!!w.busy} onClick={()=>void w.execute('Обновляем…',w.refreshList)}><Icon name="refresh"/>Обновить</Button></div>
   {!w.projects.length?<p className="empty-cell">Сначала сохраните и рассчитайте хотя бы два плана.</p>:<div className="project-list">{w.projects.map(p=><label className={`project-option ${p.result_state!=='current'?'unavailable':''}`} key={p.project_id}><input type="checkbox" checked={selected.includes(p.project_id)} disabled={!!w.busy||p.result_state!=='current'||(selected.length>=6&&!selected.includes(p.project_id))} onChange={()=>toggle(p.project_id)}/><span><strong>{p.name}</strong><small>{scenario(p.scenario_id)} сценарий</small></span><small>{p.result_state==='current'?date(p.updated_at):p.result_state==='stale'?'Нужен пересчёт':'Не рассчитан'}</small></label>)}</div>}
   {ready.length<2&&<p className="help">Создайте копию плана через меню сверху, выберите другой сценарий и рассчитайте её.</p>}
   <div className="section-footer"><span className="help">{selected.length?`Выбрано: ${selected.length}`:'Исходные планы не изменяются.'}</span><Button kind="primary" disabled={selected.length<2||!!w.busy} onClick={()=>void w.execute('Сравниваем…',async()=>{setComparison(await api.compare(selected));})}>Сравнить<Icon name="arrow"/></Button></div>
  </div>
  {comparison&&<div className="comparison-result page-enter"><div className="section-heading"><h2>Результаты сравнения</h2><div className="inline-actions"><Button kind="ghost" onClick={()=>jsonDownload(comparison,'comparison.json')}><Icon name="download"/>JSON</Button><Button kind="ghost" onClick={()=>downloadBlob(new Blob([comparisonCsv(comparison)],{type:'text/csv;charset=utf-8'}),'comparison.csv')}>CSV</Button></div></div>
   {warnings.map(s=><Notice key={s} tone="warning">{s}</Notice>)}
   {sameUnits&&supported&&<Chart years={years} unit="млн у.е." series={comparison.items.map((item,i)=>({key:item.project_id,label:item.name,values:years.map(y=>item.run.result.financial_breakdown?.find(f=>f.year===y)?.total),color:colors[i]}))}/>}
   {!supported&&<Notice tone="warning">Единицы модели отличаются от т / млн у.е. Числовая таблица скрыта. В JSON и CSV сохранены исходные значения с единицами.</Notice>}
   {supported&&<div className="table-wrap"><table className="comparison-table"><thead><tr><th>Показатель</th>{comparison.items.map(i=><th key={i.project_id}>{i.name}<small>{scenario(i.run.result.scenario_id)}</small></th>)}</tr></thead><tbody>
    <tr><th>Расходы за весь горизонт, млн у.е.</th>{comparison.items.map(i=><td key={i.project_id} className="numeric">{number(i.run.result.total_cost_mln)}</td>)}</tr>
    {years.map(y=><tr key={`total-${y}`}><th>Общий спрос · {y}</th>{comparison.items.map(i=><td key={i.project_id} className="numeric">{percent(i.run.result.yearly_balance?.find(b=>b.year===y)?.service_level_total)}</td>)}</tr>)}
    {years.map(y=><tr key={`critical-${y}`}><th>Критический спрос · {y}</th>{comparison.items.map(i=><td key={i.project_id} className="numeric">{percent(i.run.result.yearly_balance?.find(b=>b.year===y)?.service_level_critical)}</td>)}</tr>)}
    {years.map(y=><tr key={`short-${y}`}><th>Дефицит, т · {y}</th>{comparison.items.map(i=><td key={i.project_id} className="numeric">{number(i.run.result.yearly_balance?.find(b=>b.year===y)?.shortage_t)}</td>)}</tr>)}
    <tr><th>Нарушений в ответе модели</th>{comparison.items.map(i=><td key={i.project_id} className="numeric">{i.run.result.constraint_checks?.filter(c=>!c.passed).length??'—'}</td>)}</tr>
   </tbody></table></div>}
   <p className="help">Показаны сохранённые снимки, без ранжирования и выбора «лучшего» плана. После изменения исходных планов обновите сравнение.</p>
   <details className="disclosure"><summary>Решения и происхождение<Icon name="chevron" size={16}/></summary><div className="disclosure-body">{comparison.items.map(i=><details className="sub-details" key={i.project_id}><summary>{i.name} — входной план</summary><p className="help">Ревизия {i.run.input_revision} · {date(i.run.created_at)} · {i.run.engine.engine_id}</p><pre>{JSON.stringify(i.run.plan_snapshot,null,2)}</pre></details>)}{comparison.warnings.map(s=><p className="help" key={s}>{s}</p>)}</div></details>
  </div>}
 </section>;
}
