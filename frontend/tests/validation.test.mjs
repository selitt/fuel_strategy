import test from 'node:test';
import assert from 'node:assert/strict';
import {draftIssues, issueTarget, readIssues} from '../.test-build/lib/validation.js';
const plan=()=>({plan_id:'p',scenario_id:'BASE',decisions:{inventory_policy:{initial_inventory_t:0},investments:[],capacity_reservations:[{source_id:'Earth-Core',year:2035,reserved_capacity_t:120}],supply_orders:[{source_id:'Earth-Core',year:2035,order_t:8,delivery_date:'2035-01-01',batch_id:'one'}]}});
test('invalid quantities identify exact editable fields without inventing upper bounds',()=>{
 const p=plan();p.decisions.supply_orders[0].order_t=-1;p.decisions.capacity_reservations[0].reserved_capacity_t=NaN;
 const issues=draftIssues(p);assert.equal(issues.length,2);
 assert.ok(issues.some(i=>i.loc.join('.')==='decisions.supply_orders.0.order_t'&&i.message.includes('не меньше нуля')));
 assert.ok(issues.some(i=>i.loc.join('.')==='decisions.capacity_reservations.0.reserved_capacity_t'));
 p.decisions.supply_orders[0].order_t=999999;p.decisions.capacity_reservations[0].reserved_capacity_t=120;
 assert.deepEqual(draftIssues(p),[]);
});
test('positive batches explain missing dates and duplicate IDs; zero orders stay allowed',()=>{
 const p=plan();p.decisions.supply_orders.push({...p.decisions.supply_orders[0],delivery_date:'2035-02-30'});
 const issues=draftIssues(p);assert.ok(issues.some(i=>i.loc.at(-1)==='delivery_date'));
 assert.equal(issues.filter(i=>i.loc.at(-1)==='batch_id').length,2);
 p.decisions.supply_orders=[{source_id:'Earth-Core',year:2035,order_t:0}];assert.deepEqual(draftIssues(p),[]);
});
test('annual engine issue resolves to its source and year without an invented batch index',()=>{
 const p=plan();const issue={code:'reservation_exceeded',message:'Увеличьте бронь',loc:['decisions','supply_orders'],source_id:'Earth-Core',year:2035,actual:100,limit:90};
 assert.deepEqual(issueTarget(issue,p),{source:'Earth-Core',year:2035,kind:'supply_orders',index:undefined,field:undefined,month:undefined});
 const target=issueTarget({code:'invalid',message:'Ошибка',loc:['decisions','supply_orders',0,'order_t']},p);
 assert.equal(target.month,1);assert.equal(target.index,0);
});
test('malformed issue envelopes do not crash field mapping',()=>{
 assert.deepEqual(readIssues([null,{message:'bad'}, {code:'x',message:'bad',loc:[{}]}]),[]);
 assert.equal(readIssues([{code:'x',message:'Исправьте',loc:['decisions'],actual:NaN}]).length,1);
});
test('investment errors resolve the compact source control from the actual plan row',()=>{
 const p=plan();p.decisions.investments=[{investment_id:'LUNAR_ISRU',year:2038}];
 const target=issueTarget({code:'investment_too_late',message:'Измените год',loc:['decisions','investments',0,'year']},p);
 assert.equal(target.source,'Lunar-ISRU');assert.equal(target.year,2038);assert.equal(target.field,'year');
});
