import { useState } from 'react';
import type { Workspace } from '../state/useWorkspace';
import { Button, Notice } from '../components/Ui';
import { Icon } from '../components/Icon';
import { csvCell, downloadBlob } from '../lib/format';
import { columnLabels, tableLabels } from '../lib/catalog';
export function DataCatalog({w,onImport}:{w:Workspace;onImport:()=>void}){
 const [tableId,setTableId]=useState('demand');const [showAll,setShowAll]=useState(false);
 const table=w.catalog?.tables.find(t=>t.table_id===tableId);
 const cols=table?.columns.filter(c=>showAll||!['status','notes','description','reliability_profile'].includes(c))||[];
 return <section className="page-enter"><div className="page-intro"><div><h1>Исходные данные</h1><p>Справочники кейса и перенос планов.</p></div><Button onClick={onImport} disabled={!!w.busy}><Icon name="upload"/>Импорт JSON</Button></div>
  <Notice>Контрольный набор доступен для просмотра. Здесь он не меняется: текущий адаптер не принимает пользовательские CSV/XLSX.</Notice>
  <div className="section-heading catalog-heading"><label className="field">Справочник<select aria-label="Справочник" value={tableId} onChange={e=>setTableId(e.target.value)}>{w.catalog?.tables.map(t=><option key={t.table_id} value={t.table_id}>{tableLabels[t.table_id]||t.table_id}</option>)}</select></label><Button kind="ghost" disabled={!table} onClick={()=>{if(table){const csv=[table.columns,...table.rows.map(row=>table.columns.map(c=>row[c]))].map(r=>r.map(csvCell).join(',')).join('\r\n');downloadBlob(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),table.table_id+'.csv');}}}><Icon name="download"/>Скачать CSV</Button></div>
  <div className="table-wrap catalog-table"><table><caption className="sr-only">{tableLabels[tableId]}</caption><thead><tr>{cols.map(c=><th key={c}>{columnLabels[c]||c}</th>)}</tr></thead><tbody>{table?.rows.map((row,i)=><tr key={i}>{cols.map(c=><td key={c}>{row[c]||'—'}</td>)}</tr>)}</tbody></table></div>
  <div className="section-footer"><p className="help">{table?.rows.length||0} строк. Значения переданы API без пересчёта.</p><label className="checkbox-label"><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/>Все поля исходника</label></div>
  <details className="disclosure"><summary>Источник и контрольная сумма<Icon name="chevron" size={16}/></summary><div className="disclosure-body"><p><code>{table?.source_path}</code></p><p className="help break-word">SHA-256: {table?.sha256}</p>{w.catalog?.notes.map(n=><p key={n} className="help">{n}</p>)}</div></details>
  <details className="disclosure"><summary>Сценарии исходного набора<Icon name="chevron" size={16}/></summary><div className="disclosure-body"><pre>{JSON.stringify(w.catalog?.scenarios,null,2)}</pre></div></details>
 </section>;
}
