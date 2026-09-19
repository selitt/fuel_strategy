import { useState } from 'react';
import { Modal } from '../components/Ui';
import type { Workspace } from '../state/useWorkspace';
import type { MatrixSource, MatrixKey } from '../lib/matrix';
import { matrixSources, matrixYears, readCell, setInvestment, writeCell } from '../lib/matrix';
import { number } from '../lib/format';
import { Toggle } from '../components/Controls';

const options: Record<string, {id:string;year:number}> = {
 'Lunar-ISRU':{id:'LUNAR_ISRU',year:2038}, 'Earth-New':{id:'EARTH_NEW',year:2036},
};
export function SupplyMatrix({w,onAdvanced,onSource}:{w:Workspace;onAdvanced:()=>void;onSource:(source:MatrixSource)=>void}) {
 const [help,setHelp]=useState<string|null>(null);
 if (!w.draft) return null;
 const plan=w.draft, sources=matrixSources(plan,w.catalog), years=matrixYears(plan,w.catalog);
 const investmentCatalog=w.catalog?.tables.find(t=>t.table_id==='investment_options')?.rows||[];
 function unavailable(source:MatrixSource, year:number) {
  const option=options[source.key];
  if(option && !plan.decisions.investments.some(i=>i.investment_id===option.id)) return 'Сначала включите инвестицию у названия источника.';
  const available=Number(source.reference?.available_from_year);
  return available && year<available ? `Источник доступен с ${available} года.` : '';
 }
 function change(key:MatrixKey,source:MatrixSource,year:number,value:string) {
  w.setDraft(writeCell(plan,key,source,year,value==='' ? NaN : Number(value)));
 }
 return <section className="panel supply-panel direct-matrix" aria-labelledby="matrix-title">
  <div className="panel-heading"><h2 id="matrix-title">Поставки по годам</h2><button type="button" className="text-button" onClick={onAdvanced}>Другие записи →</button></div>
  <p className="matrix-instruction">Введите значения в таблицу: заказ — топливо (т), резерв — мощность (т/год).</p>
  <fieldset disabled={!!w.busy} className="matrix-fieldset"><div className="matrix-viewport" tabIndex={0} aria-label="Поставки: таблица с прокруткой">
   <table className="supply-matrix"><caption className="sr-only">Заказ топлива в тоннах и резерв мощности в тоннах за год</caption>
    <thead><tr><th scope="col">Источник</th>{years.map(year=><th scope="col" key={year} className={w.selection?.year===year?'selected-year':''}>{year}</th>)}</tr></thead>
    <tbody>{sources.map(source=>{
     const option=options[source.key], investments=option ? plan.decisions.investments.filter(i=>i.investment_id===option.id) : [];
     const investment=investments[0];const reference=investmentCatalog.find(i=>i.investment_id===option?.id);
     const investmentYears=[...new Set([...years,...investments.map(i=>i.year),...(option?[option.year]:[])])].sort((a,b)=>a-b);
     return <tr key={source.key} className={w.selection?.source===source.key?'selected-source':''}>
      <th scope="row"><button type="button" className="source-name" aria-label={`Параметры ${source.label}`} onClick={()=>onSource(source)}>{source.label} <span aria-hidden="true">ⓘ</span></button>
       {option && <div className="source-investment">
        {investments.length>1 ? <button type="button" className="text-button" onClick={onAdvanced}>{investments.length} инвестиции →</button> : <><div className="source-investment-controls"><Toggle label={`Включить инвестицию ${source.label}`} checked={!!investment} onChange={yes=>w.setDraft(setInvestment(plan,option.id,yes?option.year:null))}/><select aria-label={`Год решения ${source.label}`} title="Год решения об инвестиции; не дата поставки" disabled={!investment} value={investment?.year??option.year} onChange={e=>w.setDraft(setInvestment(plan,option.id,Number(e.target.value)))}>{investmentYears.map(y=><option key={y}>{y}</option>)}</select></div><small>{investment?'Вложения':'Включить инвестицию'}{reference && <> · {number(Number(reference.total_capex_mln))} млн</>}</small>{source.key==='Lunar-ISRU'&&investment&&investment.year>=2038&&<button type="button" className="text-button warning-text investment-warning" onClick={()=>setHelp('По каталогу Lunar-ISRU требует финансирования до 2038 года. Текущий год решения не задаёт отдельные даты оплаты и ввода. Проверьте график финансирования.')}>Проверить сроки ⚠</button>}</>}
       </div>}
      </th>
      {years.map(year=>{
       const order=readCell(plan,'supply_orders',source,year), reserve=readCell(plan,'capacity_reservations',source,year);
       const reason=unavailable(source,year), hasRecords=order.indices.length>0||reserve.indices.length>0;
       const availabilityId=`${source.key}-${year}-availability`;
       const excess=source.key!=='Lunar-ISRU' && order.value!==null && reserve.value!==null && order.value>reserve.value;
       return <td key={year} className={`${w.selection?.source===source.key&&w.selection?.year===year?'active-cell':''} ${excess||reason&&hasRecords?'warning-cell':''} ${reason&&!hasRecords?'locked-cell':''}`}>
        {([['supply_orders','Заказ','т',order],['capacity_reservations','Резерв','т/год',reserve]] as const).map(([key,label,unit,cell])=><label className="matrix-direct-field" key={key}><span>{label}</span>{cell.indices.length>1 ? <button type="button" className="text-button" onClick={onAdvanced}>{cell.indices.length} записи</button> : <input type="number" inputMode="decimal" min={0} step="any" placeholder="—" autoComplete="off" aria-label={`${label} ${source.label} ${year}, ${unit}`} aria-describedby={reason?availabilityId:undefined} aria-invalid={cell.value!==null&&(!Number.isFinite(cell.value)||cell.value<0)} disabled={!!reason&&!hasRecords} title={reason||`${label}, ${unit}${excess?' · Заказ выше резерва':''}`} value={cell.value===null||!Number.isFinite(cell.value)?'':cell.value} onFocus={()=>w.setSelection({source:source.key,year})} onChange={e=>change(key,source,year,e.target.value)}/>}</label>)}
        {reason&&hasRecords&&<button type="button" id={availabilityId} className="text-button warning-text retained-unavailable" onClick={()=>setHelp(reason)}>Недоступно ⓘ</button>}
        {reason&&!hasRecords&&<span id={availabilityId} className="sr-only">{reason}</span>}
       </td>;
      })}
     </tr>;
    })}</tbody>
   </table>
  </div></fieldset>
  <button type="button" className="text-button matrix-help" onClick={()=>setHelp('Заказ — запрашиваемое топливо в тоннах. Резерв — бронируемая мощность в т/год, не запас топлива. Подсветка означает заказ выше резерва или сохранённую запись недоступного источника. Для Lunar-ISRU и Earth-New включите инвестицию у названия. Выключение сохраняет заказы; год решения не задаёт отдельные даты оплаты и ввода. Совпадающие записи доступны через «Другие записи».')}>Как заполнить таблицу ⓘ</button>
  {help && <Modal title="Пояснение к поставкам" onClose={()=>setHelp(null)}><p>{help}</p></Modal>}
 </section>;
}
