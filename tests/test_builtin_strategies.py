from fastapi.testclient import TestClient

from src.app.main import create_app
from src.app.config.config import Settings
from src.app.config.config import ROOT
from src.engine.strategies import (get_earth_fortress_strategy, get_lunar_pioneer_strategy,
    get_balanced_strategy, get_optimal_resilient_strategy, get_stress_resilient_strategy)
from decimal import Decimal
from datetime import date
import hashlib
import json

KINDS = ("earth_fortress", "lunar_pioneer", "balanced", "base", "stress")
FACTORIES = (get_earth_fortress_strategy, get_lunar_pioneer_strategy, get_balanced_strategy,
             get_optimal_resilient_strategy, get_stress_resilient_strategy)
IDS = ("strategy_earth_fortress", "strategy_lunar_pioneer", "strategy_balanced_dual",
       "strategy_optimal_resilient_mc90", "strategy_mandatory_stress_resilient")
SCENARIOS = ("BASE", "BASE", "BASE", "BASE", "MANDATORY_STRESS")


def test_builtin_catalog_is_read_only_and_matches_engine(tmp_path):
    with TestClient(create_app(settings=Settings(data_dir=tmp_path))) as client:
        response = client.get('/api/calc/strategies')
        assert response.status_code == 200
        items = response.json()
        assert [item['id'] for item in items] == list(IDS)
        for item, factory, scenario in zip(items, FACTORIES, SCENARIOS):
            source = factory()
            assert item['plan']['scenario_id'] == scenario
            assert item['plan']['plan_id'] == source.pop('plan_id')
            source.pop('description')
            assert item['plan']['decisions'] == source
            assert item['name'] and item['description']
        assert client.get('/api/projects').json()['total'] == 0
        assert client.put('/api/calc/strategies', json=items).status_code == 405


def test_annual_compatibility_preserves_totals():
    for factory in FACTORIES:
        monthly, annual = factory(), factory(monthly=False)
        for order in annual['supply_orders']:
            total = sum(row['order_t'] for row in monthly['supply_orders'] if (row['year'], row['source_id']) == (order['year'], order['source_id']))
            assert round(total, 2) == order['order_volume_t']
        monthly['inventory_policy']['initial_inventory_t'] = -1
        assert factory()['inventory_policy']['initial_inventory_t'] >= 0


def test_catalog_uses_configured_reference_directory(tmp_path):
    reference = tmp_path / 'reference'
    (reference / 'strategies').mkdir(parents=True)
    for kind in KINDS:
        data = json.loads((ROOT / 'data' / 'strategies' / f'{kind}.json').read_text())
        data['name'] = 'Configured ' + kind
        (reference / 'strategies' / f'{kind}.json').write_text(json.dumps(data))
    with TestClient(create_app(settings=Settings(data_dir=tmp_path / 'projects', reference_dir=reference), calculation_service=object())) as client:
        response = client.get('/api/calc/strategies')
        assert response.status_code == 200
        assert [item['name'] for item in response.json()] == ['Configured ' + kind for kind in KINDS]


def test_all_builtin_plans_can_be_compared_in_both_scenarios(tmp_path):
    with TestClient(create_app(settings=Settings(data_dir=tmp_path))) as client:
        for item in client.get('/api/calc/strategies').json():
            for scenario in ('BASE', 'MANDATORY_STRESS'):
                plan = {**item['plan'], 'scenario_id': scenario}
                response = client.post('/api/calc', json=plan)
                assert response.status_code == 200
                result = response.json()
                assert result['plan_id'] == plan['plan_id']
                assert result['scenario_id'] == scenario
                assert len(result['yearly_balance']) == 6
        assert client.get('/api/projects').json()['total'] == 0


# Fingerprints captured before calendar changes (order volumes normalized to float).
ORIGINAL_DECISIONS = (
    "25e54c2bfc11b218088911f9687c63d1b3bf1bcc1e24c05880ddeab9723ad4e2",
    "ec8c52e488c4334e1eca501febeb8d0ad6b258cb78e396a583042f60af418ff4",
    "d33632256b9491aa961e91cd90fc8e18af26a0388e96235e75c9600ef422eeb3",
    "4ee5f1664a1b8a1e75eeb8b9d7b3274da7d2f274329e78c50b1a96657de2b2f4",
    "7082c04eaa2cacebe08e7ee5ec0123441b152bb5cd89661d2e7fc92431f443b9",
)

def test_original_annual_decisions_are_unchanged():
    for factory, expected in zip(FACTORIES, ORIGINAL_DECISIONS):
        annual = factory(monthly=False)
        frozen = {k: v for k, v in annual.items() if k not in ('description', 'plan_id')}
        assert hashlib.sha256(json.dumps(frozen, sort_keys=True).encode()).hexdigest() == expected


def test_catalog_contains_explicit_monthly_orders_without_runtime_generation(monkeypatch):
    import src.engine.strategies as strategies
    def forbidden(*args, **kwargs):
        raise AssertionError('builtins must load explicit dated orders')
    monkeypatch.setattr(strategies, 'make_monthly_batches', forbidden)
    for kind, factory in zip(KINDS, FACTORIES):
        data = json.loads((ROOT / 'data' / 'strategies' / f'{kind}.json').read_text())
        plan = factory()
        assert plan['supply_orders'] == data['supply_orders']
        seen, ids, totals = set(), set(), {}
        for row in plan['supply_orders']:
            received = date.fromisoformat(row['delivery_date'])
            assert received.year == row['year']
            assert not (received.month == 2 and received.day == 29)
            key = (row['year'], row['source_id'], received.month)
            assert key not in seen
            seen.add(key)
            assert row['batch_id'] and row['batch_id'] not in ids
            ids.add(row['batch_id'])
            volume = Decimal(str(row['order_t']))
            assert volume > 0 and volume == volume.quantize(Decimal('.01'))
            annual_key = key[:2]
            totals[annual_key] = totals.get(annual_key, Decimal(0)) + volume
        assert totals == {(r['year'], r['source_id']): Decimal(str(r['volume_t']))
                          for r in data['annual_orders']}
