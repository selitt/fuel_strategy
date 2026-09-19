import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorkspace } from './state/useWorkspace';
import { Brand, Icon } from './components/Icon';
import { Button, Modal, Spinner, Notice } from './components/Ui';
import { Infrastructure } from './features/Infrastructure';
import { SupplyMatrix } from './features/SupplyMatrix';
import { RiskPanel } from './features/RiskPanel';
import { ResultPanel } from './features/ResultPanel';
import { StrategySummary } from './features/StrategySummary';
import { ResultDetails } from './features/ResultDetails';
import { PlanEditor } from './features/PlanEditor';
import { Compare } from './features/Compare';
import { DataCatalog } from './features/DataCatalog';
import { ExportPlanDialog, ImportPlanDialog } from './features/PlanTransfer';
import { scenario } from './lib/format';
import { columnLabels } from './lib/catalog';
import { StrategyTabs } from './features/StrategyTabs';
import { strategyDirty } from './lib/strategies';
import './workspace-tabs.css';
import './workspace-layout.css';
import type { MatrixSource } from './lib/matrix';
type Dialog = 'help' | 'copy' | 'delete' | 'projects' | 'import' | 'export' | 'advanced' | 'data' | 'results' | 'compare' | 'risk' | null;
export default function App() {
    const w = useWorkspace(), menu = useRef<HTMLDetailsElement>(null);
    const [modal, setModal] = useState<Dialog>(null), [pending, setPending] = useState<(() => void) | null>(null), [source, setSource] = useState<MatrixSource | null>(null);
    const [closingId, setClosingId] = useState<string|null>(null);
    const scrollPositions=useRef(new Map<string,number>());
    useLayoutEffect(()=>{const key=w.view==='compare'?'compare':w.activeId;window.scrollTo(0,scrollPositions.current.get(key)||0);return()=>{scrollPositions.current.set(key,window.scrollY);};},[w.activeId,w.view]);
    function closeTab(id:string){const tab=w.tabs.find(t=>t.id===id);if(tab&&strategyDirty(tab))setClosingId(id);else w.closeTab(id);}
    const [copyName, setCopyName] = useState(''), [copyScenario, setCopyScenario] = useState('BASE');
    function guard(action: () => void) { if (w.dirty)
        setPending(() => action);
    else
        action(); }
    function menuAction(action: () => void) { if (menu.current)
        menu.current.open = false; action(); }
    function importFile() { setModal('import'); }
    function showCopy() { setCopyName((w.name + ' — копия').slice(0, 140)); setCopyScenario(w.draft?.scenario_id || 'BASE'); setModal('copy'); }
    function mode(value: 'BASE' | 'MANDATORY_STRESS' | 'both') {
        if (value === 'both') {
            w.setBoth(true);
            return;
        }
        w.setBoth(false);
        if (w.draft && w.draft.scenario_id !== value)
            w.setScenario(value);
    }
    useEffect(() => {
        const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (!w.busy && !w.riskBusy && !w.immutable)
                void w.save();
        } if (e.key === 'Escape' && menu.current)
            menu.current.open = false; };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    });
    useEffect(() => { const outside = (e: MouseEvent) => { if (menu.current && !menu.current.contains(e.target as Node))
        menu.current.open = false; }; document.addEventListener('click', outside); return () => document.removeEventListener('click', outside); }, []);
    const advanced = () => setModal('advanced');
    return <div className={`operator-app compact-desktop strategy-workspace ${w.view==='compare'?'comparison-mode':'editor-mode'}`}>
  <a href={w.view==='compare'?'#comparison-main':'#main'} className="skip-link">Перейти к содержимому</a>
  <header className="operator-header"><div className="identity"><Brand /><div><strong>Контур<span>2035</span></strong></div></div>
   <div className="plan-toolbar"><span className="comparison-header-label">Сравнение открытых стратегий</span><Button kind="ghost" className="plans-button" aria-label="Планы" disabled={!!w.busy || w.riskBusy} onClick={()=>setModal('projects')}><Icon name="folder"/><span>Планы</span></Button><div className="plan-title"><label className="sr-only" htmlFor="plan-name">Название плана</label><input id="plan-name" name="plan-name" title={w.immutable?'Готовая стратегия команды':"Название плана — можно изменить"} value={w.name} maxLength={140} disabled={!!w.busy||w.immutable} autoComplete="off" onChange={e => w.setName(e.target.value)}/><span className={`save-dot ${w.dirty ? 'dirty' : ''}`} title={w.immutable?'Готовая стратегия защищена от изменений':w.dirty ? 'Есть несохранённые изменения' : 'Нет несохранённых изменений'}/></div>{w.immutable?<Button kind="primary" className="calculate-button builtin-copy-button" aria-label="Создать свою на основе готовой стратегии" disabled={!!w.busy||w.riskBusy} onClick={()=>void w.copyFrom(w.activeId)}><Icon name="copy" size={14}/><span>Создать свою</span></Button>:<Button kind="primary" className="calculate-button" aria-label={w.busy ? 'Выполняем' : 'Сохранить'} disabled={!!w.busy || w.riskBusy || !w.draft || w.loading} onClick={() => void w.save()}>{w.busy ? <Spinner /> : <Icon name="save" size={14}/>}<span>{w.busy ? 'Выполняем…' : 'Сохранить'}</span></Button>}<Button className="export-button" aria-label="Выгрузить" disabled={!!w.busy || w.riskBusy || !w.draft} onClick={()=>setModal('export')}><Icon name="download" size={14}/><span>Выгрузить</span></Button></div>
   <div className="scenario-switch" aria-label="Режим расчёта"><button type="button" disabled={!!w.busy} aria-pressed={!w.both && w.draft?.scenario_id === 'BASE'} onClick={() => mode('BASE')}>BASE</button><button type="button" disabled={!!w.busy} aria-pressed={!w.both && w.draft?.scenario_id === 'MANDATORY_STRESS'} onClick={() => mode('MANDATORY_STRESS')}>STRESS</button><button type="button" disabled={!!w.busy} aria-pressed={w.both} onClick={() => mode('both')}><Icon name="compare" size={14}/><span>Оба</span></button></div>
   <div className="header-actions"><details ref={menu} className="actions-menu"><summary aria-label="Действия с планом"><Icon name="more"/></summary><div className="menu-panel">
     <button type="button" disabled={!!w.busy || w.riskBusy || !w.draft} onClick={() => menuAction(showCopy)}><Icon name="copy"/>Создать копию</button>
     <div className="menu-divider"/>
     <button type="button" onClick={() => menuAction(() => w.setView('compare'))}><Icon name="compare"/>Сравнить стратегии</button>
     <button type="button" onClick={() => menuAction(() => setModal('help'))}><Icon name="info"/>О модели и интерфейсе</button>
     <div className="menu-divider"/><button className="danger-text" type="button" disabled={!!w.busy || w.riskBusy || !w.project} onClick={() => menuAction(() => setModal('delete'))}><Icon name="trash"/>Удалить план</button>
    </div></details>
   </div>
  </header>
  <StrategyTabs w={w} onImport={importFile} onProjects={()=>{setModal('projects');void w.execute('Обновляем список…',w.refreshList);}} onClose={closeTab}/>
  {w.imports.length>0&&<div className="strategy-import-report" role="status">{w.imports.map((item,i)=><p key={i} className={item.error?'failed':item.value?.warning?'warning':''}>{item.filename}: {item.error||item.value?.warning||'открыта во вкладке'}</p>)}<button type="button" className="text-button" onClick={w.clearImports}>Скрыть</button></div>}
  {w.view==='compare'&&(w.loading?<div className="comparison-loading" role="status"><Spinner/>Загружаем готовые стратегии…</div>:<Compare w={w}/>)}
  {!!w.error && w.errorMessage && <div className="error-banner" role="alert"><Icon name="alert"/><div><strong>{w.errorMessage}</strong>{w.requestId && <small>Запрос: {w.requestId}</small>}{w.project && <button className="text-button" type="button" disabled={!!w.busy || w.riskBusy} onClick={() => guard(() => void w.reload())}>Открыть версию с сервера</button>}{!w.draft && !w.loading && <button className="text-button" type="button" onClick={() => location.reload()}>Повторить подключение</button>}</div><button type="button" className="icon-button" aria-label="Закрыть ошибку" onClick={w.clearError}><Icon name="close"/></button></div>}
  <main id="main" className="operator-grid" tabIndex={-1} hidden={w.view==='compare'}>
   {w.loading ? <div className="loading-state" role="status"><Spinner />Открываем план…</div> : !w.draft?<div className="empty-strategies"><p>Импортируйте план или создайте новый.</p><Button onClick={importFile}>Импорт файла</Button> <Button onClick={()=>void w.newPlan()}>Создать свою</Button></div>: <><StrategySummary w={w} onDetails={() => setModal('results')}/><div className="settings-column">{w.builtin&&<div className="builtin-strategy-note"><div><strong>Готовая стратегия команды</strong><span>{w.builtin.description}</span></div><Button kind="primary" disabled={!!w.busy||w.riskBusy} onClick={()=>void w.copyFrom(w.activeId)}><Icon name="copy"/>Создать свою на основе этой</Button></div>}<Infrastructure w={w} onAdvanced={advanced} onData={() => setModal('data')}/><SupplyMatrix key={w.activeId} w={w} onAdvanced={advanced} onSource={setSource}/></div><ResultPanel key={w.activeId} w={w} onDetails={() => setModal('results')} onRisk={() => {setModal('risk'); if (!w.riskBusy) void w.analyzeRisk();}}/></>}
  </main>

  <div className={`toast ${w.message ? 'visible' : ''}`} role="status" aria-live="polite">{w.message && <><Icon name="check"/>{w.message}</>}</div>
  {closingId && <Modal title="Закрыть стратегию?" onClose={()=>setClosingId(null)}><p>В стратегии «{w.tabs.find(t=>t.id===closingId)?.name}» есть несохранённые изменения.</p>{w.errorMessage&&<Notice tone="error">{w.errorMessage}</Notice>}<div className="modal-actions"><Button onClick={()=>setClosingId(null)}>Отмена</Button><Button kind="danger" disabled={!!w.busy} onClick={()=>{w.closeTab(closingId);setClosingId(null);}}>Не сохранять</Button><Button kind="primary" disabled={!!w.busy} onClick={()=>{const id=closingId;void w.save(id).then(saved=>{if(saved){w.closeTab(id);setClosingId(null);}});}}>Сохранить и закрыть</Button></div></Modal>}
  {pending && <Modal title="Сохранить изменения?" onClose={() => setPending(null)}><p>Открытие другого плана заменит текущие правки.</p>{w.errorMessage && <Notice tone="error">{w.errorMessage}</Notice>}<div className="modal-actions"><Button onClick={() => setPending(null)}>Остаться</Button><Button kind="danger" onClick={() => { const action = pending; setPending(null); action(); }}>Не сохранять</Button><Button kind="primary" disabled={!!w.busy || w.riskBusy} onClick={() => { const action = pending; void w.save().then(p => { if (p) {
        setPending(null);
        action();
    } }); }}>Сохранить и продолжить</Button></div></Modal>}
  {modal === 'projects' && <Modal title="Планы" onClose={() => setModal(null)}><div className="saved-plans">{w.projects.map(p => <button type="button" key={p.project_id} onClick={() => { setModal(null); void w.load(p.project_id); }}><Icon name="plan"/><span><strong>{p.name}</strong><small>{scenario(p.scenario_id)}</small></span><Icon name="right"/></button>)}{!w.projects.length && <p className="help">Сохранённых планов пока нет.</p>}</div><div className="modal-actions"><Button onClick={() => setModal('import')}><Icon name="upload"/>Импорт файла</Button><Button kind="primary" onClick={() => { setModal(null); void w.newPlan(); }}><Icon name="plus"/>Новый план</Button></div></Modal>}
  {modal === 'import' && <ImportPlanDialog w={w} onClose={()=>setModal(null)} onConfirm={(files)=>{setModal(null);void w.importFiles(files);}}/>}
  {modal === 'copy' && <Modal title="Создать копию" onClose={() => setModal(null)}>{w.errorMessage && <Notice tone="error">{w.errorMessage}</Notice>}<form onSubmit={e => { e.preventDefault(); void w.copy(copyName, copyScenario).then(p => { if (p)
        setModal(null); }); }}><label className="field">Название копии<input required maxLength={140} autoComplete="off" value={copyName} onChange={e => setCopyName(e.target.value)}/></label><label className="field">Сценарий<select aria-label="Сценарий копии" value={copyScenario} onChange={e => setCopyScenario(e.target.value)}><option value="BASE">BASE</option><option value="MANDATORY_STRESS">STRESS</option>{!['BASE', 'MANDATORY_STRESS'].includes(copyScenario) && <option>{copyScenario}</option>}</select></label><div className="modal-actions"><Button type="submit" kind="primary" disabled={!!w.busy || !copyName.trim()}>Создать копию</Button></div></form></Modal>}
  {modal === 'delete' && <Modal title="Удалить план?" onClose={() => setModal(null)}><p>«{w.name}» и его сохранённый результат будут удалены. Скачанные файлы останутся.</p><div className="modal-actions"><Button onClick={() => setModal(null)}>Отмена</Button><Button kind="danger" onClick={() => { setModal(null); void w.remove(); }}>Удалить</Button></div></Modal>}
  {modal === 'export' && <ExportPlanDialog w={w} onClose={()=>setModal(null)}/>}
  {modal === 'advanced' && <Modal title="Полные записи плана" wide onClose={() => setModal(null)}><Notice>Здесь редактируются только коллизии записей и дополнительные параметры. Обычные количества вводятся в основной таблице.</Notice><PlanEditor w={w}/></Modal>}
  {modal === 'data' && <Modal title="Контрольный набор" wide onClose={() => setModal(null)}><DataCatalog w={w} onImport={()=>setModal('import')}/></Modal>}
  {modal === 'results' && <Modal title="Результат подробно" wide onClose={() => setModal(null)}><ResultDetails w={w}/></Modal>}
  {modal === 'risk' && <Modal title="Проверка сбоев поставок" wide onClose={() => setModal(null)}><RiskPanel w={w}/></Modal>}
  {source && <Modal title={source.label} onClose={() => setSource(null)}><p className="help">Тариф топлива указан за тонну. Резерв оплачивается отдельно за годовую мощность канала; это не запас топлива. Take-or-pay — минимальная оплачиваемая доля по условиям источника. Итоговые расходы смотрите в результате расчёта.</p><dl className="reference-values">{Object.entries(source.reference || { source_id: source.writeId }).filter(([k]) => !['name', 'status'].includes(k)).map(([k, v]) => <div key={k}><dt>{columnLabels[k] || k}</dt><dd>{v || 'Не задано'}</dd></div>)}</dl></Modal>}
  {modal === 'help' && <Modal title="Контур 2035" onClose={() => setModal(null)}><div className="help-steps"><p>Сверху показан итог стратегии за все шесть лет. Введите заказ топлива и резерв мощности прямо в таблицу поставок. График пересчитывается автоматически. Общая шкала времени показывает год и день модели; просмотр времени не меняет настройки. «Сохранить» фиксирует план и результат, «Проверка сбоев поставок» запускается отдельно в блоке результата.</p><p>BASE — обычные условия. STRESS — обязательный стресс. «Оба» автоматически рассчитывает одинаковые решения в двух сценариях. Второй вариант можно сохранить в окне «Выгрузка».</p><p>Цена, мощность и единицы взяты из текущего API, а не из изображения-примера. «Год модели» передаёт поле <code>year</code> как есть; отдельные даты финансирования и ввода текущий DTO не различает.</p><Notice tone="warning">Подключён дневной SimulationEngine. Математическая приёмка остаётся у команды модели. Год модели содержит 365 дней. Монте-Карло возвращает сводку, без историй отдельных аварий.</Notice><p className="help">Веб-тесты проверяют интерфейс и API, а не математическую правильность. Начальный запас не считается бесплатным. Полная приёмка модели — задача её владельцев.</p></div></Modal>}
 </div>;
}
