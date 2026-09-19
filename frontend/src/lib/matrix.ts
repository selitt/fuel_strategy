import type { Catalog, Plan } from '../api/types';
import { planYears } from './plan.js';
import { effectiveSourceReference, sourceIsCustomized } from './sourceOverrides.js';
export type MatrixKey = 'supply_orders' | 'capacity_reservations';
export interface MatrixSource {
    key: string;
    label: string;
    aliases: string[];
    writeId: string;
    reference?: Record<string, string>;
    originalReference?: Record<string, string>;
    customized?: boolean;
}
export interface SupplyMonthCell {
    indices: number[];
    total: number;
}
const MODEL_MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function dateParts(value: unknown): { year: number; month: number; day: number } | null {
    if (typeof value !== 'string')
        return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match)
        return null;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > MODEL_MONTH_DAYS[month - 1])
        return null;
    return { year, month, day };
}

/** The model has 365 days in every year, so 29 February is never a valid delivery date. */
export function supplyDateIssue(value: unknown, expectedYear: number): string {
    if (value === '' || value === null || value === undefined)
        return 'Укажите дату поставки.';
    const parts = dateParts(value);
    if (!parts)
        return 'Дата должна существовать в 365-дневном календаре модели (29 февраля недоступно).';
    if (parts.year !== expectedYear)
        return `Дата поставки должна относиться к ${expectedYear} году.`;
    return '';
}

/** Dated rows are intentional individual batches and may be totalled for their month. */
export function readSupplyMonth(plan: Plan, source: MatrixSource, year: number, month: number): SupplyMonthCell {
    const indices: number[] = [];
    let total = 0;
    plan.decisions.supply_orders.forEach((row, index) => {
        const parts = dateParts(row.delivery_date);
        if (row.year === year && source.aliases.includes(row.source_id) && parts?.year === year && parts.month === month) {
            indices.push(index);
            total += Number(row.order_t);
        }
    });
    return { indices, total };
}

/** Legacy or malformed annual rows stay visible and separate until the operator assigns a valid exact date. */
export function unscheduledSupplyIndices(plan: Plan, source: MatrixSource, year: number): number[] {
    const indices: number[] = [];
    plan.decisions.supply_orders.forEach((row, index) => {
        if (row.year === year && source.aliases.includes(row.source_id) && supplyDateIssue(row.delivery_date, year))
            indices.push(index);
    });
    return indices;
}

export function updateSupplyBatch(plan: Plan, index: number, patch: { delivery_date?: string; order_t?: number; batch_id?: string; source_id?: string }): Plan {
    const supply_orders = plan.decisions.supply_orders.map((row, rowIndex) => {
        if (rowIndex !== index)
            return row;
        const next = { ...row, ...patch, ...(patch.order_t !== undefined && "order_volume_t" in row ? {order_volume_t: patch.order_t} : {}) };
        const parts = dateParts(next.delivery_date);
        return parts ? { ...next, year: parts.year } : next;
    });
    return { ...plan, decisions: { ...plan.decisions, supply_orders } };
}

export function addSupplyBatch(plan: Plan, source: MatrixSource, deliveryDate: string, orderT: number, batchId: string): Plan {
    const parts = dateParts(deliveryDate);
    if (!parts)
        throw new Error('Нельзя добавить поставку без корректной даты модели.');
    if (!batchId.trim())
        throw new Error('Нельзя добавить поставку без идентификатора партии.');
    const row = { year: parts.year, source_id: source.writeId, order_t: orderT, delivery_date: deliveryDate, batch_id: batchId };
    return { ...plan, decisions: { ...plan.decisions, supply_orders: [...plan.decisions.supply_orders, row] } };
}

export function nextSupplyBatchId(plan: Plan, deliveryDate: string): string {
    const stem = `batch-${deliveryDate.replaceAll('-', '')}-`;
    const used = new Set(plan.decisions.supply_orders.map(row => row.batch_id).filter(value => typeof value === 'string'));
    let serial = 1;
    while (used.has(stem + serial))
        serial += 1;
    return stem + serial;
}

export function removeSupplyBatch(plan: Plan, index: number): Plan {
    return { ...plan, decisions: { ...plan.decisions,
        supply_orders: plan.decisions.supply_orders.filter((_, rowIndex) => rowIndex !== index) } };
}
/** A visual row may have a short-ID alias. Stored decisions are never normalized. */
export function matrixSources(plan: Plan, catalog: Pick<Catalog, 'tables'> | null): MatrixSource[] {
    const refs = catalog?.tables.find(t => t.table_id === 'supply_sources')?.rows || [];
    const decisions = [...plan.decisions.supply_orders, ...plan.decisions.capacity_reservations];
    const rows: MatrixSource[] = refs.map(reference => {
        const aliases = [reference.name, reference.source_id].filter(Boolean);
        return { key: reference.name, label: reference.name, aliases,
            reference: effectiveSourceReference(plan, reference), originalReference: reference,
            customized: sourceIsCustomized(plan, reference),
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
        : existing.length ? plan.decisions.investments.map(r => r.investment_id === id ? { ...r, year, ...("commissioning_year" in r ? {commissioning_year: year} : {}) } : r)
            : [...plan.decisions.investments, { investment_id: id, year }];
    return { ...plan, decisions: { ...plan.decisions, investments } };
}
export function otherScenario(plan: Plan): Plan {
    if (!['BASE', 'MANDATORY_STRESS'].includes(plan.scenario_id))
        throw new Error('Для сравнения обоих режимов выберите BASE или STRESS.');
    return { ...plan, scenario_id: plan.scenario_id === 'BASE' ? 'MANDATORY_STRESS' : 'BASE' };
}
