import type { Workspace } from '../state/useWorkspace';
import type { MatrixKey, MatrixSource } from '../lib/matrix';
import { matrixSources, matrixYears, readCell, setInvestment, writeCell } from '../lib/matrix';
import { number } from '../lib/format';
import { StepNumber, Range, Toggle } from '../components/Controls';
import { Icon } from '../components/Icon';
const colorClass: Record<string, string> = { 'Earth-Core': 'core', 'Earth-Flex': 'flex', Emergency: 'emergency', 'Lunar-ISRU': 'lunar', 'Earth-New': 'new' };
const sourceInvestments: Record<string, { id: string; defaultYear: number }> = {
    'Lunar-ISRU': { id: 'LUNAR_ISRU', defaultYear: 2038 },
    'Earth-New': { id: 'EARTH_NEW', defaultYear: 2036 },
};
export function SupplyMatrix({ w, onAdvanced, onSource }: {
    w: Workspace;
    onAdvanced: () => void;
    onSource: (s: MatrixSource) => void;
}) {
    const selected = w.selection, setSelected = w.setSelection;
    if (!w.draft)
        return null;
    const plan = w.draft, sources = matrixSources(plan, w.catalog), years = matrixYears(plan, w.catalog);
    const investments = w.catalog?.tables.find(t => t.table_id === 'investment_options')?.rows || [];
    const s = selected ? sources.find(r => r.key === selected.source) : sources[0], year = selected?.year ?? years[0];
    const editing = s && years.includes(year) ? { source: s, year } : null;
    const focus = (source: MatrixSource, y: number) => setSelected({ source: source.key, year: y });
    function inactive(source: MatrixSource, y: number) {
        const required = source.key === 'Lunar-ISRU' ? 'LUNAR_ISRU' : source.key === 'Earth-New' ? 'EARTH_NEW' : null;
        if (required && !plan.decisions.investments.some(r => r.investment_id === required))
            return 'Включите инвестицию ' + source.label;
        const from = Number(source.reference?.available_from_year);
        if (from && y < from)
            return 'В справочнике доступен с ' + from;
        return '';
    }
    function change(key: MatrixKey, source: MatrixSource, y: number, value: number) { w.setDraft(writeCell(plan, key, source, y, value)); }
    const cellOrder = editing ? readCell(plan, 'supply_orders', editing.source, year) : null;
    const cellReserve = editing ? readCell(plan, 'capacity_reservations', editing.source, year) : null;
    const warning = editing && inactive(editing.source, year);
    const over = cellOrder?.value !== null && cellReserve?.value !== null && s?.key !== 'Lunar-ISRU' && (cellOrder?.value || 0) > (cellReserve?.value || 0);
    return <section className="supply-panel panel" aria-labelledby="matrix-title">
  <div className="panel-heading"><div><h2 id="matrix-title">Матрица снабжения</h2></div><span className="horizon">{years[0]}<span>—</span>{years.at(-1)}</span></div>
  <div className="matrix-legend"><span><i className="order-dot"/>Заказ, т</span><span><i className="reserve-dot"/>Бронь, т/год</span><button type="button" className="text-button" onClick={onAdvanced}>Полные записи<Icon name="right" size={12}/></button></div>
  <fieldset disabled={!!w.busy} className="matrix-fieldset"><div className="matrix-viewport"><table className="supply-matrix"><caption className="sr-only">Заказы и резервирование: источники по строкам, годы по столбцам</caption><thead><tr><th scope="col">Источник</th>{years.map(y => <th key={y} scope="col" className={editing?.year === y ? 'selected-year' : ''}>{y}</th>)}</tr></thead><tbody>
   {sources.map(source => {
            const definition = sourceInvestments[source.key];
            const records = definition ? plan.decisions.investments.filter(r => r.investment_id === definition.id) : [];
            const investment = records[0];
            const reference = definition ? investments.find(r => r.investment_id === definition.id) : undefined;
            const investmentYears = definition ? [...new Set([...years, definition.defaultYear, ...records.map(r => r.year)])].sort((a, b) => a - b) : [];
            return <tr key={source.key}><th scope="row"><div className="matrix-source-cell"><button type="button" className={`source-label ${colorClass[source.key] || 'custom'}`} onClick={() => onSource(source)}><i /><span><strong>{source.label}</strong></span></button>{definition && <div className={`source-investment ${investment ? 'enabled' : ''}`}>
     {records.length > 1 ? <button type="button" className="text-button" onClick={onAdvanced}>{records.length} записи</button> : <Toggle label={`Включить инвестицию ${source.label}`} checked={!!investment} onChange={yes => w.setDraft(setInvestment(plan, definition.id, yes ? definition.defaultYear : null))}/>}<select title={reference?.commissioning_rule} aria-label={`Год инвестиции ${source.label}`} disabled={!investment || records.length > 1} value={investment?.year || definition.defaultYear} onChange={e => w.setDraft(setInvestment(plan, definition.id, Number(e.target.value)))}>{investmentYears.map(y => <option key={y}>{y}</option>)}</select><span>CAPEX <strong>{reference ? number(Number(reference.total_capex_mln)) : '—'}</strong></span>
    </div>}</div></th>
    {years.map(y => {
                const a = readCell(plan, 'supply_orders', source, y), b = readCell(plan, 'capacity_reservations', source, y), locked = inactive(source, y);
                const hasRecords = a.indices.length > 0 || b.indices.length > 0;
                const disabled = !!locked && !hasRecords;
                const collision = a.indices.length > 1 || b.indices.length > 1;
                const excess = source.key !== 'Lunar-ISRU' && a.value !== null && b.value !== null && a.value > b.value;
                const active = editing?.source.key === source.key && editing.year === y;
                return <td key={y} className={`${active ? 'active-cell' : ''} ${disabled ? 'locked-cell' : ''} ${excess ? 'warning-cell' : ''}`} onFocus={() => focus(source, y)}>
      {collision ? <button type="button" className="collision-button" title="Записи не объединяются. Откройте для раздельного редактирования." onClick={onAdvanced}><Icon name="alert" size={12}/>{Math.max(a.indices.length, b.indices.length)} записи</button> : <div className="cell-pair" title={locked || (excess ? 'Заказ превышает бронь. Проверьте условия канала.' : '')}>
       <div className="order-input"><i /><StepNumber compact value={a.value} disabled={disabled} label={`Заказ ${source.label} ${y}`} onFocus={() => focus(source, y)} onChange={v => change('supply_orders', source, y, v)}/></div>
       <div className="reserve-input"><i /><StepNumber compact value={b.value} disabled={disabled} label={`Бронь ${source.label} ${y}`} onFocus={() => focus(source, y)} onChange={v => change('capacity_reservations', source, y, v)}/></div>
      </div>}
     </td>;
            })}</tr>;
        })}
  </tbody></table></div></fieldset>
  {editing && <div className="cell-inspector"><div className="inspector-heading"><span><strong>{editing.source.label}</strong><span className="muted"> / {year}</span></span><small>{warning ? <><Icon name="lock" size={11}/>{warning}</> : over ? <><Icon name="alert" size={11}/>Заказ выше брони</> : <>Мощность: {number(Number(editing.source.reference?.capacity_t_per_year) || undefined)} т/год</>}</small></div><fieldset disabled={!!w.busy}><div className="inspector-controls">
   {([['supply_orders', 'Заказ', 'т', cellOrder], ['capacity_reservations', 'Бронь', 'т/год', cellReserve]] as const).map(([key, title, unit, cell]) => <div className="inspector-control" key={key}><label>{title}<span>{unit}</span></label>{cell && cell.indices.length <= 1 ? <><StepNumber value={cell.value} label={`${title} выбранной ячейки`} disabled={!!warning && cellOrder?.indices.length === 0 && cellReserve?.indices.length === 0} onChange={v => change(key, editing.source, year, v)}/><Range value={cell.value} max={Number(editing.source.reference?.capacity_t_per_year) || 500} label={`${title}: ползунок`} disabled={!!warning && cellOrder?.indices.length === 0 && cellReserve?.indices.length === 0} onChange={v => change(key, editing.source, year, v)}/></> : <button className="text-button" type="button" onClick={onAdvanced}>Открыть записи</button>}</div>)}
  </div></fieldset></div>}

  {!editing && selected && <div className="cell-inspector"><div className="inspector-heading"><strong>{selected.source} / {selected.year}</strong><span>Нет записи в плане</span></div><button type="button" className="text-button" onClick={onAdvanced}>Полные записи</button></div>}
 </section>;
}
