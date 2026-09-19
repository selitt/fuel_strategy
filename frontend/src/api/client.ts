import type { Catalog, Comparison, Meta, Plan, Project, Result, Summary, Validation } from './types';
import type { schemas } from './schema';
import { downloadBlob, safeFilename } from '../lib/format.js';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public requestId = '') { super(message); this.name='ApiError'; }
}
export function errorText(error: unknown): string {
  if(error instanceof ApiError) {
    if(error.status===409 && error.code.includes('REVISION')) return 'План изменён в другом окне. Откройте свежую версию или сохраните свои правки отдельной копией.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Не удалось выполнить действие. Повторите попытку.';
}
async function checked(response: Response): Promise<Response> {
  if(response.ok) return response;
  let value: Record<string,unknown>={};
  try { value=await response.json(); } catch { /* proxy can return HTML; never show it to the user */ }
  const detail=value.detail;
  let message=typeof detail==='string'?detail:Array.isArray(detail)?detail.map((e:Record<string,unknown>)=>{
    const location=Array.isArray(e.loc)?e.loc.filter(x=>x!=='body').join(' → '):'';
    return `${location ? location+': ' : ''}${e.msg||'Проверьте значение'}`;
  }).join('\n'):'';
  if(!message) message=({401:'Для доступа к рабочему пространству нужна авторизация.',413:'Файл или запрос слишком большой.',502:'Backend недоступен. Проверьте запуск сервера.',503:'Расчётный сервис недоступен. Повторите позже.'} as Record<number,string>)[response.status] || `Запрос не выполнен (HTTP ${response.status}).`;
  throw new ApiError(response.status,String(value.code||`HTTP_${response.status}`),message,String(value.request_id||response.headers.get('X-Request-ID')||''));
}
async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),120000);
  try { return await checked(await fetch('/api'+path,{...init,signal:controller.signal,cache:'no-store'})); }
  catch(error) {
    if(error instanceof ApiError) throw error;
    if(controller.signal.aborted) throw new Error('Сервер не ответил за 2 минуты. Расчёт мог продолжиться — обновите проект перед повторной попыткой.');
    throw new Error('Нет соединения с сервером. Проверьте сеть и повторите действие.');
  } finally { clearTimeout(timer); }
}
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response=await request(path,init);
  try{return await response.json() as T;}catch{throw new Error('Сервер вернул не JSON. Проверьте адрес и проксирование /api.');}
}
function body(value:unknown, method='POST'):RequestInit {return {method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)};}
async function upload<T>(path:string,file:File):Promise<T>{const form=new FormData();form.append('file',file);return json<T>(path,{method:'POST',body:form});}
export async function download(path:string,fallback:string,init?:RequestInit):Promise<void>{
  const response=await request(path,init);
  const disposition=response.headers.get('Content-Disposition')||'';
  const filename=/filename="([^"]+)"/.exec(disposition)?.[1]||fallback;
  downloadBlob(await response.blob(),safeFilename(filename));
}
export const api = {
  simulate:(plan:Plan)=>json<Result>('/calc',body(plan)),
  analyzeRisk:(plan:Plan)=>json<Result>('/calc/risk',body(plan)),
  meta:()=>json<Meta>('/meta'), catalog:()=>json<Catalog>('/catalog'), template:()=>json<Plan>('/calc/template'),
  async list():Promise<Summary[]> {
    const all:Summary[]=[];let offset=0;
    for(;;){const page=await json<schemas['ProjectListDTO']>(`/projects?limit=100&offset=${offset}`);all.push(...page.items);offset+=page.items.length;if(offset>=page.total||!page.items.length)break;}
    return all;
  },
  project:(id:string)=>json<Project>(`/projects/${encodeURIComponent(id)}`),
  create:(name:string,plan:Plan)=>json<Project>('/projects',body({name,plan})),
  update:(id:string,name:string,plan:Plan,revision:number)=>json<Project>(`/projects/${encodeURIComponent(id)}`,body({name,plan,expected_revision:revision},'PUT')),
  calculate:(id:string,revision:number)=>json<Project>(`/projects/${encodeURIComponent(id)}/calculate`,body({expected_revision:revision})),
  async remove(id:string,revision:number):Promise<void>{await request(`/projects/${encodeURIComponent(id)}?expected_revision=${revision}`,{method:'DELETE'});},
  importPlan:(file:File)=>upload<Validation>('/plans/import',file),
  importProject:(file:File)=>upload<Project>('/projects/import',file),
  validate:(plan:Plan)=>json<Validation>('/plans/validate',body(plan)),
  compare:(ids:string[])=>json<Comparison>('/projects/compare',body({project_ids:ids})),
  exportPlan:(plan:Plan)=>download('/plans/export','plan.json',body(plan)),
  exportProject:(id:string)=>download(`/projects/${encodeURIComponent(id)}/export`,'project.json'),
  exportResult:(id:string,format:'json'|'csv')=>download(`/projects/${encodeURIComponent(id)}/result/export?format=${format}`,`result.${format==='csv'?'zip':'json'}`),
};
