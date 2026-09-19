const numeric = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2});
const percentages = new Intl.NumberFormat('ru-RU', {style:'percent', maximumFractionDigits: 1});
const dates = new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export function number(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? numeric.format(value) : '—';
}
export function percent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? percentages.format(value) : '—';
}
export function date(value: string): string {
  const d = new Date(value); return Number.isFinite(d.getTime()) ? dates.format(d) : '—';
}
export function scenario(value: string | undefined): string {
  return value === 'BASE' ? 'Базовый' : value === 'MANDATORY_STRESS' ? 'Стрессовый' : value || 'Не указан';
}
export function safeFilename(value: string): string {
  return value.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001f<>:"|?*]/g,'_').slice(0,180) || 'download.json';
}
export function csvCell(value: unknown): string {
  let s = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"','""') + '"' : s;
}
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=safeFilename(filename);
  document.body.append(a); a.click(); a.remove();
  // Safari may still be reading the URL after click; revoke asynchronously.
  window.setTimeout(()=>URL.revokeObjectURL(url), 30000);
}
export function jsonDownload(value: unknown, name: string): void {
  downloadBlob(new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}),name);
}

/** Never silently relabel data from a future/imported engine with another unit system. */
export function supportedUnits(units:unknown):boolean {
 if(!units||typeof units!=='object')return false;
 const u=units as Record<string,unknown>;
 return u.fuel==='t' && u.currency==='mln_units';
}
