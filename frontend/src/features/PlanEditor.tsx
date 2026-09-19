import type { Workspace } from '../state/useWorkspace';
import type { Investment, Order, Reservation } from '../api/types';
import type { MatrixKey } from '../lib/matrix';
import { matrixSources, readCell } from '../lib/matrix';
import { addDecision, planYears, removeDecision, sourceChoices, updateDecision } from '../lib/plan';
import { Button, NumericInput, Notice } from '../components/Ui';
import { Icon } from '../components/Icon';
import { number } from '../lib/format';

const compactInvestmentIds = new Set(['ZBO', 'LUNAR_ISRU', 'EARTH_NEW']);

export function PlanEditor({w}:{w:Workspace}){
 if(!w.draft)return null;
 const plan=w.draft;const years=planYears(plan,w.catalog);const sources=sourceChoices(plan,w.catalog);
 const matrix=matrixSources(plan,w.catalog);
 const investments=w.catalog?.tables.find(t=>t.table_id==='investment_options')?.rows||[];
 function duplicateIndices(key:MatrixKey){
  const found=new Set<number>();
  const rowYears=[...new Set(plan.decisions[key].map(row=>row.year))];
  matrix.forEach(source=>rowYears.forEach(year=>{const cell=readCell(plan,key,source,year);if(cell.indices.length>1)cell.indices.forEach(index=>found.add(index));}));
  return [...found].sort((a,b)=>a-b);
 }
 const orderIndices=duplicateIndices('supply_orders'), reservationIndices=duplicateIndices('capacity_reservations');
 const investmentCounts=new Map<string,number>();
 plan.decisions.investments.forEach(row=>investmentCounts.set(row.investment_id,(investmentCounts.get(row.investment_id)||0)+1));
 const investmentIndices=plan.decisions.investments.map((row,index)=>({row,index})).filter(({row})=>!compactInvestmentIds.has(row.investment_id)||(investmentCounts.get(row.investment_id)||0)>1);
 const unrepresentedInvestments=investments.filter(row=>!compactInvestmentIds.has(row.investment_id));
 function decisionTable(key:MatrixKey,indices:number[]){
  const orders=key==='supply_orders';
  return <div className="table-wrap editor-table"><table><caption className="sr-only">{orders?'Совпадающие записи заказов':'Совпадающие записи резервирования'}</caption><thead><tr><th scope="col">Год</th><th scope="col">Источник</th><th scope="col">{orders?'Заказ, т':'Резерв, т/год'}</th><th scope="col"><span className="sr-only">Удаление</span></th></tr></thead><tbody>
   {indices.map(index=>{const row=plan.decisions[key][index];return <tr key={`${key}-${index}`}><td><NumericInput integer value={row.year} label={`Год, исходная строка ${index+1}`} onChange={v=>w.setDraft(updateDecision(plan,key,index,{year:v}))}/></td><td><select aria-label={`Источник, исходная строка ${index+1}`} value={row.source_id} onChange={e=>w.setDraft(updateDecision(plan,key,index,{source_id:e.target.value}))}>{sources.map(source=><option key={source} value={source}>{source}</option>)}</select></td><td><NumericInput label={`Объём, исходная строка ${index+1}`} value={orders?(row as Order).order_t:(row as Reservation).reserved_capacity_t} onChange={v=>w.setDraft(updateDecision(plan,key,index,orders?{order_t:v}:{reserved_capacity_t:v}))}/></td><td><button className="icon-button row-delete" type="button" aria-label={`Удалить исходную строку ${index+1}`} onClick={()=>w.setDraft(removeDecision(plan,key,index))}><Icon name="close" size={16}/></button></td></tr>;})}
   {!indices.length&&<tr><td colSpan={4} className="empty-cell">Совпадающих записей нет. Обычные значения редактируются в таблице поставок.</td></tr>}
  </tbody></table></div>;
 }
 return <section className="page-enter" aria-labelledby="plan-title">
  <div className="page-intro"><div><h1 id="plan-title">Другие записи и метаданные</h1><p>Здесь показаны только совпадающие записи, которые нужно редактировать отдельно.</p></div><span className="quiet-tag">{years.length?`${years[0]}–${years.at(-1)}`:'Горизонт из данных'}</span></div>
  <fieldset className="editor-fieldset" disabled={!!w.busy}>
   <div className="section-heading"><h2>Заказы</h2><span className="muted">{orderIndices.length}</span></div>{decisionTable('supply_orders',orderIndices)}
   <div className="section-heading"><h2>Резерв мощности</h2><span className="muted">{reservationIndices.length}</span></div>{decisionTable('capacity_reservations',reservationIndices)}
   <details className="disclosure" open={investmentIndices.length>0||undefined}><summary>Другие инвестиции <span className="muted">{investmentIndices.length}</span><Icon name="chevron" size={16}/></summary><div className="disclosure-body">
    <div className="section-heading"><p className="help">Дубли и неизвестные инвестиции сохраняются отдельными записями.</p>{unrepresentedInvestments.length>0&&<Button kind="ghost" onClick={()=>w.setDraft(addDecision(plan,'investments',{investment_id:unrepresentedInvestments[0].investment_id,year:years[0]||2035}))}><Icon name="plus"/>Добавить прочую инвестицию</Button>}</div>
    <div className="table-wrap"><table><thead><tr><th>Инвестиция</th><th>Год решения</th><th>CAPEX по справочнику, млн у.е.</th><th><span className="sr-only">Удаление</span></th></tr></thead><tbody>{investmentIndices.map(({row,index})=>{
     const options=[...new Set([...investments.map(item=>item.investment_id),row.investment_id])];const reference=investments.find(item=>item.investment_id===row.investment_id);
     return <tr key={index}><td><select aria-label={`Инвестиция, исходная строка ${index+1}`} value={row.investment_id} onChange={e=>w.setDraft(updateDecision(plan,'investments',index,{investment_id:e.target.value} as Partial<Investment>))}>{options.map(id=><option value={id} key={id}>{investments.find(item=>item.investment_id===id)?.name||id}</option>)}</select></td><td><NumericInput integer value={row.year} label={`Год решения, исходная строка ${index+1}`} onChange={v=>w.setDraft(updateDecision(plan,'investments',index,{year:v}))}/></td><td className="numeric">{reference?number(Number(reference.total_capex_mln)):'—'}</td><td><button type="button" className="icon-button" aria-label={`Удалить инвестицию, исходная строка ${index+1}`} onClick={()=>w.setDraft(removeDecision(plan,'investments',index))}><Icon name="close" size={16}/></button></td></tr>;
    })}{!investmentIndices.length&&<tr><td colSpan={4} className="empty-cell">Все инвестиции доступны на компактном экране.</td></tr>}</tbody></table></div>
   </div></details>
   <details className="disclosure"><summary>Метаданные плана<Icon name="chevron" size={16}/></summary><div className="disclosure-body">
    <label className="field narrow">Идентификатор плана<input autoComplete="off" name="plan-id" spellCheck={false} value={plan.plan_id} required onChange={e=>w.setDraft({...plan,plan_id:e.target.value})}/></label>
    <Notice>Неизвестные поля импортированного JSON сохраняются без изменений.</Notice>
    <details className="sub-details"><summary>Посмотреть передаваемый JSON</summary><pre>{JSON.stringify(plan,null,2)}</pre></details>
   </div></details>
  </fieldset>
 </section>;
}
