import { useState } from 'react';
import type { Workspace } from '../state/useWorkspace';
import type { Result } from '../api/types';
import { AnalyticsChart, FinanceChart, palette } from '../components/AnalyticsChart';
import type { Trace } from '../components/AnalyticsChart';
import { DailyChart } from '../components/DailyChart';
import { Icon } from '../components/Icon';
import { Button, Modal } from '../components/Ui';
import {
  MODEL_HORIZON_DAYS,
  modelCalendarDate,
  detailTimelineRange,
  modelDayFromYearDay,
  modelDayLabel,
  timelineRecordAt,
  yearDayFromModelDay,
} from '../lib/daily';
import { number, percent, supportedUnits } from '../lib/format';

const checkLabels: Record<string, string> = { RESERVE_45D: 'Резерв на 45 дней', BASE_CRITICAL_SERVICE: 'Критический сервис', BASE_TOTAL_SERVICE: 'Общий сервис', CAPACITY_EXCEEDED: 'Мощность источника', STORAGE_OVERFLOW: 'Переполнение', CAPEX_2037: 'CAPEX до 2037', CAPEX_2040: 'CAPEX до 2040', STRESS_LOSS_LIMIT: 'Потери', EMERGENCY_BASE_STREAK: 'Роль Emergency' };

const dailyFields = [
  ['opening_inventory_t', 'Запас на начало', 'т'],
  ['closing_inventory_t', 'Запас на конец', 'т'],
  ['delivered_t', 'Поступление', 'т'],
  ['demand_total_t', 'Спрос', 'т'],
  ['served_total_t', 'Обслужено', 'т'],
  ['losses_t', 'Потери', 'т'],
  ['spill_t', 'Сброс при переполнении', 'т'],
  ['shortage_t', 'Дефицит', 'т'],
] as const;

export function ResultPanel({ w, onDetails, onRisk }: {
  w: Workspace;
  onDetails: () => void;
  onRisk: () => void;
}) {
  const [chart, setChart] = useState<'inventory' | 'cost'>('inventory');
  const [selectedModelDay, setSelectedModelDay] = useState(1);
  const [timelineView, setTimelineView] = useState<'overview' | 'detail'>('overview');
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'checks' | 'risk' | null>(null);
  const [detailSide, setDetailSide] = useState<'primary' | 'other'>('primary');
  const result = w.displayResult;
  const fresh = w.preview ? w.previewFresh : w.current;
  if (!result)
    return <section className="result-panel panel result-empty" aria-label="Результат расчёта"><div className="panel-heading"><h2>Результат</h2></div><div className="empty-result-body"><h3>Нет расчёта</h3></div></section>;
  if (!supportedUnits(result.units))
    return <section className="panel result-panel"><div className="panel-heading"><h2>Результат</h2></div><p className="inline-warning">Единицы результата отличаются от т / млн у.е. Графики скрыты; исходный ответ сохранён в JSON.</p><button className="text-button" onClick={onDetails}>Открыть ответ</button></section>;

  const coordinate = yearDayFromModelDay(selectedModelDay)!;
  const year = coordinate.year;
  const day = coordinate.day;
  const balances = result.yearly_balance || [];
  const years = balances.map(balance => balance.year);
  const row = balances.find(balance => balance.year === year);
  const financial = result.financial_breakdown?.find(entry => entry.year === year);
  const other = w.displayOther && supportedUnits(w.displayOther.units) ? w.displayOther : undefined;
  const otherRow = other?.yearly_balance?.find(balance => balance.year === year);
  const costSeries: Trace[] = other ? [
    { key: 'primary-cost', label: scenarioCode(result), color: palette.muted, values: years.map(value => valueAt(result, value)) },
    { key: 'other-cost', label: scenarioCode(other), color: palette.green, dashed: true, values: years.map(value => valueAt(other, value)) },
  ] : [];
  const checks = result.constraint_checks || [];
  const failed = checks.filter(check => !check.passed);
  const yearFails = failed.filter(check => check.year === year);
  const detailResult = detailSide === 'other' && other ? other : result;
  const detailOther = detailResult === result ? other : result;
  const detailRecord = timelineRecordAt(detailResult, selectedModelDay);
  const chartRange = timelineView === 'detail' ? detailTimelineRange(selectedModelDay) : undefined;
  const selectYear = (selectedYear: number) => {
    const modelDay = modelDayFromYearDay(selectedYear, day);
    if (modelDay !== undefined)
      setSelectedModelDay(modelDay);
  };
  const rangePercent = 100 * (selectedModelDay - 1) / (MODEL_HORIZON_DAYS - 1);

  return <section className={`result-panel panel ${fresh ? "" : "result-stale"}`} aria-labelledby="result-title">
    <div className="panel-heading"><h2 id="result-title">{other ? 'Сравнение сценариев' : 'Результат'}</h2><strong className="timeline-selected-day" data-testid="timeline-selected-day">{chart === 'inventory' ? modelCalendarDate(year, day) : `Расходы за ${year}`}</strong></div>
    <div className="result-local-status" role="status">{fresh ? "Расчёт текущих настроек" : w.errorMessage ? "Устарел — исправьте ошибки плана для пересчёта" : "Устарел — ожидаем пересчёт"}</div>
    <div className="result-metrics result-metrics-compact">
      <strong className="service-year">Обеспечение спроса за {year}</strong>
      <div className="service-scenario">
        <b>{scenarioCode(result)}</b>
        <span>Общий спрос <strong data-testid="service-total">{percent(row?.service_level_total)}</strong></span>
        <span>Критический спрос <strong>{percent(row?.service_level_critical)}</strong></span>
      </div>
      {otherRow && <div className="service-scenario">
        <b>{scenarioCode(other!)}</b>
        <span>Общий спрос <strong>{percent(otherRow.service_level_total)}</strong></span>
        <span>Критический спрос <strong>{percent(otherRow.service_level_critical)}</strong></span>
      </div>}
    </div>
    <div className={`result-widget result-widget-${chart}`} data-testid="result-widget">
    <div className="result-toolbar">
      <div className="chart-mode" aria-label="Показатель графика"><button type="button" aria-pressed={chart === 'inventory'} onClick={() => setChart('inventory')}>Запас по дням</button><button type="button" aria-pressed={chart === 'cost'} onClick={() => setChart('cost')}>Затраты по годам</button></div>
      {chart === 'cost' && <div className="cost-year-selector" data-testid="cost-year-selector" role="group" aria-label="Год расходов">{years.map(value => <button type="button" key={value} aria-pressed={value === year} onClick={() => selectYear(value)}>{value}</button>)}</div>}
      {chart === 'inventory' && <div className="timeline-view-toggle" data-testid="timeline-view-toggle" aria-label="Масштаб дневного графика">
        <button type="button" aria-pressed={timelineView === 'overview'} onClick={() => setTimelineView('overview')}>Весь период</button>
        <button type="button" aria-pressed={timelineView === 'detail'} onClick={() => setTimelineView('detail')}>Подробнее · 90 дней</button>
      </div>}
    </div>
    {w.displayOther && !other && <p className="comparison-caption">Второй сценарий использует другие единицы. Сопоставление скрыто.</p>}
    {other && chart === 'inventory' && <div className="daily-detail-switch" aria-label="Сценарий дневных событий">
      <span>Поступления и дефицит:</span>
      <button type="button" aria-pressed={detailSide === 'primary'} onClick={() => setDetailSide('primary')}>{scenarioCode(result)}</button>
      <button type="button" aria-pressed={detailSide === 'other'} onClick={() => setDetailSide('other')}>{scenarioCode(other)}</button>
    </div>}
    <div className="result-chart-area">
      {chart === 'inventory'
        ? <DailyChart timeline result={detailResult} other={detailOther} range={chartRange} selectedDay={selectedModelDay} onSelectDay={setSelectedModelDay}/>
        : other
          ? <AnalyticsChart years={years} series={costSeries} unit="млн у.е." selected={year} onSelect={selectYear}/>
          : <FinanceChart rows={result.financial_breakdown || []} selected={year} onSelect={selectYear}/>
      }
    </div>
    {chart === 'inventory' && <div className="timeline-control">
      <div className="timeline-control-heading"><span>День горизонта</span><span><b>{year}</b> · день <b>{day}</b> из 365</span></div>
      <input
        className="range"
        type="range"
        aria-label="День горизонта"
        aria-valuetext={`${year}, день ${day}`}
        min={1}
        max={MODEL_HORIZON_DAYS}
        step={1}
        value={selectedModelDay}
        onChange={event => setSelectedModelDay(event.target.valueAsNumber)}
        style={{backgroundSize: `${rangePercent}% 100%`}}
      />
      <div className="timeline-year-scale" aria-hidden="true">{[2035, 2036, 2037, 2038, 2039, 2040].map(value => {
        const firstDay = modelDayFromYearDay(value, 1)!;
        return <span key={value} style={{left: `${100 * (firstDay - 1) / (MODEL_HORIZON_DAYS - 1)}%`}}>{value}</span>;
      })}</div>
      <div className="timeline-control-action"><span>День 1</span><button type="button" className="text-button" data-testid="timeline-details-button" onClick={() => setDayDetailsOpen(true)}>Подробнее о выбранном дне</button><span>День {MODEL_HORIZON_DAYS}</span></div>
    </div>}
    </div>
    {!row && <p className="inline-warning">Нет данных за {year}</p>}
    <div className="timeline-annual-label">За год <strong>{year}</strong></div>
    <div className="result-numbers"><div><span>Дефицит</span><strong className={(row?.shortage_t || 0) > 0 ? 'warning-text' : ''}>{number(row?.shortage_t)}<small> т</small></strong></div><div><span>Запас на конец</span><strong>{number(row?.closing_inventory_t)}<small> т</small></strong></div><div><span>Расходы за год</span><strong>{number(financial?.total)}<small> млн у.е.</small></strong></div></div>
    <div className="result-actions">
      <button className="result-action" type="button" data-testid="result-checks" onClick={() => setInfoModal('checks')}><Icon name={failed.length ? 'alert' : 'check'} size={15}/><span>{scenarioCode(result)} · {checks.length ? (failed.length ? `${failed.length} нарушений за горизонт` : 'Все проверки модели пройдены') : 'Проверки не переданы'}</span><Icon name="right" size={15}/></button>
      <button className="result-action risk-entry" type="button" data-testid="risk-disclosure" onClick={() => setInfoModal('risk')}><span>Проверка сбоев поставок</span><Icon name="right" size={15}/></button>
    </div>
    {infoModal === 'checks' && <Modal title={`Проверки модели · ${scenarioCode(result)}`} wide onClose={() => setInfoModal(null)}>
      <div className="compact-checks">
        {failed.length ? <div className="check-preview">{failed.map((check, checkIndex) => <p key={checkIndex} title={check.detail}><b>{check.year}</b><span>{checkLabels[check.constraint_id] || check.constraint_id}</span><small>{check.excess == null ? '' : number(check.excess)}</small></p>)}</div> : <p>{checks.length ? 'Нарушений в переданных проверках нет.' : 'Модель не передала проверки для этого результата.'}</p>}
        {yearFails.length > 0 && <p className="help">За выбранный {year} год: {yearFails.length}.</p>}
        <div className="modal-actions"><Button onClick={() => { setInfoModal(null); onDetails(); }}>Все показатели и значения</Button></div>
      </div>
    </Modal>}
    {infoModal === 'risk' && <Modal title="Проверка сбоев поставок" onClose={() => setInfoModal(null)}>
      <p>Модель выполнит 100 случайных прогонов отказов поставок и покажет, как часто нет дефицита, нарушений начального резерва и переполнения.</p>
      <p className="help">Это дополнительная оценка устойчивости текущего плана. Она запускается отдельно и не меняет введённые решения.</p>
      <div className="modal-actions"><Button data-testid="run-risk-button" disabled={w.riskBusy || !!w.busy} onClick={() => { setInfoModal(null); onRisk(); }}>Запустить проверку сбоев</Button></div>
    </Modal>}
    {dayDetailsOpen && <Modal title={modelDayLabel(selectedModelDay)} wide onClose={() => setDayDetailsOpen(false)}>
      <div className="daily-detail" data-testid="daily-detail">
        {other && <div className="daily-detail-switch" aria-label="Сценарий подробностей"><span>Сценарий:</span><button type="button" aria-pressed={detailSide === 'primary'} onClick={() => setDetailSide('primary')}>{scenarioCode(result)}</button><button type="button" aria-pressed={detailSide === 'other'} onClick={() => setDetailSide('other')}>{scenarioCode(other)}</button></div>}
        <DailyChart timeline result={detailResult} other={detailOther} range={detailTimelineRange(selectedModelDay)} selectedDay={selectedModelDay} onSelectDay={setSelectedModelDay}/>
        <div className="daily-detail-grid">{dailyFields.map(([field, label, unit]) => <div key={field}><span>{label}</span><strong>{number(detailRecord?.[field])}<small> {unit}</small></strong></div>)}</div>
        {!detailRecord && <p className="inline-warning">За этот день выбранный сценарий не передал данные.</p>}
      </div>
    </Modal>}
  </section>;
}

function valueAt(result: Result, year: number) {
  return result.financial_breakdown?.find(row => row.year === year)?.total;
}

function scenarioCode(result: Result) {
  return result.scenario_id === 'BASE' ? 'BASE' : result.scenario_id === 'MANDATORY_STRESS' ? 'STRESS' : result.scenario_id;
}
