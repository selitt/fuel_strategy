"""Offline calendar preparation; never called by the application.

Run: .venv/bin/python -m tools.prepare_strategy_calendars --write
Annual decisions are fixed. This bounded local search is not an optimality proof.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
from decimal import Decimal
import hashlib
import json
from pathlib import Path

from src.engine.calendar import PlanValidationError
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog, find_data_root
from src.engine.strategies import (
    BUILTIN_STRATEGY_KINDS, load_builtin_strategy_data, make_monthly_batches,
)

MONTH_LENGTHS = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
OBJECTIVE_FIELDS = (
    'critical_shortage_from_rounded_service_t', 'shortage_t',
    'reserve_violations', 'reserve_gap_t', 'spill_t', 'losses_t',
)


def objective(result):
    """Use engine outputs, including its published four-decimal service precision."""
    balances = result['yearly_balance']
    return (
        round(sum(b['demand_critical_t'] * (1 - b['service_level_critical']) for b in balances), 4),
        round(sum(b['shortage_t'] for b in balances), 2),
        sum(not b['reserve_45d_met'] for b in balances),
        round(sum(max(0, b['reserve_45d_target_t'] - b['opening_inventory_t']) for b in balances), 2),
        round(sum(b['spill_t'] for b in balances), 2),
        round(sum(b['losses_t'] for b in balances), 2),
    )


def uniform_plan(data):
    """Reconstruct the old baseline from the unchanged annual decisions."""
    plan = {key: deepcopy(data[key]) for key in ('investments', 'capacity_reservations', 'inventory_policy')}
    plan['supply_orders'] = [batch for row in data['annual_orders']
        for batch in make_monthly_batches(row['year'], row['source_id'], row['volume_t'],
                                         batch_prefix=row.get('prefix'))]
    return plan


def move_volume(rows, donor, receiver, hundredths):
    a, b = rows[donor], rows[receiver]
    if (a['year'], a['source_id']) != (b['year'], b['source_id']) or donor == receiver:
        return None
    available = int(Decimal(str(a['order_t'])) * 100)
    if hundredths <= 0 or hundredths > available:
        return None
    changed = [dict(row) for row in rows]
    changed[donor]['order_t'] = (available - hundredths) / 100
    changed[receiver]['order_t'] = (int(Decimal(str(b['order_t'])) * 100) + hundredths) / 100
    return changed


def prepare_calendar(data, catalog, max_evaluations=10_000):
    if max_evaluations < 1:
        raise ValueError('max_evaluations must be positive')
    engine = SimulationEngine(catalog)
    plan = uniform_plan(data)
    rows = plan['supply_orders']
    scenario = data['scenario_id']

    def evaluate(candidate_rows):
        candidate = {**plan, 'supply_orders': [row for row in candidate_rows if row['order_t'] > 0]}
        return engine.run(data['id'], scenario, candidate, run_risk_analysis=False)

    baseline = evaluate(rows)
    best = objective(baseline)
    evaluations = 1
    improvements = 0
    groups = {}
    for index, row in enumerate(rows):
        groups.setdefault((row['year'], row['source_id']), []).append(index)
    partners = {index: group for group in groups.values() for index in group}
    # Every stage gets a budget; both date and volume proposals visit all years.
    for stage, step in enumerate((1000, 100, 10, 1)):
        limit = 1 + (max_evaluations - 1) * (stage + 1) // 4
        while evaluations < limit:
            improved_sweep = False
            for offset in range(31):
                for index in range(len(rows)):
                    if evaluations >= limit:
                        break
                    row = rows[index]
                    month = int(row['delivery_date'][5:7])
                    days = list(dict.fromkeys([1, MONTH_LENGTHS[month - 1], 15, *range(2, MONTH_LENGTHS[month - 1] + 1)]))
                    proposals = []
                    if offset < len(days) and row['order_t'] > 0:
                        proposed_date = f"{row['year']}-{month:02d}-{days[offset]:02d}"
                        if proposed_date != row['delivery_date']:
                            dated = [dict(r) for r in rows]
                            dated[index]['delivery_date'] = proposed_date
                            proposals.append(dated)
                    group = partners[index]
                    if len(group) > 1:
                        receiver = group[(group.index(index) + 1 + offset % (len(group) - 1)) % len(group)]
                        moved = move_volume(rows, index, receiver, step)
                        if moved is not None:
                            proposals.append(moved)
                    for candidate in proposals:
                        if evaluations >= limit:
                            break
                        evaluations += 1
                        try:
                            score = objective(evaluate(candidate))
                        except PlanValidationError:
                            continue
                        if score < best:
                            rows, best = candidate, score
                            improvements += 1
                            improved_sweep = True
                            # Next proposal must be based on the newly accepted state.
                            break
                if evaluations >= limit:
                    break
            if not improved_sweep:
                break
        print(f"{data['id']}: step={step / 100:g} evaluations={evaluations} score={best}", flush=True)
    selected = {**plan, 'supply_orders': [r for r in rows if r['order_t'] > 0]}
    return selected, {
        'scenario_id': scenario, 'evaluations': evaluations, 'improvements': improvements,
        'evaluation_limit': max_evaluations, 'baseline_objective': list(objective(baseline)),
        'selected_objective': list(best), 'global_optimum_proven': False,
    }


def summary(result):
    return {
        'objective': list(objective(result)), 'is_feasible': result['is_feasible'],
        'total_cost_mln': result['total_cost_mln'],
        'yearly_balance': result['yearly_balance'],
        'violations': [row for row in result['constraint_checks'] if not row['passed']],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Persist selected calendars and comparison report')
    parser.add_argument('--max-evaluations', type=int, default=10_000)
    parser.add_argument('--kind', choices=BUILTIN_STRATEGY_KINDS, action='append')
    parser.add_argument('--report', type=Path, default=Path('reports/strategy_calendars.json'))
    args = parser.parse_args()
    root = find_data_root()
    catalog = CaseCatalog(root)
    engine = SimulationEngine(catalog)
    report = {
        'method': 'deterministic bounded local search; fixed annual decisions',
        'objective_fields': OBJECTIVE_FIELDS,
        'precision_note': 'Critical shortage is estimated from engine yearly service rounded to four decimals; other metrics use published engine precision.',
        'model_verified': False, 'monte_carlo_run': False, 'strategies': {},
    }
    for kind in args.kind or BUILTIN_STRATEGY_KINDS:
        data = load_builtin_strategy_data(kind, root)
        baseline = uniform_plan(data)
        selected, search = prepare_calendar(data, catalog, args.max_evaluations)
        comparisons = {}
        for scenario in ('BASE', 'MANDATORY_STRESS'):
            comparisons[scenario] = {
                'baseline': summary(engine.run(data['id'], scenario, baseline, run_risk_analysis=False)),
                'selected': summary(engine.run(data['id'], scenario, selected, run_risk_analysis=False)),
            }
        data['supply_orders'] = selected['supply_orders']
        data['calendar_note'] = 'TEAM_DECISION: фиксированный месячный календарь; годовые решения сохранены. Глобальная оптимальность и прежние проценты Monte Carlo не подтверждены.'
        digest = hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        report['strategies'][kind] = {**search, 'strategy_sha256': digest, 'comparisons': comparisons}
        if args.write:
            (root / 'strategies' / f'{kind}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            output = args.report
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f"{kind}: {search}", flush=True)


if __name__ == '__main__':
    main()
