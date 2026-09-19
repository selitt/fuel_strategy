import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from './state/useWorkspace';
import { Brand, Icon } from './components/Icon';
import { Button, Modal, Spinner, Notice } from './components/Ui';
import { Infrastructure } from './features/Infrastructure';
import { SupplyMatrix } from './features/SupplyMatrix';
import { ResultPanel } from './features/ResultPanel';
import { ResultDetails } from './features/ResultDetails';
import { PlanEditor } from './features/PlanEditor';
import { Compare } from './features/Compare';
import { DataCatalog } from './features/DataCatalog';
import { downloadBlob, jsonDownload, scenario } from './lib/format';
import { columnLabels } from './lib/catalog';
import { scenarioPairCsv } from './lib/pair';
import type { MatrixSource } from './lib/matrix';
type Dialog = 'help' | 'copy' | 'delete' | 'projects' | 'export' | 'advanced' | 'data' | 'results' | 'compare' | null;
export default function App() {
    const w = useWorkspace(), file = useRef<HTMLInputElement>(null), menu = useRef<HTMLDetailsElement>(null);
    const [modal, setModal] = useState<Dialog>(null), [pending, setPending] = useState<(() => void) | null>(null), [source, setSource] = useState<MatrixSource | null>(null);
    const [copyName, setCopyName] = useState(''), [copyScenario, setCopyScenario] = useState('BASE'), [mobile, setMobile] = useState<'plan' | 'result'>('plan');
    function guard(action: () => void) { if (w.dirty)
        setPending(() => action);
    else
        action(); }
    function menuAction(action: () => void) { if (menu.current)
        menu.current.open = false; action(); }
    function importFile() { guard(() => file.current?.click()); }
    function showCopy() { setCopyName((w.name + ' — копия').slice(0, 140)); setCopyScenario(w.draft?.scenario_id || 'BASE'); setModal('copy'); }
    function mode(value: 'BASE' | 'MANDATORY_STRESS' | 'both') {
        if (value === 'both') {
            w.setBoth(true);
            return;
        }
        w.setBoth(false);
        if (w.draft && w.draft.scenario_id !== value)
            w.setDraft({ ...w.draft, scenario_id: value });
    }
    useEffect(() => {
        const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (!w.busy)
                void w.save();
        } if (e.key === 'Escape' && menu.current)
            menu.current.open = false; };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    });
    useEffect(() => { const outside = (e: MouseEvent) => { if (menu.current && !menu.current.contains(e.target as Node))
        menu.current.open = false; }; document.addEventListener('click', outside); return () => document.removeEventListener('click', outside); }, []);
    const advanced = () => setModal('advanced');
    return <div className="operator-app">
  <a href="#main" className="skip-link">Перейти к плану</a>
  <header className="operator-header"><div className="identity"><Brand /><div><strong>Контур<span>2035</span></strong><small>Планирование снабжения</small></div></div>
   <div className="plan-title"><button type="button" className="icon-button" aria-label="Открыть сохранённый план" onClick={() => setModal('projects')} disabled={!!w.busy}><Icon name="folder"/></button><label className="sr-only" htmlFor="plan-name">Название плана</label><input id="plan-name" name="plan-name" title="Название плана — можно изменить" value={w.name} maxLength={140} disabled={!!w.busy} autoComplete="off" onChange={e => w.setName(e.target.value)}/><span className={`save-dot ${w.dirty ? 'dirty' : ''}`} title={w.dirty ? 'Есть несохранённые изменения' : 'Нет несохранённых изменений'}/></div>
   <div className="scenario-switch" aria-label="Режим расчёта"><button type="button" disabled={!!w.busy} aria-pressed={!w.both && w.draft?.scenario_id === 'BASE'} onClick={() => mode('BASE')}>BASE</button><button type="button" disabled={!!w.busy} aria-pressed={!w.both && w.draft?.scenario_id === 'MANDATORY_STRESS'} onClick={() => mode('MANDATORY_STRESS')}>STRESS</button><button type="button" disabled={!!w.busy} aria-pressed={w.both} onClick={() => mode('both')}><Icon name="compare" size={14}/><span>Оба</span></button></div>
   <div className="header-actions"><Button kind="primary" className="calculate-button" disabled={!!w.busy || !w.draft || w.loading} onClick={() => void w.calculate()}>{w.busy ? <Spinner /> : <Icon name="play" size={14}/>}<span>{w.busy ? 'Выполняем…' : w.both ? 'Рассчитать оба' : 'Рассчитать'}</span></Button>
    <details ref={menu} className="actions-menu"><summary aria-label="Действия с планом"><Icon name="more"/></summary><div className="menu-panel">
     <button type="button" disabled={!!w.busy} onClick={() => menuAction(() => guard(() => void w.newPlan()))}><Icon name="plus"/>Новый план из шаблона API</button>
     <button type="button" disabled={!!w.busy || !w.draft} onClick={() => menuAction(() => void w.save())}><Icon name="save"/>Сохранить<span className="key-hint">Ctrl S</span></button>
     <button type="button" disabled={!!w.busy || !w.draft} onClick={() => menuAction(showCopy)}><Icon name="copy"/>Создать копию</button>
     <div className="menu-divider"/>
     <button type="button" disabled={!!w.busy} onClick={() => menuAction(importFile)}><Icon name="upload"/>Загрузить JSON</button>
     <button type="button" disabled={!!w.busy || !w.draft} onClick={() => menuAction(() => setModal('export'))}><Icon name="download"/>Скачать…</button>
     <button type="button" onClick={() => menuAction(() => setModal('compare'))}><Icon name="compare"/>Сравнить сохранённые планы</button>
     <button type="button" onClick={() => menuAction(() => setModal('help'))}><Icon name="info"/>О модели и интерфейсе</button>
     <div className="menu-divider"/><button className="danger-text" type="button" disabled={!!w.busy || !w.project} onClick={() => menuAction(() => setModal('delete'))}><Icon name="trash"/>Удалить план</button>
    </div></details>
   </div>
  </header>
  {w.errorMessage && <div className="error-banner" role="alert"><Icon name="alert"/><div><strong>{w.errorMessage}</strong>{w.requestId && <small>Запрос: {w.requestId}</small>}{w.project && <button className="text-button" type="button" disabled={!!w.busy} onClick={() => guard(() => void w.load(w.project!.project_id))}>Открыть версию с сервера</button>}{!w.draft && !w.loading && <button className="text-button" type="button" onClick={() => location.reload()}>Повторить подключение</button>}</div><button type="button" className="icon-button" aria-label="Закрыть ошибку" onClick={w.clearError}><Icon name="close"/></button></div>}
  <div className="mobile-switch segmented"><button type="button" aria-pressed={mobile === 'plan'} onClick={() => setMobile('plan')}>План</button><button type="button" aria-pressed={mobile === 'result'} onClick={() => setMobile('result')}>Результат</button></div>
  <main id="main" className={`operator-grid mobile-${mobile}`} tabIndex={-1}>
   {w.loading ? <div className="loading-state" role="status"><Spinner />Открываем план…</div> : <><Infrastructure w={w} onAdvanced={advanced} onData={() => setModal('data')}/><SupplyMatrix w={w} onAdvanced={advanced} onSource={setSource}/><ResultPanel w={w} onDetails={() => setModal('results')}/></>}
  </main>
  <footer className="operator-footer"><span>{w.busy || (w.dirty ? 'Изменения сохранятся перед расчётом' : 'Решения, результаты и данные — в одном пространстве')}</span><button type="button" onClick={() => setModal('help')}>Прототип расчёта<Icon name="info" size={12}/></button></footer>
  <input ref={file} className="sr-only" type="file" accept=".json,application/json" aria-label="Файл плана или проекта" onChange={e => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) {
        setModal(null);
        void w.importFile(f);
    } }}/>
  <div className={`toast ${w.message ? 'visible' : ''}`} role="status" aria-live="polite">{w.message && <><Icon name="check"/>{w.message}</>}</div>
  {pending && <Modal title="Сохранить изменения?" onClose={() => setPending(null)}><p>Открытие другого плана заменит текущие правки.</p>{w.errorMessage && <Notice tone="error">{w.errorMessage}</Notice>}<div className="modal-actions"><Button onClick={() => setPending(null)}>Остаться</Button><Button kind="danger" onClick={() => { const action = pending; setPending(null); action(); }}>Не сохранять</Button><Button kind="primary" disabled={!!w.busy} onClick={() => { const action = pending; void w.save().then(p => { if (p) {
        setPending(null);
        action();
    } }); }}>Сохранить и продолжить</Button></div></Modal>}
  {modal === 'projects' && <Modal title="Сохранённые планы" onClose={() => setModal(null)}><div className="saved-plans">{w.projects.map(p => <button type="button" key={p.project_id} onClick={() => { setModal(null); guard(() => void w.load(p.project_id)); }}><Icon name="plan"/><span><strong>{p.name}</strong><small>{scenario(p.scenario_id)}</small></span><Icon name="right"/></button>)}{!w.projects.length && <p className="help">План появится здесь после сохранения или расчёта.</p>}</div><div className="modal-actions"><Button onClick={() => { setModal(null); importFile(); }}><Icon name="upload"/>Загрузить JSON</Button><Button kind="primary" onClick={() => { setModal(null); guard(() => void w.newPlan()); }}><Icon name="plus"/>Новый план</Button></div></Modal>}
  {modal === 'copy' && <Modal title="Создать копию" onClose={() => setModal(null)}>{w.errorMessage && <Notice tone="error">{w.errorMessage}</Notice>}<form onSubmit={e => { e.preventDefault(); void w.copy(copyName, copyScenario).then(p => { if (p)
        setModal(null); }); }}><label className="field">Название копии<input required maxLength={140} autoComplete="off" value={copyName} onChange={e => setCopyName(e.target.value)}/></label><label className="field">Сценарий<select aria-label="Сценарий копии" value={copyScenario} onChange={e => setCopyScenario(e.target.value)}><option value="BASE">BASE</option><option value="MANDATORY_STRESS">STRESS</option>{!['BASE', 'MANDATORY_STRESS'].includes(copyScenario) && <option>{copyScenario}</option>}</select></label><div className="modal-actions"><Button type="submit" kind="primary" disabled={!!w.busy || !copyName.trim()}>Создать копию</Button></div></form></Modal>}
  {modal === 'delete' && <Modal title="Удалить план?" onClose={() => setModal(null)}><p>«{w.name}» и его сохранённый результат будут удалены. Скачанные файлы останутся.</p><div className="modal-actions"><Button onClick={() => setModal(null)}>Отмена</Button><Button kind="danger" onClick={() => { setModal(null); void w.remove(); }}>Удалить</Button></div></Modal>}
  {modal === 'export' && <Modal title="Скачать данные" onClose={() => setModal(null)}><p className="help">JSON-проект можно открыть снова. CSV-архив содержит таблицы и результат расчёта.</p><div className="export-options">{([['plan', 'План JSON', 'Текущие решения'], ['project', 'Проект целиком', 'Решения и сохранённый результат'], ['json', 'Результат JSON', 'Ответ модели с происхождением'], ['csv', 'Результат CSV', 'Архив таблиц по годам']] as const).map(([kind, title, subtitle]) => <button type="button" key={kind} disabled={!!w.busy || ((kind === 'json' || kind === 'csv') && (!w.current || w.dirty))} onClick={() => void w.exportFile(kind)}><Icon name="download"/><span><strong>{title}</strong><small>{subtitle}</small></span></button>)}</div>{w.pair && <div className="modal-actions"><Button onClick={() => jsonDownload({ format: 'fuel-scenario-comparison-v1', created_at: w.pair!.createdAt, basis_plan: w.pair!.basis, primary_run: w.project?.last_run, other_plan: w.pair!.otherPlan, other_result: w.pair!.other, other_origin: 'stateless-api-calc' }, 'scenario-comparison.json')}>Сравнение JSON</Button><Button onClick={() => { if (w.pair && w.project?.last_run)
        downloadBlob(new Blob([scenarioPairCsv(w.project.last_run, w.pair.otherPlan, w.pair.other)], { type: "text/csv;charset=utf-8" }), "scenario-comparison.csv"); }}>Сравнение CSV</Button><Button disabled={!!w.busy} onClick={() => void w.saveOther()}>Сохранить второй сценарий</Button></div>}</Modal>}
  {modal === 'advanced' && <Modal title="Полные записи плана" wide onClose={() => setModal(null)}><Notice>Все исходные записи доступны отдельно. Дубли и расширенные поля не объединяются матрицей.</Notice><PlanEditor w={w}/></Modal>}
  {modal === 'data' && <Modal title="Контрольный набор" wide onClose={() => setModal(null)}><DataCatalog w={w} onImport={importFile}/></Modal>}
  {modal === 'results' && <Modal title="Результат подробно" wide onClose={() => setModal(null)}><ResultDetails w={w}/></Modal>}
  {modal === 'compare' && <Modal title="Сравнение сохранённых планов" wide onClose={() => setModal(null)}><Compare w={w}/></Modal>}
  {source && <Modal title={source.label} onClose={() => setSource(null)}><p className="help">Параметры текущего каталога API. Числа не взяты из иллюстраций интерфейса.</p><dl className="reference-values">{Object.entries(source.reference || { source_id: source.writeId }).filter(([k]) => !['name', 'status'].includes(k)).map(([k, v]) => <div key={k}><dt>{columnLabels[k] || k}</dt><dd>{v || 'Не задано'}</dd></div>)}</dl></Modal>}
  {modal === 'help' && <Modal title="Контур 2035" onClose={() => setModal(null)}><div className="help-steps"><p>Слева выберите инфраструктуру. В матрице задайте заказ и бронь; выбранную ячейку можно менять ползунками и стрелками. «Рассчитать» сохраняет план и обновляет графики справа.</p><p>BASE — обычные условия. STRESS — обязательный стресс. «Оба» рассчитывает одинаковые решения в двух сценариях без создания лишних проектов. Второй вариант можно сохранить через «Скачать…».</p><p>Цена, мощность и единицы взяты из текущего API, а не из изображения-примера. «Год модели» передаёт поле <code>year</code> как есть; отдельные даты финансирования и ввода текущий DTO не различает.</p><Notice tone="warning">В поставленном архиве подключён исходный расчётный прототип. Новый код модели и вероятностные расчёты не приложены. Монте-Карло и вымышленные пресеты не добавлены.</Notice><p className="help">Веб-тесты проверяют интерфейс и API, а не математическую правильность. Начальный запас не считается бесплатным. Полная приёмка модели — задача её владельцев.</p></div></Modal>}
 </div>;
}
