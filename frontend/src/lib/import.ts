export type PlanImportKind = 'json' | 'table';

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
