import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import { Button, Modal, Notice } from '../components/Ui';
import { Icon } from '../components/Icon';
import { downloadBlob, jsonDownload } from '../lib/format';
import { inspectPlanImport } from '../lib/import';
import type { PlanImportInspection } from '../lib/import';
import { scenarioPairCsv } from '../lib/pair';
import type { Workspace } from '../state/useWorkspace';

const ACCEPT='.json,.csv,.xlsx,.xls,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

function fileSize(value:number){
 if(value>=1024*1024)return `${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value/1024/1024)} МБ`;
 if(value>=1024)return `${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value/1024)} КБ`;
 return `${value} байт`;
}

const importDescriptions:Record<PlanImportInspection['kind'],string>={
 project:'Полный проект будет импортирован отдельной копией.',
 'plan-json':'JSON-план станет несохранённым редактируемым черновиком.',
 table:'Табличный план станет несохранённым черновиком; API проверит и нормализует поля.',
};

export function ImportPlanDialog({w,onClose,onConfirm}:{w:Workspace;onClose:()=>void;onConfirm:(files:File[])=>void}){
 const input=useRef<HTMLInputElement>(null);
 const [dragging,setDragging]=useState(false);
 const [selected,setSelected]=useState<{file:File;inspection?:PlanImportInspection;error?:string}[]>([]);
 const inspectionVersion=useRef(0);
 const [inspecting,setInspecting]=useState(false);
 const maxBytes=w.meta?.max_upload_bytes||2097152;
 const select=async(files:File[])=>{
  if(!files.length)return;
  const version=++inspectionVersion.current;
  setSelected([]);setInspecting(true);
  const entries=await Promise.all(files.map(async file=>{
   try{return {file,inspection:await inspectPlanImport(file,maxBytes)};}
   catch(reason){return {file,error:reason instanceof Error?reason.message:'Не удалось проверить файл.'};}
  }));
  if(version!==inspectionVersion.current)return;
  setSelected(entries);setInspecting(false);
 };
 const open=()=>input.current?.click();
 const keyboard=(event:KeyboardEvent<HTMLDivElement>)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}};
 const drop=(event:DragEvent<HTMLDivElement>)=>{event.preventDefault();setDragging(false);void select(Array.from(event.dataTransfer.files));};
 return <Modal title="Импорт плана" onClose={onClose}>
  <p className="help">Выберите один или несколько файлов. Каждый откроется отдельной стратегией; текущие правки сохранятся во вкладках. JSON может содержать план или полный проект.</p>
  <div className={`import-dropzone ${dragging?'dragging':''}`} role="button" tabIndex={0} data-testid="import-dropzone" aria-label="Выбрать или перетащить файл плана" onClick={open} onKeyDown={keyboard} onDragEnter={event=>{event.preventDefault();setDragging(true);}} onDragOver={event=>event.preventDefault()} onDragLeave={()=>setDragging(false)} onDrop={drop}>
   <Icon name="upload" size={24}/><strong>{inspecting?'Проверяем файлы…':'Перетащите файлы сюда'}</strong><span>или нажмите, чтобы выбрать</span><small>JSON, CSV, XLSX, XLS · до {fileSize(maxBytes)} на файл</small>
  </div>
  <input ref={input} className="sr-only" type="file" multiple accept={ACCEPT} aria-label="Файл плана или проекта" onChange={event=>{const files=Array.from(event.currentTarget.files||[]);event.currentTarget.value='';void select(files);}}/>
  {!!w.error&&w.errorMessage&&<Notice tone="error">{w.errorMessage}</Notice>}
  {selected.map((item,index)=><div key={index} className="import-selection" role="status"><Icon name={item.error?'alert':'plan'}/><div><strong>{item.file.name}</strong><span>{item.inspection?.format} · {fileSize(item.file.size)}</span><small>{item.error||(item.inspection&&importDescriptions[item.inspection.kind])}</small></div></div>)}
  <div className="transfer-templates"><span>Нужен шаблон?</span><button type="button" className="text-button" disabled={!!w.busy} onClick={()=>void w.downloadTemplate('csv')}>Скачать CSV</button><button type="button" className="text-button" disabled={!!w.busy} onClick={()=>void w.downloadTemplate('xlsx')}>Скачать XLSX</button></div>
  <div className="modal-actions"><Button onClick={onClose}>Отмена</Button><Button kind="primary" disabled={!selected.some(item=>item.inspection)||inspecting||!!w.busy||w.riskBusy} onClick={()=>onConfirm(selected.map(item=>item.file))}>Импортировать{selected.length>1?` (${selected.filter(item=>item.inspection).length})`:''}</Button></div>
 </Modal>;
}

function ExportOption({title,subtitle,primary=false,disabled=false,onClick}:{title:string;subtitle:string;primary?:boolean;disabled?:boolean;onClick:()=>void}){
 return <button type="button" className={primary?'export-primary':''} aria-label={title} disabled={disabled} onClick={onClick}><Icon name="download"/><span><strong>{title}</strong><small>{subtitle}</small></span></button>;
}

export function ExportPlanDialog({w,onClose}:{w:Workspace;onClose:()=>void}){
 const unavailable=!w.current||w.dirty;
 const locked=!!w.busy||w.riskBusy;
 return <Modal title="Выгрузка" onClose={onClose}>
  {w.errorMessage&&<Notice tone="error">{w.errorMessage}</Notice>}
  <section className="transfer-group"><h3>Для переноса и продолжения работы</h3><div className="export-options export-options-single">
   <ExportOption primary title={w.dirty?'Сохранить и выгрузить проект':'Выгрузить проект'} subtitle={w.dirty?'Сохранит план, пересчитает результат и скачает полную копию.':'План и сохранённый результат в одном JSON-файле.'} disabled={locked||!w.draft} onClick={()=>void w.exportFile('project')}/>
   <ExportOption title="План JSON" subtitle="Только текущие решения; сохранение на сервере не требуется." disabled={locked||!w.draft} onClick={()=>void w.exportFile('plan')}/>
  </div></section>
  <section className="transfer-group"><h3>Результаты расчёта</h3><div className="export-options">
   <ExportOption title="Результат JSON" subtitle="Ответ модели с происхождением." disabled={locked||unavailable} onClick={()=>void w.exportFile('json')}/>
   <ExportOption title="Результат CSV" subtitle="ZIP-архив таблиц по годам." disabled={locked||unavailable} onClick={()=>void w.exportFile('csv')}/>
  </div>{unavailable&&<p className="transfer-disabled-reason">{w.dirty?'Результаты станут доступны после сохранения и пересчёта.':'Сначала сохраните и рассчитайте план.'}</p>}</section>
  {w.pair&&<section className="transfer-group"><h3>Сравнение сценариев</h3><div className="modal-actions transfer-pair-actions"><Button onClick={()=>jsonDownload({format:'fuel-scenario-comparison-v1',created_at:w.pair!.createdAt,basis_plan:w.pair!.basis,primary_run:w.project?.last_run,other_plan:w.pair!.otherPlan,other_result:w.pair!.other,other_origin:'stateless-api-calc'},'scenario-comparison.json')}>Сравнение JSON</Button><Button onClick={()=>{if(w.pair&&w.project?.last_run)downloadBlob(new Blob([scenarioPairCsv(w.project.last_run,w.pair.otherPlan,w.pair.other)],{type:'text/csv;charset=utf-8'}),'scenario-comparison.csv');}}>Сравнение CSV</Button><Button disabled={locked} onClick={()=>void w.saveOther()}>Сохранить второй сценарий</Button></div></section>}
 </Modal>;
}
