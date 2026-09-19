import { useLayoutEffect, useRef, useState } from 'react';
import type { Plan } from '../api/types';
import { api } from '../api/client';
import { calculatePreview, LatestCalculation } from '../lib/live';
import type { Preview, PreviewInput } from '../lib/live';
import { samePlan, validateDraft } from '../lib/plan';
export function useLivePreview(plan: Plan | null, both: boolean, enabled: boolean, scope: number) {
 const [value, setValue] = useState<{scope: number; result: Preview} | null>(null);
 const [error, setError] = useState<unknown>(null);
 const completed = useRef<{scope: number; result: Preview} | null>(null);
 const queue = useRef<LatestCalculation<PreviewInput & {scope: number}, {scope: number; result: Preview}> | null>(null);
 useLayoutEffect(() => {
  const instance = new LatestCalculation<PreviewInput & {scope: number}, {scope: number; result: Preview}>(
   async input => ({scope: input.scope, result: await calculatePreview(input, api.simulate)}),
   result => {completed.current=result;setValue(result);setError(null);}, setError);
  queue.current = instance;
  return () => {instance.dispose();queue.current=null;};
 }, []);
 useLayoutEffect(() => {
  setError(null);
  const previous=completed.current;
  const matches=previous?.scope===scope && !!plan && samePlan(previous.result.basis,plan) && !!previous.result.other===both;
  queue.current?.update(enabled && plan && !matches && !validateDraft('preview', plan).length ? {plan, both, scope} : null);
  if (enabled && matches) setValue(previous);
 }, [plan, both, enabled, scope]);
 const displayed = value?.scope === scope ? value.result : null;
 const fresh = !!displayed && !!plan && samePlan(displayed.basis, plan) && !!displayed.other === both;
 const accept = (result: Preview) => { const next={scope,result}; completed.current=next; setValue(next); setError(null); };
 return { displayed, fresh, error, accept, clearError:()=>setError(null), invalidate:()=>queue.current?.update(null), pause:()=>queue.current?.pause() ?? Promise.resolve() };
}
