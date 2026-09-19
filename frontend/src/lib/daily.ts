import type { Result } from '../api/types';

export const MODEL_DAYS_PER_YEAR = 365;
export const MODEL_START_YEAR = 2035;
export const MODEL_END_YEAR = 2040;
export const MODEL_HORIZON_DAYS = (MODEL_END_YEAR - MODEL_START_YEAR + 1) * MODEL_DAYS_PER_YEAR;

export type DailyPoint = {
  year: number;
  day: number;
  absolute_day?: number;
  opening_inventory_t?: number;
  delivered_t?: number;
  losses_t?: number;
  spill_t?: number;
  demand_total_t?: number;
  served_total_t?: number;
  shortage_t?: number;
  closing_inventory_t?: number;
};

export type TimelinePoint = DailyPoint & {
  model_day: number;
};

const measurementFields = [
  'opening_inventory_t',
  'delivered_t',
  'losses_t',
  'spill_t',
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

export function modelDayFromYearDay(year: number, day: number): number | undefined {
  if (!Number.isInteger(year) || year < MODEL_START_YEAR || year > MODEL_END_YEAR)
    return undefined;
  if (!Number.isInteger(day) || day < 1 || day > MODEL_DAYS_PER_YEAR)
    return undefined;
  return (year - MODEL_START_YEAR) * MODEL_DAYS_PER_YEAR + day;
}

export function yearDayFromModelDay(modelDay: number): {year: number; day: number} | undefined {
  if (!Number.isInteger(modelDay) || modelDay < 1 || modelDay > MODEL_HORIZON_DAYS)
    return undefined;
  const zeroBased = modelDay - 1;
  return {
    year: MODEL_START_YEAR + Math.floor(zeroBased / MODEL_DAYS_PER_YEAR),
    day: zeroBased % MODEL_DAYS_PER_YEAR + 1,
  };
}

export function modelTimelineRange(range?: readonly [number, number]): [number, number] {
  if (!range)
    return [1, MODEL_HORIZON_DAYS];
  const left = Number.isFinite(range[0]) ? Math.trunc(range[0]) : 1;
  const right = Number.isFinite(range[1]) ? Math.trunc(range[1]) : MODEL_HORIZON_DAYS;
  const start = Math.max(1, Math.min(MODEL_HORIZON_DAYS, Math.min(left, right)));
  const end = Math.max(1, Math.min(MODEL_HORIZON_DAYS, Math.max(left, right)));
  return [start, end];
}

export function detailTimelineRange(selectedDay: number, windowDays = 90): [number, number] {
  const selected = Math.max(1, Math.min(MODEL_HORIZON_DAYS, Math.trunc(selectedDay)));
  const length = Math.max(1, Math.min(MODEL_HORIZON_DAYS, Math.trunc(windowDays)));
  let start = selected - Math.floor(length / 2);
  let end = start + length - 1;
  if (start < 1) {
    start = 1;
    end = length;
  }
  if (end > MODEL_HORIZON_DAYS) {
    end = MODEL_HORIZON_DAYS;
    start = end - length + 1;
  }
  return [start, end];
}

/** Projects source records onto the fixed 2035–2040 model-day axis without interpolation. */
export function projectTimelineTrace(result: Result, range?: readonly [number, number]): TimelinePoint[] {
  const [start, end] = modelTimelineRange(range);
  const trace = Array.isArray(result.inventory_trace) ? result.inventory_trace : [];
  return trace.flatMap((value): TimelinePoint[] => {
    const source = record(value);
    if (!source || !Number.isInteger(source.year) || !Number.isInteger(source.day_of_year))
      return [];
    const year = source.year as number;
    const day = source.day_of_year as number;
    const modelDay = modelDayFromYearDay(year, day);
    if (modelDay === undefined || modelDay < start || modelDay > end)
      return [];
    const point: TimelinePoint = { year, day, model_day: modelDay };
    if (finite(source.day))
      point.absolute_day = source.day;
    for (const field of measurementFields) {
      if (finite(source[field]))
        point[field] = source[field];
    }
    return [point];
  }).sort((left, right) => left.model_day - right.model_day);
}

export function timelineRecordAt(result: Result, modelDay: number): TimelinePoint | undefined {
  if (!Number.isInteger(modelDay))
    return undefined;
  return projectTimelineTrace(result, [modelDay, modelDay])[0];
}

export function modelTimelineTicks(range?: readonly [number, number], maxTicks = 7): number[] {
  const [start, end] = modelTimelineRange(range);
  const count = Math.max(2, Math.trunc(maxTicks));
  const duration = end - start + 1;
  if (duration <= 1)
    return [start];
  if (duration <= MODEL_DAYS_PER_YEAR) {
    const actualCount = Math.min(count, duration);
    return Array.from({length: actualCount}, (_, index) =>
      Math.round(start + (end - start) * index / (actualCount - 1)));
  }
  const candidates = [start];
  for (let year = MODEL_START_YEAR; year <= MODEL_END_YEAR; year += 1) {
    const firstDay = modelDayFromYearDay(year, 1)!;
    if (firstDay > start && firstDay < end)
      candidates.push(firstDay);
  }
  candidates.push(end);
  if (candidates.length <= count)
    return candidates;
  return Array.from({length: count}, (_, index) =>
    candidates[Math.round((candidates.length - 1) * index / (count - 1))]);
}

export function modelDayLabel(modelDay: number): string {
  const coordinate = yearDayFromModelDay(modelDay);
  return coordinate ? `${coordinate.year} · день ${coordinate.day}` : '—';
}

/** Calendar presentation only: February always has 28 days in the model. */
export function modelCalendarDate(year: number, day: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(day) || day < 1 || day > 365) return '—';
  const lengths = [31,28,31,30,31,30,31,31,30,31,30,31];
  let month = 0;
  while (day > lengths[month]) day -= lengths[month++];
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
