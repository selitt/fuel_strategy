import test from 'node:test';
import assert from 'node:assert/strict';
const m = await import('../.test-build/lib/plot.js').catch(() => ({}));
test('stack positions retain negative cash-flow components rather than dropping them', () => {
  assert.equal(typeof m.signedStack, 'function');
  const s = m.signedStack([10, -4, 2, -3]);
  assert.equal(s.min, -7); assert.equal(s.max, 12);
  assert.deepEqual(s.segments.map(({from, to}) => [from, to]), [[0,10],[0,-4],[10,12],[-4,-7]]);
});
test('missing chart components are gaps and explicit zero is retained', () => {
  const s = m.signedStack([0, undefined, NaN, Infinity]);
  assert.deepEqual(s.segments, [{index:0,from:0,to:0}]);
  assert.equal(s.min, 0); assert.equal(s.max, 0);
});
