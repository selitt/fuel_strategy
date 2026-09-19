import test from 'node:test';
import assert from 'node:assert/strict';

const daily = await import('../.test-build/lib/daily.js').catch(() => ({}));

const result = {
  scenario_id: 'BASE',
  plan_id: 'plan-1',
  units: { fuel: 't', currency: 'mln_units' },
  inventory_trace: [
    { year: 2036, day_of_year: 1, closing_inventory_t: 91 },
    { year: 2035, day_of_year: 8, opening_inventory_t: 12, delivered_t: 0, losses_t: 0, demand_total_t: 3, served_total_t: 3, shortage_t: 0, closing_inventory_t: 9 },
    { year: 2035, day_of_year: 1, opening_inventory_t: 10, delivered_t: 5, losses_t: 1, demand_total_t: 2, served_total_t: 2, shortage_t: 0, closing_inventory_t: 12 },
    { year: 2035, day_of_year: 3, opening_inventory_t: 8, delivered_t: 0, losses_t: 0, demand_total_t: 4, served_total_t: 1, shortage_t: 3, closing_inventory_t: 5 },
    { year: 2035, day_of_year: 0, closing_inventory_t: 999 },
    { year: 2035, day_of_year: '4', closing_inventory_t: 999 },
  ],
};

test('daily projection uses only the requested model year, sorts model days, and retains explicit zeroes', () => {
  assert.equal(typeof daily.projectDailyTrace, 'function');
  const projected = daily.projectDailyTrace(result, 2035);
  assert.deepEqual(projected.map(row => row.day), [1, 3, 8]);
  assert.equal(projected[2].delivered_t, 0);
  assert.equal(projected[2].shortage_t, 0);
  assert.deepEqual(daily.projectDailyTrace(result, 2040), []);
});

test('daily projection keeps missing measurements missing instead of replacing them with zero', () => {
  const projected = daily.projectDailyTrace({
    ...result,
    inventory_trace: [{ year: 2035, day_of_year: 4, closing_inventory_t: null, delivered_t: '7' }],
  }, 2035);
  assert.equal(projected.length, 1);
  assert.equal(projected[0].closing_inventory_t, undefined);
  assert.equal(projected[0].delivered_t, undefined);
});

test('a detail range is clamped to the 365-day model year without inventing civil dates', () => {
  const projected = daily.projectDailyTrace(result, 2035, [2, 999]);
  assert.deepEqual(projected.map(row => row.day), [3, 8]);
  assert.deepEqual(daily.modelDayRange([-20, 999]), [1, 365]);
});

test('weekly ticks stay anchored to model days 1, 8, 15 and include day 365', () => {
  assert.deepEqual(daily.modelWeekTicks([1, 20]), [1, 8, 15]);
  const full = daily.modelWeekTicks();
  assert.equal(full[0], 1);
  assert.equal(full[1], 8);
  assert.equal(full.at(-1), 365);
  assert.equal(full.length, 53);
});

test('day lookup is exact and never falls back to another year or day', () => {
  assert.equal(daily.dailyRecordAt(result, 2035, 3)?.shortage_t, 3);
  assert.equal(daily.dailyRecordAt(result, 2036, 3), undefined);
  assert.equal(daily.dailyRecordAt(result, 2035, 2), undefined);
});

test('timeline coordinates cross model-year boundaries without civil-date math', () => {
  assert.equal(daily.modelDayFromYearDay(2035, 1), 1);
  assert.equal(daily.modelDayFromYearDay(2035, 365), 365);
  assert.equal(daily.modelDayFromYearDay(2036, 1), 366);
  assert.equal(daily.modelDayFromYearDay(2040, 365), 2190);
  assert.deepEqual(daily.yearDayFromModelDay(366), { year: 2036, day: 1 });
  assert.deepEqual(daily.yearDayFromModelDay(2190), { year: 2040, day: 365 });
  assert.equal(daily.modelDayFromYearDay(2041, 1), undefined);
  assert.equal(daily.yearDayFromModelDay(0), undefined);
});

test('a 90-day detail window follows the selected day across years and clamps at horizon edges', () => {
  assert.deepEqual(daily.detailTimelineRange(1), [1, 90]);
  assert.deepEqual(daily.detailTimelineRange(366), [321, 410]);
  assert.deepEqual(daily.detailTimelineRange(2190), [2101, 2190]);
  assert.deepEqual(daily.modelTimelineRange([-10, 9999]), [1, 2190]);
});

test('timeline projection sorts the whole horizon and keeps missing measurements absent', () => {
  const projected = daily.projectTimelineTrace({
    ...result,
    inventory_trace: [
      { year: 2036, day_of_year: 2, closing_inventory_t: 20 },
      { year: 2035, day_of_year: 365, closing_inventory_t: 10 },
      { year: 2036, day_of_year: 1, closing_inventory_t: null, shortage_t: 4 },
      { year: 2041, day_of_year: 1, closing_inventory_t: 999 },
    ],
  });
  assert.deepEqual(projected.map(row => [row.model_day, row.year, row.day]), [
    [365, 2035, 365],
    [366, 2036, 1],
    [367, 2036, 2],
  ]);
  assert.equal(projected[1].closing_inventory_t, undefined);
  assert.equal(projected[1].shortage_t, 4);
  assert.deepEqual(daily.projectTimelineTrace(result, [366, 366]).map(row => row.model_day), [366]);
});

test('timeline ticks are sparse for the full horizon and readable inside a detail window', () => {
  assert.deepEqual(daily.modelTimelineTicks([1, 2190], 7), [1, 366, 731, 1096, 1461, 1826, 2190]);
  assert.deepEqual(daily.modelTimelineTicks([340, 429], 4), [340, 370, 399, 429]);
  assert.equal(daily.modelDayLabel(366), '2036 · день 1');
});

test('month date labels follow the fixed 365-day model, including leap years', () => {
  assert.equal(daily.modelCalendarDate(2036, 59), '2036-02-28');
  assert.equal(daily.modelCalendarDate(2036, 60), '2036-03-01');
  assert.equal(daily.modelCalendarDate(2035, 365), '2035-12-31');
  assert.equal(daily.modelCalendarDate(2035, 366), '—');
});
