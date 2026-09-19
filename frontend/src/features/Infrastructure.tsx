import type { Workspace } from '../state/useWorkspace';
import type { IconName } from '../components/Icon';
import { Icon } from '../components/Icon';
import { StepNumber, Range, Toggle } from '../components/Controls';
import { matrixYears, setInvestment } from '../lib/matrix';
import { number } from '../lib/format';
const definitions: {
    id: string;
    name: string;
    subtitle: string;
    icon: IconName;
    defaultYear: number;
}[] = [
    { id: 'ZBO', name: 'Хранилище ZBO', subtitle: 'Модернизация', icon: 'box', defaultYear: 2036 },
    { id: 'LUNAR_ISRU', name: 'Lunar-ISRU', subtitle: 'Лунное производство', icon: 'moon', defaultYear: 2038 },
    { id: 'EARTH_NEW', name: 'Earth-New', subtitle: 'Новый поставщик', icon: 'globe', defaultYear: 2036 },
];
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
    const changeInventory = (v: number) => w.setDraft({ ...plan, decisions: { ...plan.decisions, inventory_policy: { ...plan.decisions.inventory_policy, initial_inventory_t: v } } });
    return <aside className="infrastructure panel" aria-label="Инфраструктура">
  <div className="panel-heading"><h2>Инфраструктура</h2><button type="button" className="icon-button" title="Справочники и параметры" aria-label="Исходные данные" onClick={onData}><Icon name="info" size={16}/></button></div>
  <fieldset disabled={!!w.busy}>
   <div className="inventory-control"><label>Начальный запас <span>т</span></label><StepNumber value={inventory} label="Начальный запас, т" onChange={changeInventory} step={1}/><Range value={inventory} max={cap} label="Изменить начальный запас" onChange={changeInventory} step={.01}/><div className="range-scale"><span>0 т</span><span>{number(cap)} т</span></div>{(!Number.isFinite(inventory) || inventory < 0) && <p className="field-error">Введите запас не меньше нуля.</p>}</div>
   <div className="investments-label">Инвестиции</div>
   {definitions.map(def => {
            const records = plan.decisions.investments.filter(r => r.investment_id === def.id), row = records[0], reference = investments.find(r => r.investment_id === def.id);
            const years = [...new Set([...matrixYears(plan, w.catalog), def.defaultYear, ...records.map(r => r.year)])].sort((a, b) => a - b);
            return <div key={def.id} className={`investment ${row ? 'enabled' : ''}`}>
      <div className="investment-top"><Icon name={def.icon} size={19}/><span><strong>{def.name}</strong><small>{def.subtitle}</small></span>{records.length > 1 ? <button type="button" className="text-button" onClick={onAdvanced}>{records.length} записи</button> : <Toggle label={`Включить ${def.id}`} checked={!!row} onChange={yes => w.setDraft(setInvestment(plan, def.id, yes ? def.defaultYear : null))}/>}</div>
      <div className="investment-bottom"><span title={reference?.commissioning_rule}>Год модели</span><select aria-label={`Год ${def.id}`} disabled={!row || records.length > 1} value={row?.year || def.defaultYear} onChange={e => w.setDraft(setInvestment(plan, def.id, Number(e.target.value)))}>{years.map(y => <option key={y}>{y}</option>)}</select></div>
      <p className="investment-price">CAPEX <strong>{reference ? number(Number(reference.total_capex_mln)) : '—'}</strong><span>млн у.е.</span></p>
    </div>;
        })}
  </fieldset>
  <div className="infra-footer"><p>Даты и ограничения проверяет модель.</p></div>
 </aside>;
}
