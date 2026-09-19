import { useId, useLayoutEffect, useMemo, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Result } from '../api/types';
import {
  MODEL_END_YEAR,
  MODEL_HORIZON_DAYS,
  MODEL_START_YEAR,
  modelDayFromYearDay,
  modelDayLabel,
  modelTimelineTicks,
  projectTimelineTrace,
  yearDayFromModelDay,
} from '../lib/daily';
import { number } from '../lib/format';

export type ComparisonChartMetric = 'inventory' | 'shortage' | 'cost';

export type ComparisonChartSeries = {
  id: string;
  name: string;
  color: string;
  result: Result;
  stale: boolean;
};

type Props = {
  series: ComparisonChartSeries[];
  metric: ComparisonChartMetric;
  range: 'all' | 'year';
  year: number;
};

type Point = { x: number; value: number };
type PreparedSeries = ComparisonChartSeries & { points: Point[]; values: Map<number, number> };

const labels: Record<ComparisonChartMetric, string> = {
  inventory: 'Запас на конец дня',
  shortage: 'Дефицит за день',
  cost: 'Расходы за год',
};

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function uniquePoints(points: Point[]) {
  const grouped = new Map<number, Point[]>();
  for (const point of points)
    grouped.set(point.x, [...(grouped.get(point.x) || []), point]);
  return [...grouped.values()].flatMap(matches => matches.length === 1 ? matches : []).sort((left, right) => left.x - right.x);
}

function usePlotSize() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1040, height: 240 });
  useLayoutEffect(() => {
    if (!node)
      return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (!rect)
        return;
      setSize({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(150, Math.round(rect.height)),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { ref: setNode, ...size };
}

function lineSegments(points: Point[], x: (value: number) => number, y: (value: number) => number) {
  const paths: string[] = [];
  let path = '';
  let previous: number | undefined;
  for (const point of points) {
    if (previous !== undefined && point.x !== previous + 1) {
      if (path)
        paths.push(path);
      path = '';
    }
    path += `${path ? ' L' : 'M'}${x(point.x)},${y(point.value)}`;
    previous = point.x;
  }
  if (path)
    paths.push(path);
  return paths;
}

function tickLabel(metric: ComparisonChartMetric, value: number, range: 'all' | 'year') {
  if (metric === 'cost')
    return String(value);
  const coordinate = yearDayFromModelDay(value);
  if (!coordinate)
    return '—';
  return range === 'all' ? String(coordinate.year) : `день ${coordinate.day}`;
}

export function StrategyComparisonChart({ series, metric, range, year }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const tooltipId = useId();
  const { ref, width, height } = usePlotSize();
  const daily = metric !== 'cost';
  const yearStart = modelDayFromYearDay(year, 1) ?? 1;
  const yearEnd = modelDayFromYearDay(year, 365) ?? MODEL_HORIZON_DAYS;
  const domain: readonly [number, number] = daily
    ? range === 'year' ? [yearStart, yearEnd] : [1, MODEL_HORIZON_DAYS]
    : [MODEL_START_YEAR, MODEL_END_YEAR];

  const prepared = useMemo<PreparedSeries[]>(() => series.map(item => {
    let points: Point[];
    if (metric === 'cost') {
      points = (item.result.financial_breakdown || []).flatMap(row =>
        Number.isInteger(row.year) && finite(row.total) && row.year >= domain[0] && row.year <= domain[1]
          ? [{ x: row.year, value: row.total }]
          : []);
    } else {
      const field = metric === 'inventory' ? 'closing_inventory_t' : 'shortage_t';
      points = projectTimelineTrace(item.result, domain).flatMap(row =>
        finite(row[field]) ? [{ x: row.model_day, value: row[field] }] : []);
    }
    points = uniquePoints(points);
    return { ...item, points, values: new Map(points.map(point => [point.x, point.value])) };
  }), [domain[0], domain[1], metric, series]);

  const values = prepared.flatMap(item => item.points.map(point => point.value));
  if (!values.length)
    return <div className="strategy-comparison-chart-empty">Модель не передала значения для выбранного графика.</div>;

  const pad = { left: 60, right: 20, top: 20, bottom: 38 };
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const span = Math.max(1, maxValue - minValue);
  const x = (value: number) => pad.left + (width - pad.left - pad.right) * (value - domain[0]) / Math.max(1, domain[1] - domain[0]);
  const y = (value: number) => pad.top + (height - pad.top - pad.bottom) * (maxValue - value) / span;
  const yTicks = [0, .25, .5, .75, 1].map(part => minValue + span * part);
  const xTicks = daily
    ? modelTimelineTicks(domain, width < 760 ? 4 : 7)
    : Array.from({ length: MODEL_END_YEAR - MODEL_START_YEAR + 1 }, (_, index) => MODEL_START_YEAR + index);
  const unit = metric === 'cost' ? 'млн у.е.' : 'т';
  const cursor = hovered === null ? null : Math.max(domain[0], Math.min(domain[1], hovered));

  function selectFromPointer(event: ReactPointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0)
      return;
    const plotX = (event.clientX - bounds.left) * width / bounds.width;
    const value = domain[0] + (plotX - pad.left) / (width - pad.left - pad.right) * (domain[1] - domain[0]);
    setHovered(Math.max(domain[0], Math.min(domain[1], Math.round(value))));
  }

  function moveCursor(change: number) {
    setHovered(current => Math.max(domain[0], Math.min(domain[1], (current ?? domain[0]) + change)));
  }

  const tooltipTitle = cursor === null
    ? ''
    : metric === 'cost' ? String(cursor) : modelDayLabel(cursor);

  return <div className="strategy-comparison-chart">
    <div className="comparison-chart-frame" ref={ref}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${labels[metric]}, ${unit}. ${series.map(item => item.name).join(', ')}`} onPointerLeave={() => setHovered(null)}>
      {yTicks.map(value => <g key={value}>
        <line className="comparison-chart-grid" x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)}/>
        <text className="comparison-chart-axis" x={pad.left - 10} y={y(value) + 4} textAnchor="end">{number(value)}</text>
      </g>)}
      <text className="comparison-chart-axis comparison-chart-unit" x={pad.left} y={14}>{unit}</text>
      {xTicks.map(value => <g key={value}>
        <line className="comparison-chart-grid comparison-chart-grid-x" x1={x(value)} x2={x(value)} y1={pad.top} y2={height - pad.bottom}/>
        <text className="comparison-chart-axis" x={x(value)} y={height - 15} textAnchor={value === domain[0] ? 'start' : value === domain[1] ? 'end' : 'middle'}>{tickLabel(metric, value, range)}</text>
      </g>)}
      {prepared.map(item => <g key={item.id}>
        {lineSegments(item.points, x, y).map((path, index) => <path
          key={index}
          className={`comparison-chart-line ${item.stale ? 'is-stale' : ''}`}
          d={path}
          stroke={item.color}
        />)}
        {metric === 'cost' && item.points.map(point => <circle key={point.x} cx={x(point.x)} cy={y(point.value)} r="3.5" fill="var(--surface)" stroke={item.color} strokeWidth="2"/>)}
      </g>)}
      {cursor !== null && <line className="comparison-chart-cursor" x1={x(cursor)} x2={x(cursor)} y1={pad.top} y2={height - pad.bottom}/>} 
      <rect
        className="comparison-chart-hit"
        x={pad.left}
        y={pad.top}
        width={width - pad.left - pad.right}
        height={height - pad.top - pad.bottom}
        fill="transparent"
        role="slider"
        tabIndex={0}
        aria-label="Точка общего графика"
        aria-valuemin={domain[0]}
        aria-valuemax={domain[1]}
        aria-valuenow={cursor ?? domain[0]}
        aria-valuetext={cursor === null ? 'Используйте стрелки для просмотра значений' : tooltipTitle}
        aria-describedby={cursor === null ? undefined : tooltipId}
        onPointerMove={selectFromPointer}
        onFocus={() => setHovered(current => current ?? domain[0])}
        onBlur={() => setHovered(null)}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); moveCursor(-1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); moveCursor(1); }
          if (event.key === 'Home') { event.preventDefault(); setHovered(domain[0]); }
          if (event.key === 'End') { event.preventDefault(); setHovered(domain[1]); }
        }}
      />
    </svg>
    {cursor !== null && <div id={tooltipId} className="comparison-chart-tooltip" style={{ left: `${Math.max(12, Math.min(88, x(cursor) / width * 100))}%` }}>
      <strong>{tooltipTitle}</strong>
      {prepared.map(item => <span key={item.id}><i style={{ background: item.color }}/><b>{item.name}</b><em>{number(item.values.get(cursor))} {unit}</em></span>)}
    </div>}
    </div>
    <div className="comparison-chart-legend" aria-label="Легенда графика">
      {prepared.map(item => <span key={item.id}><i style={{ background: item.color }}/>{item.name}{item.stale && <small>устарел</small>}</span>)}
    </div>
  </div>;
}
