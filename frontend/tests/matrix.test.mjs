import test from 'node:test';
import assert from 'node:assert/strict';
const m = await import('../.test-build/lib/matrix.js').catch(() => ({}));
const catalog = {tables:[{table_id:'supply_sources',rows:[{source_id:'A',name:'Earth-Core',capacity_t_per_year:'190'},{source_id:'D',name:'Lunar-ISRU',capacity_t_per_year:'120',available_from_year:'2038'}]}]};
const plan = () => ({plan_id:'p',scenario_id:'BASE',extra:{keep:1},decisions:{extra:'keep',supply_orders:[{year:2035,source_id:'A',order_t:100,shipment:'first'}],capacity_reservations:[{year:2035,source_id:'A',reserved_capacity_t:120,contract:'annual'}],investments:[],inventory_policy:{initial_inventory_t:12.33}}});
test('matrix helpers exist',()=>assert.equal(typeof m.matrixSources,'function'));
test('short aliases share a visual source, but original IDs stay untouched',()=>{const p=plan();const rows=m.matrixSources(p,catalog);assert.deepEqual(rows.map(r=>r.key),['Earth-Core','Lunar-ISRU']);const b=m.readCell(p,'supply_orders',rows[0],2035);assert.deepEqual(b.indices,[0]);assert.equal(b.value,100);const next=m.writeCell(p,'supply_orders',rows[0],2035,110);assert.equal(next.decisions.supply_orders[0].source_id,'A');assert.equal(next.decisions.supply_orders[0].shipment,'first');assert.equal(p.decisions.supply_orders[0].order_t,100);assert.deepEqual(next.extra,p.extra);});
test('new cells add only the selected decision and use existing source alias',()=>{const p=plan(),s=m.matrixSources(p,catalog)[0];const next=m.writeCell(p,'supply_orders',s,2036,80);assert.equal(next.decisions.supply_orders[1].source_id,'A');assert.equal(next.decisions.supply_orders[1].year,2036);assert.deepEqual(next.decisions.capacity_reservations,p.decisions.capacity_reservations);});
test('colliding records never silently collapse or get totalled',()=>{const p=plan();p.decisions.supply_orders.push({year:2035,source_id:'Earth-Core',order_t:10,shipment:'second'});const s=m.matrixSources(p,catalog)[0];assert.equal(m.readCell(p,'supply_orders',s,2035).value,null);assert.equal(m.readCell(p,'supply_orders',s,2035).indices.length,2);assert.throws(()=>m.writeCell(p,'supply_orders',s,2035,111),/несколько/);assert.equal(p.decisions.supply_orders.length,2);});
test('missing cell is distinguishable from explicit zero',()=>{const p=plan(),s=m.matrixSources(p,catalog)[0];assert.equal(m.readCell(p,'supply_orders',s,2040).value,null);assert.equal(m.readCell(p,'supply_orders',s,2040).indices.length,0);const q=m.writeCell(p,'supply_orders',s,2040,0);assert.equal(m.readCell(q,'supply_orders',s,2040).value,0);});
test('unknown sources and future years remain accessible',()=>{const p=plan();p.decisions.supply_orders.push({source_id:'Research-X',year:2047,order_t:4});assert.equal(m.matrixSources(p,catalog).at(-1).key,'Research-X');assert.ok(m.matrixYears(p,catalog).includes(2047));});
test('invalid input is preserved for validation, never clamped into a valid plan',()=>{const p=plan(),s=m.matrixSources(p,catalog)[0];assert.equal(m.writeCell(p,'supply_orders',s,2035,-10).decisions.supply_orders[0].order_t,-10);assert.ok(Number.isNaN(m.writeCell(p,'supply_orders',s,2035,NaN).decisions.supply_orders[0].order_t));});
test('investment editing preserves additional fields and unrelated investments',()=>{const p=plan();p.decisions.investments=[{investment_id:'ZBO',year:2036,funding:'keep'},{investment_id:'Research',year:2042}];const q=m.setInvestment(p,'ZBO',2037);assert.deepEqual(q.decisions.investments,[{investment_id:'ZBO',year:2037,funding:'keep'},{investment_id:'Research',year:2042}]);assert.equal(m.setInvestment(p,'ZBO',null).decisions.investments.length,1);});
test('duplicate investments require per-record editing',()=>{const p=plan();p.decisions.investments=[{investment_id:'ZBO',year:2036},{investment_id:'ZBO',year:2037}];assert.throws(()=>m.setInvestment(p,'ZBO',2038),/несколько/);});
test('disabling an investment never removes or zeroes supply decisions',()=>{const p=plan();p.decisions.investments=[{investment_id:'ZBO',year:2036}];const q=m.setInvestment(p,'ZBO',null);assert.deepEqual(q.decisions.supply_orders,p.decisions.supply_orders);assert.deepEqual(q.decisions.capacity_reservations,p.decisions.capacity_reservations);});
test('comparison changes only scenario and preserves full plan data',()=>{const p=plan();const q=m.otherScenario(p);assert.equal(q.scenario_id,'MANDATORY_STRESS');assert.deepEqual(q.decisions,p.decisions);assert.deepEqual(q.extra,p.extra);assert.equal(p.scenario_id,'BASE');assert.equal(m.otherScenario(q).scenario_id,'BASE');});

test('a monthly supply cell totals only dated batches from that model month',()=>{
 const p=plan();
 p.decisions.supply_orders=[
  {year:2036,source_id:'A',order_t:12,delivery_date:'2036-02-01',batch_id:'b1'},
  {year:2036,source_id:'Earth-Core',order_t:23,delivery_date:'2036-02-28',batch_id:'b2',note:'keep'},
  {year:2036,source_id:'A',order_t:7,delivery_date:'2036-03-01',batch_id:'b3'},
  {year:2036,source_id:'A',order_t:100,shipment:'legacy'},
 ];
 const source=m.matrixSources(p,catalog)[0];
 assert.deepEqual(m.readSupplyMonth(p,source,2036,2),{indices:[0,1],total:35});
 assert.deepEqual(m.readSupplyMonth(p,source,2036,3),{indices:[2],total:7});
});

test('legacy and invalid annual orders stay separate until an exact model date is assigned',()=>{
 const p=plan();
 p.decisions.supply_orders=[
  {year:2036,source_id:'A',order_t:10,shipment:'legacy'},
  {year:2036,source_id:'A',order_t:20,delivery_date:'2036-02-29',batch_id:'bad-leap'},
  {year:2036,source_id:'A',order_t:30,delivery_date:'2037-01-03',batch_id:'wrong-year'},
 ];
 const source=m.matrixSources(p,catalog)[0];
 assert.deepEqual(m.unscheduledSupplyIndices(p,source,2036),[0,1,2]);
 assert.equal(m.supplyDateIssue('',2036),'Укажите дату поставки.');
 assert.match(m.supplyDateIssue('2036-02-29',2036),/365/);
 assert.match(m.supplyDateIssue('2037-01-03',2036),/2036/);
 assert.equal(m.supplyDateIssue('2036-02-28',2036),'');
});

test('editing a batch preserves extensions and keeps year equal to its delivery date',()=>{
 const p=plan();
 p.decisions.supply_orders=[{year:2035,source_id:'A',order_t:11,delivery_date:'2035-01-02',batch_id:'b1',note:'keep'}];
 const next=m.updateSupplyBatch(p,0,{delivery_date:'2036-12-31',order_t:18});
 assert.deepEqual(next.decisions.supply_orders[0],{year:2036,source_id:'A',order_t:18,delivery_date:'2036-12-31',batch_id:'b1',note:'keep'});
 assert.equal(p.decisions.supply_orders[0].year,2035);
});

test('adding and removing a dated batch changes only that supply row',()=>{
 const p=plan();
 const source=m.matrixSources(p,catalog)[0];
 const added=m.addSupplyBatch(p,source,'2036-04-15',9,'batch-new');
 assert.deepEqual(added.decisions.supply_orders[1],{year:2036,source_id:'A',order_t:9,delivery_date:'2036-04-15',batch_id:'batch-new'});
 assert.deepEqual(added.decisions.capacity_reservations,p.decisions.capacity_reservations);
 assert.deepEqual(m.removeSupplyBatch(added,1).decisions.supply_orders,p.decisions.supply_orders);
});

test('new batch IDs are stable and do not collide with imported IDs',()=>{
 const p=plan();
 p.decisions.supply_orders.push({year:2036,source_id:'A',order_t:2,delivery_date:'2036-04-15',batch_id:'batch-20360415-1'});
 assert.equal(m.nextSupplyBatchId(p,'2036-04-15'),'batch-20360415-2');
});

test('explicit edits update known legacy aliases instead of leaving conflicting hidden values',()=>{
 const p=plan();p.decisions.supply_orders=[{year:2035,source_id:'A',order_t:10,order_volume_t:10,keep:'yes'}];
 const q=m.updateSupplyBatch(p,0,{order_t:15});
 assert.equal(q.decisions.supply_orders[0].order_volume_t,15);
 assert.equal(q.decisions.supply_orders[0].keep,'yes');
 p.decisions.investments=[{investment_id:'ZBO',year:2036,commissioning_year:2036}];
 assert.equal(m.setInvestment(p,'ZBO',2037).decisions.investments[0].commissioning_year,2037);
});
