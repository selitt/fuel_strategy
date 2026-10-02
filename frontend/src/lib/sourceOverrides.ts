import type { Plan, SourceOverride } from '../api/types';

const CANONICAL_SOURCE_IDS = new Set(['A', 'B', 'C', 'D', 'E']);
const NUMERIC_FIELDS = [
  'capacity_t_per_year',
  'variable_cost_mln_per_t',
  'reservation_rate_mln_per_t_year_capacity',
  'take_or_pay_share',
  'lead_time_min_value',
  'lead_time_max_value',
] as const;
const OVERRIDE_FIELDS = [...NUMERIC_FIELDS, 'lead_time_unit', 'reliability_profile', 'available_from_year'] as const;

type NumericField = typeof NUMERIC_FIELDS[number];
export type ReliabilityDraft =
  | {kind: 'constant'; value: string}
  | {kind: 'operating'; first_operating_year: string; later: string}
  | {kind: 'annual'; values: Record<string, string>};
export type SourceDraft = Record<NumericField, string> & {
  lead_time_unit: 'month' | 'week' | 'day';
  reliability: ReliabilityDraft;
  available_from_year: string;
};
export type SourceDraftErrors = Partial<Record<NumericField | 'lead_time_unit' | 'reliability_profile' | 'available_from_year', string>>;

function canonicalSourceId(reference: Record<string, string>): string | null {
  return CANONICAL_SOURCE_IDS.has(reference.source_id) ? reference.source_id : null;
}

function overrideFor(plan: Plan, reference: Record<string, string>): SourceOverride | undefined {
  const sourceId = canonicalSourceId(reference);
  return sourceId ? plan.source_overrides?.[sourceId] : undefined;
}

function displayValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export function effectiveSourceReference(plan: Plan, reference: Record<string, string>): Record<string, string> {
  const override = overrideFor(plan, reference);
  if (!override) return reference;
  const effective = {...reference};
  for (const field of OVERRIDE_FIELDS) {
    if (Object.hasOwn(override, field)) effective[field] = displayValue(override[field]);
  }
  return effective;
}

export function sourceIsCustomized(plan: Plan, reference: Record<string, string>): boolean {
  return !!overrideFor(plan, reference);
}

function profilePairs(profile: string): Record<string, string> {
  return Object.fromEntries(profile.split(';').map(part => {
    const separator = part.indexOf(':');
    return separator < 0 ? [] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(parts => parts.length === 2 && parts[0]));
}

function reliabilityDraft(originalProfile: string, effectiveProfile: string): ReliabilityDraft {
  const original = profilePairs(originalProfile), values = profilePairs(effectiveProfile);
  if (Object.hasOwn(original, 'constant')) return {kind: 'constant', value: values.constant ?? ''};
  if (Object.hasOwn(original, 'first_operating_year')) {
    return {kind: 'operating', first_operating_year: values.first_operating_year ?? '', later: values.later ?? ''};
  }
  return {kind: 'annual', values};
}

export function makeSourceDraft(reference: Record<string, string>, override?: SourceOverride): SourceDraft {
  const effective = {...reference};
  if (override) for (const field of OVERRIDE_FIELDS) {
    if (Object.hasOwn(override, field)) effective[field] = displayValue(override[field]);
  }
  return {
    capacity_t_per_year: effective.capacity_t_per_year ?? '',
    variable_cost_mln_per_t: effective.variable_cost_mln_per_t ?? '',
    reservation_rate_mln_per_t_year_capacity: effective.reservation_rate_mln_per_t_year_capacity ?? '',
    take_or_pay_share: effective.take_or_pay_share ?? '',
    lead_time_min_value: effective.lead_time_min_value ?? '',
    lead_time_max_value: effective.lead_time_max_value ?? '',
    lead_time_unit: effective.lead_time_unit === 'week' || effective.lead_time_unit === 'day' ? effective.lead_time_unit : 'month',
    reliability: reliabilityDraft(reference.reliability_profile ?? '', effective.reliability_profile ?? ''),
    available_from_year: effective.available_from_year ?? '',
  };
}

export function makePlanSourceDraft(plan: Plan, reference: Record<string, string>): SourceDraft {
  return makeSourceDraft(reference, overrideFor(plan, reference));
}

function finiteNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function annualReliabilityYears(draft: SourceDraft, reference: Record<string, string>, modelYears: number[] = []): number[] {
  if (draft.reliability.kind !== 'annual') return [];
  const originalYears = Object.keys(profilePairs(reference.reliability_profile ?? '')).map(Number).filter(Number.isInteger);
  const available = finiteNumber(draft.available_from_year);
  const operatingYears = Number.isInteger(available) ? modelYears.filter(year => Number.isInteger(year) && year >= available!) : [];
  return [...new Set([...originalYears, ...operatingYears])].sort((a, b) => a - b);
}

function probabilityIssue(value: string): string | undefined {
  const parsed = finiteNumber(value);
  return parsed === null || parsed < 0 || parsed > 1 ? 'Введите вероятность от 0 до 1.' : undefined;
}

export function validateSourceDraft(draft: SourceDraft, reference: Record<string, string>, modelYears: number[] = []): SourceDraftErrors {
  const errors: SourceDraftErrors = {};
  for (const field of ['capacity_t_per_year', 'variable_cost_mln_per_t', 'reservation_rate_mln_per_t_year_capacity'] as const) {
    const value = finiteNumber(draft[field]);
    if (value === null || value < 0) errors[field] = 'Введите конечное число не меньше нуля.';
  }
  const share = finiteNumber(draft.take_or_pay_share);
  if (share === null || share < 0 || share > 1) errors.take_or_pay_share = 'Введите долю от 0 до 1.';
  for (const field of ['lead_time_min_value', 'lead_time_max_value'] as const) {
    const value = finiteNumber(draft[field]);
    if (value === null || !Number.isInteger(value) || value < 0) errors[field] = 'Введите целое число не меньше нуля.';
  }
  const leadMin = finiteNumber(draft.lead_time_min_value), leadMax = finiteNumber(draft.lead_time_max_value);
  if (leadMin !== null && leadMax !== null && leadMin > leadMax) {
    errors.lead_time_max_value = 'Максимальный срок не может быть меньше минимального.';
  }
  const available = finiteNumber(draft.available_from_year);
  const mayBeUnknown = reference.available_from_year === '' || reference.available_from_year === undefined;
  if (!(mayBeUnknown && draft.available_from_year === '') && (available === null || !Number.isInteger(available) || available < 1 || available > 9999)) {
    errors.available_from_year = 'Введите целый год от 1 до 9999.';
  }
  if (draft.reliability.kind === 'constant') {
    const issue = probabilityIssue(draft.reliability.value);
    if (issue) errors.reliability_profile = issue;
  } else if (draft.reliability.kind === 'operating') {
    const first = probabilityIssue(draft.reliability.first_operating_year);
    const later = probabilityIssue(draft.reliability.later);
    if (first || later) errors.reliability_profile = 'Для первого и последующих лет введите вероятности от 0 до 1.';
  } else {
    const reliability = draft.reliability;
    const invalidYear = annualReliabilityYears(draft, reference, modelYears).find(year => probabilityIssue(reliability.values[String(year)] ?? ''));
    if (invalidYear !== undefined) errors.reliability_profile = `Для ${invalidYear} года введите вероятность от 0 до 1.`;
  }
  return errors;
}

function normalizedNumber(value: string): number {
  return Number(value);
}

function reliabilityProfile(draft: SourceDraft, reference: Record<string, string>, modelYears: number[]): string {
  if (draft.reliability.kind === 'constant') return `constant:${normalizedNumber(draft.reliability.value)}`;
  if (draft.reliability.kind === 'operating') {
    return `first_operating_year:${normalizedNumber(draft.reliability.first_operating_year)};later:${normalizedNumber(draft.reliability.later)}`;
  }
  const reliability = draft.reliability;
  return annualReliabilityYears(draft, reference, modelYears).map(year => `${year}:${normalizedNumber(reliability.values[String(year)] ?? '')}`).join(';');
}

function profilesEqual(left: string, right: string): boolean {
  const a = profilePairs(left), b = profilePairs(right), keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key)
    && Number.isFinite(Number(a[key])) && Number(a[key]) === Number(b[key]));
}

export function applySourceDraft(plan: Plan, reference: Record<string, string>, draft: SourceDraft, modelYears: number[] = []): Plan {
  const errors = validateSourceDraft(draft, reference, modelYears);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const sourceId = canonicalSourceId(reference);
  if (!sourceId) throw new Error('Параметры можно менять только у источников A–E из справочника.');
  const current: SourceOverride = {};
  for (const field of NUMERIC_FIELDS) {
    const value = normalizedNumber(draft[field]);
    if (value !== Number(reference[field])) current[field] = value;
  }
  if (draft.lead_time_unit !== reference.lead_time_unit) current.lead_time_unit = draft.lead_time_unit;
  const profile = reliabilityProfile(draft, reference, modelYears);
  if (!profilesEqual(profile, reference.reliability_profile)) current.reliability_profile = profile;
  const originalAvailable = reference.available_from_year ? Number(reference.available_from_year) : null;
  const available = draft.available_from_year === '' ? null : Number(draft.available_from_year);
  if (available !== originalAvailable) current.available_from_year = available;
  const sourceOverrides = {...(plan.source_overrides ?? {})};
  if (Object.keys(current).length) sourceOverrides[sourceId] = current;
  else delete sourceOverrides[sourceId];
  const next = {...plan};
  if (Object.keys(sourceOverrides).length) next.source_overrides = sourceOverrides;
  else delete next.source_overrides;
  return next;
}

export function resetSourceOverride(plan: Plan, reference: Record<string, string>): Plan {
  const sourceId = canonicalSourceId(reference);
  if (!sourceId || !plan.source_overrides?.[sourceId]) return plan;
  const sourceOverrides = {...plan.source_overrides};
  delete sourceOverrides[sourceId];
  const next = {...plan};
  if (Object.keys(sourceOverrides).length) next.source_overrides = sourceOverrides;
  else delete next.source_overrides;
  return next;
}
