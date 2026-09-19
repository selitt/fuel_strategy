import { useState } from 'react';
import type { Workspace } from '../state/useWorkspace';
import { number, percent, date, supportedUnits } from '../lib/format';
import { Notice } from '../components/Ui';
export function ResultDetails({ w }: {
    w: Workspace;
}) {
    const [tab, setTab] = useState<'balance' | 'finance' | 'checks' | 'source'>('checks');
    const run = w.current && !w.preview ? w.project?.last_run : null, r = w.displayResult;
    if (!r)
        return <Notice>Сначала пересчитайте план. Устаревший результат не отображается.</Notice>;
    if (!supportedUnits(r.units))
        return <><Notice tone="warning">Единицы модели не совпадают с т / млн у.е. Ответ показан без переименования величин.</Notice><pre>{JSON.stringify(r, null, 2)}</pre></>;
    const years = r.yearly_balance || [];
    return <div className="result-details"><div className="segmented">{([['checks', 'Нарушения'], ['balance', 'Баланс'], ['finance', 'Затраты'], ['source', 'Происхождение']] as const).map(([k, title]) => <button type="button" key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{title}</button>)}</div>
  {tab === 'checks' && <><p className="help">Все проверки ответа модели. Единица отклонения в текущем DTO не выделена — она раскрывается в причине.</p><div className="table-wrap"><table><thead><tr><th>Год</th><th>Проверка</th><th>Результат</th><th>Причина</th><th>Отклонение</th></tr></thead><tbody>{r.constraint_checks?.map((c, i) => <tr key={i}><td>{c.year}</td><td>{c.constraint_id}</td><td className={!c.passed ? 'warning-text' : ''}>{c.passed ? 'Выполнено' : 'Нарушено'}</td><td>{c.detail}</td><td>{number(c.excess)}</td></tr>)}</tbody></table></div></>}
  {tab === 'balance' && <div className="table-wrap"><table><thead><tr><th>Показатель</th>{years.map(b => <th key={b.year}>{b.year}</th>)}</tr></thead><tbody>{([
                ['demand_total_t', 'Общий спрос, т'], ['demand_critical_t', 'Критический спрос, т'], ['delivered_t', 'Поставлено, т'], ['served_t', 'Выдано, т'], ['shortage_t', 'Дефицит, т'], ['losses_t', 'Потери, т'], ['opening_inventory_t', 'Запас на начало, т'], ['closing_inventory_t', 'Запас на конец, т'], ['reserve_45d_target_t', 'Резерв на 45 дней, т'], ['service_level_total', 'Общий сервис'], ['service_level_critical', 'Критический сервис'],
            ] as const).map(([key, label]) => <tr key={key}><th>{label}</th>{years.map(b => <td key={b.year} className="numeric">{key.startsWith('service_') ? percent(b[key]) : number(b[key])}</td>)}</tr>)}</tbody></table></div>}
  {tab === 'finance' && <><p className="help">Расходы в млн условных денежных единиц, не прибыль. Всего: {number(r.total_cost_mln)}.</p><div className="table-wrap"><table><thead><tr><th>Год</th><th>Закупка</th><th>Бронь</th><th>Хранение</th><th>CAPEX</th><th>OPEX</th><th>Всего</th></tr></thead><tbody>{r.financial_breakdown?.map(f => <tr key={f.year}><th>{f.year}</th>{(['procurement', 'reservation', 'holding', 'capex', 'opex', 'total'] as const).map(k => <td key={k} className="numeric">{number(f[k])}</td>)}</tr>)}</tbody></table></div></>}
  {tab === 'source' && <><p className="help">{run ? `${date(run.created_at)} · ${run.engine.engine_id} · ${run.engine.version} · ревизия ${run.input_revision}` : `Предпросмотр /api/calc · ${date(w.preview?.createdAt || '')}`} </p><Notice>Используется имеющееся в архиве ядро. Его математическая приёмка не подтверждается интерфейсом или веб-тестами.</Notice><p className="help">Ссылка на допущения из ответа: <code>{JSON.stringify(r.assumptions_reference)}</code></p><details className="disclosure"><summary>Поставки по каналам</summary><pre>{JSON.stringify(r.source_schedule, null, 2)}</pre></details><details className="disclosure"><summary>Внутригодовые данные и риски</summary><pre>{JSON.stringify({ inventory_trace: r.inventory_trace, risk_register: r.risk_register }, null, 2)}</pre></details><details className="disclosure"><summary>Весь ответ модели</summary><pre>{JSON.stringify(r, null, 2)}</pre></details></>}
 </div>;
}
