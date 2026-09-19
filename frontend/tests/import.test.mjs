import test from 'node:test';
import assert from 'node:assert/strict';
import {planImportKind,planImportName} from '../.test-build/lib/import.js';

test('supported upload extensions are classified without trusting MIME',()=>{
 assert.equal(planImportKind('PLAN.JSON'),'json');
 for(const name of ['plan.csv','plan.xlsx','plan.xls']) assert.equal(planImportKind(name),'table');
 assert.equal(planImportKind('plan.xls.exe'),null);
});

test('uploaded plan name removes only the supported final extension',()=>{
 assert.equal(planImportName('План.2035.XLSX'),'План.2035');
 assert.equal(planImportName('.csv'),'Импортированный план');
});
