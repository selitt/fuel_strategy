"""Live preview browser checks against the real API, using isolated project storage.

Run with PLAYWRIGHT_BROWSERS_PATH pointing to the project's downloaded browser.
Artifacts are written under frontend/test-results/live-ui. No user projects touched.
"""
from __future__ import annotations
import asyncio, json, os, socket, subprocess, sys, tempfile, time
from pathlib import Path
import httpx
from playwright.async_api import async_playwright, expect
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'frontend/test-results/live-ui'

async def main():
 OUT.mkdir(parents=True, exist_ok=True)
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 url=f'http://127.0.0.1:{port}'
 report={'checks':[], 'errors':[], 'requests':[]}
 def check(label, value=True):
  assert value,label
  report['checks'].append(label);print('PASS',label,flush=True)
 with tempfile.TemporaryDirectory(dir=OUT) as data, (OUT/'server.log').open('w') as log:
  env={**os.environ,'FUEL_DATA_DIR':data,'FUEL_FRONTEND_DIR':str(ROOT/'frontend/dist'),'FUEL_HTTP_USER':'','FUEL_HTTP_PASSWORD':''}
  server=subprocess.Popen([sys.executable,'-m','uvicorn','src.app.web:create_web_app','--factory','--host','127.0.0.1','--port',str(port)],cwd=ROOT,env=env,stdout=log,stderr=log)
  try:
   async with httpx.AsyncClient(base_url=url) as client:
    for _ in range(100):
     try:
      if (await client.get('/api/health')).status_code==200:break
     except httpx.HTTPError:pass
     await asyncio.sleep(.1)
    async with async_playwright() as p:
     browser=await p.chromium.launch()
     page=await browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
     page.on('pageerror',lambda e:report['errors'].append(str(e)))
     delay=0.0;active=0;peak=0;records=[]; synthetic=False; unsupported=False; fail_stress=False
     async def intercept(route):
      nonlocal active,peak
      payload=route.request.post_data_json
      row={'at':time.monotonic(),'plan':payload,'done':False}
      records.append(row);active+=1;peak=max(peak,active)
      try:
       await asyncio.sleep(delay)
       if fail_stress and payload['scenario_id']=='MANDATORY_STRESS':
        await route.fulfill(status=503,json={'code':'ENGINE_NOT_READY','detail':'Тест: второй сценарий недоступен'});return
       response=await route.fetch();row['result']=await response.json()
       if synthetic:
        # Explicit browser contract fixture: test missing result-year and foreign units.
        result=json.loads(json.dumps(final));result['plan_id']=payload['plan_id'];result['scenario_id']=payload['scenario_id']
        result['source_schedule'].append({'year':2048,'source_id':'Result-Only','reserved_capacity_t':0,'ordered_t':0,'delivered_t':77})
        if unsupported:result['units']={'fuel':'kg','currency':'mln_units'}
        row['result']=result;await route.fulfill(status=200,json=result)
       else:await route.fulfill(response=response)
      finally:active-=1;row['done']=True
     await page.route('**/api/calc',intercept)
     await page.goto(url)
     await expect(page.locator('[data-testid="service-total"]')).to_be_visible()
     await expect(page.locator('.timeline-table tbody tr')).to_have_count(5)
     check('Opening automatically calculates without saving a project',(await client.get('/api/projects')).json()['total']==0)
     check('Footer prose removed',await page.locator('.infra-footer,.matrix-footnote,.operator-footer').count()==0)
     order=page.get_by_label('Заказ Earth-Core 2035',exact=True)
     await order.focus()
     slider=page.get_by_label('Заказ: ползунок',exact=True)
     delay=.2;before=len(records)
     await page.evaluate('''() => new Promise(resolve => {
      const el=document.querySelector('input[aria-label="Заказ: ползунок"]');
      const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      const frames=[];let start;function frame(t){if(start===undefined)start=t;frames.push(t);set.call(el,String(110+Math.min(30,Math.floor((t-start)/20))));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));if(t-start<650)requestAnimationFrame(frame);else{window.__frameTimes=frames;resolve();}}requestAnimationFrame(frame);
     })''')
     await expect(order).to_have_value('140')
     for _ in range(100):
      if records and records[-1]['done'] and records[-1]['plan']['decisions']['supply_orders'][0]['order_t']==140:break
      await asyncio.sleep(.05)
     await asyncio.sleep(.2)
     check('Latest slider snapshot reaches backend',records[-1]['plan']['decisions']['supply_orders'][0]['order_t']==140)
     check('Slow preview does not queue every slider position',1<=len(records)-before<=5)
     check('One active request in single mode',peak==1)
     check('No project writes during dragging',(await client.get('/api/projects')).json()['total']==0)
     check('No loading overlay while dragging',await page.locator('.result-panel').get_by_text('Обновляется',exact=True).count()==0)
     starts=[r['at'] for r in records[before:]]
     check('Calculation cycles remain at least 100ms apart',all(b-a>=.09 for a,b in zip(starts,starts[1:])))
     frames=await page.evaluate('window.__frameTimes');intervals=[b-a for a,b in zip(frames,frames[1:])]
     report['frame_intervals_ms']={'count':len(intervals),'median':sorted(intervals)[len(intervals)//2], 'max':max(intervals)}
     # Values shown must come from latest actual API result.
     final=records[-1]['result'];await expect(page.locator('.plot-legend').get_by_text(str(round(final['yearly_balance'][0]['delivered_t'])),exact=True)).to_be_visible()
     check('Chart shows actual latest API delivery')
     await page.locator('.timeline-table tbody tr').nth(1).locator('button').nth(2).click()
     await expect(page.locator('.inspector-heading')).to_contain_text('Earth-Flex / 2037')
     await expect(page.locator('.year-nav strong')).to_have_text('2037')
     check('Timeline selection updates editor and result year')
     delay=0
     await page.get_by_role('button',name='Оба',exact=True).click()
     await expect(page.get_by_role('heading',name='Сравнение сценариев',exact=True)).to_be_visible()
     check('Both scenarios are actual calculations',set(r['plan']['scenario_id'] for r in records[-2:])=={'BASE','MANDATORY_STRESS'})
     await page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
     # Saving is explicit and stores matching plan/result.
     preview_before_save=len(records)
     await page.locator('.calculate-button').click()
     await expect(page.locator('.calculate-button')).to_be_enabled()
     projects=(await client.get('/api/projects')).json()['items'];check('Explicit save creates one project',len(projects)==1)
     saved=(await client.get('/api/projects/'+projects[0]['project_id'])).json()
     check('Saved result is current',saved['result_state']=='current')
     settled_count=len(records);await asyncio.sleep(.35)
     check('Saving does not launch another preview of the same inputs',len(records)==preview_before_save+1)
     exported=(await client.get('/api/projects/'+projects[0]['project_id']+'/result/export?format=json')).json()
     check('Export equals saved actual result',all(exported[k]==v for k,v in saved['last_run']['result'].items()))
     await order.fill('-1');count=len(records);await asyncio.sleep(.4)
     check('Invalid input is not calculated',len(records)==count)
     await order.fill('141')
     await page.locator('summary[aria-label="Действия с планом"]').click()
     await page.get_by_role('button',name='Скачать…',exact=True).click()
     await expect(page.get_by_role('button',name='Результат JSON',exact=False)).to_be_disabled()
     check('Changed draft cannot export old saved result')
     await page.get_by_role('button',name='Закрыть окно',exact=True).click()
     # Revision conflict cannot overwrite a teammate's plan.
     await client.put('/api/projects/'+saved['project_id'],json={'name':saved['name'],'plan':saved['plan'],'expected_revision':saved['revision']})
     await page.locator('.calculate-button').click()
     await expect(page.locator('.error-banner')).to_contain_text('другом окне')
     check('Revision conflict stays visible')
     await page.get_by_label('Закрыть ошибку',exact=True).click()
     for width,height in [(1366,768),(1280,720),(390,844)]:
      await page.set_viewport_size({'width':width,'height':height})
      await asyncio.sleep(.2)
      check(f'No document horizontal overflow {width}',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
      if width>=1200:
       for selector in ['.result-panel','.matrix-viewport','.timeline-viewport']:
        check(f'Contents fit {selector} at {width}',await page.locator(selector).evaluate('(e)=>e.scrollHeight<=e.clientHeight+1'))
      await page.screenshot(path=str(OUT/f'view-{width}.png'),full_page=True)
     await page.locator('.mobile-switch').get_by_role('button',name='Результат',exact=True).click()
     await expect(page.locator('.result-panel')).to_be_visible();await expect(page.locator('.timeline-panel')).to_be_visible()
     check('Mobile retains timeline beside active mode')
     await page.emulate_media(reduced_motion='reduce')
     await page.keyboard.press('Tab')
     check('Keyboard focus remains visible',await page.evaluate('document.activeElement !== document.body'))
     await page.screenshot(path=str(OUT/'mobile-result.png'),full_page=True)
     await page.set_viewport_size({'width':1440,'height':1000})
     # Return to server revision, then verify saved primary wins if second scenario fails.
     await page.get_by_label('Открыть сохранённый план',exact=True).click()
     await page.get_by_role('dialog').locator('.saved-plans button').first.click()
     await page.get_by_role('button',name='Не сохранять',exact=True).click()
     await expect(order).to_have_value('140')
     await asyncio.sleep(.25)
     fail_stress=True
     await order.fill('142');await page.locator('.calculate-button').click()
     await expect(page.locator('.error-banner')).to_contain_text('второй сценарий недоступен')
     await expect(page.locator('.plot-legend').get_by_text('142',exact=True)).to_be_visible()
     check('Saved primary replaces old preview even if second scenario fails')
     fail_stress=False
     await page.get_by_label('Закрыть ошибку',exact=True).click()
     await page.get_by_role('button',name='BASE',exact=True).click()
     synthetic=True
     fixture=json.loads(json.dumps(saved['plan']));fixture['plan_id']='SYNTHETIC-selection-contract'
     fixture['decisions']['supply_orders'].append({'source_id':'Future-X','year':2047,'order_t':7})
     await page.get_by_label('Файл плана или проекта',exact=True).set_input_files({'name':'SYNTHETIC-selection.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()})
     await expect(page.locator('.timeline-table tbody tr').filter(has_text='Result-Only')).to_be_visible()
     await page.locator('.timeline-table tbody tr').filter(has_text='Future-X').locator('button').filter(has_text='7').first.click()
     await expect(page.locator('.year-nav strong')).to_have_text('2047')
     await expect(page.locator('.result-panel')).to_contain_text('Нет данных за 2047')
     await expect(page.locator('.plot-legend strong')).to_have_text(['—','—','—'])
     check('Future selected year never substitutes first-year result (SYNTHETIC contract fixture)')
     await page.locator('.timeline-modes').get_by_role('button',name='Поставлено',exact=True).click()
     await page.locator('.timeline-table tbody tr').filter(has_text='Result-Only').get_by_role('button',name='Result-Only, 2048:',exact=False).click()
     await expect(page.locator('.inspector-heading')).to_contain_text('Result-Only / 2048')
     await expect(page.locator('.inspector-heading')).to_contain_text('Нет записи в плане')
     check('Result-only source never edits Earth-Core by fallback (SYNTHETIC contract fixture)')
     unsupported=True
     await page.get_by_label('Заказ Earth-Core 2035',exact=True).fill('143')
     await expect(page.locator('.timeline-panel')).to_contain_text('Единицы не поддерживаются')
     check('Foreign-unit result is not shown as tons in timeline (SYNTHETIC contract fixture)',all(value=='—' for value in await page.locator('.timeline-value').all_text_contents()))
     check('No uncaught browser errors',not report['errors'])
     await browser.close()
  finally:
   server.terminate();server.wait(timeout=10)
   report['requests']=[{'at':r['at'],'scenario':r['plan']['scenario_id']} for r in locals().get('records',[])]
   (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':asyncio.run(main())
