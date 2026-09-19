import type { Catalog, Plan } from '../api/types';
import { planYears } from './plan.js';
export type MatrixKey = 'supply_orders' | 'capacity_reservations';
export interface MatrixSource {
    key: string;
    label: string;
    aliases: string[];
    writeId: string;
    reference?: Record<string, string>;
}
/** A visual row may have a short-ID alias. Stored decisions are never normalized. */
export function matrixSources(plan: Plan, catalog: Pick<Catalog, 'tables'> | null): MatrixSource[] {
    const refs = catalog?.tables.find(t => t.table_id === 'supply_sources')?.rows || [];
    const decisions = [...plan.decisions.supply_orders, ...plan.decisions.capacity_reservations];
    const rows: MatrixSource[] = refs.map(reference => {
        const aliases = [reference.name, reference.source_id].filter(Boolean);
        return { key: reference.name, label: reference.name, aliases, reference,
            writeId: decisions.find(d => aliases.includes(d.source_id))?.source_id || reference.name };
    });
    for (const decision of decisions) {
        if (!rows.some(r => r.aliases.includes(decision.source_id))) {
            rows.push({ key: decision.source_id, label: decision.source_id, aliases: [decision.source_id], writeId: decision.source_id });
        }
    }
    const order = ['Earth-Core', 'Earth-Flex', 'Emergency', 'Lunar-ISRU', 'Earth-New'];
    return rows.sort((a, b) => (order.includes(a.key) ? order.indexOf(a.key) : 999) - (order.includes(b.key) ? order.indexOf(b.key) : 999));
}
export function matrixYears(plan: Plan, catalog: Pick<Catalog, 'tables'> | null): number[] {
    return planYears(plan, catalog);
}
export function readCell(plan: Plan, key: MatrixKey, source: MatrixSource, year: number) {
    const indices: number[] = [];
    plan.decisions[key].forEach((row, i) => { if (row.year === year && source.aliases.includes(row.source_id))
        indices.push(i); });
    const row = indices.length === 1 ? plan.decisions[key][indices[0]] : null;
    const value = row ? Number(key === 'supply_orders' ? row.order_t : row.reserved_capacity_t) : null;
    return { indices, value };
}
export function writeCell(plan: Plan, key: MatrixKey, source: MatrixSource, year: number, value: number): Plan {
    const cell = readCell(plan, key, source, year);
    if (cell.indices.length > 1)
        throw new Error('В ячейке несколько записей. Измените каждую отдельно.');
    const field = key === 'supply_orders' ? 'order_t' : 'reserved_capacity_t';
    const next = cell.indices.length ? plan.decisions[key].map((r, i) => i === cell.indices[0] ? { ...r, [field]: value } : r)
        : [...plan.decisions[key], { year, source_id: source.writeId, [field]: value }];
    return { ...plan, decisions: { ...plan.decisions, [key]: next } } as Plan;
}
/** Individual investment records have ownership: do not flatten duplicate or custom records. */
export function setInvestment(plan: Plan, id: string, year: number | null): Plan {
    const existing = plan.decisions.investments.filter(r => r.investment_id === id);
    if (existing.length > 1)
        throw new Error('Для инвестиции несколько записей. Измените каждую отдельно.');
    const investments = year === null ? plan.decisions.investments.filter(r => r.investment_id !== id)
        : existing.length ? plan.decisions.investments.map(r => r.investment_id === id ? { ...r, year } : r)
            : [...plan.decisions.investments, { investment_id: id, year }];
    return { ...plan, decisions: { ...plan.decisions, investments } };
}
export function otherScenario(plan: Plan): Plan {
    if (!['BASE', 'MANDATORY_STRESS'].includes(plan.scenario_id))
        throw new Error('Для сравнения обоих режимов выберите BASE или STRESS.');
    return { ...plan, scenario_id: plan.scenario_id === 'BASE' ? 'MANDATORY_STRESS' : 'BASE' };
}
