"""Focused native Chromium checks; only unsaved drafts in a temporary local store."""
from __future__ import annotations
import json
from copy import deepcopy
import os
import re
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

import httpx
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'results' / 'chart-validation'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    url = f'http://127.0.0.1:{port}'
    report = {'checks': [], 'console_errors': [], 'requests': []}
    def check(name, passed=True):
        assert passed, name
        report['checks'].append(name)
        print('PASS:', name, flush=True)
    with tempfile.TemporaryDirectory(prefix='store-', dir=OUT) as store, (OUT/'server.log').open('w') as log:
        env = {**os.environ, 'FUEL_DATA_DIR': store, 'FUEL_FRONTEND_DIR': str(ROOT/'frontend/dist'),
               'FUEL_HTTP_USER': '', 'FUEL_HTTP_PASSWORD': '', 'FUEL_PUBLIC_MODE': '0',
               'FUEL_ALLOW_UNAUTHENTICATED_LOCAL': '1', 'FUEL_BIND_HOST': '127.0.0.1'}
        server = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'src.app.web:create_web_app', '--factory',
                                   '--host', '127.0.0.1', '--port', str(port), '--no-proxy-headers'],
                                  cwd=ROOT, env=env, stdout=log, stderr=log)
        try:
            for _ in range(100):
                try:
                    if httpx.get(url+'/api/health').status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                time.sleep(.1)
            else:
                raise AssertionError('Local server did not start')
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(viewport={'width':1600,'height':1000})
                page.set_default_timeout(15000)
                page.on('pageerror', lambda error: report['console_errors'].append(str(error)))
                page.on('request', lambda request: report['requests'].append({'method':request.method,'url':request.url}))
                template=httpx.get(url+'/api/calc/template').json()
                # Explicit, unsaved test decisions; every result is calculated by the real engine.
                fixture=deepcopy(template)
                fixture['plan_id']='ui-chart-validation'
                fixture['decisions']['supply_orders']=[{'source_id':'Earth-Core','year':2035,'delivery_date':f'2035-{month:02}-15','batch_id':f'ui-core-{month}','order_t':8.33 if month<12 else 8.37} for month in range(1,13)]
                fixture['decisions']['capacity_reservations']=[{'source_id':'Earth-Core','year':2035,'reserved_capacity_t':120}]
                fixture['decisions']['investments']=[]
                fixture['decisions']['inventory_policy']['initial_inventory_t']=0
                def load_draft(draft,name):
                    page.get_by_label('Добавить стратегию', exact=True).click()
                    page.locator('.strategy-add').get_by_role('button', name='Импорт файла', exact=True).click()
                    page.get_by_label('Файл плана или проекта',exact=True).set_input_files({'name':name+'.json','mimeType':'application/json','buffer':json.dumps(draft).encode()})
                    page.get_by_role('dialog').get_by_role('button',name='Импортировать',exact=True).click()
                    expect(page.get_by_role('heading',name='Поставки по месяцам',exact=True)).to_be_visible()
                page.goto(url)
                load_draft(fixture,'Проверка графиков')
                expect(page.locator('.daily-chart-svg')).to_be_visible()
                page.wait_for_timeout(250)
                check('Daily chart uses the surrounding card background', page.locator('.daily-chart-frame').evaluate('(e)=>getComputedStyle(e).backgroundColor') == 'rgba(0, 0, 0, 0)')
                page.screenshot(path=str(OUT/'daily-unified.png'))
                page.get_by_role('button',name='Затраты по годам',exact=True).click()
                page.wait_for_timeout(250)
                page.screenshot(path=str(OUT/'costs.png'))
                samples=page.evaluate('''async()=>{const a=[];let start;const done=new Promise(resolve=>{
                  function frame(t){start??=t;const s=document.querySelector('.daily-chart-svg');if(s&&getComputedStyle(s).visibility==='visible'){
                    const h=s.viewBox.baseVal.height,y=Number(s.querySelector('.daily-grid').getAttribute('y1'));
                    a.push({h,y,box:s.getAttribute('viewBox')});}
                    if(t-start<250)requestAnimationFrame(frame);else resolve(a);}requestAnimationFrame(frame);});
                  [...document.querySelectorAll('button')].find(b=>b.textContent==='Запас по дням').click();return await done;}''')
                report['mount_frames']=samples
                check('First visible frame already has coherent measured geometry', bool(samples) and all(abs(s['y']-(s['h']-54))<.01 for s in samples))
                for size in [(1280,720),(1600,1000)]:
                    page.set_viewport_size({'width':size[0],'height':size[1]})
                    page.wait_for_timeout(200)
                    check(f'Chart fits at {size}', page.locator('.daily-chart-svg').evaluate('(e)=>{const b=e.getBoundingClientRect();return b.x>=0&&b.right<=innerWidth+1;}'))
                page.get_by_role('button', name='Подробнее · 90 дней', exact=True).click()
                expect(page.locator('.daily-chart-svg')).to_be_visible()
                page.get_by_role('button', name='Весь период', exact=True).click()
                page.get_by_label('Год плана поставок',exact=True).select_option('2039')
                page.get_by_label('Год плана поставок',exact=True).select_option('2035')
                for _ in range(3):
                    page.get_by_role('button',name='Затраты по годам',exact=True).click()
                    page.get_by_role('button',name='Запас по дням',exact=True).click()
                page.get_by_role('button',name='Оба',exact=True).click()
                expect(page.locator('.daily-detail-switch')).to_be_visible()
                check('Scenario control shares the same card background',page.locator('.daily-detail-switch').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)')
                page.locator('.daily-detail-switch').get_by_role('button',name='STRESS',exact=True).click()
                page.locator('.daily-detail-switch').get_by_role('button',name='BASE',exact=True).click()
                check('Periods, years, scenarios and rapid chart switches remain usable')
                page.get_by_role('button', name=re.compile(r'^Earth-Core, Янв 2035:')).click()
                fuel=page.locator('#batch-0-order_t')
                original=fuel.input_value()
                fuel.fill('-1')
                expect(fuel).to_have_attribute('aria-invalid','true')
                expect(page.locator('#batch-0-issues')).to_contain_text('не меньше нуля')
                page.locator('.supply-issue-summary button').first.click()
                expect(fuel).to_be_focused()
                check('Negative fuel has an inline explanation and summary focuses the exact field')
                fuel.fill(original)
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                reserve=page.get_by_label('Резерв Earth-Core 2035, т/год',exact=True)
                reserve.fill('90')
                expect(page.locator('.supply-issue-summary')).to_contain_text('бронь')
                expect(reserve).to_have_attribute('aria-invalid','true')
                expect(page.locator('.month-cell[aria-invalid=true]')).to_have_count(12)
                page.screenshot(path=str(OUT/'reservation-error.png'))
                check('Annual reservation error highlights affected months and gives an actionable engine limit')
                page.locator('.supply-issue-summary button').first.click()
                expect(reserve).to_be_focused()
                reserve.fill('999')
                expect(page.locator('.supply-issue-summary')).to_contain_text('190')
                check('Reservation above source capacity shows actual catalog limit')
                reserve.fill('120')
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                page.get_by_role('button', name=re.compile(r'^Earth-Core, Янв 2035:')).click()
                page.locator('#batch-0-order_t').fill('200')
                expect(page.locator('.supply-issue-summary')).to_contain_text('190')
                check('Total supply above annual source capacity is explained by the engine')
                page.locator('#batch-0-order_t').fill(original)
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                duplicate=fixture['decisions']['supply_orders'][1]['batch_id']
                page.locator('#batch-0-batch_id').fill(duplicate)
                expect(page.locator('#batch-0-issues')).to_contain_text('повторяется')
                check('Duplicate batch ID has an editable field and actionable explanation')
                page.locator('#batch-0-batch_id').fill('ui-unique-batch')
                page.locator('#batch-0-delivery_date').fill('')
                expect(page.locator('.supply-issue-summary')).to_contain_text('дату')
                page.locator('.supply-issue-summary button').first.click()
                expect(page.locator('#batch-0-delivery_date')).to_be_focused()
                page.locator('#batch-0-delivery_date').fill('2035-01-01')
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                check('Missing delivery date is visible, reachable and cleared after correction')
                page.get_by_role('button',name='Параметры Earth-Core',exact=True).click()
                expect(page.get_by_role('dialog')).to_contain_text('Резерв оплачивается отдельно')
                expect(page.get_by_role('dialog')).to_contain_text('6.2')
                page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
                check('Price explanation uses existing source catalog and separates reservation from fuel')
                investment=page.get_by_role('switch',name='Включить инвестицию Earth-New',exact=True)
                investment.click()
                page.get_by_label('Год плана поставок',exact=True).select_option('2039')
                page.get_by_label('Резерв Earth-New 2039, т/год',exact=True).fill('1')
                page.get_by_role('button',name=re.compile(r'^Earth-New, Янв 2039:')).click()
                page.get_by_role('button',name='+ Добавить партию',exact=True).click()
                page.locator('.batch-list').get_by_label('Топливо, т',exact=True).fill('1')
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                investment.click()
                expect(page.locator('.supply-issue-summary')).to_contain_text('инвестиционное решение')
                page.locator('.supply-issue-summary button').first.click()
                expect(investment).to_be_focused()
                page.screenshot(path=str(OUT/'unavailable-source.png'))
                investment.click()
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                check('Unavailable invested source explains the missing decision and focuses its switch')
                catalog=httpx.get(url+'/api/catalog').json()
                lunar=next(row for table in catalog['tables'] if table['table_id']=='supply_sources' for row in table['rows'] if row['name']=='Lunar-ISRU')
                available=int(lunar['available_from_year'])
                page.get_by_role('switch',name='Включить инвестицию Lunar-ISRU',exact=True).click()
                lunar_year=page.get_by_label('Год решения Lunar-ISRU',exact=True)
                lunar_year.select_option(str(available))
                expect(page.locator('.supply-issue-summary')).to_contain_text(re.compile('профинансир',re.I))
                page.locator('.supply-issue-summary button').first.click()
                expect(lunar_year).to_be_focused()
                expect(lunar_year).to_have_attribute('aria-invalid','true')
                lunar_year.select_option(str(available-1))
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                check('Late investment year is explained and links to the actual year control')
                page.emulate_media(reduced_motion='reduce')
                page.get_by_role('button',name='Затраты по годам',exact=True).click()
                check('Reduced motion disables plot animation', page.locator('.chart-plot').first.evaluate('(e)=>getComputedStyle(e).animationName')=='none')
                page.get_by_role('button',name='Запас по дням',exact=True).click()
                page.screenshot(path=str(OUT/'final.png'))
                bad_source=deepcopy(fixture)
                bad_source['decisions']['supply_orders'][0]['source_id']='Unknown-channel'
                load_draft(bad_source,'Проверка источника поставки')
                expect(page.locator('.supply-issue-summary')).to_contain_text('источник')
                page.locator('.supply-issue-summary button').first.click()
                expect(page.locator('#batch-0-source_id')).to_be_focused()
                page.locator('#batch-0-source_id').select_option('Earth-Core')
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                check('Unknown imported supply source leads to an editable source selector')
                bad_reserve=deepcopy(fixture)
                bad_reserve['decisions']['capacity_reservations'][0]['source_id']='Unknown-channel'
                load_draft(bad_reserve,'Проверка источника резерва')
                expect(page.locator('.supply-issue-summary')).to_contain_text('источник')
                page.locator('.supply-issue-summary button').first.click()
                dialog=page.get_by_role('dialog')
                expect(dialog).to_contain_text('источник')
                dialog.get_by_label('Источник, исходная строка 1',exact=True).select_option('Earth-Core')
                dialog.get_by_label('Закрыть окно',exact=True).click()
                expect(page.locator('.supply-issue-summary')).to_have_count(0)
                check('Unknown imported reservation source is reachable in the advanced editor')
                check('No JavaScript runtime errors',not report['console_errors'])
                check('No persistent writes or risk calls',not any(r['method'] in ('POST','PUT','DELETE','PATCH') and ('/projects' in r['url'] or '/risk' in r['url']) for r in report['requests']))
                browser.close()
        finally:
            server.terminate()
            server.wait(timeout=10)
            (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    main()
