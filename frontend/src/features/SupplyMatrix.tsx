import { Fragment, useState } from 'react';
import { Modal } from '../components/Ui';
import type { Workspace } from '../state/useWorkspace';
import type { MatrixSource } from '../lib/matrix';
import {
 addSupplyBatch, matrixSources, matrixYears, nextSupplyBatchId, readCell, readSupplyMonth,
 removeSupplyBatch, setInvestment, supplyDateIssue, unscheduledSupplyIndices,
 updateSupplyBatch, writeCell,
} from '../lib/matrix';
import { number } from '../lib/format';
import { Toggle } from '../components/Controls';

const MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'] as const;
const options: Record<string, {id:string;year:number}> = {
 'Lunar-ISRU':{id:'LUNAR_ISRU',year:2037}, 'Earth-New':{id:'EARTH_NEW',year:2036},
};
type Expanded = {source:string;month:number|null};

export function SupplyMatrix({w,onAdvanced,onSource}:{w:Workspace;onAdvanced:()=>void;onSource:(source:MatrixSource)=>void}) {
 const [help,setHelp]=useState<string|null>(null);
 const [chosenYear,setChosenYear]=useState<number|null>(null);
 const [expanded,setExpanded]=useState<Expanded|null>(null);
 if (!w.draft) return null;
 const plan=w.draft, sources=matrixSources(plan,w.catalog), years=matrixYears(plan,w.catalog);
 const selectedYear=chosenYear!==null&&years.includes(chosenYear)?chosenYear:years[0]||2035;
 const investmentCatalog=w.catalog?.tables.find(t=>t.table_id==='investment_options')?.rows||[];
 function unavailable(source:MatrixSource) {
  const option=options[source.key];
  if(option && !plan.decisions.investments.some(i=>i.investment_id===option.id)) return 'Сначала включите инвестицию у названия источника.';
  const available=Number(source.reference?.available_from_year);
  return available && selectedYear<available ? `Источник доступен с ${available} года.` : '';
 }
 function select(source:MatrixSource,month:number|null) {
  setExpanded(current=>current?.source===source.key&&current.month===month?null:{source:source.key,month});
  w.setSelection({source:source.key,year:selectedYear});
 }
 function addBatch(source:MatrixSource,month:number) {
  const deliveryDate=`${selectedYear}-${String(month).padStart(2,'0')}-01`;
  w.setDraft(addSupplyBatch(plan,source,deliveryDate,0,nextSupplyBatchId(plan,deliveryDate)));
 }
 function batchEditor(source:MatrixSource,month:number|null,indices:number[]) {
  const title=month===null?'Поставки без корректной даты':`${MONTHS[month-1]} ${selectedYear}`;
  return <tr className="batch-editor-row"><td colSpan={13}><div className="batch-editor" role="region" aria-label={`Партии ${source.label}: ${title}`}>
   <div className="batch-editor-heading"><div><strong>{source.label}</strong><span>{title}</span></div>{month!==null&&<button type="button" className="text-button" onClick={()=>addBatch(source,month)}>+ Добавить партию</button>}</div>
   {month===null&&<p className="batch-editor-note">Старые годовые записи сохранены без изменений. Назначьте каждой партии точную дату — до этого календарный расчёт заблокирован.</p>}
   <div className="batch-list">{indices.map(index=>{
    const row=plan.decisions.supply_orders[index];
    const date=typeof row.delivery_date==='string'?row.delivery_date:'';
    const issue=supplyDateIssue(date,selectedYear);
    const storedBatchId=typeof row.batch_id==='string'&&row.batch_id?row.batch_id:'';
    const batchId=storedBatchId||nextSupplyBatchId(plan,date||`${selectedYear}-01-01`);
    return <div className="batch-line" key={`${index}-${batchId}`}>
     <label><span>Дата получения</span><input type="date" min={`${selectedYear}-01-01`} max={`${selectedYear}-12-31`} value={date} aria-invalid={!!issue} aria-describedby={issue?`batch-${index}-issue`:undefined} onChange={e=>w.setDraft(updateSupplyBatch(plan,index,{delivery_date:e.target.value,batch_id:batchId}))}/></label>
     <label><span>Топливо, т</span><input type="number" inputMode="decimal" min={0} step="any" value={Number.isFinite(Number(row.order_t))?Number(row.order_t):''} aria-invalid={!Number.isFinite(Number(row.order_t))||Number(row.order_t)<0} onChange={e=>w.setDraft(updateSupplyBatch(plan,index,{order_t:e.target.value===''?NaN:Number(e.target.value),batch_id:batchId}))}/></label>
     {storedBatchId?<span className="batch-id" title={batchId}>{batchId}</span>:<button type="button" className="text-button warning-text" onClick={()=>w.setDraft(updateSupplyBatch(plan,index,{batch_id:batchId}))}>Назначить ID партии</button>}
     <button type="button" className="text-button danger-text" onClick={()=>w.setDraft(removeSupplyBatch(plan,index))}>Удалить</button>
     {(issue||!storedBatchId)&&<small className="batch-issue" id={`batch-${index}-issue`}>{issue||'Для расчёта назначьте стабильный ID партии.'}</small>}
    </div>;
   })}</div>
   {!indices.length&&<div className="empty-batches">Партий пока нет. Добавьте поставку и укажите точную дату получения.</div>}
  </div></td></tr>;
 }
 return <section className="panel supply-panel direct-matrix monthly-matrix" aria-labelledby="matrix-title">
  <div className="panel-heading monthly-heading"><div><h2 id="matrix-title">Поставки по месяцам</h2><span className="muted">Партии с точными датами · engine считает каждый день</span></div><div className="monthly-actions"><label>Год<select aria-label="Год плана поставок" value={selectedYear} onChange={e=>{setChosenYear(Number(e.target.value));setExpanded(null);}}>{years.map(year=><option key={year}>{year}</option>)}</select></label><button type="button" className="text-button" onClick={onAdvanced}>Другие записи →</button></div></div>
  <p className="matrix-instruction">Нажмите месяц → укажите дату и тонны. Резерв — один раз на год.</p>
  <fieldset disabled={!!w.busy} className="matrix-fieldset"><div className="matrix-viewport" tabIndex={0} aria-label={`Поставки за ${selectedYear} год`}>
   <table className="supply-matrix monthly-supply-table"><caption className="sr-only">Партии поставок по месяцам за {selectedYear} год</caption>
    <thead><tr><th scope="col">Источник и резерв</th>{MONTHS.map(month=><th scope="col" key={month}>{month}</th>)}</tr></thead>
    <tbody>{sources.map(source=>{
     const option=options[source.key], investments=option ? plan.decisions.investments.filter(i=>i.investment_id===option.id) : [];
     const investment=investments[0], reference=investmentCatalog.find(i=>i.investment_id===option?.id);
     const availableYear=Number(source.reference?.available_from_year);
     const defaultInvestmentYear=source.key==='Lunar-ISRU'&&Number.isInteger(availableYear)?availableYear-1:option?.year;
     const investmentYears=[...new Set([...years,...investments.map(i=>i.year),...(defaultInvestmentYear?[defaultInvestmentYear]:[])])].sort((a,b)=>a-b);
     const leadMin=Number(source.reference?.lead_time_min_value), leadMax=Number(source.reference?.lead_time_max_value);
     const readiness=source.key==='Lunar-ISRU'&&Number.isInteger(availableYear)?`Доступно с ${availableYear}; решение до ${availableYear}`:source.key==='Earth-New'&&Number.isFinite(leadMin)&&Number.isFinite(leadMax)?`Подготовка ${leadMin}–${leadMax} мес. после решения`:'';
     const reason=unavailable(source), reserve=readCell(plan,'capacity_reservations',source,selectedYear), undated=unscheduledSupplyIndices(plan,source,selectedYear);
     const opened=expanded?.source===source.key;
     return <Fragment key={source.key}><tr className={w.selection?.source===source.key?'selected-source':''}>
      <th scope="row" className="monthly-source"><button type="button" className="source-name" aria-label={`Параметры ${source.label}`} onClick={()=>onSource(source)}>{source.label} <span aria-hidden="true">ⓘ</span></button>
       <label className="annual-reserve"><span>Резерв, т/год</span>{reserve.indices.length>1?<button type="button" className="text-button" onClick={onAdvanced}>{reserve.indices.length} записи</button>:<input type="number" inputMode="decimal" min={0} step="any" placeholder="—" value={reserve.value===null||!Number.isFinite(reserve.value)?'':reserve.value} aria-label={`Резерв ${source.label} ${selectedYear}, т/год`} onChange={e=>w.setDraft(writeCell(plan,'capacity_reservations',source,selectedYear,e.target.value===''?NaN:Number(e.target.value)))}/>}</label>
       {undated.length>0&&<button type="button" className="undated-badge" aria-expanded={opened&&expanded.month===null} onClick={()=>select(source,null)}>{undated.length} без даты</button>}
       {option&&<div className="source-investment">{investments.length>1?<button type="button" className="text-button" onClick={onAdvanced}>{investments.length} инвестиции →</button>:<><div className="source-investment-controls"><Toggle label={`Включить инвестицию ${source.label}`} checked={!!investment} onChange={yes=>w.setDraft(setInvestment(plan,option.id,yes?(defaultInvestmentYear||option.year):null))}/><select aria-label={`Год решения ${source.label}`} title="Год решения об инвестиции; не дата поставки" disabled={!investment} value={investment?.year??defaultInvestmentYear??option.year} onChange={e=>w.setDraft(setInvestment(plan,option.id,Number(e.target.value)))}>{investmentYears.map(year=><option key={year}>{year}</option>)}</select></div><small>{investment?'Вложения':'Включить инвестицию'}{reference&&<> · {number(Number(reference.total_capex_mln))} млн</>}{readiness&&<><br/>{readiness}</>}</small></>}</div>}
      </th>
      {MONTHS.map((monthName,index)=>{const month=index+1,cell=readSupplyMonth(plan,source,selectedYear,month);const active=opened&&expanded.month===month;return <td key={monthName} className={`${active?'active-cell':''} ${reason&&cell.indices.length?'warning-cell':''} ${reason&&!cell.indices.length?'locked-cell':''}`}><button type="button" className="month-cell" disabled={!!reason&&!cell.indices.length} aria-expanded={active} aria-label={`${source.label}, ${monthName} ${selectedYear}: ${cell.indices.length?`${number(cell.total)} т, партий ${cell.indices.length}`:'нет партий'}`} title={reason||'Открыть партии месяца'} onClick={()=>select(source,month)}><strong>{cell.indices.length?number(cell.total):'—'}</strong><span>{cell.indices.length?`${cell.indices.length} парт.`:'добавить'}</span></button></td>;})}
     </tr>{opened&&batchEditor(source,expanded.month,expanded.month===null?undated:readSupplyMonth(plan,source,selectedYear,expanded.month).indices)}</Fragment>;
    })}</tbody>
   </table>
  </div></fieldset>
  <button type="button" className="text-button matrix-help" onClick={()=>setHelp('Каждая поставка — отдельная партия с точной датой получения и объёмом в тоннах. Ячейка месяца показывает сумму таких партий. Резерв — годовая пропускная способность канала, а не запас топлива. Записи старых планов без даты не распределяются автоматически: дату нужно назначить вручную.')}>Как заполнить таблицу ⓘ</button>
  {help&&<Modal title="Пояснение к поставкам" onClose={()=>setHelp(null)}><p>{help}</p></Modal>}
 </section>;
}
