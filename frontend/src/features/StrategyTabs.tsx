import { useEffect, useRef } from 'react';
import type { Workspace } from '../state/useWorkspace';
import { scenarioPlan, strategyColor, strategyDirty, strategyRunFresh } from '../lib/strategies';
import { samePlan, validateDraft } from '../lib/plan';
import { Button } from '../components/Ui';
import { Icon } from '../components/Icon';

export function StrategyTabs({w,onImport,onProjects,onClose}:{w:Workspace;onImport:()=>void;onProjects:()=>void;onClose:(id:string)=>void}) {
 const menu=useRef<HTMLDetailsElement>(null);
 const tabs=useRef<HTMLDivElement>(null);
 useEffect(()=>{tabs.current?.querySelector('.strategy-tab.active')?.scrollIntoView({block:'nearest',inline:'nearest'});},[w.activeId,w.view]);
 function action(fn:()=>void){if(menu.current)menu.current.open=false;fn();}
 return <nav className="strategy-tabs-bar" aria-label="Стратегии">
  <div ref={tabs} className="strategy-tabs" role="tablist" aria-label="Открытые стратегии">
   {w.tabs.map(tab=>{
    const scenarioId=tab.viewScenario??tab.plan.scenario_id,displayedPlan=scenarioPlan(tab,scenarioId);
    const invalid=validateDraft('preview',tab.plan).length>0;
    const failure=tab.errors[scenarioId];
    const failed=invalid||!!failure&&samePlan(failure.basis,displayedPlan);
    const fresh=strategyRunFresh(tab,scenarioId);
    const status=failed?'Ошибка расчёта':fresh?'Рассчитана':'Ожидает расчёта';
    return <div key={tab.id} className={`strategy-tab ${w.activeId===tab.id&&w.view!=='compare'?'active':''}`}>
     <button type="button" role="tab" aria-selected={w.activeId===tab.id&&w.view!=='compare'} disabled={!!w.busy} onClick={()=>w.activateTab(tab.id)} title={`${tab.name} · ${status}${tab.builtin?' · Готовая стратегия команды':''}${strategyDirty(tab)?' · Есть несохранённые изменения':''}`}>
      <i style={{background:strategyColor(tab.id)}}/><span>{tab.name||'Без названия'}</span>{tab.builtin&&<span className="tab-builtin">Готовая · {tab.builtin.preferredScenario==='MANDATORY_STRESS'?'STRESS':'BASE'}</span>}{strategyDirty(tab)&&<span className="tab-dirty" aria-label="Не сохранена">•</span>}
      <span className={`tab-status ${failed?'failed':fresh?'ready':'waiting'}`} aria-label={status}>{failed?'!':fresh?'✓':'…'}</span>
     </button>
     {!tab.builtin&&<button type="button" className="tab-close" disabled={!!w.busy} aria-label={`Закрыть вкладку ${tab.name}`} onClick={()=>onClose(tab.id)}>×</button>}
    </div>;
   })}
  </div>
  <details ref={menu} className="actions-menu strategy-add"><summary aria-label="Добавить стратегию"><Icon name="plus"/></summary><div className="menu-panel">
   <button type="button" disabled={!!w.busy} onClick={()=>action(()=>void w.newPlan())}><Icon name="plus"/>Создать свою</button>
   <button type="button" disabled={!!w.busy} onClick={()=>action(onImport)}><Icon name="upload"/>Импорт файла</button>
   <button type="button" disabled={!!w.busy} onClick={()=>action(onProjects)}><Icon name="folder"/>Открыть сохранённую</button>
  </div></details>
  {w.view!=='compare'&&w.selectedIds.length>0&&<label className="editor-comparison-choice"><input type="checkbox" checked={w.selectedIds.includes(w.activeId)} disabled={!!w.busy} onChange={()=>w.toggleComparison(w.activeId)}/>В сравнении</label>}
  <Button className={`strategy-compare-button ${w.view==='compare'?'active':''}`} disabled={!!w.busy||!w.tabs.length} onClick={()=>w.setView('compare')}><Icon name="compare"/>{w.view!=='compare'&&w.selectedIds.length>=2?'К сравнению':'Сравнить'}{w.selectedIds.length>0&&<span className="compare-count">{w.selectedIds.length}</span>}</Button>
 </nav>;
}
