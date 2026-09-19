import { useEffect, useRef, useState } from 'react';
import type { RiskMetric, RiskTrajectories } from '../lib/risk';
import { number } from '../lib/format';

type Props = {data:RiskTrajectories;label:string};
export function RiskTrajectoryChart({data,label}:Props) {
 const n=data.days.length;
 const [width,setWidth]=useState(1400);
 const W=width,H=width<600?280:350,L=18,R=W-85,T=24,B=H-45;
 const [metric,setMetric]=useState<RiskMetric>('inventory_t');
 const [selected,setSelected]=useState(0);
 const [window,setWindow]=useState<[number,number]>([0,n-1]);
 const [hover,setHover]=useState(0);
 const svg=useRef<SVGSVGElement>(null);
 useEffect(()=>{
  const el=svg.current;if(!el)return;
  const observer=new ResizeObserver(entries=>setWidth(Math.max(280,Math.round(entries[0].contentRect.width))));
  observer.observe(el);return ()=>observer.disconnect();
 },[]);
 const drag=useRef<{x:number;window:[number,number]}|null>(null);
 const [lo,hi]=window;
 const span=Math.max(1,hi-lo);
 const band=data.bands[metric];
 const run=selected?data.runs[selected-1]:null;
 const index=Math.max(lo,Math.min(hi,hover));
 const day=data.days[index];
 const maximum=Math.max(1,...band.p95.slice(lo,hi+1),...(run?run[metric].slice(lo,hi+1):[]))*1.08;
 const x=(i:number)=>L+(i-lo)/span*(R-L);
 const y=(v:number)=>B-v/maximum*(B-T);
 const points=(values:number[],reverse=false)=>{
  const indices=Array.from({length:hi-lo+1},(_,i)=>lo+i);
  if(reverse)indices.reverse();
  return indices.map(i=>`${x(i).toFixed(2)},${y(values[i]).toFixed(2)}`).join(' ');
 };
 const clampWindow=(start:number,size:number):[number,number]=>{
  const width=Math.min(n-1,Math.max(Math.min(29,n-1),Math.round(size)));
  const a=Math.max(0,Math.min(n-1-width,Math.round(start)));
  return [a,a+width];
 };
 const zoom=(factor:number,anchor=.5)=>setWindow(([a,b])=>{
  const size=(b-a)*factor;
  return clampWindow(a+((b-a)-size)*anchor,size);
 });
 useEffect(()=>{
  const el=svg.current;if(!el)return;
  const wheel=(event:WheelEvent)=>{
   event.preventDefault();
   const bounds=el.getBoundingClientRect();
   const anchor=Math.max(0,Math.min(1,((event.clientX-bounds.left)/bounds.width*W-L)/(R-L)));
   zoom(event.deltaY>0?1.3:1/1.3,anchor);
  };
  el.addEventListener('wheel',wheel,{passive:false});
  return ()=>el.removeEventListener('wheel',wheel);
 },[n,W,R]);
 const ticks=Array.from({length:W<600?3:6},(_,i)=>Math.round(lo+i*span/(W<600?2:5)));
 return <section className="risk-terminal" data-testid="risk-trajectories">
  <div className="risk-terminal-toolbar">
   <div className="risk-metric-tabs" role="group" aria-label="Показатель прогонов">
    <button type="button" aria-pressed={metric==='inventory_t'} onClick={()=>setMetric('inventory_t')}>Запас топлива</button>
    <button type="button" aria-pressed={metric==='shortage_t'} onClick={()=>setMetric('shortage_t')}>Дефицит за день</button>
   </div>
   <label className="risk-run-select">Отдельный прогон <select aria-label="Отдельный прогон" value={selected} onChange={e=>setSelected(Number(e.target.value))}><option value={0}>Не выбран</option>{data.runs.map(r=><option key={r.run} value={r.run}>№ {r.run}</option>)}</select></label>
   <div className="risk-zoom-controls"><button type="button" aria-label="Приблизить график" onClick={()=>zoom(.5)}>＋</button><button type="button" aria-label="Отдалить график" onClick={()=>zoom(2)}>−</button><button type="button" onClick={()=>setWindow(clampWindow(index-89,179))}>180 дней</button><button type="button" onClick={()=>setWindow([0,n-1])}>Весь период</button></div>
  </div>
  <div className="risk-terminal-legend"><strong>{label} · {data.runs.length} прогонов</strong><span className="fan-key">Диапазон 5–95%</span><span className="median-key">Медиана</span>{run&&<span className="run-key">Прогон № {run.run}</span>}<span className="risk-chart-unit">{metric==='inventory_t'?'Запас на конец дня':'Дефицит за день'}, т</span></div>
  <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: дневные траектории Monte Carlo`} tabIndex={0}
   onKeyDown={e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setHover(Math.max(lo,Math.min(hi,index+(e.key==='ArrowLeft'?-1:1))));}
    if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.5);}
    if(e.key==='-'){e.preventDefault();zoom(2);}
    if(e.key==='Home'){e.preventDefault();setWindow([0,n-1]);setHover(0);}
   }}
   onPointerDown={e=>{if(e.button!==0)return;drag.current={x:e.clientX,window};e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>{drag.current=null;}}
   onPointerMove={e=>{
    const bounds=e.currentTarget.getBoundingClientRect();
    const fraction=Math.max(0,Math.min(1,((e.clientX-bounds.left)/bounds.width*W-L)/(R-L)));
    if(drag.current){const d=drag.current;const size=d.window[1]-d.window[0];const shift=(e.clientX-d.x)/bounds.width*W/(R-L)*size;setWindow(clampWindow(d.window[0]-shift,size));}
    setHover(Math.round(lo+fraction*span));
   }}>
   <title>Диапазон значений на каждый день. Колесо — масштаб; перетаскивание — время; стрелки — выбранный день.</title>
   {[0,.25,.5,.75,1].map(v=><g key={v}><line x1={L} x2={R} y1={y(v*maximum)} y2={y(v*maximum)} className="trajectory-grid"/><text x={R+12} y={y(v*maximum)+5} className="trajectory-label">{number(v*maximum)}</text></g>)}
   {ticks.map((i,j)=><g key={j}><line x1={x(i)} x2={x(i)} y1={T} y2={B} className="trajectory-grid"/><text x={x(i)} y={B+28} textAnchor={j===0?'start':j===ticks.length-1?'end':'middle'} className="trajectory-label">{W<600?<><tspan x={x(i)}>{data.days[i].year}</tspan><tspan x={x(i)} dy={13}>{data.days[i].day_of_year} д.</tspan></>:`${data.days[i].year} · ${data.days[i].day_of_year} д.`}</text></g>)}
   <polygon points={`${points(band.p95)} ${points(band.p05,true)}`} className="trajectory-fan"/>
   <polyline points={points(band.p95)} className="trajectory-bound"/><polyline points={points(band.p05)} className="trajectory-bound"/>
   <polyline points={points(band.median)} className="trajectory-median"/>
   {run&&<polyline points={points(run[metric])} className="trajectory-run"/>}
   <line x1={x(index)} x2={x(index)} y1={T} y2={B} className="trajectory-crosshair"/>
   <line x1={L} x2={R} y1={y(run?run[metric][index]:band.median[index])} y2={y(run?run[metric][index]:band.median[index])} className="trajectory-crosshair"/>
   <circle cx={x(index)} cy={y(run?run[metric][index]:band.median[index])} r={4} className={run?'trajectory-run-dot':'trajectory-median-dot'}/>
  </svg>
  <div className="risk-day-readout" data-testid="risk-day-readout"><strong>{day.year} · день {day.day_of_year}</strong><span>5–95%: <b>{number(band.p05[index])}–{number(band.p95[index])} т</b></span><span>Медиана: <b>{number(band.median[index])} т</b></span>{run&&<><span>№ {run.run} · запас: <b>{number(run.inventory_t[index])} т</b></span><span>Поступило: <b>{number(run.delivered_t[index])} т</b></span><span>Дефицит: <b>{number(run.shortage_t[index])} т</b></span></>}</div>
  <div className="risk-chart-help"><span>Колесо — масштаб · перетаскивание — время · ← → — день</span><span>Показаны дни {lo+1}–{hi+1} из {n}</span></div>
  <p className="risk-band-explanation">Заливка — от 5-го до 95-го процентиля на каждый день. Это диапазон выборки, а не гарантия и не отдельный прогон. Выберите прогон, чтобы увидеть его реальный путь.</p>
 </section>;
}
