import type { Plan, Result } from '../api/types';
import { otherScenario } from './matrix.js';
export interface PreviewInput { plan: Plan; both: boolean }
export interface Preview { basis: Plan; primary: Result; otherPlan?: Plan; other?: Result; createdAt: string }
export async function calculatePreview(input: PreviewInput, simulate: (plan: Plan) => Promise<Result>): Promise<Preview> {
 const otherPlan = input.both ? otherScenario(input.plan) : undefined;
 // Await every request, including the surviving half of a failed pair.
 const replies = await Promise.allSettled([simulate(input.plan), ...(otherPlan ? [simulate(otherPlan)] : [])]);
 const failure = replies.find(r => r.status === 'rejected');
 if (failure?.status === 'rejected') throw failure.reason;
 const results = replies.map(r => (r as PromiseFulfilledResult<Result>).value);
 return { basis: input.plan, primary: results[0], otherPlan, other: results[1], createdAt: new Date().toISOString() };
}
interface Clock { now(): number; set(fn: () => void, delay: number): unknown; clear(timer: unknown): void }
const clock: Clock = { now: () => performance.now(), set: (fn, ms) => setTimeout(fn, ms), clear: timer => clearTimeout(timer as ReturnType<typeof setTimeout>) };
/** One active cycle and one replaceable pending snapshot. Never retries a failed input. */
export class LatestCalculation<I, O> {
 private generation = 0;
 private pending: { input: I; generation: number } | null = null;
 private running = false;
 private timer: unknown = null;
 private lastStart = -Infinity;
 private stopped = false;
 private waiters: (() => void)[] = [];
 constructor(private run: (input: I) => Promise<O>, private publish: (output: O) => void, private fail: (error: unknown) => void, private time = clock) {}
 update(input: I | null) {
  if (this.stopped) return;
  this.generation++;
  this.pending = input === null ? null : { input, generation: this.generation };
  if (this.timer !== null) { this.time.clear(this.timer); this.timer = null; }
  this.schedule();
 }
 private schedule() {
  if (this.stopped || this.running || !this.pending || this.timer !== null) return;
  this.timer = this.time.set(() => { this.timer = null; void this.start(); }, Math.max(0, 100 - (this.time.now() - this.lastStart)));
 }
 private async start() {
  const job = this.pending;
  if (!job || this.stopped) return;
  this.pending = null; this.running = true; this.lastStart = this.time.now();
  try { const output = await this.run(job.input); if (!this.stopped && job.generation === this.generation) this.publish(output); }
  catch (error) { if (!this.stopped && job.generation === this.generation) this.fail(error); }
  finally { this.running = false; this.waiters.splice(0).forEach(resolve => resolve()); this.schedule(); }
 }
 pause(): Promise<void> { this.update(null); return this.running ? new Promise(resolve => this.waiters.push(resolve)) : Promise.resolve(); }
 dispose() { this.update(null); this.stopped = true; }
}
