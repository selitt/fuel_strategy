import { useId } from 'react';
import { Icon } from './Icon';
export function StepNumber({ value, onChange, label, step = 1, disabled = false, compact = false, onFocus, placeholder = '—' }: {
    value: number | null;
    onChange: (n: number) => void;
    label: string;
    step?: number;
    disabled?: boolean;
    compact?: boolean;
    onFocus?: () => void;
    placeholder?: string;
}) {
    const valid = value === null || (Number.isFinite(value) && value >= 0);
    const move = (delta: number) => onChange(Math.max(0, Math.round(((value && Number.isFinite(value) ? value : 0) + delta) * 100) / 100));
    return <div className={`step-number ${compact ? 'small' : ''} ${!valid ? 'invalid' : ''}`}>
    {!compact && <button type="button" aria-label={`Уменьшить: ${label}`} disabled={disabled} onClick={() => move(-step)}><Icon name="minus" size={12}/></button>}
    <input type="number" inputMode="decimal" autoComplete="off" aria-label={label} aria-invalid={!valid} disabled={disabled} min={0} step="any" placeholder={placeholder} value={value === null || !Number.isFinite(value) ? '' : value} onFocus={onFocus} onChange={e => onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)}/>
    {!compact && <button type="button" aria-label={`Увеличить: ${label}`} disabled={disabled} onClick={() => move(step)}><Icon name="plus" size={12}/></button>}
  </div>;
}
export function Range({ value, max, label, onChange, disabled = false, step = 1 }: {
    value: number | null;
    max: number;
    label: string;
    onChange: (n: number) => void;
    disabled?: boolean;
    step?: number;
}) {
    const id = useId();
    const safe = value !== null && Number.isFinite(value) ? Math.max(0, value) : 0;
    const top = Math.max(max, safe, 1);
    return <input id={id} className="range" type="range" aria-label={label} aria-valuetext={`${value === null ? 'Не задано' : value}`} min={0} max={top} step={step} value={safe} disabled={disabled} onChange={e => onChange(e.target.valueAsNumber)} style={{ backgroundSize: `${100 * safe / top}% 100%` }}/>;
}
export function Toggle({ label, checked, onChange, disabled = false }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return <button className="toggle" type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}><span /></button>;
}
