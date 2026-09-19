import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const source = path.resolve('src/lib/motion.ts');
const build = path.resolve('.motion-test-build');
const output = path.join(build, 'motion.mjs');

if (fs.existsSync(source)) {
  const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    fileName: source,
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(ts.formatDiagnostics(errors, { getCanonicalFileName: value => value, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }));
  fs.mkdirSync(build, { recursive: true });
  fs.writeFileSync(output, compiled.outputText);
}

const motion = fs.existsSync(output) ? await import(`${new URL(output, import.meta.url).href}?${Date.now()}`) : {};
fs.rmSync(build, { recursive: true, force: true });

function fakeFrames() {
  let nextId = 1;
  const pending = new Map();
  const cancelled = [];
  return {
    driver: {
      requestFrame(callback) {
        const id = nextId++;
        pending.set(id, callback);
        return id;
      },
      cancelFrame(id) {
        cancelled.push(id);
        pending.delete(id);
      },
    },
    flush(time) {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach(callback => callback(time));
    },
    get pending() { return pending.size; },
    cancelled,
  };
}

test('multiple animations share one demand-driven frame request and stop when complete', () => {
  assert.equal(typeof motion.createMotionScheduler, 'function');
  const frames = fakeFrames();
  const scheduler = motion.createMotionScheduler(frames.driver);
  const calls = [];
  scheduler.subscribe(time => { calls.push(['a', time]); return false; });
  scheduler.subscribe(time => { calls.push(['b', time]); return false; });
  assert.equal(frames.pending, 1);
  frames.flush(0);
  assert.deepEqual(calls, [['a', 0], ['b', 0]]);
  assert.equal(frames.pending, 0);
});

test('high-refresh frames are coalesced to about 60 updates per second', () => {
  const frames = fakeFrames();
  const scheduler = motion.createMotionScheduler(frames.driver);
  const calls = [];
  scheduler.subscribe(time => { calls.push(time); return calls.length < 3; });
  frames.flush(0);
  frames.flush(5);
  frames.flush(10);
  frames.flush(17);
  frames.flush(25);
  frames.flush(34);
  assert.deepEqual(calls, [0, 17, 34]);
  assert.equal(frames.pending, 0);
});

test('fractional 60Hz browser timestamps do not drop every other frame', () => {
  const frames = fakeFrames();
  const scheduler = motion.createMotionScheduler(frames.driver);
  const calls = [];
  scheduler.subscribe(time => { calls.push(time); return calls.length < 4; });
  for (const time of [0, 16.666, 33.333, 50]) frames.flush(time);
  assert.deepEqual(calls, [0, 16.666, 33.333, 50]);
});

test('120Hz and 144Hz displays keep an average update rate close to 60Hz', () => {
  for (const refreshRate of [120, 144]) {
    const frames = fakeFrames();
    const scheduler = motion.createMotionScheduler(frames.driver);
    let updates = 0;
    scheduler.subscribe(() => { updates++; return true; });
    for (let frame = 0; frame <= refreshRate; frame++) frames.flush(frame * 1000 / refreshRate);
    assert.ok(updates >= 58 && updates <= 62, `${refreshRate}Hz produced ${updates} updates`);
  }
});

test('unsubscribing the last animation cancels the pending browser frame', () => {
  const frames = fakeFrames();
  const scheduler = motion.createMotionScheduler(frames.driver);
  const unsubscribe = scheduler.subscribe(() => true);
  assert.equal(frames.pending, 1);
  unsubscribe();
  assert.equal(frames.pending, 0);
  assert.equal(frames.cancelled.length, 1);
});
