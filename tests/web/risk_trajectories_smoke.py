import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright,expect
async def main():
 parser=argparse.ArgumentParser(description='Read-only browser check of real Monte Carlo trajectories; starts no services and saves no plans.')
 parser.add_argument('--url',default='http://127.0.0.1:8080/')
 parser.add_argument('--artifacts',type=Path,required=True)
 args=parser.parse_args();args.artifacts.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  page=await browser.new_page(viewport={'width':1920,'height':900},device_scale_factor=1)
  errors=[];responses=[];tasks=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  async def collect(response):
   if '/api/calc/risk' in response.url:
    assert response.status==200
    responses.append(await response.json())
  page.on('response',lambda r:tasks.append(asyncio.create_task(collect(r))))
  await page.goto(args.url)
  await expect(page.locator('.strategy-freshness')).to_contain_text('Результат текущих настроек')
  await page.get_by_role('button',name='Оба',exact=True).click()
  await page.get_by_test_id('risk-disclosure').click()
  await page.get_by_test_id('run-risk-button').click()
  await expect(page.get_by_test_id('risk-trajectories')).to_be_visible(timeout=120000)
  await expect(page.get_by_role('button',name='Повторить проверку',exact=True)).to_be_enabled(timeout=120000)
  await asyncio.gather(*tasks)
  assert len(responses)==2,len(responses)
  await page.get_by_label('Отдельный прогон',exact=True).select_option('17')
  chart=page.get_by_test_id('risk-trajectories');svg=chart.locator('svg')
  await expect(chart.locator('.trajectory-run')).to_have_count(1)
  # Exact rendered coordinates correspond to every actual raw run sample.
  for result in responses:
   risk=result['risk_register'][0];d=risk['daily_trajectories']
   assert len(d['runs'])==100 and len(d['days'])==2190
   for metric in ['inventory_t','shortage_t']:
    for i in [0,60,364,365,1000,2189]:
     vals=sorted(r[metric][i] for r in d['runs'])
     assert d['bands'][metric]['p05'][i]==vals[4]
     assert d['bands'][metric]['p95'][i]==vals[94]
     assert d['bands'][metric]['median'][i]==round((vals[49]+vals[50])/2,2)
  d=responses[0]['risk_register'][0]['daily_trajectories']
  points=await chart.locator('.trajectory-run').get_attribute('points')
  assert len(points.split())==2190
  maxv=max(1,*d['bands']['inventory_t']['p95'],*d['runs'][16]['inventory_t'])*1.08
  viewbox=list(map(float,(await svg.get_attribute('viewBox')).split()))
  right=viewbox[2]-85
  for i in [0,60,1000,2189]:
   xp,yp=map(float,points.split()[i].split(','))
   assert abs(xp-(18+i/2189*(right-18)))<=.011
   assert abs(yp-(viewbox[3]-45-d['runs'][16]['inventory_t'][i]/maxv*(viewbox[3]-69)))<=.011
  await page.screenshot(path=str(args.artifacts/'paths-overview.png'),full_page=True)
  await chart.get_by_role('button',name='180 дней',exact=True).click()
  assert len((await chart.locator('.trajectory-run').get_attribute('points')).split())==180
  await svg.focus();await page.keyboard.press('ArrowRight')
  await expect(page.get_by_test_id('risk-day-readout')).to_contain_text('день 2')
  await page.screenshot(path=str(args.artifacts/'paths-zoom.png'),full_page=True)
  box=await svg.bounding_box();await page.mouse.move(box['x']+box['width']*.5,box['y']+box['height']*.5)
  before=await chart.locator('.risk-chart-help').inner_text();await page.mouse.wheel(0,-100)
  await page.wait_for_timeout(150)
  assert before!=await chart.locator('.risk-chart-help').inner_text()
  before=await chart.locator('.risk-chart-help').inner_text()
  await page.mouse.down();await page.mouse.move(box['x']+box['width']*.3,box['y']+box['height']*.5,steps=5);await page.mouse.up()
  assert before!=await chart.locator('.risk-chart-help').inner_text()
  await chart.get_by_role('button',name='Дефицит за день',exact=True).click()
  await expect(chart.locator('.risk-chart-unit')).to_have_text('Дефицит за день, т')
  await page.screenshot(path=str(args.artifacts/'paths-shortage.png'),full_page=True)
  await page.get_by_role('group',name='Сценарий траекторий').get_by_role('button',name='Стрессовый',exact=True).click()
  await expect(chart.locator('.risk-terminal-legend')).to_contain_text('Стрессовый')
  await page.get_by_label('Отдельный прогон',exact=True).select_option('100')
  await expect(chart.locator('.risk-terminal-legend')).to_contain_text('Прогон № 100')
  await page.set_viewport_size({'width':390,'height':844})
  await chart.scroll_into_view_if_needed()
  await page.screenshot(path=str(args.artifacts/'paths-mobile.png'),full_page=False)
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  dialog=page.get_by_role('dialog');assert await dialog.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  assert not errors,errors
  (args.artifacts/'paths-browser.json').write_text(json.dumps({'scenarios':len(responses),'runs':100,'days':2190,'coordinates':'verified against API','zoom_wheel_drag_keyboard':'passed','mobile_overflow':False,'errors':errors},ensure_ascii=False,indent=2))
  await browser.close()
asyncio.run(main())
