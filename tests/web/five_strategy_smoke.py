"""Compare all five real built-in strategies in an isolated native browser session."""
from __future__ import annotations
import json,os,socket,subprocess,sys,tempfile,time
from pathlib import Path
import httpx
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'results/five-strategies'
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 url=f'http://127.0.0.1:{port}'
 report={'errors':[],'checks':[],'responses':[]};results={}
 def check(name,condition=True):
  assert condition,name
  report['checks'].append(name);print('PASS:',name,flush=True)
 with tempfile.TemporaryDirectory(dir=OUT) as store,(OUT/'server.log').open('w') as log:
  env={**os.environ,'FUEL_DATA_DIR':store,'FUEL_FRONTEND_DIR':str(ROOT/'frontend/dist'),'FUEL_HTTP_USER':'','FUEL_HTTP_PASSWORD':'','FUEL_PUBLIC_MODE':'0','FUEL_ALLOW_UNAUTHENTICATED_LOCAL':'1','FUEL_BIND_HOST':'127.0.0.1'}
  proc=subprocess.Popen([sys.executable,'-m','uvicorn','src.app.web:create_web_app','--factory','--host','127.0.0.1','--port',str(port),'--no-proxy-headers'],cwd=ROOT,env=env,stdout=log,stderr=log)
  try:
   for _ in range(100):
    try:
     if httpx.get(url+'/api/health').status_code==200:break
    except httpx.HTTPError:pass
    time.sleep(.1)
   with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1600,'height':1000});page.set_default_timeout(20000)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    def response(r):
     if '/api/calc' not in r.url:return
     report['responses'].append({'url':r.url,'status':r.status})
     if r.url.endswith('/api/calc') and r.status==200:
      result=r.json();results[(result['plan_id'],result['scenario_id'])]=result
    page.on('response',response)
    page.goto(url)
    expect(page.locator('.comparison-compact-table tbody tr')).to_have_count(5)
    page.wait_for_function("()=>document.querySelectorAll('.comparison-compact-table .is-fresh,.comparison-compact-table .is-error').length===10",timeout=60000)
    builtins=httpx.get(url+'/api/calc/strategies').json()
    check('All five built-in strategies finish both calculations',len(results)==10 and len(builtins)==5)
    colors=page.locator('.comparison-chart-legend i').evaluate_all('(items)=>items.map(e=>getComputedStyle(e).backgroundColor)')
    check('Five chart series have five distinct colors',len(colors)==5 and len(set(colors))==5)
    for strategy in builtins:
     for scenario in ['BASE','MANDATORY_STRESS']:
      label='STRESS' if scenario=='MANDATORY_STRESS' else 'BASE'
      result=results[(strategy['plan']['plan_id'],scenario)]
      failed=[item for item in result['constraint_checks'] if item['passed'] is False]
      page.get_by_role('button',name=f"Нарушения {strategy['name']}, {label}: {len(failed)}",exact=True).click()
      dialog=page.get_by_role('dialog')
      expect(dialog).to_be_visible()
      expect(dialog.locator('.comparison-checks-list li')).to_have_count(len(failed))
      text=dialog.inner_text()
      assert all(item['detail'] in text for item in failed),strategy['name']
      if not failed:expect(dialog).to_contain_text('не обнаружила нарушений')
      if strategy==builtins[0] and scenario=='BASE':page.screenshot(path=str(OUT/'constraint-reasons.png'))
      dialog.get_by_role('button',name='Закрыть',exact=True).click()
    check('All ten violation dialogs show the actual engine reasons, including zero violations')
    for name in ['Дефицит','Затраты','Запас']:
     page.locator('.comparison-metric-switch').get_by_role('button',name=name,exact=True).click()
     expect(page.locator('.comparison-chart-legend>span')).to_have_count(5)
    page.locator('.comparison-chart-controls').get_by_role('button',name='STRESS',exact=True).click()
    page.locator('.comparison-chart-controls').get_by_role('button',name='2035',exact=True).click()
    page.locator('.comparison-chart-controls').get_by_role('button',name='Весь период',exact=True).click()
    check('All five series remain available for each metric, scenario and period')
    first=builtins[0];failed=[c for c in results[(first['plan']['plan_id'],'MANDATORY_STRESS')]['constraint_checks'] if not c['passed']]
    page.get_by_role('button',name=f"Нарушения {first['name']}, STRESS: {len(failed)}",exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Открыть стратегию',exact=True).click()
    expect(page.locator('.daily-detail-switch').get_by_role('button',name='STRESS',exact=True)).to_have_attribute('aria-pressed','true')
    page.get_by_role('button',name='К сравнению 5',exact=True).click()
    expect(page.locator('.comparison-compact-table tbody tr')).to_have_count(5)
    check('Opening a violation preserves its scenario and returns to all five strategies')
    page.locator('.comparison-chart-controls').get_by_role('button',name='BASE',exact=True).click()
    for width,height in [(1600,1000),(1366,768),(1280,720)]:
     page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
     metrics=page.evaluate('''()=>({viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],items:[...document.querySelectorAll('.comparison-compact-table tbody tr,.comparison-chart-card,.comparison-chart-legend')].map(e=>({name:e.className,text:e.textContent.slice(0,110),x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))})''')
     report.setdefault('layouts',[]).append(metrics)
     check(f'Five rows and chart fit at {width}x{height}',metrics['document']==[width,height] and len(metrics['items'])==7 and all(item['x']>=0 and item['y']>=0 and item['y']+item['h']<=height+1 for item in metrics['items']))
     page.screenshot(path=str(OUT/f'comparison-{width}.png'))
    page.reload()
    expect(page.locator('.comparison-compact-table tbody tr')).to_have_count(5)
    expect(page.locator('.comparison-compact-table .is-fresh')).to_have_count(10,timeout=60000)
    check('Reload restores all five builtins and recalculates both scenarios')
    check('No JavaScript or calculation errors',not report['errors'] and all(item['status']==200 for item in report['responses']))
    browser.close()
  finally:
   proc.terminate();proc.wait(timeout=10);(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
