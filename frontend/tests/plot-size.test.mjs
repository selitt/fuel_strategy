import test from 'node:test';
import assert from 'node:assert/strict';

const plotSize = await import('../.test-build/lib/plotSize.js').catch(() => ({}));

test('plot size uses the measured box and rounds it to stable SVG coordinates', () => {
  assert.equal(typeof plotSize.normalizePlotSize, 'function');
  assert.deepEqual(plotSize.normalizePlotSize({ width: 719.6, height: 284.4 }, 320, 210), {
    width: 720,
    height: 284,
  });
});

test('plot size clamps small boxes and waits while an element has no layout', () => {
  assert.equal(plotSize.normalizePlotSize({ width: 180, height: 90 }, 320, 210)?.width, 320);
  assert.equal(plotSize.normalizePlotSize({ width: 180, height: 90 }, 320, 210)?.height, 210);
  assert.equal(plotSize.normalizePlotSize({ width: 0, height: 210 }, 320, 210), null);
  assert.equal(plotSize.normalizePlotSize({ width: 320, height: 0 }, 320, 210), null);
});
