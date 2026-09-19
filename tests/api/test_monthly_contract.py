"""Dated batches survive transport and are evaluated on their actual dates."""
import csv
from io import StringIO
from src.app.service.plan_tabular_io import parse_plan_file, PLAN_COLUMNS


def test_new_plan_uses_explicit_monthly_example(client):
    plan = client.get('/api/calc/template').json()
    assert plan['template_kind'] == 'TEAM_DECISION_EXAMPLE'
    assert len(plan['decisions']['supply_orders']) == 72
    assert {row['delivery_date'][5:7] for row in plan['decisions']['supply_orders']} == {f'{m:02d}' for m in range(1,13)}
    assert all(row['batch_id'] for row in plan['decisions']['supply_orders'])
    response = client.post('/api/calc', json=plan)
    assert response.status_code == 200, response.text[:300]


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
