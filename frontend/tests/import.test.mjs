import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPlanImport,planImportKind,planImportName} from '../.test-build/lib/import.js';

const candidate=(name,contents)=>({name,size:new TextEncoder().encode(contents).byteLength,text:async()=>contents});

test('supported upload extensions are classified without trusting MIME',()=>{
 assert.equal(planImportKind('PLAN.JSON'),'json');
 for(const name of ['plan.csv','plan.xlsx','plan.xls']) assert.equal(planImportKind(name),'table');
 assert.equal(planImportKind('plan.xls.exe'),null);
});

test('uploaded plan name removes only the supported final extension',()=>{
 assert.equal(planImportName('План.2035.XLSX'),'План.2035');
 assert.equal(planImportName('.csv'),'Импортированный план');
});

test('selected import is classified before it can replace the current draft',async()=>{
 assert.deepEqual(await inspectPlanImport(candidate('project.json',JSON.stringify({schema_version:'1',project_id:'p1'})),1000),{kind:'project',format:'JSON'});
 assert.deepEqual(await inspectPlanImport(candidate('plan.json',JSON.stringify({plan_id:'p1'})),1000),{kind:'plan-json',format:'JSON'});
 assert.deepEqual(await inspectPlanImport(candidate('plan.xlsx','binary'),1000),{kind:'table',format:'XLSX'});
});

test('invalid import selection fails before confirmation',async()=>{
 await assert.rejects(()=>inspectPlanImport(candidate('plan.txt','x'),1000),/Выберите план JSON, CSV, XLSX или XLS/);
 await assert.rejects(()=>inspectPlanImport(candidate('plan.json','{'),1000),/Не удалось прочитать JSON/);
 await assert.rejects(()=>inspectPlanImport(candidate('plan.csv','too large'),2),/Файл превышает допустимый размер 2 байт/);
});
