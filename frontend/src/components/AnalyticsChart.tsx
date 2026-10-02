import { useId, useState } from 'react';
import type { Finance } from '../api/types';
import { number } from '../lib/format';
import { signedStack } from '../lib/plot';
import { useMotionNumbers } from './useMotion';
import { usePlotSize } from './usePlotSize';
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
/** Coordinates only: the model supplies every value; missing values break the trace. */
export function AnalyticsChart({ years, series, unit, selected, onSelect }: {
    years: number[];
    series: Trace[];
    unit: string;
    selected: number;
    onSelect: (year: number) => void;
}) {
    const uid = useId().replace(/:/g, ''), [hover, setHover] = useState<number | null>(null);
    const { ref, size } = usePlotSize(260, 130), width = size?.width ?? 260, height = size?.height ?? 130, pad = { left: 42, right: 16, top: 20, bottom: 26 };
    const values = series.flatMap(s => s.values.filter(finite));
    const low = Math.min(0, ...values), high = Math.max(1, ...values), span = high - low;
    const min = low < 0 ? low - span * .06 : 0, max = high + span * .13;
    const x = (i: number) => pad.left + (width - pad.left - pad.right) * (years.length === 1 ? .5 : i / (years.length - 1));
    const y = (v: number) => height - pad.bottom - (v - min) / (max - min) * (height - pad.top - pad.bottom);
    const index = hover ?? years.indexOf(selected);
    const yearX = years.map((_, i) => x(i));
    const gridValues = [0, 1, 2, 3].map(i => min + (max - min) * i / 3);
    const selectionLeft = index >= 0 ? Math.max(pad.left, x(index) - 17) : pad.left;
    const selectionWidth = index >= 0 ? Math.min(width - pad.right, x(index) + 17) - selectionLeft : 0;
    const topology = `${years.join(',')}|${series.map(s => `${s.key}:${s.values.map(v => finite(v) ? '1' : '0').join('')}`).join('|')}`;
    const geometry = useMotionNumbers([
        ...yearX,
        ...gridValues.map(y),
        y(0),
        selectionLeft,
        selectionWidth,
        ...series.flatMap(s => s.values.filter(finite).map(y)),
    ], `${topology}|${size?.width ?? 0}x${size?.height ?? 0}`);
    let cursor = 0;
    const drawnX = geometry.slice(cursor, cursor += years.length);
    const drawnGridY = geometry.slice(cursor, cursor += gridValues.length);
    const drawnZeroY = geometry[cursor++];
    const drawnSelectionLeft = geometry[cursor++], drawnSelectionWidth = geometry[cursor++];
    const drawnSeriesY = series.map(s => s.values.map(value => finite(value) ? geometry[cursor++] : undefined));
    if (!years.length || !values.length)
        return <div className="chart-empty">Модель не передала ряд для этого графика.</div>;
    return <div className="analytics-chart" onMouseLeave={() => setHover(null)}>
  <div className="plot-svg-frame" ref={ref}><svg key={topology} className={`chart-plot ${size ? 'is-ready' : ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${unit}: ${series.map(s => s.label).join(', ')}`}>
   <defs>{series.map(s => <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity=".24"/><stop offset="100%" stopColor={s.color} stopOpacity=".015"/></linearGradient>)}</defs>
   {gridValues.map((v, i) => <g key={i}><line x1={pad.left} x2={width - pad.right} y1={drawnGridY[i]} y2={drawnGridY[i]} stroke="var(--grid)" strokeDasharray="3 5"/><text x={pad.left - 9} y={drawnGridY[i] + 4} textAnchor="end" className="axis-label">{number(Math.round(v))}</text></g>)}
   <text x={pad.left} y={10} className="axis-label">{unit}</text>
   {index >= 0 && <rect x={drawnSelectionLeft} y={pad.top} width={drawnSelectionWidth} height={height - pad.top - pad.bottom} fill="var(--chart-selection)" rx="8"/>}
   {series.map((s, seriesIndex) => {
            const segments: {
                x: number;
                y: number;
            }[][] = [];
            let points: {
                x: number;
                y: number;
            }[] = [];
            years.forEach((_, i) => { const v = s.values[i]; if (finite(v))
                points.push({ x: drawnX[i], y: drawnSeriesY[seriesIndex][i]! });
            else {
                if (points.length)
                    segments.push(points);
                points = [];
            } });
            if (points.length)
                segments.push(points);
            return <g key={s.key}>{segments.map((pts, j) => { const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '); return <g key={j}>{s.area && pts.length > 1 && <path d={`${d} L${pts.at(-1)!.x},${drawnZeroY} L${pts[0].x},${drawnZeroY} Z`} fill={`url(#${uid}-${s.key})`}/>}<path d={d} stroke={s.color} strokeWidth={s.dashed ? 1.8 : 2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={s.dashed ? '5 6' : undefined}/></g>; })}
    {years.map((_, i) => finite(s.values[i]) ? <g key={i}>{i === index && <circle cx={drawnX[i]} cy={drawnSeriesY[seriesIndex][i]} r="8" fill={s.color} opacity=".12"/>}<circle cx={drawnX[i]} cy={drawnSeriesY[seriesIndex][i]} r={i === index ? 3.8 : 2.4} fill="var(--panel)" stroke={s.color} strokeWidth="2"/></g> : null)}</g>;
        })}
   {years.map((year, i) => <g key={year}><text x={drawnX[i]} y={height - 5} textAnchor="middle" className={`axis-label ${year === selected ? 'selected-axis' : ''}`}>{year}</text><rect className="chart-hit" x={drawnX[i] - 20} y={pad.top} width="40" height={height - pad.top} fill="transparent" role="button" aria-label={`Показатели за ${year}`} tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => onSelect(year)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(year);
    } }}><title>{year}: {series.map(s => `${s.label}: ${number(s.values[i])} ${unit}`).join('; ')}</title></rect></g>)}
  </svg></div>
  <div className="plot-legend">{series.map(s => <span key={s.key}><i className={s.dashed ? 'dashed' : ''} style={{ background: s.color }}/>{s.label}<strong>{number(s.values[index])}</strong></span>)}</div>
 </div>;
}
export const costKeys = ['procurement', 'reservation', 'holding', 'capex', 'opex'] as const;
export const costNames = ['Закупка топлива', 'Резерв мощности', 'Хранение', 'Инвестиции', 'Эксплуатация'];
export const costColors = [palette.blue, palette.purple, palette.green, palette.amber, palette.muted];
export function FinanceChart({ rows, selected, onSelect }: {
    rows: Finance[];
    selected: number;
    onSelect: (year: number) => void;
}) {
    const { ref, size } = usePlotSize(260, 130), width = size?.width ?? 260, height = size?.height ?? 130;
    const left = 42, right = 16, top = 22, bottom = 27;
    // This sum only positions stacked rectangles. Displayed total remains the API total.
    const stacks = rows.map(row => signedStack(costKeys.map(k => row[k])));
    const min = Math.min(0, ...stacks.map(s => s.min)) * 1.1, max = Math.max(1, ...stacks.map(s => s.max)) * 1.1, cell = (width - left - right) / Math.max(1, rows.length), bw = Math.min(84, cell * .68), h = height - top - bottom;
    const y = (value: number) => height - bottom - (value - min) / (max - min) * h;
    const gridValues = [0, 1, 2, 3].map(i => min + (max - min) * i / 3);
    const topology = rows.map((row, i) => `${row.year}:${stacks[i].segments.map(segment => segment.index).join(',')}`).join('|');
    const geometry = useMotionNumbers([
        ...gridValues.map(y), cell, bw, h,
        ...rows.flatMap((_, i) => {
            const rowX = left + cell * (i + .5);
            return [rowX, ...stacks[i].segments.flatMap(({ from, to }) => [Math.min(y(from), y(to)), Math.abs(y(from) - y(to))])];
        }),
    ], `${topology}|${size?.width ?? 0}x${size?.height ?? 0}`);
    let cursor = 0;
    const drawnGridY = geometry.slice(cursor, cursor += gridValues.length);
    const drawnCell = geometry[cursor++], drawnBw = geometry[cursor++], drawnH = geometry[cursor++];
    const drawnRows = rows.map((_, i) => ({
        x: geometry[cursor++],
        segments: stacks[i].segments.map(() => ({ y: geometry[cursor++], height: geometry[cursor++] })),
    }));
    if (!rows.length)
        return <div className="chart-empty">Модель не передала расходы.</div>;
    const current = rows.find(f => f.year === selected);
    return <div className="analytics-chart"><div className="plot-svg-frame" ref={ref}><svg key={topology} className={`chart-plot ${size ? 'is-ready' : ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Структура расходов по годам, млн у.е.">
  {gridValues.map((v, i) => <g key={i}><line x1={left} x2={width - right} y1={drawnGridY[i]} y2={drawnGridY[i]} stroke="var(--grid)" strokeDasharray="3 5"/><text className="axis-label" x={left - 9} y={drawnGridY[i] + 4} textAnchor="end">{number(Math.round(v))}</text></g>)}<text x={left} y="10" className="axis-label">млн у.е.</text>
  {rows.map((row, i) => { const drawn = drawnRows[i]; return <g key={row.year}>{row.year === selected && <rect x={drawn.x - drawnBw / 2 - 5} y={top - 5} width={drawnBw + 10} height={drawnH + 6} rx="7" fill="var(--chart-selection)"/>}{stacks[i].segments.map(({ index: k }, segmentIndex) => { const key = costKeys[k], segment = drawn.segments[segmentIndex]; return <rect key={key} x={drawn.x - drawnBw / 2} y={segment.y} width={drawnBw} height={segment.height} fill={costColors[k]} rx="2" opacity={row.year === selected ? 1 : .76}><title>{row.year} · {costNames[k]}: {number(row[key])} млн у.е.</title></rect>; })}<text className="axis-label" x={drawn.x} y={height - 5} textAnchor="middle">{row.year}</text><rect role="button" tabIndex={0} className="chart-hit" aria-label={`Расходы за ${row.year}`} x={drawn.x - drawnCell / 2} y={top} width={drawnCell} height={drawnH + 25} fill="transparent" onClick={() => onSelect(row.year)} onKeyDown={e => { if (['Enter', ' '].includes(e.key)) {
        e.preventDefault();
        onSelect(row.year);
    } }}/></g>; })}
 </svg></div><div className="plot-legend costs">{costKeys.map((key, i) => <span key={key}><i style={{ background: costColors[i] }}/>{costNames[i]}<strong>{number(current?.[key])}</strong></span>)}</div></div>;
}
export function ServiceRing({ total, critical }: {
    total: number | undefined;
    critical: number | undefined;
}) {
    const radius = 32, circ = 2 * Math.PI * radius;
    const geometry = useMotionNumbers([
        finite(total) ? Math.max(0, Math.min(1, total)) : 0,
        finite(critical) ? Math.max(0, Math.min(1, critical)) : 0,
    ], `${finite(total) ? 1 : 0}${finite(critical) ? 1 : 0}`);
    return <svg className="service-ring" width="86" height="86" viewBox="0 0 86 86" role="img" aria-label="Общий и критический сервис"><circle cx="43" cy="43" r={radius} fill="none" stroke="var(--track)" strokeWidth="4"/><circle cx="43" cy="43" r="23" fill="none" stroke="var(--track)" strokeWidth="4"/>{finite(total) && <circle cx="43" cy="43" r={radius} fill="none" stroke={palette.blue} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${geometry[0] * circ} ${circ}`} transform="rotate(-90 43 43)"/>}{finite(critical) && <circle cx="43" cy="43" r="23" fill="none" stroke={palette.green} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${geometry[1] * 2 * Math.PI * 23} ${2 * Math.PI * 23}`} transform="rotate(-90 43 43)"/>}<path d="M37 43h12 M43 37v12" stroke="var(--muted)" strokeWidth="1.4"/></svg>;
}
