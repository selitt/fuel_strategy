import test from 'node:test';
import assert from 'node:assert/strict';

const sourceOverrides = await import('../.test-build/lib/sourceOverrides.js').catch(() => ({}));

const reference = (patch = {}) => ({
  source_id: 'A',
  name: 'Earth-Core',
  capacity_t_per_year: '190',
  variable_cost_mln_per_t: '6.2',
  reservation_rate_mln_per_t_year_capacity: '0.45',
  take_or_pay_share: '0.70',
  lead_time_min_value: '12',
  lead_time_max_value: '12',
  lead_time_unit: 'month',
  reliability_profile: 'constant:0.96',
  available_from_year: '2035',
  ...patch,
});

const plan = (source_overrides) => ({
  plan_id: 'p',
  scenario_id: 'BASE',
  decisions: {supply_orders: [], capacity_reservations: [], investments: [], inventory_policy: {initial_inventory_t: 0}},
  ...(source_overrides ? {source_overrides} : {}),
});

test('source override helpers are available', () => {
  assert.equal(typeof sourceOverrides.makeSourceDraft, 'function');
  assert.equal(typeof sourceOverrides.applySourceDraft, 'function');
  assert.equal(typeof sourceOverrides.effectiveSourceReference, 'function');
});

test('effective source parameters merge by canonical source ID without mutating catalog data', () => {
  const row = reference();
  const p = plan({A: {capacity_t_per_year: 175, available_from_year: 2037}});
  assert.deepEqual(sourceOverrides.effectiveSourceReference(p, row), {...row, capacity_t_per_year: '175', available_from_year: '2037'});
  assert.equal(row.capacity_t_per_year, '190');
  assert.equal(sourceOverrides.sourceIsCustomized(p, row), true);
  assert.equal(sourceOverrides.sourceIsCustomized(plan({EarthCore: {capacity_t_per_year: 1}}), row), false);
});

test('applying an editor draft stores only differences and preserves unrelated plan and override fields', () => {
  const row = reference();
  const p = {...plan({A: {reservation_rate_mln_per_t_year_capacity: 0.45}, B: {capacity_t_per_year: 77}}), extension: {keep: true}};
  const draft = sourceOverrides.makeSourceDraft(row);
  draft.capacity_t_per_year = '205.5';
  draft.take_or_pay_share = '0.8';
  draft.reliability = {kind: 'constant', value: '0.975'};
  const next = sourceOverrides.applySourceDraft(p, row, draft);
  assert.deepEqual(next.source_overrides, {
    A: {capacity_t_per_year: 205.5, take_or_pay_share: 0.8, reliability_profile: 'constant:0.975'},
    B: {capacity_t_per_year: 77},
  });
  assert.deepEqual(next.extension, {keep: true});
  assert.equal(p.source_overrides.A.capacity_t_per_year, undefined);
});

test('matching original values remove known overrides and reset removes the canonical entry', () => {
  const row = reference();
  const p = plan({A: {capacity_t_per_year: 200}, B: {capacity_t_per_year: 77}});
  const resetDraft = sourceOverrides.makeSourceDraft(row);
  const applied = sourceOverrides.applySourceDraft(p, row, resetDraft);
  assert.deepEqual(applied.source_overrides, {B: {capacity_t_per_year: 77}});
  assert.deepEqual(sourceOverrides.resetSourceOverride(p, row), { ...p, source_overrides: {B: {capacity_t_per_year: 77}} });
});

test('numeric validation rejects non-finite, fractional lead time, inverted range, shares and probabilities outside zero to one', () => {
  const draft = sourceOverrides.makeSourceDraft(reference());
  draft.capacity_t_per_year = 'Infinity';
  draft.take_or_pay_share = '1.01';
  draft.lead_time_min_value = '2.5';
  draft.lead_time_max_value = '1';
  draft.reliability = {kind: 'constant', value: '-0.1'};
  const errors = sourceOverrides.validateSourceDraft(draft, reference());
  assert.match(errors.capacity_t_per_year, /число/);
  assert.match(errors.take_or_pay_share, /0 до 1/);
  assert.match(errors.lead_time_min_value, /целое/);
  assert.match(errors.lead_time_max_value, /меньше/);
  assert.match(errors.reliability_profile, /0 до 1/);
});

test('unchanged Lunar profile keeps decimal formatting from creating a research override', () => {
  const row = reference({source_id: 'D', name: 'Lunar-ISRU', available_from_year: '2038', reliability_profile: '2038:0.78;2039:0.90;2040:0.93'});
  const draft = sourceOverrides.makeSourceDraft(row);
  const next = sourceOverrides.applySourceDraft(plan(), row, draft, [2035, 2036, 2037, 2038, 2039, 2040]);
  assert.equal(next.source_overrides, undefined);
});

test('annual reliability adds blank catalog years when availability moves earlier and never guesses probabilities', () => {
  const row = reference({source_id: 'D', name: 'Lunar-ISRU', available_from_year: '2038', reliability_profile: '2038:0.78;2039:0.90;2040:0.93'});
  const draft = sourceOverrides.makeSourceDraft(row);
  draft.available_from_year = '2036';
  const years = [2035, 2036, 2037, 2038, 2039, 2040];
  assert.deepEqual(sourceOverrides.annualReliabilityYears(draft, row, years), [2036, 2037, 2038, 2039, 2040]);
  assert.equal(draft.reliability.kind, 'annual');
  assert.equal(draft.reliability.values['2036'], undefined);
  assert.match(sourceOverrides.validateSourceDraft(draft, row, years).reliability_profile, /2036/);
  draft.reliability.values['2036'] = '0.7';
  draft.reliability.values['2037'] = '0.75';
  assert.equal(sourceOverrides.validateSourceDraft(draft, row, years).reliability_profile, undefined);
  const next = sourceOverrides.applySourceDraft(plan(), row, draft, years);
  assert.equal(next.source_overrides.D.reliability_profile, '2036:0.7;2037:0.75;2038:0.78;2039:0.9;2040:0.93');
});

test('availability before the catalog horizon requires every catalog year without hardcoded UI bounds', () => {
  const row = reference({source_id: 'D', name: 'Lunar-ISRU', available_from_year: '2038', reliability_profile: '2038:0.78;2039:0.90;2040:0.93'});
  const draft = sourceOverrides.makeSourceDraft(row);
  draft.available_from_year = '2034';
  assert.deepEqual(sourceOverrides.annualReliabilityYears(draft, row, [2035, 2036, 2037, 2038, 2039, 2040]), [2035, 2036, 2037, 2038, 2039, 2040]);
});

test('profile parser trims imported key/value whitespace', () => {
  const draft = sourceOverrides.makeSourceDraft(reference({reliability_profile: ' constant : 0.96 '}));
  assert.deepEqual(draft.reliability, {kind: 'constant', value: '0.96'});
});

test('availability may stay unknown only for a source whose catalog value is unknown', () => {
  const known = sourceOverrides.makeSourceDraft(reference());
  known.available_from_year = '';
  assert.match(sourceOverrides.validateSourceDraft(known, reference()).available_from_year, /целый год/);
  const unknownRow = reference({source_id: 'C', name: 'Earth-New', available_from_year: ''});
  const unknown = sourceOverrides.makeSourceDraft(unknownRow);
  assert.equal(sourceOverrides.validateSourceDraft(unknown, unknownRow).available_from_year, undefined);
  const next = sourceOverrides.applySourceDraft(plan(), unknownRow, unknown);
  assert.equal(next.source_overrides, undefined);
});
