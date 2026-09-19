import test from 'node:test';
import assert from 'node:assert/strict';
import { numericDelta, equivalentChartSeries, comparisonEditorContext, updateEditorUi } from '../.test-build/lib/comparisonView.js';

test('display differences preserve missing values instead of inventing zero',()=>{
 assert.equal(numericDelta(120,100),20);assert.equal(numericDelta(0,10),-10);
 assert.equal(numericDelta(undefined,10),undefined);assert.equal(numericDelta(10,NaN),undefined);
});
const result=(offset=0)=>({
 financial_breakdown:Array.from({length:6},(_,i)=>({year:2035+i,total:100+i+offset})),
 inventory_trace:Array.from({length:2190},(_,i)=>({year:2035+Math.floor(i/365),day_of_year:i%365+1,closing_inventory_t:i%11+offset,shortage_t:i%7})),
});
test('coincident lines require matching complete values for exactly the selected metric and period',()=>{
 const a=result(),b=result();
 assert.equal(equivalentChartSeries([a,b],'inventory','all',2035),true);
 assert.equal(equivalentChartSeries([a,result(2)],'inventory','all',2035),false);
 assert.equal(equivalentChartSeries([a,result(2)],'shortage','all',2035),true);
 b.inventory_trace[2189].closing_inventory_t=999;
 assert.equal(equivalentChartSeries([a,b],'inventory','year',2035),true);
 assert.equal(equivalentChartSeries([a,b],'inventory','all',2035),false);
 assert.equal(equivalentChartSeries([a,b],'cost','all',2035),true);
});
test('empty, missing and duplicate coordinates must never claim that results coincide',()=>{
 const a=result(),b=result();b.inventory_trace.pop();
 assert.equal(equivalentChartSeries([a,b],'inventory','all',2035),false);
 assert.equal(equivalentChartSeries([{},{}],'cost','all',2035),false);
 assert.equal(equivalentChartSeries([a],'inventory','all',2035),false);
 const c=result();c.financial_breakdown[5]={year:2039,total:104};
 assert.equal(equivalentChartSeries([a,c],'cost','all',2035),false);
});
test('comparison opens the same year and chart in editor without changing strategy decisions',()=>{
 const context=comparisonEditorContext({year:2038,scenario:'MANDATORY_STRESS',metric:'cost',range:'year'}, {resultDay:35,custom:'preserved'});
 assert.equal(context.supplyYear,2038);assert.equal(context.resultDay,1130);assert.equal(context.resultChart,'cost');assert.equal(context.custom,'preserved');
 assert.equal(context.resultSide,'other');
});
test('supply year and result timeline stay synchronized in either direction',()=>{
 const bySupply=updateEditorUi({resultDay:35,resultChart:'cost'},'supplyYear',2038);
 assert.equal(bySupply.resultDay,1130);assert.equal(bySupply.resultChart,'cost');
 const byDay=updateEditorUi(bySupply,'resultDay',1462);
 assert.equal(byDay.supplyYear,2039);assert.equal(byDay.resultDay,1462);
});
