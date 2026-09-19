"""Native browser integration: daily engine, strict layout and explicitly requested risks.
Uses real API, isolated storage, and one controlled secondary-risk error response.
"""
from __future__ import annotations
import asyncio,json,os,socket,subprocess,sys,tempfile,time,argparse
from pathlib import Path
import httpx
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
async def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--site',type=Path,default=ROOT/'frontend/dist')
 parser.add_argument('--artifacts',type=Path,default=ROOT/'frontend/test-results/daily-ui')
 args=parser.parse_args();out=args.artifacts.resolve();out.mkdir(parents=True,exist_ok=True)
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 url=f'http://127.0.0.1:{port}';report={'checks':[],'errors':[],'risk_requests':[]}
 def check(name,condition=True):
  assert condition,name
  report['checks'].append(name);print('PASS',name,flush=True)
 with tempfile.TemporaryDirectory(dir=out) as temp,(out/'server.log').open('w') as log:
  proc=subprocess.Popen([sys.executable,'-m','uvicorn','src.app.web:create_web_app','--factory','--host','127.0.0.1','--port',str(port)],cwd=ROOT,env={**os.environ,'FUEL_DATA_DIR':temp,'FUEL_FRONTEND_DIR':str(args.site.resolve()),'FUEL_HTTP_USER':'','FUEL_HTTP_PASSWORD':''},stdout=log,stderr=log)
  try:
   async with httpx.AsyncClient(base_url=url,timeout=120) as client:
    for _ in range(100):
     try:
      if (await client.get('/api/health')).is_success:break
     except httpx.HTTPError:pass
     await asyncio.sleep(.1)
    async with async_playwright() as pw:
     browser=await pw.chromium.launch();page=await browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(15000)
     page.on('pageerror',lambda e:report['errors'].append(str(e)))
     ordinary=[];starts=[];ordinary_active=0;ordinary_peak=0;risks=[];risk_active=0;risk_peak=0;fail_second=False
     async def calc_route(route):
      nonlocal ordinary_active,ordinary_peak
      starts.append(time.monotonic());ordinary_active+=1;ordinary_peak=max(ordinary_peak,ordinary_active)
      try:
       response=await route.fetch();ordinary.append({'plan':route.request.post_data_json,'result':await response.json()});await route.fulfill(response=response)
      finally:ordinary_active-=1
     async def risk_route(route):
      nonlocal risk_active,risk_peak
      risk_active+=1;risk_peak=max(risk_peak,risk_active)
      item={'plan':route.request.post_data_json,'at':time.monotonic()};risks.append(item)
      try:
       await asyncio.sleep(.35)
       if fail_second and item['plan']['scenario_id']=='MANDATORY_STRESS':
        await route.fulfill(status=503,json={'detail':'Тест: второй анализ недоступен'});item['error']=True
       else:
        response=await route.fetch(timeout=120000);item['result']=await response.json();await route.fulfill(response=response)
      finally:risk_active-=1
     await page.route('**/api/calc',calc_route);await page.route('**/api/calc/risk',risk_route)
     await page.goto(url)
     await expect(page.get_by_test_id('daily-chart')).to_be_visible()
     for _ in range(100):
      if ordinary:break
      await asyncio.sleep(.1)
     result=ordinary[-1]['result'];check('Real daily engine returns 2190 daily records',len(result['inventory_trace'])==2190)
     check('No automatic Monte-Carlo requests',not risks)
     check('No automatic project writes',(await client.get('/api/projects')).json()['total']==0)
     check('Duplicate timeline is removed',await page.locator('.timeline-panel').count()==0)
     await expect(page.locator('.supply-matrix tbody tr')).to_have_count(5)
     check('Supplier investment sits inside matrix',await page.locator('.supply-matrix').get_by_role('switch',name='Включить инвестицию Earth-New',exact=True).count()==1)
     order=page.get_by_label('Заказ Earth-Core 2035',exact=True)
     await order.focus();before=len(starts)
     await page.evaluate("""() => new Promise(resolve => {
      const el=document.querySelector('input[aria-label="Заказ: ползунок"]');
      const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      const frames=[];let start;function frame(t){if(start===undefined)start=t;frames.push(t);set.call(el,String(110+Math.min(30,Math.floor((t-start)/20))));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));if(t-start<650)requestAnimationFrame(frame);else{window.__frameTimes=frames;resolve();}}requestAnimationFrame(frame);
     })""")
     await expect(order).to_have_value('140')
     for _ in range(100):
      if ordinary[-1]['plan']['decisions']['supply_orders'][0]['order_t']==140:break
      await asyncio.sleep(.05)
     check('Continuous slider sends latest decisions',ordinary[-1]['plan']['decisions']['supply_orders'][0]['order_t']==140)
     times=starts[before:];check('Continuous slider requests at least 100ms apart',all(b-a>=.098 for a,b in zip(times,times[1:])))
     check('One ordinary request at a time in single mode',ordinary_peak==1)
     frames=await page.evaluate('window.__frameTimes');intervals=[b-a for a,b in zip(frames,frames[1:])]
     report['frame_intervals_ms']={'count':len(intervals),'median':sorted(intervals)[len(intervals)//2],'max':max(intervals)}
     await order.fill('100')
     for _ in range(100):
      if ordinary[-1]['plan']['decisions']['supply_orders'][0]['order_t']==100:break
      await asyncio.sleep(.05)
     receipt=next(row for row in result['inventory_trace'] if row['year']==2035 and row['delivered_t']>0)
     marker=page.get_by_role('button',name=f"Перенести поступление: день {receipt['day_of_year']}",exact=True)
     await marker.scroll_into_view_if_needed();await asyncio.sleep(.25)
     bounds=await marker.bounding_box();before_drag=len(ordinary)
     await page.mouse.move(bounds['x']+bounds['width']/2,bounds['y']+bounds['height']/2)
     await page.mouse.down();await page.mouse.move(bounds['x']+bounds['width']/2+80,bounds['y']+bounds['height']/2,steps=12);await page.mouse.up()
     await expect(page.get_by_role('dialog',name='Предложение переноса поставки')).to_be_visible()
     await expect(page.get_by_role('dialog')).to_contain_text('не отправляется и не меняет расчёт')
     check('Dragging receipt proposes a later day',int(await page.get_by_label('Предложенная дата поставки',exact=True).input_value())>receipt['day_of_year'])
     check('Date proposal does not fabricate a calculation request',len(ordinary)==before_drag)
     await page.screenshot(path=str(out/'delivery-proposal.png'),full_page=True)
     await page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
     await page.get_by_test_id('daily-chart').get_by_role('button',name=f"День модели {receipt['day_of_year']}",exact=True).click()
     await expect(page.get_by_role('dialog')).to_be_visible()
     text=await page.get_by_role('dialog').inner_text()
     formatted=await page.evaluate('(n)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(n)',receipt['delivered_t'])
     check('Day details show actual API receipt',formatted in text)
     await page.screenshot(path=str(out/'day-details.png'),full_page=True)
     await page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
     await page.get_by_role('button',name='Оба',exact=True).click()
     for _ in range(150):
      if len(ordinary)>=3 and {v['plan']['scenario_id'] for v in ordinary[-2:]}=={'BASE','MANDATORY_STRESS'}:break
      await asyncio.sleep(.1)
     await page.screenshot(path=str(out/'desktop.png'),full_page=True)
     await page.get_by_role('button',name='Анализ рисков',exact=True).click()
     await expect(page.get_by_role('dialog')).to_be_visible()
     await expect(page.locator('.risk-progress')).to_be_visible()
     await page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
     baseline_count=len(ordinary)
     order=page.get_by_label('Заказ Earth-Core 2035',exact=True)
     await order.fill('123');await asyncio.sleep(.15)
     check('Ordinary preview pauses during requested risk analysis',len(ordinary)==baseline_count)
     await page.get_by_role('button',name='Анализ рисков',exact=True).click()
     await expect(page.locator('.risk-summary thead th')).to_have_count(3,timeout=120000)
     await expect(page.locator('.risk-progress')).to_have_count(0,timeout=120000)
     check('Both risk analyses run sequentially',risk_peak==1 and len(risks)==2)
     check('Risk requests use original immutable plan',all(x['plan']['decisions']['supply_orders'][0]['order_t']==100 for x in risks))
     await expect(page.locator('.risk-panel')).to_contain_text('Решения изменены')
     check('Changed decisions mark previous risk snapshot')
     check('Real risk output has 100 runs and seed',all(x['result']['risk_register'][0]['iterations']==100 and x['result']['risk_register'][0]['seed']==42 for x in risks))
     await expect(page.locator('.risk-panel')).to_contain_text('Дневная динамика обычного расчёта')
     await page.screenshot(path=str(out/'risk.png'),full_page=True)
     await page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
     for _ in range(100):
      if ordinary[-1]['plan']['decisions']['supply_orders'][0]['order_t']==123:break
      await asyncio.sleep(.1)
     check('Latest edited plan resumes after risk analysis',ordinary[-1]['plan']['decisions']['supply_orders'][0]['order_t']==123)
     await page.locator('.calculate-button').click();await expect(page.locator('.calculate-button')).to_be_enabled(timeout=120000)
     projects=(await client.get('/api/projects')).json()['items'];check('Explicit save creates one project',len(projects)==1)
     saved=(await client.get('/api/projects/'+projects[0]['project_id'])).json();check('Saved daily result is current',saved['result_state']=='current' and len(saved['last_run']['result']['inventory_trace'])==2190)
     exported=(await client.get('/api/projects/'+saved['project_id']+'/result/export?format=json')).json()
     check('Export preserves complete actual daily result',all(exported[k]==v for k,v in saved['last_run']['result'].items()))
     await page.reload();await expect(order).to_have_value('123');check('Reload preserves saved decisions')
     # Both mode is session-local; explicitly select again for the secondary-error case.
     await page.get_by_role('button',name='Оба',exact=True).click();fail_second=True
     await page.get_by_role('button',name='Анализ рисков',exact=True).click()
     await expect(page.locator('.risk-panel')).to_contain_text('Тест: второй анализ недоступен',timeout=120000)
     await expect(page.locator('.risk-summary thead th')).to_have_count(2)
     check('Secondary risk failure preserves successful first summary')
     await page.get_by_role('dialog').get_by_label('Закрыть окно',exact=True).click()
     for width,height in [(1280,720),(390,844)]:
      await page.set_viewport_size({'width':width,'height':height});await asyncio.sleep(.2)
      check(f'No horizontal document overflow at {width}',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
      await expect(page.get_by_test_id('daily-chart')).to_be_visible()
      await page.screenshot(path=str(out/f'view-{width}.png'),full_page=True)
     await page.emulate_media(reduced_motion='reduce');await page.keyboard.press('Tab')
     check('Keyboard focus available',await page.evaluate('document.activeElement!==document.body'))
     check('No browser runtime errors',not report['errors']);await browser.close()
  finally:
   proc.terminate();proc.wait(timeout=10)
   report['risk_requests']=[{'scenario':x['plan']['scenario_id'],'at':x['at'],'error':x.get('error',False)} for x in locals().get('risks',[])]
   (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':asyncio.run(main())
