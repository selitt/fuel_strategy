import type { Result } from '../api/types';
import type { Workspace } from '../state/useWorkspace';
import { number, percent, supportedUnits } from '../lib/format';
import { validateDraft } from '../lib/plan';
import { strategyStatus, strategyYears } from '../lib/strategy';
const statusLabels = {
 missing:'Нет результата', unsupported:'Единицы результата не поддерживаются', incomplete:'Данных недостаточно для оценки',
 violations:'Есть нарушения', feasible:'Выполнима по переданным проверкам модели',
};
function ScenarioSummary({result, label, fresh}: {result:Result|null;label:string;fresh:boolean}) {
 const status = strategyStatus(result);
 const unitsOk = !!result && supportedUnits(result.units);
 return <article className={`strategy-scenario strategy-${fresh ? status.kind : 'stale'}`}>
  <div className="strategy-scenario-heading"><h3>{label}</h3><span className="strategy-cost">{unitsOk ? number(result?.total_cost_mln) : '—'} <small>млн у.е. за весь период</small></span></div>
  <p className="strategy-verdict">{!fresh && result ? 'Предыдущий результат · ' : ''}{statusLabels[status.kind]}</p>
  {status.failed > 0 && <details className="strategy-checks"><summary>Нарушений в ответе: {status.failed} · Посмотреть причины</summary><ul>{result?.constraint_checks?.filter(c=>c.passed===false).map((c,i)=><li key={i}><strong>{c.year ? `${c.year}: ` : ''}</strong>{c.detail || c.constraint_id}</li>)}</ul></details>}
  <details className="strategy-year-details"><summary>Показатели по годам</summary><div className="strategy-table-wrap"><table className="strategy-years"><caption className="sr-only">{label}: обеспечение спроса и дефицит по годам</caption><thead><tr><th scope="col">Показатель</th>{strategyYears.map(year=><th scope="col" key={year}>{year}</th>)}</tr></thead><tbody>
   {([['service_level_total','Общий спрос обеспечен',true],['service_level_critical','Критический спрос обеспечен',true],['shortage_t','Дефицит, т',false]] as const).map(([key,title,pct])=><tr key={key}><th scope="row">{title}</th>{strategyYears.map(year=>{
    const matches=result?.yearly_balance?.filter(row=>row.year===year)||[];
    const value=unitsOk && matches.length===1 ? matches[0][key] : undefined;
    return <td key={year} className={typeof value==='number' && (pct ? value<1 : value>0) ? 'strategy-attention' : ''}>{pct ? percent(value) : number(value)}</td>;
   })}</tr>)}
  </tbody></table></div><p className="strategy-scroll-hint">Прокрутите таблицу вправо, чтобы увидеть все годы.</p></details>
 </article>;
}
export function StrategySummary({w,onDetails}:{w:Workspace;onDetails:()=>void}) {
 const fresh = w.preview ? w.previewFresh : w.current;
 const invalid = !!w.draft && validateDraft('preview', w.draft).length > 0;
 const status = invalid ? 'Исправьте ошибки ввода. Расчёт приостановлен; показан предыдущий результат, если он есть.' : w.errorMessage && !fresh ? 'Пересчёт не завершён. Показанные данные могут относиться к предыдущим настройкам.'
  : !fresh && (w.displayResult || w.displayOther) ? 'Настройки изменились — показан предыдущий результат. Ожидаем пересчёт…'
  : !w.displayResult ? 'Ожидаем расчёт стратегии…'
  : w.riskBusy ? 'Анализ рисков выполняется отдельно. Здесь показан обычный расчёт.'
  : w.dirty ? 'Результат текущих настроек. Изменения ещё не сохранены.' : 'Результат текущих настроек.';
 const name=(r:Result|null|undefined)=>r?.scenario_id==='MANDATORY_STRESS'?'STRESS · Обязательный стресс':r?.scenario_id==='BASE'?'BASE · Базовые условия':r?.scenario_id||'Сценарий';
 return <section className="strategy-summary panel" aria-labelledby="strategy-title">
  <div className="panel-heading"><div><h2 id="strategy-title">Стратегия за 2035–2040</h2><p>Расходы и проверки за все шесть лет.</p></div><button type="button" className="text-button" onClick={onDetails} disabled={!w.displayResult}>Все показатели →</button></div>
  <p className={`strategy-freshness ${!fresh ? 'strategy-attention' : ''}`} role="status">{status}</p>
  <div className={`strategy-scenarios ${w.both ? 'strategy-pair' : ''}`}>
   <ScenarioSummary result={w.displayResult} label={name(w.displayResult) || 'BASE'} fresh={fresh}/>
   {w.both && <ScenarioSummary result={w.displayOther} label={w.displayResult?.scenario_id==='MANDATORY_STRESS'?'BASE · Базовые условия':'STRESS · Обязательный стресс'} fresh={fresh}/>}
  </div>
  <p className="strategy-footnote">Оценка прототипа модели. Критический спрос входит в общий; расходы — не прибыль.</p>
 </section>;
}
