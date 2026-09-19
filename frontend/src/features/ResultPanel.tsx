import { useState } from 'react';
import type { Workspace } from '../state/useWorkspace';
import type { Result } from '../api/types';
import { AnalyticsChart, FinanceChart, ServiceRing, palette } from '../components/AnalyticsChart';
import type { Trace } from '../components/AnalyticsChart';
import { Icon } from '../components/Icon';
import { number, percent, scenario, supportedUnits } from '../lib/format';
import { Range } from '../components/Controls';
const checkLabels: Record<string, string> = { RESERVE_45D: 'Резерв на 45 дней', BASE_CRITICAL_SERVICE: 'Критический сервис', BASE_TOTAL_SERVICE: 'Общий сервис', CAPACITY_EXCEEDED: 'Мощность источника', STORAGE_OVERFLOW: 'Переполнение', CAPEX_2037: 'CAPEX до 2037', CAPEX_2040: 'CAPEX до 2040', STRESS_LOSS_LIMIT: 'Потери', EMERGENCY_BASE_STREAK: 'Роль Emergency' };
export function ResultPanel({ w, onDetails }: {
    w: Workspace;
    onDetails: () => void;
}) {
    const [selected, setSelected] = useState<number | null>(null), [chart, setChart] = useState<'supply' | 'inventory' | 'cost'>('supply');
    const run = w.current ? w.project?.last_run : null, result = run?.result;
    if (!result)
        return <section className="result-panel panel result-empty" aria-label="Результат расчёта"><div className="panel-heading"><h2>Результат</h2><Icon name="chart" size={17}/></div><div className="empty-result-body"><svg width="172" height="138" viewBox="0 0 172 138" aria-hidden="true"><defs><linearGradient id="emptyRing"><stop stopColor="#72cfff"/><stop offset="1" stopColor="#7de0bc"/></linearGradient></defs><circle cx="86" cy="68" r="41" fill="none" stroke="var(--grid)"/><ellipse cx="86" cy="68" rx="77" ry="27" fill="none" stroke="var(--grid)" transform="rotate(-24 86 68)"/><path d="M45 68a41 41 0 0 1 71-28" stroke="url(#emptyRing)" strokeWidth="2.5" fill="none"/><circle cx="116" cy="40" r="4" fill="#7de0bc"/><path d="M74 76V58h11M81 68h13M88 61l7 7-7 7" stroke="#72cfff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg><h3>{w.project?.last_run ? 'План изменён' : 'Решения слева. Эффект здесь.'}</h3><p>{w.project?.last_run ? 'Пересчитайте: прежние графики скрыты, чтобы не смешивать разные входы.' : 'Заполните матрицу и нажмите «Рассчитать». Модель вернёт поставки, затраты и ограничения.'}</p><div className="empty-result-labels"><span>Поставки</span><span>Запасы</span><span>Затраты</span></div></div><div className="result-footer">Без подставленных результатов</div></section>;
    if (!supportedUnits(result.units))
        return <section className="panel result-panel"><div className="panel-heading"><h2>Результат</h2></div><p className="inline-warning">Единицы результата отличаются от т / млн у.е. Графики скрыты; исходный ответ сохранён в JSON.</p><button className="text-button" onClick={onDetails}>Открыть ответ</button></section>;
    const balances = result.yearly_balance || [], years = balances.map(b => b.year), year = years.includes(selected || -1) ? selected! : years[0];
    const row = balances.find(b => b.year === year), financial = result.financial_breakdown?.find(f => f.year === year);
    const index = years.indexOf(year), pair = w.both ? w.pair : null;
    const other = pair && supportedUnits(pair.other.units) ? pair.other : undefined;
    const otherRow = other?.yearly_balance?.find(b => b.year === year);
    const pairCompatible = other && supportedUnits(other.units);
    const series: Trace[] = other && pairCompatible ? [
        { key: 'base', label: result.scenario_id === 'BASE' ? 'BASE' : 'STRESS', color: palette.blue, area: true, values: years.map(y => valueAt(result, y, chart)) },
        { key: 'other', label: other.scenario_id === 'BASE' ? 'BASE' : 'STRESS', color: palette.amber, dashed: true, values: years.map(y => valueAt(other, y, chart)) },
    ] : chart === 'supply' ? [
        { key: 'delivered', label: 'Поставка', values: balances.map(b => b.delivered_t), color: palette.blue, area: true },
        { key: 'demand', label: 'Спрос', values: balances.map(b => b.demand_total_t), color: palette.muted, dashed: true },
        { key: 'served', label: 'Выдано', values: balances.map(b => b.served_t), color: palette.green },
    ] : [
        { key: 'opening', label: 'На начало', values: balances.map(b => b.opening_inventory_t), color: palette.blue, area: true },
        { key: 'closing', label: 'На конец', values: balances.map(b => b.closing_inventory_t), color: palette.green },
        { key: 'target', label: 'Резерв', values: balances.map(b => b.reserve_45d_target_t), color: palette.amber, dashed: true },
    ];
    const checks = result.constraint_checks || [], failed = checks.filter(c => !c.passed), yearFails = failed.filter(c => c.year === year);
    return <section className="result-panel panel" aria-labelledby="result-title">
  <div className="panel-heading"><h2 id="result-title">{other ? 'Сравнение сценариев' : 'Результат'}</h2><div className="year-nav"><button type="button" className="icon-button" aria-label="Предыдущий год" disabled={index <= 0} onClick={() => setSelected(years[index - 1])}><Icon name="left" size={14}/></button><strong>{year || '—'}</strong><button type="button" className="icon-button" aria-label="Следующий год" disabled={index === years.length - 1} onClick={() => setSelected(years[index + 1])}><Icon name="right" size={14}/></button></div></div>
  <div className="result-metrics page-enter" key={run?.run_id}><ServiceRing total={row?.service_level_total} critical={row?.service_level_critical}/><div className="service-values"><div><span><i className="dot blue"/>Общий сервис</span><strong data-testid="service-total">{percent(row?.service_level_total)}</strong></div><div><span><i className="dot green"/>Критический</span><strong>{percent(row?.service_level_critical)}</strong></div>{otherRow && <small>Второй сценарий: {percent(otherRow.service_level_total)} / {percent(otherRow.service_level_critical)}</small>}</div></div>
  <div className="chart-mode" aria-label="Показатель графика">{([['supply', 'Поток'], ['inventory', 'Запас'], ['cost', 'Затраты']] as const).map(([key, title]) => <button type="button" aria-pressed={chart === key} key={key} onClick={() => setChart(key)}>{title}</button>)}</div>
  {pair && !other && <p className="comparison-caption">Второй сценарий использует другие единицы. Сопоставление скрыто.</p>}
  {other && <p className="comparison-caption">Одни решения · {chart === 'supply' ? 'фактическая поставка' : chart === 'inventory' ? 'запас на начало' : 'годовые расходы'}</p>}
  {chart === 'cost' && !other ? <FinanceChart key="finance" rows={result.financial_breakdown || []} selected={year} onSelect={setSelected}/> : <AnalyticsChart key={chart + (other ? "-comparison" : "")} years={years} series={series} unit={chart === 'cost' ? 'млн у.е.' : 'т'} selected={year} onSelect={setSelected}/>}
  {years.length > 1 && <div className="year-slider"><Range label="Год показателей" value={index} max={years.length - 1} onChange={i => setSelected(years[i])}/><div><span>{years[0]}</span><span>{years.at(-1)}</span></div></div>}
  <div className="result-numbers"><div><span>Дефицит</span><strong className={(row?.shortage_t || 0) > 0 ? 'warning-text' : ''}>{number(row?.shortage_t)}<small> т</small></strong></div><div><span>Запас на конец</span><strong>{number(row?.closing_inventory_t)}<small> т</small></strong></div><div><span>Расходы за год</span><strong>{number(financial?.total)}<small> млн</small></strong></div></div>
  <div className="compact-checks"><button type="button" className="check-summary" onClick={onDetails}><span><Icon name={failed.length ? 'alert' : 'check'} size={15}/>{checks.length ? (failed.length ? `${failed.length} нарушений за горизонт` : 'Переданные проверки выполнены') : 'Проверки не переданы'}</span><Icon name="right" size={15}/></button>
   <div className="check-preview">{yearFails.slice(0, 2).map((c, i) => <p key={i} title={c.detail}><b>{c.year}</b><span>{checkLabels[c.constraint_id] || c.constraint_id}</span><small>{c.excess == null ? '' : number(c.excess)}</small></p>)}{!yearFails.length && <p className="quiet-check">{checks.length ? 'За выбранный год нарушений не передано.' : 'Отсутствие проверок не означает выполнимость.'}</p>}</div>
  </div>
  <div className="result-footer"><span>{run?.origin === 'imported' ? 'Импортированный результат' : w.both && !pair ? 'Второй сценарий ещё не рассчитан' : `${scenario(result.scenario_id)} · ответ модели`}</span><button className="text-button" type="button" onClick={onDetails}>Все значения<Icon name="right" size={12}/></button></div>
 </section>;
}
function valueAt(result: Result, year: number, chart: string) {
    const b = result.yearly_balance?.find(b => b.year === year);
    return chart === 'supply' ? b?.delivered_t : chart === 'inventory' ? b?.opening_inventory_t : result.financial_breakdown?.find(f => f.year === year)?.total;
}
