"""Dated batches survive transport and are evaluated on their actual dates."""
import csv
from io import StringIO
from src.app.service.plan_tabular_io import parse_plan_file, PLAN_COLUMNS


def test_new_plan_is_empty_and_can_be_calculated(client):
    response = client.get('/api/calc/template')
    assert response.status_code == 200, response.text
    plan = response.json()
    assert plan['decisions'] == {
        'supply_orders': [],
        'capacity_reservations': [],
        'investments': [],
        'inventory_policy': {'initial_inventory_t': 0.0},
    }

    response = client.post('/api/calc', json=plan)
    assert response.status_code == 200, response.text[:300]
    assert response.json()['plan_id'] == plan['plan_id']


def test_calendar_fields_are_documented(client):
    props = client.get('/openapi.json').json()['components']['schemas']['SupplyOrderDTO']['properties']
    assert 'delivery_date' in props and 'batch_id' in props


def test_dated_csv_round_trip_fields():
    out = StringIO()
    fields = list(dict.fromkeys([*PLAN_COLUMNS, 'delivery_date', 'batch_id']))
    writer = csv.DictWriter(out, fields)
    writer.writeheader()
    writer.writerows([
        {'record_type':'plan','plan_id':'monthly','scenario_id':'BASE'},
        {'record_type':'inventory_policy','initial_inventory_t':0},
        {'record_type':'supply_order','year':2035,'source_id':'Earth-Core','order_t':5,
         'delivery_date':'2035-02-12','batch_id':'one'},
    ])
    plan = parse_plan_file(out.getvalue().encode(), 'plan.csv', 100000)
    assert plan['decisions']['supply_orders'][0]['delivery_date'] == '2035-02-12'
    assert plan['decisions']['supply_orders'][0]['batch_id'] == 'one'


def test_undated_plan_can_save_but_cannot_calculate(client, plan):
    plan['decisions']['supply_orders'] = [{'year':2035,'source_id':'Earth-Core','order_t':5}]
    saved = client.post('/api/projects', json={'name':'Old plan','plan':plan})
    assert saved.status_code == 201
    for route in ('/api/calc', '/api/calc/risk'):
        response = client.post(route, json=plan)
        assert response.status_code == 422, response.text[:600]
        assert 'дат' in str(response.json()).lower()
