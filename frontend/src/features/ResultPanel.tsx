import { useState } from 'react';
import type { Workspace } from '../state/useWorkspace';
import type { Result } from '../api/types';
import { AnalyticsChart, FinanceChart, ServiceRing, palette } from '../components/AnalyticsChart';
import type { Trace } from '../components/AnalyticsChart';
import { DailyChart } from '../components/DailyChart';
import { Icon } from '../components/Icon';
import { Modal, Notice } from '../components/Ui';
import { dailyRecordAt } from '../lib/daily';
import { number, percent, scenario, supportedUnits } from '../lib/format';
import { Range } from '../components/Controls';

const checkLabels: Record<string, string> = { RESERVE_45D: 'Резерв на 45 дней', BASE_CRITICAL_SERVICE: 'Критический сервис', BASE_TOTAL_SERVICE: 'Общий сервис', CAPACITY_EXCEEDED: 'Мощность источника', STORAGE_OVERFLOW: 'Переполнение', CAPEX_2037: 'CAPEX до 2037', CAPEX_2040: 'CAPEX до 2040', STRESS_LOSS_LIMIT: 'Потери', EMERGENCY_BASE_STREAK: 'Роль Emergency' };

const dailyFields = [
  ['opening_inventory_t', 'Запас на начало', 'т'],
  ['closing_inventory_t', 'Запас на конец', 'т'],
  ['delivered_t', 'Поступление', 'т'],
  ['demand_total_t', 'Спрос', 'т'],
  ['served_total_t', 'Обслужено', 'т'],
  ['losses_t', 'Потери', 'т'],
  ['shortage_t', 'Дефицит', 'т'],
] as const;

export function ResultPanel({ w, onDetails }: {
  w: Workspace;
  onDetails: () => void;
}) {
  const selected = w.selection?.year ?? null;
  const setSelected = (year: number) => w.setSelection({ source: w.selection?.source || 'Earth-Core', year });
  const [proposal, setProposal] = useState<{year:number;from:number;to:number;scenario:string;volume:number|undefined} | null>(null);
  const [chart, setChart] = useState<'inventory' | 'cost'>('inventory');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [detailSide, setDetailSide] = useState<'primary' | 'other'>('primary');
  const result = w.displayResult;
  if (!result)
    return <section className="result-panel panel result-empty" aria-label="Результат расчёта"><div className="panel-heading"><h2>Результат</h2></div><div className="empty-result-body"><h3>Нет расчёта</h3></div></section>;
  if (!supportedUnits(result.units))
    return <section className="panel result-panel"><div className="panel-heading"><h2>Результат</h2></div><p className="inline-warning">Единицы результата отличаются от т / млн у.е. Графики скрыты; исходный ответ сохранён в JSON.</p><button className="text-button" onClick={onDetails}>Открыть ответ</button></section>;

  const balances = result.yearly_balance || [];
  const years = balances.map(balance => balance.year);
  const year = selected ?? years[0];
  const row = balances.find(balance => balance.year === year);
  const financial = result.financial_breakdown?.find(entry => entry.year === year);
  const index = years.indexOf(year);
  const previousYear = years.filter(value => value < year).at(-1);
  const nextYear = years.find(value => value > year);
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
  const detailRecord = selectedDay === null ? undefined : dailyRecordAt(detailResult, year, selectedDay);

  return <section className="result-panel panel" aria-labelledby="result-title">
    <div className="panel-heading"><h2 id="result-title">{other ? 'Сравнение сценариев' : 'Результат'}</h2><div className="year-nav"><button type="button" className="icon-button" aria-label="Предыдущий год" disabled={previousYear === undefined} onClick={() => previousYear !== undefined && setSelected(previousYear)}><Icon name="left" size={14}/></button><strong>{year || '—'}</strong><button type="button" className="icon-button" aria-label="Следующий год" disabled={nextYear === undefined} onClick={() => nextYear !== undefined && setSelected(nextYear)}><Icon name="right" size={14}/></button></div></div>
    <div className="result-metrics"><ServiceRing total={row?.service_level_total} critical={row?.service_level_critical}/><div className="service-values"><div><span><i className="dot blue"/>Общий сервис</span><strong data-testid="service-total">{percent(row?.service_level_total)}</strong></div><div><span><i className="dot green"/>Критический</span><strong>{percent(row?.service_level_critical)}</strong></div>{otherRow && <small>Второй сценарий: {percent(otherRow.service_level_total)} / {percent(otherRow.service_level_critical)}</small>}</div></div>
    <div className="chart-mode" aria-label="Показатель графика"><button type="button" aria-pressed={chart === 'inventory'} onClick={() => setChart('inventory')}>Запас по дням</button><button type="button" aria-pressed={chart === 'cost'} onClick={() => setChart('cost')}>Затраты</button></div>
    {w.displayOther && !other && <p className="comparison-caption">Второй сценарий использует другие единицы. Сопоставление скрыто.</p>}
    {other && chart === 'inventory' && <div className="daily-detail-switch" aria-label="Сценарий дневных событий">
      <span>Поступления и дефицит:</span>
      <button type="button" aria-pressed={detailSide === 'primary'} onClick={() => setDetailSide('primary')}>{scenarioCode(result)}</button>
      <button type="button" aria-pressed={detailSide === 'other'} onClick={() => setDetailSide('other')}>{scenarioCode(other)}</button>
    </div>}
    <div className="result-chart-area">
      {chart === 'inventory' && typeof year === 'number'
        ? <DailyChart result={detailResult} other={detailOther} year={year} selectedDay={selectedDay} onSelectDay={setSelectedDay} onProposeDeliveryDate={(from,to) => setProposal({year,from,to,scenario:detailResult.scenario_id,volume:dailyRecordAt(detailResult,year,from)?.delivered_t})}/>
        : chart === 'cost' && other
          ? <AnalyticsChart years={years} series={costSeries} unit="млн у.е." selected={year} onSelect={setSelected}/>
          : <FinanceChart rows={result.financial_breakdown || []} selected={year} onSelect={setSelected}/>}
    </div>
    {years.length > 1 && index >= 0 && <div className="year-slider"><Range label="Год показателей" value={index} max={years.length - 1} onChange={value => setSelected(years[value])}/><div><span>{years[0]}</span><span>{years.at(-1)}</span></div></div>}
    {!row && <p className="inline-warning">Нет данных за {year}</p>}
    <div className="result-numbers"><div><span>Дефицит</span><strong className={(row?.shortage_t || 0) > 0 ? 'warning-text' : ''}>{number(row?.shortage_t)}<small> т</small></strong></div><div><span>Запас на конец</span><strong>{number(row?.closing_inventory_t)}<small> т</small></strong></div><div><span>Расходы за год</span><strong>{number(financial?.total)}<small> млн</small></strong></div></div>
    <div className="compact-checks"><button type="button" className="check-summary" onClick={onDetails}><span><Icon name={failed.length ? 'alert' : 'check'} size={15}/>{checks.length ? (failed.length ? `${failed.length} нарушений за горизонт` : 'Нет нарушений в ответе') : 'Проверки не переданы'}</span><Icon name="right" size={15}/></button>
      <div className="check-preview">{yearFails.slice(0, 2).map((check, checkIndex) => <p key={checkIndex} title={check.detail}><b>{check.year}</b><span>{checkLabels[check.constraint_id] || check.constraint_id}</span><small>{check.excess == null ? '' : number(check.excess)}</small></p>)}</div>
    </div>
    <div className="result-footer"><span>{scenario(result.scenario_id)}</span><button className="text-button" type="button" onClick={onDetails}>Все значения<Icon name="right" size={12}/></button></div>
    {proposal && <Modal title="Предложение переноса поставки" onClose={() => setProposal(null)}>
      <div className="delivery-proposal">
        <Notice>Макет для согласования с бэком. Перенос не отправляется и не меняет расчёт.</Notice>
        <div className="daily-detail-grid"><div><span>Сценарий / год модели</span><strong>{scenario(proposal.scenario)} / {proposal.year}</strong></div><div><span>Текущий день</span><strong>{proposal.from}</strong></div><div><span>Поступление, т</span><strong>{number(proposal.volume)}</strong></div></div>
        <label>Предложенный день модели <input type="number" min={1} max={365} value={proposal.to} onChange={event => {const value=event.target.valueAsNumber;if(Number.isInteger(value) && value>=1 && value<=365)setProposal({...proposal,to:value});}}/></label>
        <input type="range" aria-label="Предложенная дата поставки" value={proposal.to} min={1} max={365} onChange={event => setProposal({...proposal,to:event.target.valueAsNumber})}/>
        <p>Сводное поступление за день. Отдельные заявки и поставщики в дневном ответе модели пока не выделены.</p>
        <button type="button" className="text-button" onClick={() => setProposal(null)}>Закрыть предложение</button>
      </div>
    </Modal>}
    {selectedDay !== null && <Modal title={`День модели ${selectedDay}`} wide onClose={() => setSelectedDay(null)}>
      <div className="daily-detail" data-testid="daily-detail">
        {other && <div className="daily-detail-switch" aria-label="Сценарий подробностей"><span>Сценарий:</span><button type="button" aria-pressed={detailSide === 'primary'} onClick={() => setDetailSide('primary')}>{scenarioCode(result)}</button><button type="button" aria-pressed={detailSide === 'other'} onClick={() => setDetailSide('other')}>{scenarioCode(other)}</button></div>}
        <DailyChart result={detailResult} other={detailOther} year={year} range={[selectedDay - 14, selectedDay + 14]} selectedDay={selectedDay} onSelectDay={setSelectedDay}/>
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
