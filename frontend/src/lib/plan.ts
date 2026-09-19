import type { Catalog, Plan, Order, Reservation, Investment } from '../api/types';
type DecisionKey = 'supply_orders' | 'capacity_reservations' | 'investments';
type Row = Order | Reservation | Investment;

// All changes spread the existing objects: extension fields belong to the model team.
export function updateDecision(plan: Plan, key: DecisionKey, index: number, patch: Partial<Row>): Plan {
  return {...plan,decisions:{...plan.decisions,[key]:plan.decisions[key].map((row,i)=>i===index?{...row,...patch}:row)}};
}
export function removeDecision(plan: Plan, key: DecisionKey, index: number): Plan {
  return {...plan,decisions:{...plan.decisions,[key]:plan.decisions[key].filter((_,i)=>i!==index)}};
}
export function addDecision(plan: Plan, key: DecisionKey, row: Row): Plan {
  return {...plan,decisions:{...plan.decisions,[key]:[...plan.decisions[key],row]}};
}
export function planYears(plan: Plan | null, catalog?: Pick<Catalog,'tables'> | null): number[] {
  const rows=catalog?.tables.find(t=>t.table_id==='demand')?.rows || [];
  const values=[...rows.map(r=>Number(r.year)),...(plan?[
    ...plan.decisions.supply_orders.map(r=>r.year),
    ...plan.decisions.capacity_reservations.map(r=>r.year),
    ...plan.decisions.investments.map(r=>r.year),
  ]:[])];
  return [...new Set(values.filter(Number.isInteger))].sort((a,b)=>a-b);
}
export function sourceChoices(plan: Plan, catalog: Catalog | null): string[] {
  return [...new Set([
    ...(catalog?.tables.find(t=>t.table_id==='supply_sources')?.rows || []).map(r=>r.name),
    ...plan.decisions.supply_orders.map(r=>r.source_id),
    ...plan.decisions.capacity_reservations.map(r=>r.source_id),
  ].filter(Boolean))];
}
export function validateDraft(name: string, plan: Plan): string[] {
  const errors: string[]=[];
  if(!name.trim() || name.trim().length>140) errors.push('Название плана: от 1 до 140 символов.');
  if(!plan.plan_id.trim()) errors.push('Укажите идентификатор плана.');
  if(!plan.scenario_id.trim()) errors.push('Выберите сценарий.');
  const good=(x:number)=>Number.isFinite(x)&&x>=0;
  if(!good(plan.decisions.inventory_policy.initial_inventory_t)) errors.push('Начальный запас: введите число не меньше нуля.');
  for(const [key,label] of [['supply_orders','Поставка'],['capacity_reservations','Резервирование'],['investments','Инвестиция']] as const) {
    plan.decisions[key].forEach((row,i)=>{
      if(!Number.isInteger(row.year) || row.year<1) errors.push(`${label}, строка ${i+1}: укажите целый год.`);
      const id=key==='investments'?(row as Investment).investment_id:(row as Order).source_id;
      if(!id?.trim()) errors.push(`${label}, строка ${i+1}: укажите ${key==='investments'?'инвестицию':'источник'}.`);
      if(key!=='investments') {
        const value=key==='supply_orders'?(row as Order).order_t:(row as Reservation).reserved_capacity_t;
        if(!good(value)) errors.push(`${label}, строка ${i+1}: объём должен быть числом не меньше нуля.`);
      }
    });
  }
  return errors;
}
function stable(value: unknown): string {
  if (typeof value==='number' && !Number.isFinite(value)) return `!number:${String(value)}`;
  if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}';
  return JSON.stringify(value) ?? 'undefined';
}
export function samePlan(a: unknown,b: unknown): boolean {return stable(a)===stable(b);}
// Only API-normalized input is accepted as editor state. No hidden default inventory here.
export function normalizedPlan(value: unknown): Plan {
  const p=value as Plan;
  if(!p || typeof p.plan_id!=='string' || typeof p.scenario_id!=='string' || !p.decisions ||
    !Array.isArray(p.decisions.supply_orders) || !Array.isArray(p.decisions.capacity_reservations) ||
    !Array.isArray(p.decisions.investments) || typeof p.decisions.inventory_policy?.initial_inventory_t!=='number') {
    throw new Error('API вернул неполный план. Проверьте совместимость контракта.');
  }
  return p;
}

/** Unique client-side plan label, also available over plain HTTP LAN deployments. */
export function newPlanId():string {
 const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);
 return 'plan-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
