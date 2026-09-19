import { useEffect, useRef } from 'react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
export function Button({children,kind='secondary',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{kind?:'primary'|'secondary'|'ghost'|'danger'}){
 return <button type="button" {...props} className={`button ${kind} ${props.className||''}`}>{children}</button>;
}
export function Spinner(){return <span className="spinner" aria-hidden="true"/>;}
export function Empty({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){
 return <div className="empty"><div className="empty-mark"><Icon name="plan" size={28}/></div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current!;el.showModal();return()=>el.close();},[]);
 return <dialog ref={ref} className={`modal ${wide?'wide':''}`} aria-label={title} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-inner"><div className="modal-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Закрыть окно" onClick={onClose}><Icon name="close"/></button></div>{children}</div></dialog>;
}
export function Notice({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'warning'|'error'}){
 return <div className={`notice ${tone}`} role={tone==='error'?'alert':undefined}><Icon name={tone==='neutral'?'info':'alert'} size={17}/><div>{children}</div></div>;
}
export function NumericInput({value,onChange,label,integer=false}:{value:number;onChange:(v:number)=>void;label:string;integer?:boolean}){
 const valid=Number.isFinite(value)&&value>=(integer?1:0)&&(!integer||Number.isInteger(value));
 return <span className="numeric-field"><input aria-label={label} type="number" inputMode={integer?'numeric':'decimal'} autoComplete="off" min={integer?1:0} step={integer?1:'any'} required value={Number.isFinite(value)?value:''} onChange={e=>onChange(e.currentTarget.value===''?NaN:e.currentTarget.valueAsNumber)} aria-invalid={!valid}/>{!valid&&<span className="field-error">{integer?'Укажите целый год':'Число ≥ 0'}</span>}</span>;
}
