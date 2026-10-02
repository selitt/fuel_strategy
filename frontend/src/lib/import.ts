export type PlanImportKind = 'json' | 'table';
export type PlanImportInspection = {kind:'project'|'plan-json'|'table';format:'JSON'|'CSV'|'XLSX'|'XLS'};
type ImportCandidate = {name:string;size:number;text:()=>Promise<string>};

export function planImportKind(filename: string): PlanImportKind | null {
  const extension = /\.([^.]+)$/.exec(filename.toLowerCase())?.[1];
  if(extension === 'json') return 'json';
  if(extension === 'csv' || extension === 'xlsx' || extension === 'xls') return 'table';
  return null;
}

export function planImportName(filename: string): string {
  const value = filename.replace(/\.(json|csv|xlsx|xls)$/i, '').trim().slice(0, 140);
  return value || 'Импортированный план';
}

export async function inspectPlanImport(file:ImportCandidate,maxBytes:number):Promise<PlanImportInspection>{
  if(file.size>maxBytes) throw new Error(`Файл превышает допустимый размер ${maxBytes} байт.`);
  const kind=planImportKind(file.name);
  if(!kind) throw new Error('Выберите план JSON, CSV, XLSX или XLS.');
  const extension=/\.([^.]+)$/.exec(file.name.toLowerCase())?.[1]?.toUpperCase() as PlanImportInspection['format'];
  if(kind==='table') return {kind:'table',format:extension};
  let value:unknown;
  try{value=JSON.parse((await file.text()).replace(/^\uFEFF/,''));}
  catch{throw new Error('Не удалось прочитать JSON. Проверьте синтаксис файла.');}
  const project=!!value&&typeof value==='object'&&'schema_version' in value&&'project_id' in value;
  return {kind:project?'project':'plan-json',format:'JSON'};
}
