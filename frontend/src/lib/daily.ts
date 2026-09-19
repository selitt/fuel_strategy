import type { Result } from '../api/types';

export const MODEL_DAYS_PER_YEAR = 365;

export type DailyPoint = {
  year: number;
  day: number;
  absolute_day?: number;
  opening_inventory_t?: number;
  delivered_t?: number;
  losses_t?: number;
  demand_total_t?: number;
  served_total_t?: number;
  shortage_t?: number;
  closing_inventory_t?: number;
};

const measurementFields = [
  'opening_inventory_t',
  'delivered_t',
  'losses_t',
  'demand_total_t',
  'served_total_t',
  'shortage_t',
  'closing_inventory_t',
] as const;

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function modelDayRange(range?: readonly [number, number]): [number, number] {
  if (!range)
    return [1, MODEL_DAYS_PER_YEAR];
  const left = Number.isFinite(range[0]) ? Math.trunc(range[0]) : 1;
  const right = Number.isFinite(range[1]) ? Math.trunc(range[1]) : MODEL_DAYS_PER_YEAR;
  const start = Math.max(1, Math.min(MODEL_DAYS_PER_YEAR, Math.min(left, right)));
  const end = Math.max(1, Math.min(MODEL_DAYS_PER_YEAR, Math.max(left, right)));
  return [start, end];
}

/** Reads model output as-is. It only validates coordinates and finite measurements. */
export function projectDailyTrace(result: Result, year: number, range?: readonly [number, number]): DailyPoint[] {
  if (!Number.isInteger(year))
    return [];
  const [start, end] = modelDayRange(range);
  const trace = Array.isArray(result.inventory_trace) ? result.inventory_trace : [];
  return trace.flatMap((value): DailyPoint[] => {
    const source = record(value);
    if (!source || source.year !== year || !Number.isInteger(source.day_of_year))
      return [];
    const day = source.day_of_year as number;
    if (day < start || day > end || day < 1 || day > MODEL_DAYS_PER_YEAR)
      return [];
    const point: DailyPoint = { year, day };
    if (finite(source.day))
      point.absolute_day = source.day;
    for (const field of measurementFields) {
      if (finite(source[field]))
        point[field] = source[field];
    }
    return [point];
  }).sort((left, right) => left.day - right.day);
}

export function dailyRecordAt(result: Result, year: number, day: number): DailyPoint | undefined {
  if (!Number.isInteger(day))
    return undefined;
  return projectDailyTrace(result, year, [day, day])[0];
}

export function modelWeekTicks(range?: readonly [number, number]): number[] {
  const [start, end] = modelDayRange(range);
  const first = 1 + Math.ceil((start - 1) / 7) * 7;
  const ticks: number[] = [];
  for (let day = first; day <= end; day += 7)
    ticks.push(day);
  return ticks;
}
