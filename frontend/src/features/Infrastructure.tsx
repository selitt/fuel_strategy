import { useState } from 'react';
import { Modal } from '../components/Ui';
import type { Workspace } from '../state/useWorkspace';
import { Toggle } from '../components/Controls';
import { matrixYears, setInvestment } from '../lib/matrix';
import { number } from '../lib/format';

const storageInvestment = { id: 'ZBO', defaultYear: 2036 };

export function Infrastructure({ w, onAdvanced, onData }: {
    w: Workspace;
    onAdvanced: () => void;
    onData: () => void;
}) {
    const [help,setHelp]=useState(false);
    if (!w.draft)
        return null;
    const plan = w.draft, inventory = plan.decisions.inventory_policy.initial_inventory_t;
    const investments = w.catalog?.tables.find(table => table.table_id === 'investment_options')?.rows || [];
    const storage = w.catalog?.tables.find(table => table.table_id === 'storage_options')?.rows || [];
    const baseStorage = storage.find(item => item.storage_id === "BASE");
    const cap = baseStorage ? Number(baseStorage.capacity_t) : NaN;
    const records = plan.decisions.investments.filter(row => row.investment_id === storageInvestment.id);
    const row = records[0];
    const reference = investments.find(item => item.investment_id === storageInvestment.id);
    const modelYears = matrixYears(plan, w.catalog);
    const years = [...new Set([...modelYears, storageInvestment.defaultYear, ...records.map(item => item.year)])].sort((a, b) => a - b);
    const changeInventory = (value: number) => w.setDraft({ ...plan, decisions: { ...plan.decisions, inventory_policy: { ...plan.decisions.inventory_policy, initial_inventory_t: value } } });

    return <aside className="infrastructure panel simple-storage" aria-labelledby="infrastructure-title">
      <div className="panel-heading"><h2 id="infrastructure-title"><button type="button" className="text-button" onClick={()=>setHelp(true)}>Запас и хранение ⓘ</button></h2><button type="button" className="text-button" onClick={onData}>Исходные данные →</button></div>
      <fieldset disabled={!!w.busy||w.immutable} className="storage-inline">
        <label className="stock-field">Начальный запас, т<input type="number" min={0} step="any" aria-label="Начальный запас топлива, т" aria-invalid={!Number.isFinite(inventory)||inventory<0} value={Number.isFinite(inventory)?inventory:''} onChange={e=>changeInventory(e.target.value===''?NaN:e.target.valueAsNumber)}/></label>
        <div className="storage-zbo"><div><span>Снижение потерь · ZBO</span>{records.length>1?<button type="button" className="text-button" onClick={onAdvanced}>{records.length} записи →</button>:<Toggle label="Включить снижение потерь (ZBO)" checked={!!row} onChange={yes=>w.setDraft(setInvestment(plan,storageInvestment.id,yes?storageInvestment.defaultYear:null))}/>}</div>
         <label>Год решения<select aria-label="Год решения ZBO" disabled={!row||records.length>1} value={row?.year??storageInvestment.defaultYear} onChange={e=>w.setDraft(setInvestment(plan,storageInvestment.id,Number(e.target.value)))}>{years.map(year=><option key={year}>{year}</option>)}</select><span>Вложения: {reference?number(Number(reference.total_capex_mln)):'—'} млн у.е.</span></label>
        </div>
      </fieldset>
      {(!Number.isFinite(inventory)||inventory<0)&&<p className="field-error">Начальный запас: введите число не меньше нуля.</p>}
      {inventory>cap&&<p className="field-error">Запас выше базовой ёмкости {number(cap)} т. Проверьте ограничения хранилища.</p>}
      {help && <Modal title="Запас и хранение" onClose={()=>setHelp(false)}><p>Начальный запас — топливо к началу первого года модели. Пока его стоимость оценивается по цене Earth-Core из справочника; отдельные источник, дата и финансирование предстартовой поставки ещё не задаются. Это ограничение прототипа, а не полное обоснование запаса. ZBO — инвестиция в снижение потерь при хранении; текущая модель не обнуляет потери. Год решения не задаёт отдельные даты оплаты и ввода.</p></Modal>}
    </aside>;
}
