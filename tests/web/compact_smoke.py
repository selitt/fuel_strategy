"""Compact UI integration tests. Native navigation is the default.

--inline is a documented environment fallback: real React, browser events and
real HTTP FastAPI, with a Python fetch relay (not a native-network deployment test).
Temporary project storage is deleted on exit; no user projects are touched.
"""
from __future__ import annotations
import argparse,base64,csv,io,json,os,re,shutil,socket,subprocess,sys,tempfile,time,zipfile
from pathlib import Path
import httpx
from playwright.sync_api import sync_playwright,expect
from browser_support import CAPTURE,RELAY
ROOT=Path(__file__).resolve().parents[2]

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--inline',action='store_true')
 parser.add_argument('--site',type=Path,default=ROOT/'frontend/prebuilt')
 parser.add_argument('--chromium',default=shutil.which('chromium'))
 parser.add_argument('--artifacts',type=Path,default=ROOT/'results/compact-ui')
 args=parser.parse_args();out=args.artifacts.resolve();out.mkdir(parents=True,exist_ok=True);site=args.site.resolve()
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 url=f'http://127.0.0.1:{port}';report={'mode':'react-real-http-relay' if args.inline else 'native-navigation','checks':[],'http':[],'errors':[]}
 def check(name,condition=True):
  if not condition:raise AssertionError(name)
  print('PASS:',name,flush=True);report['checks'].append(name)
 with tempfile.TemporaryDirectory(prefix='fuel-compact-') as temp,(out/'server.log').open('w') as log:
  env={**os.environ,'FUEL_DATA_DIR':temp,'FUEL_FRONTEND_DIR':str(site),'FUEL_HTTP_USER':'','FUEL_HTTP_PASSWORD':''}
  cmd=[sys.executable,'-m','uvicorn','src.app.web:create_web_app','--factory','--host','127.0.0.1','--port',str(port),'--workers','1']
  proc=subprocess.Popen(cmd,cwd=ROOT,env=env,stdout=log,stderr=log)
  def req(method,path,**kw):return httpx.request(method,url+path,timeout=30,**kw)
  def projects():return req('GET','/api/projects').json()['items']
  def project(pid):return req('GET','/api/projects/'+pid).json()
  try:
   for _ in range(100):
    try:
     if req('GET','/api/health').status_code==200:break
    except httpx.HTTPError:pass
    time.sleep(.1)
   with sync_playwright() as p:
    b=p.chromium.launch(headless=True,**({'executable_path':args.chromium} if args.chromium else {}));page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);page.set_default_timeout(10000)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    def relay(payload):
     if not payload['url'].startswith('/api/'):raise ValueError('Relay accepts only local API requests')
     kw={'headers':payload.get('headers') or {}}
     if payload.get('files'):kw['files']=[(f['key'],(f['name'],base64.b64decode(f['base64']),f['type'])) for f in payload['files']]
     elif payload.get('body') is not None:kw['content']=payload['body']
     r=req(payload['method'],payload['url'],**kw);report['http'].append({'method':payload['method'],'path':payload['url'],'status':r.status_code})
     return {'status':r.status_code,'headers':dict(r.headers),'body':base64.b64encode(r.content).decode()}
    if args.inline:page.expose_function('__testTransport',relay)
    def mount():
     if args.inline:
      page.set_content('<!doctype html><html lang="ru"><head><title>Контур 2035</title><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div></body></html>')
      page.add_style_tag(content=next((site/'assets').glob('*.css')).read_text())
      page.add_script_tag(content=CAPTURE+RELAY)
      page.add_script_tag(content=next((site/'assets').glob('*.js')).read_text())
     else:
      page.add_init_script(CAPTURE);page.goto(url,wait_until='networkidle')
     page.get_by_role('heading',name='Матрица снабжения',exact=True).wait_for()
    def idle():expect(page.locator('.calculate-button')).to_be_enabled()
    def calc():page.locator('.calculate-button').click();idle()
    def menu(name):
     page.locator('summary[aria-label="Действия с планом"]').click();page.locator('.menu-panel').get_by_role('button',name=re.compile('^'+re.escape(name))).click()
    def close():page.get_by_role('dialog').last.get_by_label('Закрыть окно',exact=True).click()
    def download(name):
     n=page.evaluate('window.__downloads.length');page.get_by_role('dialog').get_by_role('button',name=re.compile('^'+re.escape(name))).click();page.wait_for_function('(n)=>window.__downloads.length>n',arg=n);f=page.evaluate('window.__downloads.at(-1)');return f['name'],base64.b64decode(f['base64'])
    def snap(name):
     page.wait_for_timeout(350);page.screenshot(path=str(out/name),full_page=True)
    def no_doc_scroll(width,height):
     page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
     box=page.evaluate('({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})')
     check(f'Desktop {width}x{height}: no document scroll',box['sw']<=width+1 and box['sh']<=height+1)
     for selector in ['.matrix-viewport','.result-panel','.infrastructure']:
      sizes=page.locator(selector).evaluate('(e)=>({scroll:e.scrollHeight,client:e.clientHeight,children:[...e.children].map(c=>({name:c.className,height:c.getBoundingClientRect().height}))})')
      if sizes['scroll']>sizes['client']+1:
       print('OVERFLOW:',selector,sizes,flush=True);snap('overflow.png')
      check(f'{width}x{height}: {selector} contents fit vertically',sizes['scroll']<=sizes['client']+1)
     for name in ['.infrastructure','.supply-panel','.result-panel']:
      c=page.locator(name).bounding_box();check(f'{width}x{height}: {name} stays in viewport',c is not None and c['y']>=0 and c['y']+c['height']<=height+1)
    mount()
    check('Matrix is the initial page; no automatic project writes',len(projects())==0)
    check('Five sources and six years; no sidebar navigation',page.locator('.supply-matrix tbody tr').count()==5 and page.locator('.supply-matrix thead th').count()==7 and page.get_by_role('navigation').count()==0)
    check('No fabricated results before calculation',page.locator('[data-testid="service-total"]').count()==0)
    no_doc_scroll(1440,900);no_doc_scroll(1366,768);no_doc_scroll(1280,720);page.set_viewport_size({'width':1440,'height':900})
    snap('initial.png')
    page.get_by_label('Название плана',exact=True).fill('Базовый план снабжения')
    order=page.get_by_label('Заказ Earth-Core 2035',exact=True);order.fill('-1');calc()
    expect(page.locator('.error-banner')).to_be_visible();check('Negative quantity blocks save and calculation',len(projects())==0)
    order.fill('108');page.get_by_label('Бронь Earth-Core 2035',exact=True).fill('125')
    order.focus();page.get_by_label('Заказ: ползунок',exact=True).focus();page.keyboard.press('ArrowRight');expect(order).to_have_value('109')
    check('Selected-cell slider edits the actual order')
    page.get_by_label('Увеличить: Заказ выбранной ячейки',exact=True).click();expect(order).to_have_value('110')
    check('Stepper edits the selected cell; reservations stay independent',page.get_by_label('Бронь Earth-Core 2035',exact=True).input_value()=='125')
    expect(page.get_by_label('Заказ Earth-New 2039',exact=True)).to_be_disabled()
    page.get_by_role('switch',name='Включить EARTH_NEW').click();page.get_by_label('Заказ Earth-New 2039',exact=True).fill('10');page.get_by_role('switch',name='Включить EARTH_NEW').click()
    expect(page.get_by_label('Заказ Earth-New 2039',exact=True)).to_have_value('10');expect(page.get_by_label('Заказ Earth-New 2039',exact=True)).to_be_enabled()
    check('Disabling investment preserves existing orders for explicit correction')
    page.get_by_role('switch',name='Включить EARTH_NEW').click()
    page.locator('.source-label').filter(has_text='Earth-Core').click();expect(page.get_by_role('dialog')).to_contain_text('6.2');close();check('Source facts come from API catalog, not screenshot sample prices')
    calc();expect(page.locator('[data-testid="service-total"]')).to_be_visible();base=projects()[0]['project_id'];saved=project(base);r=saved['last_run']['result']
    check('Save and calculate uses real revisioned API',saved['result_state']=='current' and saved['revision']==2)
    check('Edited order and reservation reach backend unchanged',saved['plan']['decisions']['supply_orders'][0]['order_t']==110 and saved['plan']['decisions']['capacity_reservations'][0]['reserved_capacity_t']==125)
    expected=page.evaluate('(n)=>new Intl.NumberFormat("ru-RU",{style:"percent",maximumFractionDigits:1}).format(n)',r['yearly_balance'][0]['service_level_total'])
    expect(page.locator('[data-testid="service-total"]')).to_have_text(expected);check('Visible service metric equals model result')
    page.get_by_label('Следующий год',exact=True).click();expect(page.locator('.year-nav strong')).to_have_text('2036');check('Year arrow changes all selected-year metrics')
    page.get_by_label('Предыдущий год',exact=True).click()
    menu('Скачать…');name,raw=download('Результат JSON');export=json.loads(raw);check('JSON download matches actual result',all(export[k]==r[k] for k in r))
    name,raw=download('Результат CSV')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:check('CSV archive contains identical JSON result',any(json.loads(z.read(n))==export for n in z.namelist() if n.endswith('.json')))
    close();page.wait_for_timeout(4700)
    no_doc_scroll(1440,900);snap('workspace.png')
    no_doc_scroll(1366,768);snap('laptop.png')
    no_doc_scroll(1280,720);page.set_viewport_size({'width':1440,'height':900})
    page.get_by_role('button',name='Затраты',exact=True).click();expect(page.get_by_role('img',name='Структура расходов по годам, млн у.е.')).to_be_visible();snap('costs.png');check('Financial chart renders actual breakdown')
    page.get_by_role('button',name='Запас',exact=True).click();check('Inventory chart retains zero values and reserve target',page.get_by_role('img',name='т: На начало, На конец, Резерв').count()==1)
    page.get_by_role('button',name='Поток',exact=True).click()
    page.get_by_role('button',name='Оба',exact=True).click();calc();expect(page.get_by_role('heading',name='Сравнение сценариев',exact=True)).to_be_visible();check('Both scenarios calculate without auto-creating extra projects',len(projects())==1)
    menu('Скачать…');name,raw=download('Сравнение JSON');pair=json.loads(raw);reference=req('POST','/api/calc',json=pair['other_plan']).json();check('Scenario comparison is a second real API result',reference==pair['other_result'] and pair['other_plan']['scenario_id']=='MANDATORY_STRESS')
    _,pair_csv=download('Сравнение CSV');csv_rows=list(csv.DictReader(io.StringIO(pair_csv.decode('utf-8-sig'))))
    check('Both-scenario CSV contains actual inputs, values and stateless provenance', len(csv_rows)==12 and {r['scenario_id'] for r in csv_rows}=={'BASE','MANDATORY_STRESS'} and csv_rows[6]['origin']=='stateless-api-calc' and json.loads(csv_rows[6]['plan_snapshot_json'])==pair['other_plan'] and float(csv_rows[6]['delivered_t'])==reference['yearly_balance'][0]['delivered_t']);close()
    page.wait_for_timeout(4700);snap('comparison.png')
    order.fill('111');expect(page.get_by_role('heading',name='План изменён')).to_be_visible();check('Editing inputs hides stale charts and paired comparison')
    menu('Скачать…');expect(page.get_by_role('dialog').get_by_role('button',name=re.compile('^Результат JSON'))).to_be_disabled();close();check('Stale exports are disabled')
    current=project(base);resp=req('PUT','/api/projects/'+base,json={'name':current['name'],'plan':current['plan'],'expected_revision':current['revision']});assert resp.status_code==200
    page.keyboard.press('Control+s');idle();expect(page.locator('.error-banner')).to_contain_text('другом окне');check('409 revision conflict is shown; remote plan not overwritten',project(base)['plan']['decisions']['supply_orders'][0]['order_t']==110)
    page.get_by_role('button',name='Открыть версию с сервера',exact=True).click();page.get_by_role('button',name='Не сохранять',exact=True).click();idle();expect(order).to_have_value('110');check('Discard guard reloads current server plan')
    page.get_by_role('button',name='BASE',exact=True).click();calc()
    menu('Создать копию');page.get_by_label('Название копии',exact=True).fill('Проверка стресса');page.get_by_label('Сценарий копии').select_option('MANDATORY_STRESS');page.get_by_role('dialog').get_by_role('button',name='Создать копию',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);idle();calc();check('Copy retains independent scenario and model decisions',len(projects())==2)
    menu('Сравнить сохранённые планы');dialog=page.get_by_role('dialog');dialog.locator('.project-option input').nth(0).check();dialog.locator('.project-option input').nth(1).check();dialog.get_by_role('button',name='Сравнить',exact=True).click();expect(dialog.locator('.comparison-result')).to_be_visible();check('Saved-project comparison remains available');close()
    page.get_by_label('Открыть сохранённый план',exact=True).click();page.get_by_role('dialog').get_by_role('button',name=re.compile('^Базовый план снабжения')).click();idle()
    # Import collision and alias fixture, keeping all source-specific extensions.
    fixture=json.loads(json.dumps(saved['plan']));fixture['plan_id']='alias-test';fixture['evidence']={'owner':'math-team'};fixture['decisions']['supply_orders'][0]['source_id']='A';fixture['decisions']['supply_orders'][0]['shipment']='first';fixture['decisions']['supply_orders'].append({'year':2035,'source_id':'Earth-Core','order_t':4,'shipment':'second'})
    fixture['decisions']['supply_orders'].append({'year':2047,'source_id':'Research-X','order_t':6,'note':'future'})
    page.get_by_label('Файл плана или проекта',exact=True).set_input_files({'name':'extended.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()});idle();expect(page.locator('.collision-button')).to_be_visible();check('Imported colliding aliases are not silently merged')
    menu('Скачать…');_,raw=download('План JSON');imported=json.loads(raw);check('Round-trip preserves aliases, duplicate records, future source and extension fields',imported==fixture);close()
    page.locator('.collision-button').click();dialog=page.get_by_role('dialog');dialog.get_by_label('Объём, строка 1',exact=True).fill('112');close();menu('Скачать…');_,raw=download('План JSON');edited=json.loads(raw);check('Advanced record editing preserves the other collision',edited['decisions']['supply_orders'][0]['order_t']==112 and edited['decisions']['supply_orders'][-2]['order_t']==4 and edited['decisions']['supply_orders'][0]['shipment']=='first');close()
    page.get_by_label('Открыть сохранённый план',exact=True).click();page.get_by_role('dialog').get_by_role('button',name=re.compile('^Базовый план снабжения')).click();page.get_by_role('button',name='Не сохранять',exact=True).click();idle()
    page.set_viewport_size({'width':390,'height':844});snap('mobile-plan.png');check('Mobile document has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.locator('.mobile-switch').get_by_role('button',name='Результат',exact=True).click();expect(page.locator('[data-testid="service-total"]')).to_be_visible();snap('mobile-results.png');check('Mobile switches plan/result without duplicating data')
    page.emulate_media(reduced_motion='reduce');check('Reduced motion disables transitions',page.locator('.button.primary').evaluate('(el)=>getComputedStyle(el).transitionDuration')=='0s')
    check('No uncaught browser runtime errors',not report['errors']);b.close()
  except Exception as exc:
   report['failure']=str(exc)
   try:page.screenshot(path=str(out/'failure.png'),full_page=True)
   except Exception:pass
   raise
  finally:
   proc.terminate();proc.wait(timeout=10);(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(f"{len(report['checks'])} checks passed ({report['mode']})")
if __name__=='__main__':main()
