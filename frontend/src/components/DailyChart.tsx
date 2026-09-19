import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Result } from '../api/types';
import {
  MODEL_START_YEAR,
  dailyRecordAt,
  modelDayLabel,
  modelDayRange,
  modelTimelineRange,
  modelTimelineTicks,
  modelWeekTicks,
  projectDailyTrace,
  projectTimelineTrace,
  timelineRecordAt,
  yearDayFromModelDay,
} from '../lib/daily';
import type { DailyPoint } from '../lib/daily';
import { number, supportedUnits } from '../lib/format';
import { useMotionNumbers } from './useMotion';
import { usePlotSize } from './usePlotSize';

type ChartPoint = DailyPoint & { model_day?: number };

function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function scenarioLabel(result: Result) {
  return result.scenario_id === 'BASE' ? 'BASE' : result.scenario_id === 'MANDATORY_STRESS' ? 'STRESS' : result.scenario_id;
}

function coordinate(row: ChartPoint, timeline: boolean) {
  return timeline ? row.model_day! : row.day;
}

function segments(rows: ChartPoint[], drawnY: Map<number, number>, x: (day: number) => number, timeline: boolean) {
  const result: string[] = [];
  let points: string[] = [];
  let previousDay: number | null = null;
  for (const row of rows) {
    const day = coordinate(row, timeline);
    const y = drawnY.get(day);
    if (y === undefined || (previousDay !== null && day !== previousDay + 1)) {
      if (points.length)
        result.push(points.join(' '));
      points = [];
    }
    if (y !== undefined) {
      points.push(`${points.length ? 'L' : 'M'}${x(day)},${y}`);
      previousDay = day;
    } else {
      previousDay = null;
    }
  }
  if (points.length)
    result.push(points.join(' '));
  return result;
}

function sparseWeekTicks(range: readonly [number, number], maxTicks: number) {
  const ticks = modelWeekTicks(range);
  if (ticks.length <= maxTicks)
    return ticks;
  return Array.from({length: maxTicks}, (_, index) =>
    ticks[Math.round((ticks.length - 1) * index / (maxTicks - 1))]);
}

export function DailyChart({ result, other = null, year, timeline = false, onSelectDay, onProposeDeliveryDate, range, selectedDay = null }: {
  result: Result;
  other?: Result | null;
  year?: number;
  timeline?: boolean;
  onSelectDay?: (day: number) => void;
  onProposeDeliveryDate?: (from: number, to: number) => void;
  range?: readonly [number, number];
  selectedDay?: number | null;
}) {
  const [drag, setDrag] = useState<{from: number; to: number} | null>(null);
  const activeYear = year ?? MODEL_START_YEAR;
  const primarySupported = supportedUnits(result.units);
  const primary: ChartPoint[] = primarySupported
    ? timeline ? projectTimelineTrace(result, range) : projectDailyTrace(result, activeYear, range)
    : [];
  const secondary: ChartPoint[] = primarySupported && other && supportedUnits(other.units)
    ? timeline ? projectTimelineTrace(other, range) : projectDailyTrace(other, activeYear, range)
    : [];
  const [start, end] = timeline ? modelTimelineRange(range) : modelDayRange(range);
  const { ref, size } = usePlotSize(320, 210);
  const width = size?.width ?? 320;
  const height = size?.height ?? 210;
  const maxTicks = width < 480 ? 4 : width < 760 ? 6 : 8;
  const ticks = timeline ? modelTimelineTicks([start, end], maxTicks) : sparseWeekTicks([start, end], maxTicks);
  const timelineOverview = timeline && end - start + 1 > 365;
  const pad = { left: 48, right: 18, top: 24, bottom: timeline ? 54 : 48 };
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
  const topology = `${timeline ? 'timeline' : activeYear}|${start}:${end}|${primary.map(row => `${coordinate(row, timeline)}:${finite(row.closing_inventory_t) ? 1 : 0}`).join(',')}|${secondary.map(row => `${coordinate(row, timeline)}:${finite(row.closing_inventory_t) ? 1 : 0}`).join(',')}`;
  const geometry = useMotionNumbers(targetGeometry, `${topology}|${size?.width ?? 0}x${size?.height ?? 0}`);
  let cursor = 0;
  const drawnGrid = geometry.slice(cursor, cursor += gridValues.length);
  const primaryY = new Map(primaryFinite.map(row => [coordinate(row, timeline), geometry[cursor++]]));
  const secondaryY = new Map(secondaryFinite.map(row => [coordinate(row, timeline), geometry[cursor++]]));
  const selected = selectedDay === null
    ? primary.at(-1)
    : timeline ? timelineRecordAt(result, selectedDay) : dailyRecordAt(result, activeYear, selectedDay);
  const selectedOther = !other || selectedDay === null
    ? secondary.at(-1)
    : timeline ? timelineRecordAt(other, selectedDay) : dailyRecordAt(other, activeYear, selectedDay);
  const fallbackPoint = primary.at(-1);
  const selectedCoordinate = selectedDay ?? (fallbackPoint ? coordinate(fallbackPoint, timeline) : end);
  const axisName = timeline ? 'горизонт 2035–2040' : `год ${activeYear}`;

  if (!primarySupported)
    return <div className="daily-chart chart-empty" data-testid="daily-chart">Единицы дневного ряда не поддерживаются.</div>;
  if (!values.length)
    return <div className="daily-chart chart-empty" data-testid="daily-chart">Модель не передала дневной запас за {axisName}.</div>;

  const hitWidth = Math.max(2, (width - pad.left - pad.right) / Math.max(1, end - start + 1));
  const clampSelection = (day: number) => Math.max(start, Math.min(end, Math.round(day)));
  const selectFromPointer = (event: ReactPointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0)
      return;
    const px = (event.clientX - bounds.left) * width / bounds.width;
    const day = start + (px - pad.left) / (width - pad.left - pad.right) * (end - start);
    onSelectDay?.(clampSelection(day));
  };
  const accessibleSelection = clampSelection(selectedCoordinate);

  return <div className={`daily-chart ${timeline ? 'daily-chart-timeline' : ''}`} data-testid="daily-chart">
    <div className="daily-chart-frame" ref={ref}>
      <svg key={topology} className={`daily-chart-svg chart-plot ${size ? 'is-ready' : ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Дневной запас: ${axisName}, дни ${start}–${end}`}>
        {drawnGrid.map((gridY, index) => <g key={index}>
          <line className="daily-grid" x1={pad.left} x2={width - pad.right} y1={gridY} y2={gridY}/>
          <text className="daily-axis-label" x={pad.left - 8} y={gridY + 4} textAnchor="end">{number(gridValues[index])}</text>
        </g>)}
        <text className="daily-axis-label" x={pad.left} y={13}>т</text>
        {ticks.map(day => {
          const tickCoordinate = timeline ? yearDayFromModelDay(day) : undefined;
          return <g key={day}>
            <line className="daily-grid daily-week-grid" x1={x(day)} x2={x(day)} y1={pad.top} y2={height - pad.bottom}/>
            <text className="daily-axis-label" x={x(day)} textAnchor={day === start ? 'start' : day === end ? 'end' : 'middle'}>
              {tickCoordinate
                ? timelineOverview
                  ? <tspan x={x(day)} y={height - 10}>{tickCoordinate.year}</tspan>
                  : <><tspan x={x(day)} y={height - 22}>{tickCoordinate.year}</tspan><tspan x={x(day)} y={height - 8}>день {tickCoordinate.day}</tspan></>
                : <tspan x={x(day)} y={height - 10}>{day}</tspan>}
            </text>
          </g>;
        })}
        {primary.filter(row => finite(row.shortage_t) && row.shortage_t > 0).map(row => {
          const day = coordinate(row, timeline);
          return <rect key={`shortage-${day}`} className="daily-shortage-band" x={x(day) - hitWidth / 2} y={pad.top} width={hitWidth} height={height - pad.top - pad.bottom}/>;
        })}
        {secondary.length > 0 && segments(secondary, secondaryY, x, timeline).map((path, index) =>
          <path key={index} className="daily-inventory-line other" d={path}/>
        )}
        {segments(primary, primaryY, x, timeline).map((path, index) =>
          <path key={index} className="daily-inventory-line" d={path}/>
        )}
        {primary.filter(row => finite(row.delivered_t) && row.delivered_t > 0).map(row => {
          const day = coordinate(row, timeline);
          const cy = primaryY.get(day) ?? pad.top + 8;
          return <path key={`receipt-${day}`} className="daily-receipt-marker" d={`M${x(day)},${cy - 6} l6,6 -6,6 -6,-6 Z`}><title>{timeline ? modelDayLabel(day) : `День ${day}`}: поступление {number(row.delivered_t)} т</title></path>;
        })}
        {selectedDay !== null && selectedDay >= start && selectedDay <= end && <line data-testid="timeline-cursor" className="daily-selected" x1={x(selectedDay)} x2={x(selectedDay)} y1={pad.top} y2={height - pad.bottom}/>}
        {onSelectDay && <rect
          className="daily-hit daily-chart-selector"
          x={pad.left}
          y={pad.top}
          width={width - pad.left - pad.right}
          height={height - pad.top - pad.bottom}
          fill="transparent"
          role="slider"
          tabIndex={0}
          aria-label="Выбор дня на графике"
          aria-valuemin={start}
          aria-valuemax={end}
          aria-valuenow={accessibleSelection}
          aria-valuetext={timeline ? modelDayLabel(accessibleSelection) : `День ${accessibleSelection}`}
          onPointerDown={event => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            selectFromPointer(event);
          }}
          onPointerMove={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              selectFromPointer(event);
          }}
          onPointerUp={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onKeyDown={event => {
            let next: number | undefined;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
              next = accessibleSelection - 1;
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp')
              next = accessibleSelection + 1;
            if (event.key === 'Home')
              next = start;
            if (event.key === 'End')
              next = end;
            if (next !== undefined) {
              event.preventDefault();
              onSelectDay(clampSelection(next));
            }
          }}
        />}
        {!timeline && onProposeDeliveryDate && primary.filter(row => finite(row.delivered_t) && row.delivered_t > 0).map(row => <circle
          key={`drag-${row.day}`} className="delivery-drag" cx={x(row.day)} cy={primaryY.get(row.day) ?? pad.top + 8} r={10}
          role="button" tabIndex={0} aria-label={`Перенести поступление: день ${row.day}`}
          onPointerDown={event => {event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setDrag({from:row.day,to:row.day});}}
          onPointerMove={event => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const bounds=event.currentTarget.ownerSVGElement!.getBoundingClientRect();
            const px=(event.clientX-bounds.left)*width/bounds.width;
            const day=clampSelection(start+(px-pad.left)/(width-pad.left-pad.right)*(end-start));
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
      <span className="daily-legend-item">{timeline ? 'Дата модели' : 'День модели'} <strong>{timeline ? modelDayLabel(selectedCoordinate) : selected?.day ?? '—'}</strong></span>
      <span className="daily-legend-item"><i className="daily-inventory-line"/>{scenarioLabel(result)} <strong>{number(selected?.closing_inventory_t)} т</strong></span>
      {other && secondary.length > 0 && <span className="daily-legend-item"><i className="daily-inventory-line other"/>{scenarioLabel(other)} <strong>{number(selectedOther?.closing_inventory_t)} т</strong></span>}
      <span className="daily-legend-item"><i className="daily-receipt-marker"/>Поступление <strong>{number(selected?.delivered_t)} т</strong></span>
      <span className="daily-legend-item"><i className="daily-shortage-band"/>Дефицит <strong>{number(selected?.shortage_t)} т</strong></span>
    </div>
  </div>;
}
