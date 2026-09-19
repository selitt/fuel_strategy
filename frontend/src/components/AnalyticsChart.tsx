import { useId, useState, useLayoutEffect } from 'react';
import type { Finance } from '../api/types';
import { number } from '../lib/format';
import { signedStack } from '../lib/plot';
export const palette = { blue: '#72cfff', green: '#7de0bc', amber: '#edbe77', purple: '#b1a3fa', muted: '#889bab', red: '#f0a395' };
export interface Trace {
    key: string;
    label: string;
    color: string;
    values: (number | undefined)[];
    dashed?: boolean;
    area?: boolean;
}
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
function usePlotSize() {
    const [node, setNode] = useState<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ width: 450, height: 220 });
    useLayoutEffect(() => {
        if (!node)
            return;
        const observer = new ResizeObserver(entries => {
            const rect = entries[0]?.contentRect;
            if (!rect)
                return;
            const width = Math.max(260, Math.round(rect.width)), height = Math.max(130, Math.round(rect.height));
            setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [node]);
    return { ref: setNode, ...size };
}
/** Coordinates only: the model supplies every value; missing values break the trace. */
export function AnalyticsChart({ years, series, unit, selected, onSelect }: {
    years: number[];
    series: Trace[];
    unit: string;
    selected: number;
    onSelect: (year: number) => void;
}) {
    const uid = useId().replace(/:/g, ''), [hover, setHover] = useState<number | null>(null);
    const { ref, width, height } = usePlotSize(), pad = { left: 42, right: 16, top: 20, bottom: 26 };
    const values = series.flatMap(s => s.values.filter(finite));
    if (!years.length || !values.length)
        return <div className="chart-empty">Модель не передала ряд для этого графика.</div>;
    const low = Math.min(0, ...values), high = Math.max(1, ...values), span = high - low;
    const min = low < 0 ? low - span * .06 : 0, max = high + span * .13;
    const x = (i: number) => pad.left + (width - pad.left - pad.right) * (years.length === 1 ? .5 : i / (years.length - 1));
    const y = (v: number) => height - pad.bottom - (v - min) / (max - min) * (height - pad.top - pad.bottom);
    const index = hover ?? Math.max(0, years.indexOf(selected));
    return <div className="analytics-chart" onMouseLeave={() => setHover(null)}>
  <div className="plot-svg-frame" ref={ref}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${unit}: ${series.map(s => s.label).join(', ')}`}>
   <defs>{series.map(s => <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity=".24"/><stop offset="100%" stopColor={s.color} stopOpacity=".015"/></linearGradient>)}</defs>
   {[0, 1, 2, 3].map(i => { const v = min + (max - min) * i / 3; return <g key={i}><line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeDasharray="3 5"/><text x={pad.left - 9} y={y(v) + 4} textAnchor="end" className="axis-label">{number(Math.round(v))}</text></g>; })}
   <text x={pad.left} y={10} className="axis-label">{unit}</text>
   <rect x={Math.max(pad.left, x(index) - 17)} y={pad.top} width={Math.min(width - pad.right, x(index) + 17) - Math.max(pad.left, x(index) - 17)} height={height - pad.top - pad.bottom} fill="var(--chart-selection)" rx="8"/>
   {series.map(s => {
            const segments: {
                x: number;
                y: number;
            }[][] = [];
            let points: {
                x: number;
                y: number;
            }[] = [];
            years.forEach((_, i) => { const v = s.values[i]; if (finite(v))
                points.push({ x: x(i), y: y(v) });
            else {
                if (points.length)
                    segments.push(points);
                points = [];
            } });
            if (points.length)
                segments.push(points);
            return <g key={s.key}>{segments.map((pts, j) => { const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '); return <g key={j}>{s.area && pts.length > 1 && <path d={`${d} L${pts.at(-1)!.x},${y(0)} L${pts[0].x},${y(0)} Z`} fill={`url(#${uid}-${s.key})`}/>}<path d={d} stroke={s.color} strokeWidth={s.dashed ? 1.8 : 2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={s.dashed ? '5 6' : undefined}/></g>; })}
    {years.map((_, i) => finite(s.values[i]) ? <g key={i}>{i === index && <circle cx={x(i)} cy={y(s.values[i]!)} r="8" fill={s.color} opacity=".12"/>}<circle cx={x(i)} cy={y(s.values[i]!)} r={i === index ? 3.8 : 2.4} fill="var(--panel)" stroke={s.color} strokeWidth="2"/></g> : null)}</g>;
        })}
   {years.map((year, i) => <g key={year}><text x={x(i)} y={height - 5} textAnchor="middle" className={`axis-label ${year === selected ? 'selected-axis' : ''}`}>{year}</text><rect className="chart-hit" x={x(i) - 20} y={pad.top} width="40" height={height - pad.top} fill="transparent" role="button" aria-label={`Показатели за ${year}`} tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => onSelect(year)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(year);
    } }}><title>{year}: {series.map(s => `${s.label}: ${number(s.values[i])} ${unit}`).join('; ')}</title></rect></g>)}
  </svg></div>
  <div className="plot-legend">{series.map(s => <span key={s.key}><i className={s.dashed ? 'dashed' : ''} style={{ background: s.color }}/>{s.label}<strong>{number(s.values[index])}</strong></span>)}</div>
 </div>;
}
export const costKeys = ['procurement', 'reservation', 'holding', 'capex', 'opex'] as const;
export const costNames = ['Закупка', 'Бронь', 'Хранение', 'CAPEX', 'OPEX'];
export const costColors = [palette.blue, palette.purple, palette.green, palette.amber, palette.muted];
export function FinanceChart({ rows, selected, onSelect }: {
    rows: Finance[];
    selected: number;
    onSelect: (year: number) => void;
}) {
    const { ref, width, height } = usePlotSize();
    if (!rows.length)
        return <div className="chart-empty">Модель не передала расходы.</div>;
    const left = 42, right = 16, top = 22, bottom = 27;
    // This sum only positions stacked rectangles. Displayed total remains the API total.
    const stacks = rows.map(row => signedStack(costKeys.map(k => row[k])));
    const min = Math.min(0, ...stacks.map(s => s.min)) * 1.1, max = Math.max(1, ...stacks.map(s => s.max)) * 1.1, cell = (width - left - right) / rows.length, bw = Math.min(36, cell * .62), h = height - top - bottom;
    const y = (value: number) => height - bottom - (value - min) / (max - min) * h;
    const current = rows.find(f => f.year === selected) || rows[0];
    return <div className="analytics-chart"><div className="plot-svg-frame" ref={ref}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Структура расходов по годам, млн у.е.">
  {[0, 1, 2, 3].map(i => { const v = min + (max - min) * i / 3, py = y(v); return <g key={i}><line x1={left} x2={width - right} y1={py} y2={py} stroke="var(--grid)" strokeDasharray="3 5"/><text className="axis-label" x={left - 9} y={py + 4} textAnchor="end">{number(Math.round(v))}</text></g>; })}<text x={left} y="10" className="axis-label">млн у.е.</text>
  {rows.map((row, i) => { const x = left + cell * (i + .5); return <g key={row.year}>{row.year === selected && <rect x={x - bw / 2 - 5} y={top - 5} width={bw + 10} height={h + 6} rx="7" fill="var(--chart-selection)"/>}{stacks[i].segments.map(({ index: k, from, to }) => { const key = costKeys[k], rh = Math.abs(y(from) - y(to)); return <rect key={key} x={x - bw / 2} y={Math.min(y(from), y(to))} width={bw} height={rh} fill={costColors[k]} rx="2" opacity={row.year === selected ? 1 : .76}><title>{row.year} · {costNames[k]}: {number(row[key])} млн у.е.</title></rect>; })}<text className="axis-label" x={x} y={height - 5} textAnchor="middle">{row.year}</text><rect role="button" tabIndex={0} className="chart-hit" aria-label={`Расходы за ${row.year}`} x={x - cell / 2} y={top} width={cell} height={h + 25} fill="transparent" onClick={() => onSelect(row.year)} onKeyDown={e => { if (['Enter', ' '].includes(e.key)) {
        e.preventDefault();
        onSelect(row.year);
    } }}/></g>; })}
 </svg></div><div className="plot-legend costs">{costKeys.map((key, i) => <span key={key}><i style={{ background: costColors[i] }}/>{costNames[i]}<strong>{number(current[key])}</strong></span>)}</div></div>;
}
export function ServiceRing({ total, critical }: {
    total: number | undefined;
    critical: number | undefined;
}) {
    const radius = 32, circ = 2 * Math.PI * radius;
    return <svg className="service-ring" width="86" height="86" viewBox="0 0 86 86" role="img" aria-label="Общий и критический сервис"><circle cx="43" cy="43" r={radius} fill="none" stroke="var(--track)" strokeWidth="4"/><circle cx="43" cy="43" r="23" fill="none" stroke="var(--track)" strokeWidth="4"/>{finite(total) && <circle cx="43" cy="43" r={radius} fill="none" stroke={palette.blue} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.max(0, Math.min(1, total)) * circ} ${circ}`} transform="rotate(-90 43 43)"/>}{finite(critical) && <circle cx="43" cy="43" r="23" fill="none" stroke={palette.green} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.max(0, Math.min(1, critical)) * 2 * Math.PI * 23} ${2 * Math.PI * 23}`} transform="rotate(-90 43 43)"/>}<path d="M37 43h12 M43 37v12" stroke="var(--muted)" strokeWidth="1.4"/></svg>;
}
