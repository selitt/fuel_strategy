import { useMemo, useState } from 'react';
import { Button, Notice } from '../components/Ui';
import type { MatrixSource } from '../lib/matrix';
import {
  annualReliabilityYears,
  applySourceDraft,
  makePlanSourceDraft,
  makeSourceDraft,
  validateSourceDraft,
} from '../lib/sourceOverrides';
import type { SourceDraft } from '../lib/sourceOverrides';
import type { Workspace } from '../state/useWorkspace';
import { columnLabels } from '../lib/catalog';

const numericFields = [
  ['capacity_t_per_year', 'Мощность, т/год'],
  ['variable_cost_mln_per_t', 'Цена, млн у.е./т'],
  ['reservation_rate_mln_per_t_year_capacity', 'Резерв: годовой тариф'],
  ['take_or_pay_share', 'Take-or-pay, доля'],
] as const;

export function SourceEditor({w, source, onClose}: {w: Workspace; source: MatrixSource; onClose: () => void}) {
  const plan = w.draft;
  const reference = source.originalReference ?? source.reference;
  const [draft, setDraft] = useState<SourceDraft | null>(() => plan && reference ? makePlanSourceDraft(plan, reference) : null);
  const [submitted, setSubmitted] = useState(false);
  const modelYears = useMemo(() => (w.catalog?.tables.find(table => table.table_id === 'demand')?.rows ?? []).map(row => Number(row.year)).filter(Number.isInteger).sort((a, b) => a - b), [w.catalog]);
  const errors = useMemo(() => draft && reference ? validateSourceDraft(draft, reference, modelYears) : {}, [draft, reference, modelYears]);
  if (!plan || !reference || !draft || !['A', 'B', 'C', 'D', 'E'].includes(reference.source_id)) {
    return <><p className="help">Для этого источника нет редактируемой записи A–E в справочнике.</p><dl className="reference-values">{Object.entries(source.reference || {source_id: source.writeId}).filter(([key]) => !['name', 'status'].includes(key)).map(([key, value]) => <div key={key}><dt>{columnLabels[key] || key}</dt><dd>{value || 'Не задано'}</dd></div>)}</dl></>;
  }
  const issue = (field: keyof typeof errors) => submitted ? errors[field] : undefined;
  const update = <K extends keyof SourceDraft>(field: K, value: SourceDraft[K]) => setDraft(old => old ? {...old, [field]: value} : old);
  const reliabilityYears = annualReliabilityYears(draft, reference, modelYears);
  function apply() {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    w.setDraft(applySourceDraft(plan!, reference!, draft!, modelYears));
    onClose();
  }
  function resetForm() {
    setDraft(makeSourceDraft(reference!));
    setSubmitted(false);
  }
  function copyBuiltin() {
    void w.copyFrom(w.activeId).then(id => {if (id) onClose();});
  }
  return <form className="source-editor" noValidate onSubmit={event => {event.preventDefault(); apply();}}>
    <p className="help">Тариф топлива указан за тонну. Резерв оплачивается отдельно за годовую мощность канала; это не запас топлива. Take-or-pay — минимальная оплачиваемая доля по условиям источника.</p>
    {source.customized && <Notice tone="warning"><strong>Исследовательские условия.</strong> Применённые параметры этого источника отличаются от исходника в <code>data/</code>. Изменения в форме попадут в расчёт после нажатия кнопки.</Notice>}
    {w.immutable && <Notice>Готовая стратегия защищена от изменений. Создайте свою копию, чтобы поменять условия поставщика.</Notice>}
    <fieldset disabled={w.immutable || !!w.busy}>
      <div className="source-editor-grid">
        {numericFields.map(([field, label]) => <label className="field" key={field}><span>{label}</span><input type="number" min={0} max={field === 'take_or_pay_share' ? 1 : undefined} step="any" inputMode="decimal" required value={draft[field]} aria-invalid={!!issue(field)} onChange={event => update(field, event.target.value)}/>{issue(field) && <small className="field-error">{issue(field)}</small>}</label>)}
        <label className="field"><span>Срок, минимум</span><input type="number" min={0} step={1} inputMode="numeric" required value={draft.lead_time_min_value} aria-invalid={!!issue('lead_time_min_value')} onChange={event => update('lead_time_min_value', event.target.value)}/>{issue('lead_time_min_value') && <small className="field-error">{issue('lead_time_min_value')}</small>}</label>
        <label className="field"><span>Срок, максимум</span><input type="number" min={0} step={1} inputMode="numeric" required value={draft.lead_time_max_value} aria-invalid={!!issue('lead_time_max_value')} onChange={event => update('lead_time_max_value', event.target.value)}/>{issue('lead_time_max_value') && <small className="field-error">{issue('lead_time_max_value')}</small>}</label>
        <label className="field"><span>Единица срока</span><select value={draft.lead_time_unit} onChange={event => update('lead_time_unit', event.target.value as SourceDraft['lead_time_unit'])}><option value="month">месяц</option><option value="week">неделя</option><option value="day">день</option></select></label>
        <label className="field"><span>Доступен с</span><input type="number" min={1} max={9999} step={1} inputMode="numeric" required={reference.available_from_year !== ''} placeholder={reference.available_from_year === '' ? 'Не задано' : undefined} value={draft.available_from_year} aria-invalid={!!issue('available_from_year')} onChange={event => update('available_from_year', event.target.value)}/>{issue('available_from_year') && <small className="field-error">{issue('available_from_year')}</small>}</label>
      </div>
      <div className="reliability-editor" aria-invalid={!!issue('reliability_profile')}>
        <strong>Надёжность поставки</strong>
        {draft.reliability.kind === 'constant' && <label className="field"><span>Вероятность поставки</span><input type="number" min={0} max={1} step="any" required value={draft.reliability.value} onChange={event => setDraft(old => old && old.reliability.kind === 'constant' ? {...old, reliability: {kind: 'constant', value: event.target.value}} : old)}/></label>}
        {draft.reliability.kind === 'operating' && <div className="source-editor-grid"><label className="field"><span>Первый рабочий год</span><input type="number" min={0} max={1} step="any" required value={draft.reliability.first_operating_year} onChange={event => setDraft(old => old && old.reliability.kind === 'operating' ? {...old, reliability: {...old.reliability, first_operating_year: event.target.value}} : old)}/></label><label className="field"><span>Последующие годы</span><input type="number" min={0} max={1} step="any" required value={draft.reliability.later} onChange={event => setDraft(old => old && old.reliability.kind === 'operating' ? {...old, reliability: {...old.reliability, later: event.target.value}} : old)}/></label></div>}
        {draft.reliability.kind === 'annual' && <div className="annual-reliability">{reliabilityYears.map(year => <label className="field" key={year}><span>{year}</span><input aria-label={`Надёжность ${year}`} type="number" min={0} max={1} step="any" required value={draft.reliability.kind === 'annual' ? draft.reliability.values[String(year)] ?? '' : ''} onChange={event => setDraft(old => old && old.reliability.kind === 'annual' ? {...old, reliability: {kind: 'annual', values: {...old.reliability.values, [String(year)]: event.target.value}}} : old)}/></label>)}</div>}
        {issue('reliability_profile') && <small className="field-error">{issue('reliability_profile')}</small>}
      </div>
    </fieldset>
    <dl className="source-editor-reference"><div><dt>Код</dt><dd>{reference.source_id}</dd></div><div><dt>Название</dt><dd>{reference.name}</dd></div><div><dt>Примечание исходника</dt><dd>{reference.notes || 'Не задано'}</dd></div></dl>
    <div className="modal-actions">
      <Button onClick={onClose}>Отмена</Button>
      {w.immutable ? <Button kind="primary" disabled={!!w.busy || w.riskBusy} onClick={copyBuiltin}>Создать свою копию</Button> : <><Button disabled={!!w.busy} onClick={resetForm}>Вернуть исходные значения</Button><Button type="submit" kind="primary" disabled={!!w.busy}>Применить и пересчитать</Button></>}
    </div>
  </form>;
}
