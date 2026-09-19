import { useState } from 'react';
import type { Workspace } from '../state/useWorkspace';
import type { Investment, Order, Reservation } from '../api/types';
import { addDecision, planYears, removeDecision, sourceChoices, updateDecision } from '../lib/plan';
import { Button, NumericInput, Notice } from '../components/Ui';
import { Icon } from '../components/Icon';
import { number } from '../lib/format';
export function PlanEditor({w}:{w:Workspace}){
 const [mode,setMode]=useState<'supply_orders'|'capacity_reservations'>('supply_orders');
 if(!w.draft)return null;
 const plan=w.draft;const years=planYears(plan,w.catalog);const sources=sourceChoices(plan,w.catalog);
 const investments=w.catalog?.tables.find(t=>t.table_id==='investment_options')?.rows||[];
 const rows=plan.decisions[mode];
 function add(){w.setDraft(addDecision(plan,mode,mode==='supply_orders'?{year:years[0]||2035,source_id:sources[0]||'',order_t:0}:{year:years[0]||2035,source_id:sources[0]||'',reserved_capacity_t:0}));}
 return <section className="page-enter" aria-labelledby="plan-title">
  <div className="page-intro"><div><h1 id="plan-title">План снабжения</h1><p>Задайте решения. Последствия рассчитает модель.</p></div><span className="quiet-tag">{years.length?`${years[0]}–${years.at(-1)}`:'Горизонт из данных'}</span></div>
  <fieldset className="editor-fieldset" disabled={!!w.busy}>
   <div className="plan-settings">
    <label className="field plan-name">Название плана<input name="plan-name" autoComplete="off" value={w.name} maxLength={140} required onChange={e=>w.setName(e.target.value)} placeholder="Например, основной план…"/></label>
    <label className="field">Сценарий<select aria-label="Сценарий" value={plan.scenario_id} onChange={e=>w.setDraft({...plan,scenario_id:e.target.value})}>
      <option value="BASE">Базовый</option><option value="MANDATORY_STRESS">Обязательный стресс</option>
      {!['BASE','MANDATORY_STRESS'].includes(plan.scenario_id)&&<option value={plan.scenario_id}>{plan.scenario_id}</option>}
    </select></label>
    <div className="field">Начальный запас, т<NumericInput value={plan.decisions.inventory_policy.initial_inventory_t} label="Начальный запас, т" onChange={v=>w.setDraft({...plan,decisions:{...plan.decisions,inventory_policy:{...plan.decisions.inventory_policy,initial_inventory_t:v}}})}/></div>
   </div>
   <div className="section-heading"><div className="segmented" aria-label="Тип решений">
     <button type="button" aria-pressed={mode==='supply_orders'} onClick={()=>setMode('supply_orders')}>Поставки</button>
     <button type="button" aria-pressed={mode==='capacity_reservations'} onClick={()=>setMode('capacity_reservations')}>Резерв мощности</button>
   </div><Button kind="ghost" onClick={add}><Icon name="plus"/>Добавить строку</Button></div>
   <div className="table-wrap editor-table"><table><caption className="sr-only">{mode==='supply_orders'?'План поставок':'План резервирования'}</caption><thead><tr><th scope="col">Год</th><th scope="col">Источник</th><th scope="col">{mode==='supply_orders'?'Объём заказа, т':'Мощность, т/год'}</th><th scope="col"><span className="sr-only">Удаление</span></th></tr></thead><tbody>
    {rows.map((row,i)=><tr key={`${mode}-${i}`}><td><NumericInput integer value={row.year} label={`Год, строка ${i+1}`} onChange={v=>w.setDraft(updateDecision(plan,mode,i,{year:v}))}/></td><td><select aria-label={`Источник, строка ${i+1}`} value={row.source_id} onChange={e=>w.setDraft(updateDecision(plan,mode,i,{source_id:e.target.value}))}>{sources.map(s=><option key={s} value={s}>{s}</option>)}</select></td><td><NumericInput label={`Объём, строка ${i+1}`} value={mode==='supply_orders'?(row as Order).order_t:(row as Reservation).reserved_capacity_t} onChange={v=>w.setDraft(updateDecision(plan,mode,i,mode==='supply_orders'?{order_t:v}:{reserved_capacity_t:v}))}/></td><td><button className="icon-button row-delete" type="button" aria-label={`Удалить строку ${i+1}`} onClick={()=>w.setDraft(removeDecision(plan,mode,i))}><Icon name="close" size={16}/></button></td></tr>)}
    {!rows.length&&<tr><td colSpan={4} className="empty-cell">{mode==='supply_orders'?'Поставок пока нет. Добавьте источник и объём заказа.':'Резерв мощности ещё не задан. Это контракт, а не топливо на складе.'}</td></tr>}
   </tbody></table></div>
   <p className="help">{mode==='supply_orders'?'Объём заказа не равен фактической поставке. Сроки и ограничения проверяются расчётным модулем.':'Резервирование оплачивает доступ к мощности. Физический запас задаётся и рассчитывается отдельно.'}</p>
   <details className="disclosure" open={undefined}><summary>Инвестиции <span className="muted">{plan.decisions.investments.length}</span><Icon name="chevron" size={16}/></summary><div className="disclosure-body">
    <div className="section-heading"><p className="help">Год передаётся в модель без переинтерпретации даты решения или ввода.</p><Button kind="ghost" onClick={()=>w.setDraft(addDecision(plan,'investments',{investment_id:investments[0]?.investment_id||'ZBO',year:years[0]||2035}))}><Icon name="plus"/>Добавить инвестицию</Button></div>
    <div className="table-wrap"><table><thead><tr><th>Инвестиция</th><th>Год</th><th>CAPEX по справочнику, млн у.е.</th><th><span className="sr-only">Удаление</span></th></tr></thead><tbody>{plan.decisions.investments.map((row,i)=>{
     const options=[...new Set([...investments.map(r=>r.investment_id),row.investment_id])];const reference=investments.find(r=>r.investment_id===row.investment_id);
     return <tr key={i}><td><select aria-label={`Инвестиция ${i+1}`} value={row.investment_id} onChange={e=>w.setDraft(updateDecision(plan,'investments',i,{investment_id:e.target.value} as Partial<Investment>))}>{options.map(id=><option value={id} key={id}>{investments.find(r=>r.investment_id===id)?.name||id}</option>)}</select></td><td><NumericInput integer value={row.year} label={`Год инвестиции ${i+1}`} onChange={v=>w.setDraft(updateDecision(plan,'investments',i,{year:v}))}/></td><td className="numeric">{reference?number(Number(reference.total_capex_mln)):'—'}</td><td><button type="button" className="icon-button" aria-label={`Удалить инвестицию ${i+1}`} onClick={()=>w.setDraft(removeDecision(plan,'investments',i))}><Icon name="close" size={16}/></button></td></tr>;
    })}{!plan.decisions.investments.length&&<tr><td colSpan={4} className="empty-cell">Инвестиции не выбраны.</td></tr>}</tbody></table></div>
   </div></details>
   <details className="disclosure"><summary>Параметры и допущения<Icon name="chevron" size={16}/></summary><div className="disclosure-body">
    <label className="field narrow">Идентификатор плана<input autoComplete="off" name="plan-id" spellCheck={false} value={plan.plan_id} required onChange={e=>w.setDraft({...plan,plan_id:e.target.value})}/></label>
    <Notice>Начальный запас из шаблона — входное значение, не бесплатное топливо. Его происхождение и оплату должна учитывать модель. Расширенные поля импортированного JSON сохраняются без изменений.</Notice>
    <details className="sub-details"><summary>Посмотреть передаваемый JSON</summary><pre>{JSON.stringify(plan,null,2)}</pre></details>
   </div></details>
  </fieldset>
 </section>;
}
