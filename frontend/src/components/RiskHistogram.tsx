import { useState } from 'react';
import type { RiskDistribution } from '../lib/risk';
import { number } from '../lib/format';
const boundary=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:6});

export function RiskHistogram({data,label,domain,maxCount}:{data:RiskDistribution;label:string;domain:[number,number];maxCount:number}) {
 const [active,setActive]=useState<number|null>(null);
 const left=48,right=470,top=20,bottom=178;
 const span=domain[1]-domain[0];
 const x=(v:number)=>left+(v-domain[0])/(span||1)*(right-left);
 const y=(v:number)=>bottom-v/Math.max(1,maxCount)*(bottom-top);
 const binText=(i:number)=>{const b=data.bins[i];return `${boundary.format(b.lower_t)}${b.upper_t===b.lower_t?'':`–${boundary.format(b.upper_t)}`} т: ${b.count} из ${data.iterations} прогонов`;};
 return <figure className="risk-histogram" data-testid="risk-histogram">
  <figcaption>{label} · {data.iterations} прогонов</figcaption>
  <svg viewBox="0 0 500 220" role="group" aria-label={`${label}: распределение суммарного дефицита`}>
   <text x={left} y={12} className="risk-axis">Число прогонов</text>
   {[0,Math.ceil(maxCount/2),maxCount].filter((v,i,a)=>a.indexOf(v)===i).map(v=><g key={v}><line x1={left} x2={right} y1={y(v)} y2={y(v)} className="risk-grid"/><text x={left-8} y={y(v)+4} textAnchor="end" className="risk-axis">{v}</text></g>)}
   {data.bins.map((b,i)=>{const equal=span===0;const point=b.lower_t===b.upper_t;const start=equal?left+80:point?Math.max(left,Math.min(right-10,x(b.lower_t)-5)):x(b.lower_t);const width=equal?(right-left)-160:point?10:Math.max(1,x(b.upper_t)-start-2);return <rect key={i} x={start+1} y={y(b.count)} width={width} height={bottom-y(b.count)} className="risk-bin" tabIndex={0} aria-label={binText(i)} onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(i)} onBlur={()=>setActive(null)}><title>{binText(i)}</title></rect>;})}
   {([['Медиана',data.median,'median'],['95%',data.p95,'p95']] as const).map(([name,value,kind])=><line key={kind} x1={span===0?(left+right)/2:x(value)} x2={span===0?(left+right)/2:x(value)} y1={top} y2={bottom} className={`risk-marker ${kind}`}><title>{name}: {number(value)} т</title></line>)}
   <text x={left} y={197} className="risk-axis">{number(domain[0])}</text>{span>0&&<text x={right} y={197} textAnchor="end" className="risk-axis">{number(domain[1])}</text>}
   <text x={(left+right)/2} y={216} textAnchor="middle" className="risk-axis">Суммарный дефицит за 2035–2040, т</text>
  </svg>
  <div className="risk-chart-legend"><span>Медиана: {number(data.median)} т</span><span>95%-уровень: {number(data.p95)} т</span></div>
  <p className="risk-bin-detail" aria-live="polite">{active===null?'Наведите на столбец или выберите его клавишей Tab.':binText(active)}</p>
 </figure>;
}
