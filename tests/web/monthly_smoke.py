"""Real loopback monthly UI/API smoke. Use only an isolated test project store."""
import argparse
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:8081')
parser.add_argument('--artifacts', type=Path, required=True)
args = parser.parse_args()
args.artifacts.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':1920,'height':900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # Explicit test decisions, never the product template or purported best plan.
    plan = {'plan_id':'monthly-browser', 'scenario_id':'BASE', 'decisions':{
        'supply_orders':[{'year':y,'source_id':'Earth-Core','order_t':10,
                         'delivery_date':f'{y}-{m:02d}-15','batch_id':f'core-{y}-{m}'}
                         for y in range(2035,2041) for m in range(1,13)],
        'capacity_reservations':[{'year':y,'source_id':'Earth-Core','reserved_capacity_t':150}
                                 for y in range(2035,2041)],
        'investments':[], 'inventory_policy':{'initial_inventory_t':0}}}
    created = page.request.post(args.url+'/api/projects', data={'name':'Проверка месячного плана','plan':plan})
    assert created.status == 201, created.text()[:500]
    pid = created.json()['project_id']
    page.goto(args.url+'/?project='+pid)
    expect(page.locator('.result-local-status')).to_have_text('Расчёт текущих настроек', timeout=30000)
    assert page.locator('.monthly-supply-table thead th').count() == 13
    assert page.locator('.matrix-viewport').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.get_by_role('button', name=re.compile('Earth-Core, Янв 2035:')).click()
    editor = page.get_by_role('region',name='Партии Earth-Core: Янв 2035')
    editor.locator('input[type=date]').fill('2035-01-20')
    editor.locator('input[type=number]').fill('12')
    editor.get_by_role('button',name='+ Добавить партию').click()
    editor.locator('input[type=date]').last.fill('2035-01-25')
    with page.expect_response(lambda r: r.url.endswith('/api/calc') and r.status == 200 and any(o.get('delivery_date') == '2035-01-25' and o.get('order_t') == 3 for o in r.request.post_data_json['decisions']['supply_orders']), timeout=30000) as computed:
        editor.locator('input[type=number]').last.fill('3')
    response = computed.value.json()
    assert [(r['day_of_year'],r['delivered_t']) for r in response['inventory_trace'][:31] if r['delivered_t']] == [(20,12),(25,3)]
    expect(page.locator('.result-local-status')).to_have_text('Расчёт текущих настроек')
    expect(page.get_by_role('button',name='Earth-Core, Янв 2035: 15 т, партий 2')).to_be_visible()
    page.screenshot(path=str(args.artifacts/'monthly-editor.png'),full_page=True)
    # Chart tab changes must not resize or change the supply table.
    before = page.locator('.supply-panel').bounding_box()
    page.get_by_role('button',name='Затраты по годам',exact=True).click()
    after = page.locator('.supply-panel').bounding_box()
    assert before == after, (before,after)
    expect(page.get_by_label('Год плана поставок')).to_have_value('2035')
    page.screenshot(path=str(args.artifacts/'monthly-cost.png'),full_page=True)
    page.get_by_role('button',name='Сохранить',exact=True).click()
    expect(page.get_by_role('button',name='Сохранить',exact=True)).to_be_enabled(timeout=30000)
    page.reload()
    expect(page.get_by_role('button',name='Earth-Core, Янв 2035: 15 т, партий 2')).to_be_visible()
    with page.expect_response(lambda r:r.url.endswith('/api/calc/risk'), timeout=120000) as risk_response:
        page.get_by_test_id('run-risk-button').click()
    assert risk_response.value.status == 200
    risk = risk_response.value.json()['risk_register'][0]
    assert len(risk['daily_trajectories']['runs']) == 100
    assert sum(b['count'] for b in risk['shortage_histogram']) == 100
    for run in risk['daily_trajectories']['runs']:
        assert run['delivered_t'][14] == 0
        assert run['delivered_t'][19] in (0,12)
        assert run['delivered_t'][24] in (0,3)
    expect(page.get_by_test_id('risk-trajectories')).to_be_visible()
    page.get_by_label('Отдельный прогон',exact=True).select_option('17')
    expect(page.locator('.trajectory-run')).to_have_count(1)
    page.screenshot(path=str(args.artifacts/'monthly-monte-carlo.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert page.get_by_role('dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.screenshot(path=str(args.artifacts/'monthly-mobile.png'),full_page=False)
    assert not errors, errors
    (args.artifacts/'browser-report.json').write_text(json.dumps({'batch_edit':'passed','actual_daily_dates':'passed','save_reload':'passed','stable_layout':'passed','runs':100,'mobile_overflow':False,'errors':errors},ensure_ascii=False,indent=2))
    browser.close()
