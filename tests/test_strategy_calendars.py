from copy import deepcopy
from decimal import Decimal
import pytest
import hashlib
import json
from pathlib import Path

from src.engine.loader import CaseCatalog
from src.engine.engine import SimulationEngine
from src.engine.strategies import BUILTIN_STRATEGY_KINDS, load_builtin_strategy_data, load_builtin_strategy
from tools.prepare_strategy_calendars import prepare_calendar, objective, uniform_plan


@pytest.mark.parametrize('volume', [0.1, 0.2, 0.01, 0.05])
def test_small_optimizer_orders_do_not_create_negative_final_batches(volume):
    from src.engine.strategies import make_monthly_batches
    rows = make_monthly_batches(2037, 'Earth-Flex', volume)
    assert all(row['order_t'] > 0 for row in rows)
    assert sum(Decimal(str(row['order_t'])) for row in rows) == Decimal(str(volume))


def test_tiny_candidate_passes_real_calendar_validation_and_preparation():
    from src.engine.calendar import normalize_plan
    from src.engine.optimize import WARM_START_X0, decode_params_to_plan
    params = list(WARM_START_X0)
    params[3] = 0.1
    catalog = CaseCatalog()
    batches, _ = normalize_plan(catalog, decode_params_to_plan(params))
    assert all(batch.ordered_t > 0 for batch in batches)
    data = load_builtin_strategy_data('earth_fortress')
    data['annual_orders'] = [{'year': 2035, 'source_id': 'Earth-Core', 'volume_t': 0.1}]
    selected, report = prepare_calendar(data, catalog, max_evaluations=4)
    assert len(selected['supply_orders']) == 1
    assert selected['supply_orders'][0]['order_t'] == 0.1
    assert report['evaluations'] <= 4


def test_calendar_search_preserves_decisions_and_improves_or_keeps_engine_score():
    data = load_builtin_strategy_data('earth_fortress')
    original = deepcopy(data)
    baseline = uniform_plan(data)
    selected, report = prepare_calendar(data, CaseCatalog(), max_evaluations=16)
    assert data == original
    assert report['evaluations'] <= 16
    assert tuple(report['selected_objective']) <= tuple(report['baseline_objective'])
    for field in ('investments', 'capacity_reservations', 'inventory_policy'):
        assert selected[field] == baseline[field]
    for annual in data['annual_orders']:
        assert sum(Decimal(str(row['order_t'])) for row in selected['supply_orders']
                   if (row['year'], row['source_id']) == (annual['year'], annual['source_id'])) == Decimal(str(annual['volume_t']))
    assert prepare_calendar(data, CaseCatalog(), max_evaluations=16) == (selected, report)


def test_objective_prefers_critical_service_before_total_shortage():
    def result(critical_service, shortage):
        return {'yearly_balance': [{'demand_critical_t': 80, 'service_level_critical': critical_service,
            'shortage_t': shortage, 'reserve_45d_met': True, 'reserve_45d_target_t': 12,
            'opening_inventory_t': 15, 'spill_t': 0, 'losses_t': 1}]}
    assert objective(result(1, 10)) < objective(result(.99, 5))


def test_volume_moves_use_integer_hundredths_without_crossing_year_or_source():
    from tools.prepare_strategy_calendars import move_volume
    rows = [{'year': 2035, 'source_id': 'Earth-Core', 'order_t': 1.01},
            {'year': 2035, 'source_id': 'Earth-Core', 'order_t': 2.02}]
    moved = move_volume(rows, 0, 1, 1)
    assert [r['order_t'] for r in moved] == [1.0, 2.03]
    assert rows[0]['order_t'] == 1.01
    assert move_volume(rows, 0, 1, 102) is None
    rows[1]['year'] = 2036
    assert move_volume(rows, 0, 1, 1) is None
    rows[1]['year'] = 2035
    rows[1]['source_id'] = 'Earth-Flex'
    assert move_volume(rows, 0, 1, 1) is None


def test_published_report_matches_calendars_and_real_engine_results():
    from tools.prepare_strategy_calendars import summary
    report = json.loads((Path(__file__).resolve().parents[1] / 'reports/strategy_calendars.json').read_text())
    assert tuple(report['strategies']) == BUILTIN_STRATEGY_KINDS
    assert report['model_verified'] is False and report['monte_carlo_run'] is False
    engine = SimulationEngine(CaseCatalog())
    for kind in BUILTIN_STRATEGY_KINDS:
        data = load_builtin_strategy_data(kind)
        entry = report['strategies'][kind]
        assert entry['strategy_sha256'] == hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        assert entry['evaluations'] <= 10_000
        assert tuple(entry['selected_objective']) <= tuple(entry['baseline_objective'])
        for scenario in ('BASE', 'MANDATORY_STRESS'):
            for label, plan in (('baseline', uniform_plan(data)), ('selected', load_builtin_strategy(kind))):
                actual = engine.run(data['id'], scenario, plan, run_risk_analysis=False)
                assert entry['comparisons'][scenario][label] == summary(actual)
