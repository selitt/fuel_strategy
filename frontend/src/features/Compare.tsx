import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Result } from '../api/types';
import { StrategyComparisonChart } from '../components/StrategyComparisonChart';
import { Button, Modal, Notice } from '../components/Ui';
import { Icon } from '../components/Icon';
import { downloadBlob, jsonDownload, number, percent, supportedUnits } from '../lib/format';
import { equivalentChartSeries, numericDelta } from '../lib/comparisonView';
import {
  strategyColor,
  strategyComparisonCsv,
  strategyComparisonExport,
  strategyDirty,
  strategyRunFresh,
  scenarioPlan,
} from '../lib/strategies';
import type { StrategyTab } from '../lib/strategies';
import { samePlan, validateDraft } from '../lib/plan';
import { strategyYears } from '../lib/strategy';
import type { Workspace } from '../state/useWorkspace';
import '../comparison.css';

type ScenarioId = 'BASE' | 'MANDATORY_STRESS';
const scenarios: readonly ScenarioId[] = ['BASE', 'MANDATORY_STRESS'];

const scenarioNames: Record<ScenarioId, string> = {
  BASE: 'BASE',
  MANDATORY_STRESS: 'STRESS',
};

type MetricRow = {
  key: string;
  label: string;
  shortLabel: string;
  unit?: string;
  value: (result: Result) => number | undefined;
  format?: (value: number | undefined) => string;
  unitSensitive?: boolean;
  emphasis?: 'cost' | 'shortage';
};

function exactlyOne<T>(rows: T[]) {
  return rows.length === 1 ? rows[0] : undefined;
}

function balance(result: Result, year: number) {
  return exactlyOne((result.yearly_balance || []).filter(row => row.year === year));
}

function finance(result: Result, year: number) {
  return exactlyOne((result.financial_breakdown || []).filter(row => row.year === year));
}

function violationCount(result: Result) {
  const checks = result.constraint_checks;
  return Array.isArray(checks)&&checks.length ? checks.filter(check => check.passed === false).length : undefined;
}

function currentError(tab: StrategyTab, scenarioId: ScenarioId) {
  const error = tab.errors[scenarioId];
  return error && samePlan(error.basis, scenarioPlan(tab, scenarioId)) ? error : undefined;
}

function statusFor(tab: StrategyTab, scenarioId: ScenarioId) {
  const run = tab.results[scenarioId];
  const invalid = validateDraft('preview', tab.plan);
  const error = currentError(tab, scenarioId);
  if (invalid.length)
    return { label: run ? 'некорректно · устарел' : 'некорректно', tone: 'error', title: invalid[0] };
  if (error)
    return { label: run ? 'ошибка · устарел' : 'ошибка', tone: 'error', title: error.message };
  if (!run)
    return { label: 'расчёт…', tone: 'missing', title: 'Стратегия поставлена в общую очередь расчёта.' };
  if (!strategyRunFresh(tab, scenarioId))
    return { label: 'устарел', tone: 'stale', title: 'Результат относится к предыдущим настройкам стратегии.' };
  return { label: 'рассчитано', tone: 'fresh', title: 'Расчёт завершён. Выполнение условий модели показано отдельно в столбце нарушений.' };
}

function resultValue(tab: StrategyTab, scenarioId: ScenarioId, row: MetricRow) {
  const result = tab.results[scenarioId]?.result;
  if (!result || (row.unitSensitive && !supportedUnits(result.units)))
    return undefined;
  return row.value(result);
}

function resultCell(tab: StrategyTab, scenarioId: ScenarioId, row: MetricRow) {
  return (row.format || number)(resultValue(tab, scenarioId, row));
}

function deltaLabel(value: number | undefined, reference: number | undefined) {
  const delta = numericDelta(value, reference);
  if (delta === undefined)
    return null;
  if (delta === 0)
    return 'Δ 0';
  return `Δ ${delta > 0 ? '+' : '−'}${number(Math.abs(delta))}`;
}

function ScenarioStatus({ tab, scenarioId }: { tab: StrategyTab; scenarioId: ScenarioId }) {
  const status = statusFor(tab, scenarioId);
  return <span className={`comparison-run-status is-${status.tone}`} title={status.title} aria-label={`${scenarioNames[scenarioId]}: ${status.label}. ${status.title}`}>
    <b>{scenarioNames[scenarioId]}</b> {status.label}
  </span>;
}

export function Compare({ w }: { w: Workspace }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [checksSelection,setChecksSelection]=useState<{tabId:string;scenarioId:ScenarioId}|null>(null);
  const selected = w.tabs.filter(tab => w.selectedIds.includes(tab.id));
  const selectedCount = selected.length;
  const checksTab=w.tabs.find(tab=>tab.id===checksSelection?.tabId);
  const checksRun=checksTab&&checksSelection?checksTab.results[checksSelection.scenarioId]:undefined;
  const checks=checksRun?.result.constraint_checks;
  const failedChecks=checks?.filter(check=>check.passed===false)??[];
  const checkNames:Record<string,string>={
    RESERVE_45D:'Физический резерв на 45 дней',STORAGE_OVERFLOW:'Переполнение хранилища',
    BASE_CRITICAL_SERVICE:'Обеспечение критического спроса',BASE_TOTAL_SERVICE:'Обеспечение общего спроса',
    CAPEX_2037:'Инвестиции до 2037 года',CAPEX_2040:'Инвестиции за весь горизонт',
    EMERGENCY_BASE_STREAK:'Использование аварийного канала',STRESS_LOSS_LIMIT:'Потери топлива',
  };
  function checksButton(tab:StrategyTab,scenarioId:ScenarioId) {
    const result=tab.results[scenarioId]?.result;
    const count=result?violationCount(result):undefined;
    return <button type="button" className={`comparison-checks-button ${count?'has-violations':''}`} disabled={count===undefined}
      aria-label={`Нарушения ${tab.name}, ${scenarioNames[scenarioId]}: ${count??'нет результата'}`}
      onClick={()=>{setDetailsOpen(false);setChecksSelection({tabId:tab.id,scenarioId});}}>
      <strong>{number(count)}</strong><span>{count===undefined?'нет данных':count?'причины →':result?.is_feasible===false?'нет причин':'нет нарушений'}</span>
    </button>;
  }

  const year = w.comparison.year;
  const reference = selected.find(tab => tab.id === w.comparison.referenceId);
  const engines = new Set(selected.flatMap(tab => scenarios.flatMap(scenario => {
    const run = tab.results[scenario];
    return run ? [JSON.stringify(run.engine ? [run.engine.engine_id, run.engine.version] : null)] : [];
  })));
  const metricRows: MetricRow[] = [
    { key: 'total-cost', label: 'Расходы за весь горизонт', shortLabel: 'Расходы · горизонт', unit: 'млн у.е.', unitSensitive: true, emphasis: 'cost', value: result => result.total_cost_mln },
    { key: 'shortage', label: `Дефицит за ${year}`, shortLabel: `Дефицит · ${year}`, unit: 'т', unitSensitive: true, emphasis: 'shortage', value: result => balance(result, year)?.shortage_t },
    { key: 'violations', label: 'Нарушения за горизонт', shortLabel: 'Нарушения · горизонт', value: violationCount },
  ];
  const detailRows: MetricRow[] = [
    metricRows[0],
    metricRows[2],
    { key: 'year-cost', label: `Расходы за ${year}`, shortLabel: `Расходы · ${year}`, unit: 'млн у.е.', unitSensitive: true, emphasis: 'cost', value: result => finance(result, year)?.total },
    metricRows[1],
    { key: 'service-total', label: `Обеспечение общего спроса за ${year}`, shortLabel: `Общий спрос · ${year}`, format: percent, value: result => balance(result, year)?.service_level_total },
    { key: 'service-critical', label: `Обеспечение критического спроса за ${year}`, shortLabel: `Критический спрос · ${year}`, format: percent, value: result => balance(result, year)?.service_level_critical },
    { key: 'closing-inventory', label: `Запас на конец ${year}`, shortLabel: `Запас · ${year}`, unit: 'т', unitSensitive: true, value: result => balance(result, year)?.closing_inventory_t },
  ];
  const invalidUnits = selected.flatMap(tab => scenarios.flatMap(scenarioId => {
    const result = tab.results[scenarioId]?.result;
    return result && !supportedUnits(result.units) ? [`${tab.name} · ${scenarioNames[scenarioId]}`] : [];
  }));
  const chartSeries = selected.flatMap(tab => {
    const run = tab.results[w.comparison.scenario];
    return run && supportedUnits(run.result.units) ? [{
      id: tab.id,
      name: tab.name,
      color: strategyColor(tab.id),
      result: run.result,
      stale: !strategyRunFresh(tab, w.comparison.scenario),
    }] : [];
  });
  const sameChartUnits = new Set(chartSeries.map(item => JSON.stringify(item.result.units))).size <= 1;
  const chartSeriesCoincide = chartSeries.length === selected.length
    && chartSeries.length >= 2
    && chartSeries.every(item => !item.stale)
    && sameChartUnits
    && equivalentChartSeries(chartSeries.map(item => item.result), w.comparison.metric, w.comparison.range, year);
  const problems = selected.flatMap(tab => {
    const invalid = validateDraft('preview', tab.plan);
    if (invalid.length)
      return [`${tab.name}: ${invalid[0]}`];
    return scenarios.flatMap(scenarioId => {
      const error = currentError(tab, scenarioId);
      return error ? [`${tab.name} · ${scenarioNames[scenarioId]}: ${error.message}`] : [];
    });
  });

  function exportJson() {
    jsonDownload(strategyComparisonExport(selected, w.meta?.engine), 'strategy-comparison.json');
  }

  function exportCsv() {
    const csv = strategyComparisonCsv(selected, w.meta?.engine);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'strategy-comparison.csv');
  }

  return <section id="comparison-main" tabIndex={-1} role="main" className="strategy-comparison-page page-enter" aria-labelledby="comparison-title">
    <header className="comparison-page-header">
      <div className="comparison-title-row">
        <button type="button" className="comparison-back" onClick={() => w.setView('plan')}><Icon name="left"/>Редактор</button>
        <div><h1 id="comparison-title">Сравнение стратегий</h1><p>BASE и STRESS для одинаковых решений</p></div>
      </div>
      <div className="comparison-toolbar">
        <label className="comparison-year">Год<select value={year} onChange={event => w.setComparison({ year: Number(event.target.value) })}>{strategyYears.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="comparison-reference">Сравнивать с<select value={reference?.id || ''} onChange={event => w.setComparison({ referenceId: event.target.value || null })}>
          <option value="">Без разницы</option>
          {selected.map(tab => <option key={tab.id} value={tab.id}>{tab.name}</option>)}
        </select></label>
        <Button kind="ghost" disabled={selectedCount < 2} onClick={() => setDetailsOpen(true)}>Подробнее</Button>
        <details className="comparison-export-menu">
          <summary className="button ghost"><Icon name="download"/>Выгрузить</summary>
          <div><button type="button" disabled={selectedCount < 2} onClick={exportJson}>JSON</button><button type="button" disabled={selectedCount < 2} onClick={exportCsv}>CSV</button></div>
        </details>
      </div>
    </header>

    <div className="comparison-selection" aria-label="Стратегии для сравнения">
      <span className="comparison-selection-count">Стратегии · {selectedCount}</span>
      <div className="comparison-strategy-chips">
        {w.tabs.map(tab => {
          const checked = w.selectedIds.includes(tab.id);
          return <label key={tab.id} className={`comparison-strategy-chip ${checked ? 'is-selected' : ''}`} style={{ '--strategy-color': strategyColor(tab.id) } as CSSProperties}>
            <input type="checkbox" checked={checked} onChange={() => w.toggleComparison(tab.id)}/>
            <i/><span>{tab.name}</span>{tab.builtin&&<em>готовая</em>}{tab.plan.source_overrides&&Object.keys(tab.plan.source_overrides).length>0&&<em className="research-conditions-badge">исслед. условия</em>}{strategyDirty(tab) && <b title="Есть несохранённые изменения">●</b>}
          </label>;
        })}
      </div>
      {w.tabs.length < 2 && <p className="comparison-selection-help">Откройте или загрузите ещё одну стратегию.</p>}
    </div>

    {selectedCount < 2 ? <div className="comparison-empty">
      <Icon name="compare" size={28}/><h2>Выберите минимум две стратегии</h2><p>Можно сравнивать сколько угодно открытых стратегий, включая несохранённые.</p>
    </div> : <div className="comparison-content">
      {(engines.size > 1 || invalidUnits.length > 0) && <div className="comparison-alerts">
        {engines.size > 1 && <Notice tone="warning">Результаты получены разными версиями модели или версия не указана.</Notice>}
        {invalidUnits.length > 0 && <Notice tone="warning">Неподдерживаемые единицы: {invalidUnits.join(', ')}. Числа и линии скрыты.</Notice>}
      </div>}

      <section className="comparison-summary-card" aria-labelledby="comparison-summary-title">
        <h2 id="comparison-summary-title" className="sr-only">Сводка сравнения</h2>
        <div className="comparison-table-scroll">
          <table className="comparison-compact-table">
            <caption className="sr-only">Ключевые показатели стратегий в базовом и стрессовом сценариях</caption>
            <thead>
              <tr><th rowSpan={2} scope="col">Стратегия</th>{metricRows.map(row => <th key={row.key} scope="colgroup" colSpan={2}>{row.shortLabel}<small>{row.unit}</small></th>)}<th rowSpan={2} scope="col"><span className="sr-only">Действия</span></th></tr>
              <tr>{metricRows.flatMap(row => scenarios.map(scenarioId => <th key={`${row.key}-${scenarioId}`} scope="col">{scenarioNames[scenarioId]}</th>))}</tr>
            </thead>
            <tbody>{selected.map(tab => <tr key={tab.id}>
              <th scope="row">
                <span className="comparison-strategy-heading"><i style={{ background: strategyColor(tab.id) }}/><span title={tab.name}>{tab.name}</span>{tab.plan.source_overrides&&Object.keys(tab.plan.source_overrides).length>0&&<em className="research-conditions-badge">исслед. условия</em>}{reference?.id === tab.id && <em>эталон</em>}</span>
                <span className="comparison-status-pair">{scenarios.map(scenarioId => <ScenarioStatus key={scenarioId} tab={tab} scenarioId={scenarioId}/>)}</span>
              </th>
              {metricRows.flatMap(row => scenarios.map(scenarioId => {
                const value = resultValue(tab, scenarioId, row);
                const referenceValue = reference ? resultValue(reference, scenarioId, row) : undefined;
                const comparable = reference
                  && reference.id !== tab.id
                  && strategyRunFresh(tab, scenarioId)
                  && strategyRunFresh(reference, scenarioId)
                  && !currentError(tab, scenarioId)
                  && !currentError(reference, scenarioId)
                  && validateDraft('preview', tab.plan).length === 0
                  && validateDraft('preview', reference.plan).length === 0;
                const delta = comparable ? deltaLabel(value, referenceValue) : null;
                return <td key={`${row.key}-${scenarioId}`} className={`numeric ${row.emphasis ? `is-${row.emphasis}` : ''}`}>
                  {row.key==='violations'?checksButton(tab,scenarioId):<strong>{resultCell(tab, scenarioId, row)}</strong>}{delta && <small>{delta}</small>}
                </td>;
              }))}
              <td><div className="comparison-row-actions"><button type="button" className="text-button comparison-edit" onClick={() => w.editComparedTab(tab.id)}>Открыть<Icon name="right" size={14}/></button>{tab.builtin&&<button type="button" className="text-button comparison-copy" disabled={!!w.busy} onClick={()=>void w.copyFrom(tab.id)}><Icon name="copy" size={13}/>Создать свою</button>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="comparison-checks-help">Нарушения — невыполненные условия модели, а не сбой расчёта. Нажмите число, чтобы увидеть причины по годам.</p>
        {problems.length>0&&<details className="comparison-problems"><summary>Не удалось рассчитать: {problems.length}</summary><ul>{problems.map((problem,index)=><li key={index}>{problem}</li>)}</ul></details>}
        <div className="comparison-retry-row">
          {selected.map(tab => {
            const invalid = validateDraft('preview', tab.plan).length > 0;
            const failed = scenarios.some(scenarioId => !!currentError(tab, scenarioId));
            if (invalid)
              return <Button key={tab.id} kind="ghost" onClick={() => w.editComparedTab(tab.id)}><Icon name="alert"/>Исправить «{tab.name}»</Button>;
            return failed ? <Button key={tab.id} kind="ghost" disabled={!!w.busy} onClick={() => void w.retryTab(tab.id)}><Icon name="refresh"/>Повторить «{tab.name}»</Button> : null;
          })}
        </div>
      </section>

      <section className="comparison-chart-card" aria-labelledby="comparison-chart-title">
        <div className="comparison-section-heading comparison-chart-heading">
          <div className="comparison-chart-label"><h2 id="comparison-chart-title">График</h2>{chartSeriesCoincide && <span className="comparison-equal-series"><Icon name="info" size={14}/>Линии совпадают</span>}</div>
          <div className="comparison-chart-controls">
            <div className="segmented" aria-label="Сценарий графика">{scenarios.map(scenarioId => <button key={scenarioId} type="button" aria-pressed={w.comparison.scenario === scenarioId} onClick={() => w.setComparison({ scenario: scenarioId })}>{scenarioNames[scenarioId]}</button>)}</div>
            <div className="segmented comparison-metric-switch" aria-label="Показатель графика">
              <button type="button" aria-pressed={w.comparison.metric === 'inventory'} onClick={() => w.setComparison({ metric: 'inventory' })}>Запас</button>
              <button type="button" aria-pressed={w.comparison.metric === 'shortage'} onClick={() => w.setComparison({ metric: 'shortage' })}>Дефицит</button>
              <button type="button" aria-pressed={w.comparison.metric === 'cost'} onClick={() => w.setComparison({ metric: 'cost' })}>Затраты</button>
            </div>
            {w.comparison.metric !== 'cost' && <div className="segmented" aria-label="Период графика">
              <button type="button" aria-pressed={w.comparison.range === 'all'} onClick={() => w.setComparison({ range: 'all' })}>Весь период</button>
              <button type="button" aria-pressed={w.comparison.range === 'year'} onClick={() => w.setComparison({ range: 'year' })}>{year}</button>
            </div>}
          </div>
        </div>
        {chartSeriesCoincide && <p className="comparison-equal-explanation">У выбранных стратегий одинаковые значения на этом графике.</p>}
        <StrategyComparisonChart series={chartSeries} metric={w.comparison.metric} range={w.comparison.range} year={year}/>
        {chartSeries.length < selected.length && <p className="comparison-chart-note">Показаны только стратегии с доступным результатом и поддерживаемыми единицами.</p>}
      </section>
    </div>}

    {detailsOpen && <Modal title={`Подробные показатели · ${year}`} wide onClose={() => setDetailsOpen(false)}>
      <p className="comparison-details-intro">BASE и STRESS рассчитаны для одинаковых решений. Рейтинг не строится: решение остаётся за оператором.</p>
      {problems.length > 0 && <Notice tone="warning"><strong>Не все результаты актуальны.</strong><ul>{problems.map((problem, index) => <li key={`${problem}-${index}`}>{problem}</li>)}</ul></Notice>}
      <div className="comparison-table-scroll comparison-details-table">
        <table className="strategy-comparison-table">
          <caption className="sr-only">Подробное сравнение стратегий</caption>
          <thead>
            <tr><th rowSpan={2} scope="col">Показатель</th>{selected.map(tab => <th key={tab.id} scope="colgroup" colSpan={2}>
              <span className="comparison-strategy-heading"><i style={{ background: strategyColor(tab.id) }}/><span>{tab.name}</span>{tab.plan.source_overrides&&Object.keys(tab.plan.source_overrides).length>0&&<em className="research-conditions-badge">исслед. условия</em>}</span>
              <button type="button" className="text-button" onClick={() => { setDetailsOpen(false); w.editComparedTab(tab.id); }}>Открыть в редакторе</button>{tab.builtin&&<button type="button" className="text-button" disabled={!!w.busy} onClick={()=>{setDetailsOpen(false);void w.copyFrom(tab.id);}}>Создать свою копию</button>}
            </th>)}</tr>
            <tr>{selected.flatMap(tab => scenarios.map(scenarioId => <th scope="col" key={`${tab.id}-${scenarioId}`}><strong>{scenarioNames[scenarioId]}</strong><ScenarioStatus tab={tab} scenarioId={scenarioId}/></th>))}</tr>
          </thead>
          <tbody>{detailRows.map(row => <tr key={row.key} className={row.emphasis ? `is-${row.emphasis}` : ''}>
            <th scope="row">{row.label}{row.unit && <small>{row.unit}</small>}</th>
            {selected.flatMap(tab => scenarios.map(scenarioId => <td key={`${tab.id}-${scenarioId}`} className="numeric">{row.key==='violations'?checksButton(tab,scenarioId):resultCell(tab, scenarioId, row)}</td>))}
          </tr>)}</tbody>
        </table>
      </div>
    </Modal>}
    {checksTab&&checksSelection&&<Modal title={`${checksTab.name} · ${scenarioNames[checksSelection.scenarioId]}: условия модели`} onClose={()=>setChecksSelection(null)}>
      {checksRun&&!strategyRunFresh(checksTab,checksSelection.scenarioId)&&<Notice tone="warning">Это результат предыдущих настроек. Дождитесь пересчёта для текущего плана.</Notice>}
      {!checks?.length?<p>Модель не передала проверки для этого результата.</p>:failedChecks.length?<>
        <p className="comparison-checks-intro">Расчёт выполнен. План не выполнил следующие условия модели:</p>
        <ol className="comparison-checks-list">{failedChecks.map((check,index)=><li key={index}><strong>{check.year} · {checkNames[check.constraint_id]??check.constraint_id}</strong><p>{check.detail||'Модель не передала пояснение.'}</p></li>)}</ol>
      </>:checksRun?.result.is_feasible===false?<Notice tone="warning">Модель пометила план невыполнимым, но не передала причины.</Notice>:<p>В этом сценарии модель не обнаружила нарушений проверенных условий за весь горизонт.</p>}
      <div className="modal-actions"><Button onClick={()=>{setChecksSelection(null);w.editComparedTab(checksTab.id,checksSelection.scenarioId);}}>Открыть стратегию</Button><Button onClick={()=>setChecksSelection(null)}>Закрыть</Button></div>
    </Modal>}
  </section>;
}
