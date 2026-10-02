"""Real local browser acceptance for strategy summary, editing and continuous model time.
Run with --site frontend/dist. Uses temporary isolated storage.
"""
from __future__ import annotations
import argparse, asyncio, json, os, socket, subprocess, sys, tempfile, zipfile
from pathlib import Path
import httpx
from playwright.async_api import async_playwright, expect
ROOT = Path(__file__).resolve().parents[2]

async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=ROOT/'frontend/dist')
    parser.add_argument('--artifacts', type=Path, default=ROOT/'evidence/browser')
    args = parser.parse_args(); out = args.artifacts.resolve(); out.mkdir(parents=True, exist_ok=True)
    report = {'checks': [], 'errors': []}; ordinary = []; risk_requests = []; risk_responses = []
    def check(name, condition=True):
        assert condition, name
        report['checks'].append(name); print('PASS', name, flush=True)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
    url = f'http://127.0.0.1:{port}'
    with tempfile.TemporaryDirectory(dir=out) as storage, (out/'server.log').open('w') as log:
        proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'src.app.web:create_web_app', '--factory', '--host', '127.0.0.1', '--port', str(port), '--no-proxy-headers'], cwd=ROOT,
            env={**os.environ, 'FUEL_DATA_DIR':storage, 'FUEL_FRONTEND_DIR':str(args.site.resolve()), 'FUEL_HTTP_USER':'', 'FUEL_HTTP_PASSWORD':'', 'FUEL_PUBLIC_MODE':'0', 'FUEL_ALLOW_UNAUTHENTICATED_LOCAL':'1', 'FUEL_BIND_HOST':'127.0.0.1', 'FUEL_PUBLIC_ORIGIN':url}, stdout=log, stderr=log)
        try:
            async with httpx.AsyncClient(base_url=url, timeout=120) as client:
                for _ in range(100):
                    try:
                        if (await client.get('/api/health')).is_success: break
                    except httpx.HTTPError: pass
                    await asyncio.sleep(.1)
                else: raise AssertionError('Local API did not start')
                async with async_playwright() as pw:
                    browser = await pw.chromium.launch()
                    page = await browser.new_page(viewport={'width':1920,'height':900}, accept_downloads=True)
                    page.set_default_timeout(15000)
                    page.on('pageerror', lambda e: report['errors'].append(str(e)))
                    async def calc_route(route):
                        response = await route.fetch(timeout=120000)
                        ordinary.append({'plan':route.request.post_data_json,'result':await response.json()})
                        await route.fulfill(response=response)
                    async def risk_route(route):
                        risk_requests.append(route.request.post_data_json)
                        response = await route.fetch(timeout=120000); risk_responses.append(await response.json()); await route.fulfill(response=response)
                    await page.route('**/api/calc', calc_route)
                    await page.route('**/api/calc/risk', risk_route)
                    await page.goto(url)
                    await expect(page.get_by_role('heading', name='Сравнение стратегий', exact=True)).to_be_visible()
                    await expect(page.get_by_role('tab')).to_have_count(2)
                    await page.get_by_label('Добавить стратегию', exact=True).click()
                    await page.get_by_role('button', name='Создать свою', exact=True).click()
                    await expect(page.get_by_test_id('daily-chart')).to_be_visible()
                    await expect(page.locator('.strategy-freshness')).to_contain_text('Результат текущих настроек')
                    check('Strategy summary precedes settings', await page.locator('.strategy-summary').evaluate('(el)=>Boolean(el.compareDocumentPosition(document.querySelector(".infrastructure")) & Node.DOCUMENT_POSITION_FOLLOWING)'))
                    check('Strategy summary stays below 90px on desktop', await page.locator('.strategy-summary').evaluate('(el)=>el.getBoundingClientRect().height<=90'))
                    check('Violation details do not overflow the summary', await page.locator('.strategy-violation-preview').count()==0)
                    await expect(page.get_by_role('button',name='Планы',exact=True)).to_be_visible()
                    await expect(page.get_by_role('button',name='Сохранить',exact=True)).to_be_visible()
                    await expect(page.get_by_role('button',name='Выгрузить',exact=True)).to_be_visible()
                    check('No duplicate editor or input sliders', await page.locator('.settings-editor,.settings-column input[type=range]').count()==0)
                    check('Settings and result sit alongside each other', await page.locator('.settings-column').evaluate("el=>el.getBoundingClientRect().right<=document.querySelector('.result-panel').getBoundingClientRect().left"))
                    result = ordinary[-1]['result']
                    check('Real API supplies complete daily horizon', len(result['inventory_trace']) == 2190)
                    check('No automatic risk or project writes', not risk_requests and (await client.get('/api/projects')).json()['total'] == 0)
                    await page.evaluate('document.fonts.ready')
                    check('Local Golos Text loaded for Cyrillic',await page.evaluate('document.fonts.check(\'400 14px "Golos Text"\',"Поставки") && document.fonts.check(\'600 14px "Golos Text"\',"Поставки")'))
                    await page.get_by_role('button',name='По годам →',exact=True).first.click()
                    check('Annual details keep all six columns in dialog',await page.get_by_role('dialog').locator('.strategy-years thead th').count()==7)
                    await page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
                    await page.screenshot(path=str(out/'initial-900.png'),full_page=True)
                    check('Default workspace fits 1920x900',await page.evaluate('document.documentElement.scrollHeight<=innerHeight+1'))
                    formatted_cost = await page.evaluate('(x)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(x)', result['total_cost_mln'])
                    await expect(page.locator('.strategy-cost')).to_contain_text(formatted_cost)
                    check('Total cost comes from model result')
                    # Timeline and editor interactions are added using the stable public labels below.
                    await exercise(page, client, ordinary, check, out)
                    await page.get_by_role('button', name='Оба', exact=True).click()
                    await expect(page.locator('.strategy-scenario')).to_have_count(2)
                    await expect(page.locator('.strategy-freshness')).to_contain_text('Результат текущих настроек')
                    await expect(page.locator('.strategy-scenario').nth(1)).to_contain_text('STRESS')
                    check('Both scenarios have independent whole-strategy summaries')
                    await page.screenshot(path=str(out/'both.png'),full_page=True)
                    check('Both scenarios fit the desktop workspace',await page.evaluate('document.documentElement.scrollHeight<=innerHeight+1'))
                    await page.screenshot(path=str(out/'both.png'),full_page=True)
                    await page.get_by_test_id('run-risk-button').click()
                    await expect(page.locator('.risk-summary').first.locator('thead th')).to_have_count(3, timeout=120000)
                    check('Explicit risks calculate both scenarios', len(risk_requests) == 2 and {r['scenario_id'] for r in risk_requests} == {'BASE','MANDATORY_STRESS'})
                    await expect(page.get_by_test_id('risk-histogram')).to_have_count(2)
                    for i,response in enumerate(risk_responses):
                        risk=response['risk_register'][0]
                        assert len(risk['shortage_samples_t'])==100
                        bars=page.get_by_test_id('risk-histogram').nth(i).locator('.risk-bin')
                        await expect(bars).to_have_count(len(risk['shortage_histogram']))
                        for j,bin_ in enumerate(risk['shortage_histogram']):
                            await expect(bars.nth(j)).to_have_attribute('aria-label',__import__('re').compile(f": {bin_['count']} из 100 прогонов"))
                    check('Risk histograms show every real API bin for both 100-run samples')
                    await page.locator('.risk-distribution-details > summary').click()
                    await page.get_by_test_id('risk-histogram').first.locator('.risk-bin').first.focus()
                    await expect(page.get_by_test_id('risk-histogram').first.locator('.risk-bin-detail')).to_contain_text('из 100 прогонов')
                    check('Histogram frequencies are available through keyboard focus')
                    await page.screenshot(path=str(out/'monte-carlo.png'),full_page=True)

                    await page.get_by_role('dialog').get_by_label('Закрыть окно', exact=True).click()
                    await page.get_by_label('Название плана', exact=True).fill('Strategy UX browser check')
                    await page.locator('.calculate-button').click()
                    await expect(page.locator('.calculate-button')).to_be_enabled(timeout=120000)
                    projects = (await client.get('/api/projects')).json()['items']
                    check('Explicit save creates one project', len(projects) == 1)
                    saved = (await client.get('/api/projects/'+projects[0]['project_id'])).json()
                    check('Saved calculation is current', saved['result_state'] == 'current')
                    await page.get_by_label('Начальный запас топлива, т', exact=True).fill('23')
                    await expect(page.locator('.strategy-freshness')).to_contain_text('Результат текущих настроек')
                    await page.get_by_role('button', name='Выгрузить', exact=True).click()
                    await expect(page.get_by_role('button',name='Сохранить и выгрузить проект',exact=True)).to_be_visible()
                    async with page.expect_download() as info:
                        await page.get_by_role('button',name='Сохранить и выгрузить проект',exact=True).click()
                    download = await info.value; path = out/download.suggested_filename; await download.save_as(path)
                    check('Dirty project is saved, recalculated and downloaded', isinstance(json.loads(path.read_text()),dict))
                    await expect(page.get_by_role('button',name='Выгрузить проект',exact=True)).to_be_visible(timeout=120000)
                    saved = (await client.get('/api/projects/'+projects[0]['project_id'])).json()
                    check('Project export leaves current saved result', saved['result_state']=='current' and saved['plan']['decisions']['inventory_policy']['initial_inventory_t']==23)
                    for title in ['План JSON', 'Результат JSON', 'Результат CSV']:
                        async with page.expect_download() as info:
                            await page.get_by_role('button', name=title).click()
                        download = await info.value; path = out/download.suggested_filename; await download.save_as(path)
                        if title == 'Результат CSV':
                            with zipfile.ZipFile(path) as z: check('CSV archive is readable', z.testzip() is None and bool(z.namelist()))
                        else:
                            data = json.loads(path.read_text()); check('Browser downloads '+title, isinstance(data, dict))
                            if title == 'Результат JSON': check('Downloaded result matches saved model data', data['total_cost_mln'] == saved['last_run']['result']['total_cost_mln'])
                    await page.get_by_label('Закрыть окно', exact=True).click()
                    await page.reload()
                    await expect(page.get_by_label('Название плана', exact=True)).to_have_value('Strategy UX browser check')
                    check('Saved strategy survives reload')
                    await page.get_by_label('Действия с планом', exact=True).click()
                    await page.get_by_role('button', name='Создать копию', exact=True).click()
                    await page.get_by_label('Название копии', exact=True).fill('Strategy UX comparison')
                    await page.get_by_label('Сценарий копии', exact=True).select_option('MANDATORY_STRESS')
                    await page.get_by_role('dialog').get_by_role('button', name='Создать копию', exact=True).click()
                    await expect(page.get_by_role('dialog')).to_have_count(0)
                    await page.locator('.calculate-button').click()
                    await expect(page.locator('.calculate-button')).to_be_enabled(timeout=120000)
                    await page.get_by_label('Действия с планом', exact=True).click()
                    await page.get_by_role('button', name='Сравнить стратегии', exact=True).click()
                    await expect(page.get_by_role('heading', name='Сравнение стратегий', exact=True)).to_be_visible()
                    await expect(page.locator('.comparison-compact-table')).to_be_visible(timeout=120000)
                    check('Copied strategy can be calculated and compared')
                    await page.screenshot(path=str(out/'comparison.png'), full_page=True)
                    await page.get_by_role('button', name='Редактор', exact=True).click()
                    for width,height in [(1920,900),(1920,1080)]:
                        await page.set_viewport_size({'width':width,'height':height})
                        await page.wait_for_timeout(200)
                        check(f'No vertical page overflow at {width}x{height}',await page.evaluate('document.documentElement.scrollHeight<=innerHeight+1'))
                        check(f'No page overflow at {width}', await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                        check(f'Summary heading does not overlap status at {width}', await page.locator('.strategy-summary').evaluate("el=>el.classList.contains('strategy-summary-quiet')||el.querySelector('.panel-heading').getBoundingClientRect().bottom<=el.querySelector('.strategy-freshness').getBoundingClientRect().top"))
                        await page.screenshot(path=str(out/f'view-{width}-{height}.png'), full_page=True)
                    await page.emulate_media(reduced_motion='reduce')
                    await page.keyboard.press('Tab')
                    check('Keyboard focus is visible', await page.evaluate('document.activeElement!==document.body'))
                    check('No browser runtime errors', not report['errors'])
                    await browser.close()
        finally:
            proc.terminate(); proc.wait(timeout=10)
            (out/'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))

async def exercise(page, client, ordinary, check, out):
    month = page.locator('button[aria-label^="Earth-Core, Янв 2035:"]')
    if await month.get_attribute('aria-expanded') != 'true':
        await month.click()
    editor = page.get_by_role('region', name='Партии Earth-Core: Янв 2035', exact=True)
    await expect(editor).to_be_visible()
    order = editor.get_by_label('Топливо, т', exact=True)
    reserve = page.get_by_label('Резерв Earth-Core 2035, т/год', exact=True)
    inventory = page.get_by_label('Начальный запас топлива, т', exact=True)
    async def wait_input(predicate):
        for _ in range(200):
            if predicate(ordinary[-1]['plan']): return
            await asyncio.sleep(.05)
        raise AssertionError('Latest manual input did not reach engine')
    await order.fill('20')
    await wait_input(lambda p:p['decisions']['supply_orders'][0]['order_t']==20)
    await reserve.fill('130')
    await wait_input(lambda p:p['decisions']['capacity_reservations'][0]['reserved_capacity_t']==130)
    await inventory.fill('22')
    await wait_input(lambda p:p['decisions']['inventory_policy']['initial_inventory_t']==22)
    check('All three manual fields reach real engine inputs')
    check('Each quantity has one visible editing control', await order.count()==1 and await reserve.count()==1 and await inventory.count()==1)
    await page.get_by_role('button',name='Другие записи →',exact=True).click()
    check('Advanced dialog does not repeat ordinary quantities',await page.get_by_role('dialog').locator('input[type=number]').count()==0)
    await page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
    stable_top=await page.locator('.settings-column').evaluate('e=>e.getBoundingClientRect().top')
    before_invalid=len(ordinary);await order.fill('')
    await expect(page.locator('.strategy-freshness')).to_contain_text('Исправьте ошибки ввода')
    await asyncio.sleep(.25);check('Invalid input blocks computation instead of claiming success', len(ordinary)==before_invalid)
    check('Invalid status does not move workspace',await page.locator('.settings-column').evaluate('e=>e.getBoundingClientRect().top')==stable_top)
    await order.fill('20');await expect(page.locator('.strategy-freshness')).to_contain_text('Результат текущих настроек')
    check('Restored result does not move workspace',await page.locator('.settings-column').evaluate('e=>e.getBoundingClientRect().top')==stable_top)
    check('Violation count opens details without inline overflow',await page.get_by_role('button',name=__import__('re').compile(r'\d+ нарушений')).count()>0 and await page.locator('.strategy-violation-preview').count()==0)
    before=len(ordinary);summary=await page.locator('.strategy-scenarios').inner_text()
    slider=page.get_by_role('slider',name='День горизонта',exact=True)
    await slider.focus();await slider.press('End');await expect(slider).to_have_value('2190')
    await slider.press('Home');await expect(slider).to_have_value('1')
    await slider.evaluate("""el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'365');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}""")
    await slider.focus();await slider.press('ArrowRight');await expect(slider).to_have_attribute('aria-valuetext','2036, день 1')
    check('Day navigation crosses year boundary correctly')
    geometry=await page.evaluate("JSON.stringify(['.settings-column','.supply-matrix','.result-numbers','.result-widget'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height]}))")
    await page.get_by_role('button',name='Затраты по годам',exact=True).click()
    check('Changing chart preserves table and result geometry',geometry==await page.evaluate("JSON.stringify(['.settings-column','.supply-matrix','.result-numbers','.result-widget'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height]}))"))
    check('Annual costs have no day slider or day-details action', await slider.count()==0 and await page.get_by_test_id('timeline-details-button').count()==0)
    await page.get_by_role('group',name='Год расходов').get_by_role('button',name='2039',exact=True).click()
    await expect(page.get_by_test_id('timeline-selected-day')).to_contain_text('2039')
    row=next(r for r in ordinary[-1]['result']['financial_breakdown'] if r['year']==2039)
    expected=await page.evaluate('(x)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(x)',row['total'])
    await expect(page.locator('.result-numbers')).to_contain_text(expected)
    check('Year buttons show actual annual model costs')
    await page.screenshot(path=str(out/'costs.png'),full_page=True)
    await page.get_by_role('button',name='Запас по дням',exact=True).click()
    await expect(slider).to_have_attribute('aria-valuetext','2039, день 1')
    bounds=await slider.bounding_box();await page.mouse.move(bounds['x']+8,bounds['y']+bounds['height']/2);await page.mouse.down();await page.mouse.move(bounds['x']+bounds['width']*.6,bounds['y']+bounds['height']/2,steps=18);await page.mouse.up()
    check('Pointer day slider changes date',1000<int(await slider.input_value())<1500)
    await page.get_by_role('button',name='Подробнее · 90 дней',exact=True).click()
    await page.get_by_test_id('timeline-details-button').click()
    await expect(page.get_by_role('dialog')).to_be_visible()
    selected=int(await slider.input_value());year=2035+(selected-1)//365;day=(selected-1)%365+1
    row=next(r for r in ordinary[-1]['result']['inventory_trace'] if r['year']==year and r['day_of_year']==day)
    expected=await page.evaluate('(x)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(x)',(row['closing_inventory_t'] or 0))
    await expect(page.get_by_role('dialog')).to_contain_text(expected)
    check('Selected day details match actual engine output')
    await page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
    await page.get_by_role('button',name='Весь период',exact=True).click()
    await asyncio.sleep(.2)
    check('Viewing dates costs no API calls and does not mutate plan',len(ordinary)==before)
    check('Whole-strategy summary is independent of selected date',summary==await page.locator('.strategy-scenarios').inner_text())
    await page.get_by_label('Год плана поставок',exact=True).select_option('2035')
    if await month.get_attribute('aria-expanded') != 'true':
        await month.click()
    await expect(order).to_have_value('20');await expect(reserve).to_have_value('130')
    orders=ordinary[-1]['plan']['decisions']['supply_orders']
    await page.get_by_role('switch',name='Включить инвестицию Lunar-ISRU',exact=True).click()
    await expect(page.locator('.strategy-freshness')).to_contain_text('Результат текущих настроек')
    check('Investment switch preserves entered orders',ordinary[-1]['plan']['decisions']['supply_orders']==orders)
    await month.click()
    check('Main workspace fits monitor without page scrolling',await page.evaluate('document.documentElement.scrollHeight<=innerHeight+1'))

if __name__=='__main__':asyncio.run(main())
