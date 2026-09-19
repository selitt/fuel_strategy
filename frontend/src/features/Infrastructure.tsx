import type { Workspace } from '../state/useWorkspace';
import { Icon } from '../components/Icon';
import { StepNumber, Range, Toggle } from '../components/Controls';
import { matrixYears, setInvestment } from '../lib/matrix';
import { number } from '../lib/format';
const storageInvestment = { id: 'ZBO', defaultYear: 2036 };
export function Infrastructure({ w, onAdvanced, onData }: {
    w: Workspace;
    onAdvanced: () => void;
    onData: () => void;
}) {
    if (!w.draft)
        return null;
    const plan = w.draft, inventory = plan.decisions.inventory_policy.initial_inventory_t;
    const investments = w.catalog?.tables.find(t => t.table_id === 'investment_options')?.rows || [];
    const storage = w.catalog?.tables.find(t => t.table_id === 'storage_options')?.rows || [];
    const cap = Number(storage[0]?.capacity_t) || 70;
    const records = plan.decisions.investments.filter(r => r.investment_id === storageInvestment.id);
    const row = records[0];
    const reference = investments.find(r => r.investment_id === storageInvestment.id);
    const years = [...new Set([...matrixYears(plan, w.catalog), storageInvestment.defaultYear, ...records.map(r => r.year)])].sort((a, b) => a - b);
    const changeInventory = (v: number) => w.setDraft({ ...plan, decisions: { ...plan.decisions, inventory_policy: { ...plan.decisions.inventory_policy, initial_inventory_t: v } } });
    return <aside className="infrastructure panel" aria-label="Инфраструктура">
  <div className="panel-heading"><h2>Хранилище</h2><button type="button" className="icon-button" title="Справочники и параметры" aria-label="Исходные данные" onClick={onData}><Icon name="info" size={16}/></button></div>
  <fieldset disabled={!!w.busy} className="storage-controls">
   <div className="inventory-control"><label>Начальный запас <span>т</span></label><div><StepNumber value={inventory} label="Начальный запас, т" onChange={changeInventory} step={1}/></div><Range value={inventory} max={cap} label="Изменить начальный запас" onChange={changeInventory} step={.01}/><div className="range-scale"><span>0</span><span>{number(cap)} т</span></div>{(!Number.isFinite(inventory) || inventory < 0) && <p className="field-error">Введите запас не меньше нуля.</p>}</div>
   <div className={`storage-investment ${row ? 'enabled' : ''}`}>
    <div className="storage-investment-name"><Icon name="box" size={17}/><strong>ZBO</strong></div>
    {records.length > 1 ? <button type="button" className="text-button" onClick={onAdvanced}>{records.length} записи</button> : <Toggle label="Включить ZBO" checked={!!row} onChange={yes => w.setDraft(setInvestment(plan, storageInvestment.id, yes ? storageInvestment.defaultYear : null))}/>}<select title={reference?.commissioning_rule} aria-label="Год ZBO" disabled={!row || records.length > 1} value={row?.year || storageInvestment.defaultYear} onChange={e => w.setDraft(setInvestment(plan, storageInvestment.id, Number(e.target.value)))}>{years.map(y => <option key={y}>{y}</option>)}</select>
    <span className="storage-capex">CAPEX <strong>{reference ? number(Number(reference.total_capex_mln)) : '—'}</strong> млн</span>
   </div>
  </fieldset>
 </aside>;
}
