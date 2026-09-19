import { useLayoutEffect, useState } from 'react';
import type { Result } from '../api/types';
import { dailyRecordAt, modelDayRange, modelWeekTicks, projectDailyTrace } from '../lib/daily';
import type { DailyPoint } from '../lib/daily';
import { number, supportedUnits } from '../lib/format';
import { useMotionNumbers } from './useMotion';

function usePlotSize() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 760, height: 300 });
  useLayoutEffect(() => {
    if (!node)
      return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (!rect)
        return;
      const width = Math.max(320, Math.round(rect.width));
      const height = Math.max(210, Math.round(rect.height));
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { ref: setNode, ...size };
}

function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function scenarioLabel(result: Result) {
  return result.scenario_id === 'BASE' ? 'BASE' : result.scenario_id === 'MANDATORY_STRESS' ? 'STRESS' : result.scenario_id;
}

function segments(rows: DailyPoint[], drawnY: Map<number, number>, x: (day: number) => number) {
  const result: string[] = [];
  let points: string[] = [];
  let previousDay: number | null = null;
  for (const row of rows) {
    const y = drawnY.get(row.day);
    if (y === undefined || (previousDay !== null && row.day !== previousDay + 1)) {
      if (points.length)
        result.push(points.join(' '));
      points = [];
    }
    if (y !== undefined) {
      points.push(`${points.length ? 'L' : 'M'}${x(row.day)},${y}`);
      previousDay = row.day;
    } else {
      previousDay = null;
    }
  }
  if (points.length)
    result.push(points.join(' '));
  return result;
}

export function DailyChart({ result, other = null, year, onSelectDay, onProposeDeliveryDate, range, selectedDay = null }: {
  result: Result;
  other?: Result | null;
  year: number;
  onSelectDay?: (day: number) => void;
  onProposeDeliveryDate?: (from: number, to: number) => void;
  range?: readonly [number, number];
  selectedDay?: number | null;
}) {
  const [drag, setDrag] = useState<{from: number; to: number} | null>(null);
  const [focusedDay, setFocusedDay] = useState(1);
  const primarySupported = supportedUnits(result.units);
  const primary = primarySupported ? projectDailyTrace(result, year, range) : [];
  const secondary = primarySupported && other && supportedUnits(other.units) ? projectDailyTrace(other, year, range) : [];
  const [start, end] = modelDayRange(range);
  const ticks = modelWeekTicks([start, end]);
  const { ref, width, height } = usePlotSize();
  const pad = { left: 48, right: 18, top: 24, bottom: 48 };
  const values = [...primary, ...secondary].map(row => row.closing_inventory_t).filter(finite);
  const max = Math.max(1, ...values) * 1.08;
  const x = (day: number) => pad.left + (width - pad.left - pad.right) * (end === start ? .5 : (day - start) / (end - start));
  const y = (value: number) => height - pad.bottom - value / max * (height - pad.top - pad.bottom);
  const gridValues = [0, .25, .5, .75, 1].map(part => max * part);
  const primaryFinite = primary.filter(row => finite(row.closing_inventory_t));
  const secondaryFinite = secondary.filter(row => finite(row.closing_inventory_t));
  const targetGeometry = [
    ...gridValues.map(y),
    ...primaryFinite.map(row => y(row.closing_inventory_t!)),
    ...secondaryFinite.map(row => y(row.closing_inventory_t!)),
  ];
  const topology = `${year}|${start}:${end}|${primary.map(row => `${row.day}:${finite(row.closing_inventory_t) ? 1 : 0}`).join(',')}|${secondary.map(row => `${row.day}:${finite(row.closing_inventory_t) ? 1 : 0}`).join(',')}`;
  const geometry = useMotionNumbers(targetGeometry, topology);
  let cursor = 0;
  const drawnGrid = geometry.slice(cursor, cursor += gridValues.length);
  const primaryY = new Map(primaryFinite.map(row => [row.day, geometry[cursor++]]));
  const secondaryY = new Map(secondaryFinite.map(row => [row.day, geometry[cursor++]]));
  const selected = selectedDay === null ? primary.at(-1) : dailyRecordAt(result, year, selectedDay);

  if (!primarySupported)
    return <div className="daily-chart chart-empty" data-testid="daily-chart">Единицы дневного ряда не поддерживаются.</div>;
  if (!values.length)
    return <div className="daily-chart chart-empty" data-testid="daily-chart">Модель не передала дневной запас за {year}.</div>;

  const hitWidth = Math.max(2, (width - pad.left - pad.right) / Math.max(1, end - start + 1));
  return <div className="daily-chart" data-testid="daily-chart">
    <div className="daily-chart-frame" ref={ref}>
      <svg className="daily-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Дневной запас за ${year}, дни модели ${start}–${end}`}>
        {drawnGrid.map((gridY, index) => <g key={index}>
          <line className="daily-grid" x1={pad.left} x2={width - pad.right} y1={gridY} y2={gridY}/>
          <text className="daily-axis-label" x={pad.left - 8} y={gridY + 4} textAnchor="end">{number(gridValues[index])}</text>
        </g>)}
        <text className="daily-axis-label" x={pad.left} y={13}>т</text>
        {ticks.map(day => <g key={day}>
          <line className="daily-grid daily-week-grid" x1={x(day)} x2={x(day)} y1={pad.top} y2={height - pad.bottom}/>
          <text className="daily-axis-label" x={x(day)} y={height - 10} textAnchor="end" transform={`rotate(-55 ${x(day)} ${height - 10})`}>{day}</text>
        </g>)}
        {primary.filter(row => finite(row.shortage_t) && row.shortage_t > 0).map(row =>
          <rect key={`shortage-${row.day}`} className="daily-shortage-band" x={x(row.day) - hitWidth / 2} y={pad.top} width={hitWidth} height={height - pad.top - pad.bottom}/>
        )}
        {secondary.length > 0 && segments(secondary, secondaryY, x).map((path, index) =>
          <path key={index} className="daily-inventory-line other" d={path}/>
        )}
        {segments(primary, primaryY, x).map((path, index) =>
          <path key={index} className="daily-inventory-line" d={path}/>
        )}
        {primary.filter(row => finite(row.delivered_t) && row.delivered_t > 0).map(row => {
          const cy = primaryY.get(row.day) ?? pad.top + 8;
          return <path key={`receipt-${row.day}`} className="daily-receipt-marker" d={`M${x(row.day)},${cy - 6} l6,6 -6,6 -6,-6 Z`}><title>День {row.day}: поступление {number(row.delivered_t)} т</title></path>;
        })}
        {selectedDay !== null && selectedDay >= start && selectedDay <= end && <line className="daily-selected" x1={x(selectedDay)} x2={x(selectedDay)} y1={pad.top} y2={height - pad.bottom}/>} 
        {onSelectDay && primary.map(row => <rect key={`hit-${row.day}`} className="daily-hit" x={x(row.day) - hitWidth / 2} y={pad.top} width={hitWidth} height={height - pad.top - pad.bottom} fill="transparent" role="button" tabIndex={row.day === (primary.some(p => p.day === focusedDay) ? focusedDay : primary[0]?.day) ? 0 : -1} onFocus={() => setFocusedDay(row.day)} aria-label={`День модели ${row.day}`} onClick={() => onSelectDay(row.day)} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const next = primary[primary.indexOf(row) + (event.key === 'ArrowRight' ? 1 : -1)];
            if (next) {
              setFocusedDay(next.day);
              event.currentTarget.ownerSVGElement?.querySelector<SVGRectElement>(`[aria-label="День модели ${next.day}"]`)?.focus();
            }
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectDay(row.day);
          }
        }}><title>День {row.day}: запас {number(row.closing_inventory_t)} т; поступление {number(row.delivered_t)} т; дефицит {number(row.shortage_t)} т</title></rect>)}
        {onProposeDeliveryDate && primary.filter(row => finite(row.delivered_t) && row.delivered_t > 0).map(row => <circle
          key={`drag-${row.day}`} className="delivery-drag" cx={x(row.day)} cy={primaryY.get(row.day) ?? pad.top + 8} r={10}
          role="button" tabIndex={0} aria-label={`Перенести поступление: день ${row.day}`}
          onPointerDown={event => {event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setDrag({from:row.day,to:row.day});}}
          onPointerMove={event => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const bounds=event.currentTarget.ownerSVGElement!.getBoundingClientRect();
            const px=(event.clientX-bounds.left)*width/bounds.width;
            const day=Math.max(start,Math.min(end,Math.round(start+(px-pad.left)/(width-pad.left-pad.right)*(end-start))));
            setDrag({from:row.day,to:day});
          }}
          onPointerUp={event => {if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);if(drag && drag.to!==drag.from) onProposeDeliveryDate(drag.from,drag.to);else onSelectDay?.(row.day);setDrag(null);}}
          onPointerCancel={() => setDrag(null)}
          onKeyDown={event => {if(event.key==='Enter' || event.key===' ') {event.preventDefault();onProposeDeliveryDate(row.day,row.day);}}}
        ><title>Перетащить дату для согласования</title></circle>)}
        {drag && <g className="delivery-drag-preview"><line x1={x(drag.to)} x2={x(drag.to)} y1={pad.top} y2={height-pad.bottom}/><text x={Math.min(width-90,Math.max(pad.left,x(drag.to)+8))} y={pad.top+14}>День {drag.to}</text></g>}
      </svg>
    </div>
    <div className="daily-legend">
      <span className="daily-legend-item">День модели <strong>{selected?.day ?? '—'}</strong></span>
      <span className="daily-legend-item"><i className="daily-inventory-line"/>{scenarioLabel(result)} <strong>{number(selected?.closing_inventory_t)} т</strong></span>
      {other && secondary.length > 0 && <span className="daily-legend-item"><i className="daily-inventory-line other"/>{scenarioLabel(other)} <strong>{number(selectedDay === null ? secondary.at(-1)?.closing_inventory_t : dailyRecordAt(other, year, selectedDay)?.closing_inventory_t)} т</strong></span>}
      <span className="daily-legend-item"><i className="daily-receipt-marker"/>Поступление <strong>{number(selected?.delivered_t)} т</strong></span>
      <span className="daily-legend-item"><i className="daily-shortage-band"/>Дефицит <strong>{number(selected?.shortage_t)} т</strong></span>
    </div>
  </div>;
}
