import { useId, useState } from 'react';
import { number } from '../lib/format';
export type Series={key:string;label:string;values:(number|null|undefined)[];color:string;dashed?:boolean};
/** Geometry only: receives model values; does not compute domain KPIs. */
export function Chart({years,series,unit='т'}:{years:number[];series:Series[];unit?:string}){
 const [hover,setHover]=useState<number|null>(null);const id=useId().replaceAll(':','');
 const width=900,height=290,left=52,right=25,top=20,bottom=38;
 const data=series.flatMap(s=>s.values).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n));
 if(!years.length||!data.length)return <p className="empty-cell">Модель не вернула ряд для графика.</p>;
 const min=Math.min(0,...data),max=Math.max(1,...data);const range=max-min;
 const x=(i:number)=>left+(years.length===1?.5:i/(years.length-1))*(width-left-right);
 const y=(v:number)=>top+(max-v)/range*(height-top-bottom);
 return <div className="chart"><svg role="img" aria-label={`График: ${series.map(s=>s.label).join(', ')}. Единицы: ${unit}. Точные значения приведены в таблице.`} viewBox={`0 0 ${width} ${height}`} onMouseLeave={()=>setHover(null)}>
  <defs><linearGradient id={'area'+id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={series[0]?.color} stopOpacity=".13"/><stop offset="100%" stopColor={series[0]?.color} stopOpacity="0"/></linearGradient></defs>
  {[0,.25,.5,.75,1].map(t=>{const value=min+range*t;return <g key={t}><line x1={left} x2={width-right} y1={y(value)} y2={y(value)} className="chart-grid"/><text x={left-12} y={y(value)+4} textAnchor="end" className="chart-text">{number(value)}</text></g>;})}
  {series.map((s,si)=>{
    let d='';let valid=false;for(let i=0;i<years.length;i++){const v=s.values[i];if(typeof v!=='number'||!Number.isFinite(v)){valid=false;continue;}d+=`${valid?'L':'M'}${x(i)} ${y(v)} `;valid=true;}
    const all=s.values.length===years.length&&s.values.every(v=>typeof v==='number'&&Number.isFinite(v));
    return <g key={s.key}>{si===0&&all&&<path d={d+`L ${x(years.length-1)} ${y(min)} L ${x(0)} ${y(min)} Z`} fill={`url(#area${id})`}/>}<path className="chart-line" d={d} fill="none" stroke={s.color} strokeWidth={s.dashed?2:2.5} strokeDasharray={s.dashed?'5 6':undefined} strokeLinecap="round" strokeLinejoin="round"/>{years.map((_,i)=>{const v=s.values[i];return typeof v==='number'&&Number.isFinite(v)?<circle key={i} cx={x(i)} cy={y(v)} r={hover===i?5:3.2} fill="var(--surface)" stroke={s.color} strokeWidth="2"/>:null;})}</g>;
  })}
  {years.map((yr,i)=><g key={yr}><text x={x(i)} y={height-9} textAnchor="middle" className="chart-text">{yr}</text><rect x={x(i)-(width-left-right)/Math.max(2,years.length-1)/2} width={(width-left-right)/Math.max(2,years.length-1)} y={top} height={height-top} fill="transparent" onMouseEnter={()=>setHover(i)}><title>{yr}: {series.map(s=>`${s.label} ${number(s.values[i])} ${unit}`).join('; ')}</title></rect></g>)}
  {hover!==null&&<line x1={x(hover)} x2={x(hover)} y1={top} y2={height-bottom} stroke="var(--border)" strokeDasharray="3 5" pointerEvents="none"/>}
 </svg><div className="chart-legend">{series.map(s=><span key={s.key}><i style={{background:s.color}}/>{s.label}{hover!==null&&<strong>{number(s.values[hover])} {unit}</strong>}</span>)}</div></div>;
}
