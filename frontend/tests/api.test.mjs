import test from 'node:test';
import assert from 'node:assert/strict';
import {api,ApiError,errorText} from '../.test-build/api/client.js';
import {comparisonCsv,comparabilityWarnings} from '../.test-build/lib/comparison.js';
const response=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json',...headers}});
test('busy calculation retains retry guidance without automatic retries',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return response({detail:'Расчётный сервис занят. Повторите позже.'},503,{'Retry-After':'5'});});
 await assert.rejects(api.simulate({}),e=>e instanceof ApiError&&e.status===503&&e.retryAfter===5&&errorText(e).includes('занят'));
 assert.equal(calls,1);
});
test('optimistic revision is sent for writes and calculation',async t=>{const calls=[];t.mock.method(globalThis,'fetch',async(url,init)=>{calls.push([url,init]);return response({});});await api.update('abc','Name',{x:1},9);await api.calculate('abc',10);assert.equal(calls[0][1].method,'PUT');assert.deepEqual(JSON.parse(calls[0][1].body),{name:'Name',plan:{x:1},expected_revision:9});assert.equal(JSON.parse(calls[1][1].body).expected_revision,10);});
test('API requests stay inside the current reverse-proxy prefix',async t=>{
 const previous=globalThis.document;
 globalThis.document={baseURI:'https://workspace.example/proxy/8080/'};
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 let requested='';
 t.mock.method(globalThis,'fetch',async url=>{requested=String(url);return response({});});
 await api.meta();
 assert.equal(requested,'/proxy/8080/api/meta');
});
test('standard FastAPI 409 uses revision guidance for project writes and calculation',async t=>{t.mock.method(globalThis,'fetch',async()=>response({detail:'Conflict without a machine code'},409));for(const action of [()=>api.update('abc','Name',{x:1},9),()=>api.calculate('abc',9),()=>api.remove('abc',9)])await assert.rejects(action,e=>e instanceof ApiError && e.status===409 && e.code==='HTTP_409' && e.requestId==='' && errorText(e).includes('другом окне'));});
test('result export 409 gives stale-result guidance instead of revision guidance',async t=>{t.mock.method(globalThis,'fetch',async()=>response({detail:'Conflict without a machine code'},409));await assert.rejects(api.exportResult('abc','json'),e=>e instanceof ApiError && errorText(e).includes('пересчёт') && !errorText(e).includes('другом окне'));});
test('FastAPI validation details remain readable',async t=>{t.mock.method(globalThis,'fetch',async()=>response({detail:[{type:'missing',loc:['body','decisions','supply_orders',0,'order_t'],msg:'Field required',input:{}}]},422));await assert.rejects(api.validate({}),e=>e instanceof ApiError && e.message==='decisions → supply_orders → 0 → order_t: Field required');});
test('empty 401, 413 and 503 responses keep actionable fallbacks',async t=>{let status=401;t.mock.method(globalThis,'fetch',async()=>response({},status));for(const [next,text] of [[401,'авторизация'],[413,'слишком большой'],[503,'Расчётный сервис недоступен']]){status=next;await assert.rejects(api.meta(),e=>e instanceof ApiError && e.status===next && e.message.includes(text));}});
test('HTML proxy failures are readable and do not leak markup',async t=>{t.mock.method(globalThis,'fetch',async()=>new Response('<h1>nginx error</h1>',{status:502}));await assert.rejects(api.meta(),e=>e.status===502 && e.message.includes('Backend') && !e.message.includes('<h1>'));});
test('successful non-JSON response is not accepted as a DTO',async t=>{t.mock.method(globalThis,'fetch',async()=>new Response('<html></html>'));await assert.rejects(api.meta(),/не JSON/);});
test('transport failure has actionable network message',async t=>{t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('fetch failed');});await assert.rejects(api.meta(),/Нет соединения/);});
test('request timeout keeps its dedicated guidance',async t=>{t.mock.method(globalThis,'setTimeout',callback=>{callback();return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});t.mock.method(globalThis,'fetch',async(_,init)=>{if(init.signal.aborted)throw new DOMException('aborted','AbortError');return response({});});await assert.rejects(api.meta(),/Сервер не ответил за 2 минуты/);});
test('project pagination continues through all pages',async t=>{let n=0;t.mock.method(globalThis,'fetch',async url=>{n++;if(n===1)return response({items:[{project_id:'a'}],total:2});assert.ok(url.endsWith('offset=1'));return response({items:[{project_id:'b'}],total:2});});assert.deepEqual((await api.list()).map(x=>x.project_id),['a','b']);});
test('built-in strategies use the read-only calculation catalog endpoint',async t=>{
 let requested='';const builtins=[{id:'base',name:'Базовая',description:'Готовая',plan:{plan_id:'base'}}];
 t.mock.method(globalThis,'fetch',async url=>{requested=String(url);return response(builtins);});
 assert.deepEqual(await api.strategies(),builtins);assert.equal(requested,'/api/calc/strategies');
});
test('multipart import leaves the boundary to fetch',async t=>{t.mock.method(globalThis,'fetch',async(_,init)=>{assert.ok(init.body instanceof FormData);assert.equal(init.headers,undefined);assert.equal(init.body.get('file').name,'plan.json');return response({});});await api.importPlan(new File(['{}'],'plan.json',{type:'application/json'}));});
test('plan template download uses the server format contract',async t=>{
 const previousDocument=globalThis.document,previousWindow=globalThis.window;
 const anchor={click(){this.clicked=true;},remove(){}};
 globalThis.document={baseURI:'http://localhost/',createElement:()=>anchor,body:{append(){}}};
 globalThis.window={setTimeout(){return 1;}};
 t.after(()=>{globalThis.document=previousDocument;globalThis.window=previousWindow;});
 t.mock.method(URL,'createObjectURL',()=> 'blob:test');t.mock.method(URL,'revokeObjectURL',()=>{});
 let requested='';t.mock.method(globalThis,'fetch',async url=>{requested=String(url);return new Response('template',{headers:{'Content-Disposition':'attachment; filename="plan-template.xlsx"'}});});
 await api.downloadPlanTemplate('xlsx');
 assert.equal(requested,'/api/plans/import/template?format=xlsx');assert.equal(anchor.download,'plan-template.xlsx');assert.equal(anchor.clicked,true);
});
const item=(id)=>({project_id:id,name:'Name '+id,run:{origin:'calculated',input_revision:3,input_hash:'sha',engine:{engine_id:'engine',version:'v1'},result:{plan_id:id,scenario_id:'BASE',units:{fuel:'t',currency:'mln_units'},assumptions_reference:'rules',total_cost_mln:10,yearly_balance:[{year:2035,demand_total_t:100,shortage_t:2,service_level_total:0.98}],financial_breakdown:[{year:2035,total:10}]}}});
test('comparison CSV uses exact API numbers and includes provenance',()=>{const c={items:[item('a'),item('b')]};const csv=comparisonCsv(c);assert.ok(csv.startsWith('\uFEFFproject_id'));assert.ok(csv.includes('input_revision,input_hash,engine_id,engine_version,origin,units'));assert.ok(csv.includes('0.98'));assert.ok(csv.includes('2035,100'));assert.ok(csv.includes('mln_units'));});
test('comparison flags heterogeneous units, horizons, engines and imports',()=>{const a=item('a'),b=item('b');b.run.origin='imported';b.run.engine.version='v2';b.run.result.units.fuel='kg';b.run.result.yearly_balance[0].year=2041;b.run.result.assumptions_reference='other';const warnings=comparabilityWarnings({items:[a,b]});assert.equal(warnings.length,5);assert.deepEqual(comparabilityWarnings({items:[a,item('c')]}),[]);});
test('structured calculation errors retain field metadata and readable detail',async t=>{
 const issues=[{code:'reservation_exceeded',message:'Увеличьте бронь или уменьшите поставки',loc:['decisions','supply_orders'],source_id:'Earth-Core',year:2035,actual:100,limit:90}];
 t.mock.method(globalThis,'fetch',async()=>response({detail:'Заказ превышает бронь',issues},422));
 await assert.rejects(api.simulate({}),e=>e instanceof ApiError&&e.message.includes('бронь')&&assert.deepEqual(e.issues,issues)===undefined);
});
