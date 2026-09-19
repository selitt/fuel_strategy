"""User supplier assumptions affect calculations without mutating CASE_INPUT."""
from copy import deepcopy

import pytest

from src.app.dto.calc_dto import ParticipantPlanDTO
from src.app.service.calc_service import CalculationService


def test_price_override_changes_cost_and_keeps_other_requests_isolated(client, plan):
    baseline = client.post('/api/calc', json=plan).json()
    edited = deepcopy(plan)
    edited['source_overrides'] = {'A': {'variable_cost_mln_per_t': 12.4}}
    response = client.post('/api/calc', json=edited)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['total_cost_mln'] > baseline['total_cost_mln']
    assert result['yearly_balance'] == baseline['yearly_balance']
    assert result['source_overrides'] == edited['source_overrides']
    assert result['input_context'] == 'RESEARCH_SOURCE_OVERRIDES'
    assert client.post('/api/calc', json=plan).json() == baseline
    assert response.headers['x-model-verified'] == 'false'


@pytest.mark.parametrize('override', [
    {'A': {'capacity_t_per_year': -1}},
    {'A': {'take_or_pay_share': 1.1}},
    {'A': {'lead_time_min_value': 13}},
    {'A': {'lead_time_max_value': 1.5}},
    {'A': {'lead_time_max_value': 100000000}},
    {'A': {'lead_time_unit': 'fortnight'}},
    {'A': {'reliability_profile': 'constant:1.1'}},
    {'A': {'reliability_profile': 'constant:nan'}},
    {'A': {'reliability_profile': '2035:0.9'}},
    {'A': {'available_from_year': None}},
    {'A': {'variable_cost_mln_per_t': None}},
    {'A': {'capacity_t_per_year': True}},
    {'A': {'name': 'other'}},
    {'Earth-Core': {'capacity_t_per_year': 200}},
    {'Z': {'capacity_t_per_year': 200}},
    {'D': {'available_from_year': 2037}},
])
def test_bad_overrides_are_input_errors(client, plan, override):
    plan['source_overrides'] = override
    response = client.post('/api/calc', json=plan)
    assert response.status_code == 422, response.text[:500]


def test_effective_capacity_is_used_for_admission(client, plan):
    plan['source_overrides'] = {'A': {'capacity_t_per_year': 100}}
    response = client.post('/api/calc', json=plan)
    assert response.status_code == 422, response.text[:500]


def test_free_reservation_does_not_remove_capacity_contract(client, plan):
    plan['decisions']['capacity_reservations'] = []
    plan['source_overrides'] = {'A': {'reservation_rate_mln_per_t_year_capacity': 0}}
    response = client.post('/api/calc', json=plan)
    assert response.status_code == 422, response.text[:500]
    assert 'reserved_capacity_exceeded' in response.text


def test_changing_lunar_reservation_price_does_not_add_capacity_contract(client):
    plan = {'plan_id': 'lunar-price', 'scenario_id': 'BASE', 'source_overrides': {
        'D': {'reservation_rate_mln_per_t_year_capacity': 1},
    }, 'decisions': {
        'investments': [{'investment_id': 'LUNAR_ISRU', 'year': 2037}],
        'supply_orders': [{'source_id': 'D', 'year': 2038, 'delivery_date': '2038-05-01',
                           'batch_id': 'one', 'order_t': 1}],
    }}
    response = client.post('/api/calc', json=plan)
    assert response.status_code == 200, response.text[:500]


def test_source_override_survives_storage_and_invalidates_result(client, plan):
    plan['source_overrides'] = {'A': {'variable_cost_mln_per_t': 7}}
    created = client.post('/api/projects', json={'name': 'Custom', 'plan': plan}).json()
    project_id = created['project_id']
    run = client.post(f'/api/projects/{project_id}/calculate', json={'expected_revision': created['revision']})
    assert run.status_code == 200, run.text
    saved = run.json()
    assert saved['last_run']['plan_snapshot']['source_overrides'] == plan['source_overrides']
    plan['source_overrides']['A']['variable_cost_mln_per_t'] = 8
    changed = client.put(f'/api/projects/{project_id}', json={
        'name': 'Custom', 'plan': plan, 'expected_revision': saved['revision'],
    })
    assert changed.status_code == 200, changed.text
    assert changed.json()['result_state'] == 'stale'
    assert changed.json()['plan']['team_notes'] == plan['team_notes']
    assert client.get(f'/api/projects/{project_id}').json()['plan']['source_overrides'] == plan['source_overrides']


def test_legacy_plan_serialization_does_not_add_empty_overrides():
    raw = {'plan_id': 'old', 'scenario_id': 'BASE', 'decisions': {}}
    assert 'source_overrides' not in ParticipantPlanDTO.model_validate(raw).model_dump()


@pytest.mark.parametrize('profile', ['constant:0.5', ' constant : 0.5 '])
def test_risk_uses_same_custom_catalog_without_running_monte_carlo(monkeypatch, plan, profile):
    seen = []

    def risk_probe(*, catalog, **kwargs):
        from src.engine.monte_carlo import extract_reliability
        assert extract_reliability(catalog.sources['Earth-Core'].reliability_profile, 2035) == 0.5
        seen.append(catalog.sources['Earth-Core'].reliability_profile)
        return {'probe': True}

    monkeypatch.setattr('src.engine.engine.run_monte_carlo', risk_probe)
    plan['source_overrides'] = {'A': {'reliability_profile': profile}}
    service = CalculationService()
    service.calculate_risk(ParticipantPlanDTO.model_validate(plan))
    assert seen == ['constant:0.5']
    assert service.engine.catalog.sources['A'].reliability_profile == 'constant:0.96'


def test_new_source_lead_time_unit_is_respected(client):
    plan = {'plan_id': 'weeks', 'scenario_id': 'BASE', 'source_overrides': {
        'C': {'lead_time_min_value': 1, 'lead_time_max_value': 2, 'lead_time_unit': 'week'},
    }, 'decisions': {
        'investments': [{'investment_id': 'EARTH_NEW', 'year': 2035}],
        'capacity_reservations': [{'year': 2035, 'source_id': 'C', 'reserved_capacity_t': 1}],
        'supply_orders': [{'year': 2035, 'source_id': 'C', 'order_t': 1,
                           'batch_id': 'one', 'delivery_date': '2035-01-15'}],
    }}
    response = client.post('/api/calc', json=plan)
    assert response.status_code == 200, response.text[:500]
    assert response.json()['delivery_schedule'][0]['order_date'] == '2035-01-01'


def test_json_transfer_preserves_sparse_overrides_and_explicit_unknown(client, plan):
    plan['source_overrides'] = {'A': {'take_or_pay_share': 0}, 'C': {'available_from_year': None}}
    exported = client.post('/api/plans/export', json=plan)
    assert exported.status_code == 200, exported.text
    imported = client.post('/api/plans/import', files={
        'file': ('custom.json', exported.content, 'application/json'),
    })
    assert imported.status_code == 200, imported.text
    assert imported.json()['plan']['source_overrides'] == plan['source_overrides']
    assert imported.json()['plan']['team_notes'] == plan['team_notes']


def test_stress_multiplies_custom_price_and_reservation_remains_separate(client, plan):
    plan['decisions']['supply_orders'][0].update(year=2038, delivery_date='2038-05-01')
    plan['decisions']['capacity_reservations'][0]['year'] = 2038
    plan['source_overrides'] = {'A': {
        'variable_cost_mln_per_t': 10, 'take_or_pay_share': 0.5,
        'reservation_rate_mln_per_t_year_capacity': 2,
    }}
    for scenario, expected in [('BASE', 600), ('MANDATORY_STRESS', 750)]:
        plan['scenario_id'] = scenario
        response = client.post('/api/calc', json=plan)
        assert response.status_code == 200, response.text[:500]
        row = next(row for row in response.json()['source_schedule']
                   if row['year'] == 2038 and row['source_id'] == 'Earth-Core')
        assert row['payable_volume_t'] == 60
        assert row['procurement_cost_mln'] == expected
        assert row['reservation_cost_mln'] == 240


def test_custom_availability_requires_investment_and_complete_annual_reliability(client):
    plan = {'plan_id': 'lunar', 'scenario_id': 'BASE', 'source_overrides': {'D': {
        'available_from_year': 2037,
        'reliability_profile': '2037:0.7;2038:0.78;2039:0.9;2040:0.93',
    }}, 'decisions': {
        'supply_orders': [{'source_id': 'D', 'year': 2037, 'delivery_date': '2037-05-01',
                           'batch_id': 'lunar-one', 'order_t': 1}],
    }}
    response = client.post('/api/calc', json=plan)
    assert response.status_code == 422
    assert 'LUNAR_ISRU' in response.text
    plan['decisions']['investments'] = [{'investment_id': 'LUNAR_ISRU', 'year': 2036}]
    response = client.post('/api/calc', json=plan)
    assert response.status_code == 200, response.text[:500]
    assert response.json()['delivery_schedule'][0]['delivered_t'] == 1
