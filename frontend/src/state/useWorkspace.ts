import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, errorText } from '../api/client';
import type { Catalog, Meta, Plan, Project, Result, Summary } from '../api/types';
import { normalizedPlan, samePlan, validateDraft, newPlanId } from '../lib/plan';
import { otherScenario } from '../lib/matrix';
export type ScenarioPair = {
    basis: Plan;
    otherPlan: Plan;
    other: Result;
    createdAt: string;
};
export type View = 'overview' | 'plan' | 'compare' | 'data';
function initialView(): View { const v = new URLSearchParams(location.search).get('view'); return ['overview', 'plan', 'compare', 'data'].includes(v || '') ? v as View : 'plan'; }
function urlUpdate(view: View, id?: string) { const u = new URL(location.href); u.searchParams.set('view', view); if (id)
    u.searchParams.set('project', id);
else
    u.searchParams.delete('project'); history.replaceState(null, '', u); }
export function useWorkspace() {
    const [both, setBoth] = useState(false);
    const [pair, setPair] = useState<ScenarioPair | null>(null);
    const [view, setViewState] = useState<View>(initialView);
    const [project, setProject] = useState<Project | null>(null);
    const [draft, setDraftState] = useState<Plan | null>(null);
    const [name, setNameState] = useState('Новый план');
    const [edited, setEdited] = useState(false);
    const [projects, setProjects] = useState<Summary[]>([]);
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState<unknown>(null);
    const [message, setMessage] = useState('');
    const lock = useRef(false);
    const inputChanged = !!draft && (project ? !samePlan(draft, project.plan) : edited);
    const dirty = !!draft && (project ? (inputChanged || name !== project.name) : edited);
    const current = !!project && project.result_state === 'current' && !inputChanged;
    const setView = useCallback((v: View) => { setViewState(v); urlUpdate(v, project?.project_id); }, [project?.project_id]);
    const adopt = useCallback((p: Project) => { setPair(null); setProject(p); setDraftState(normalizedPlan(p.plan)); setNameState(p.name); setEdited(false); urlUpdate(view, p.project_id); }, [view]);
    const refreshList = useCallback(async () => { setProjects(await api.list()); }, []);
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [m, c, list] = await Promise.all([api.meta(), api.catalog(), api.list()]);
                if (!active)
                    return;
                setMeta(m);
                setCatalog(c);
                setProjects(list);
                const requested = new URLSearchParams(location.search).get('project');
                if (requested || list.length) {
                    const p = await api.project(requested || list[0].project_id);
                    if (active) {
                        setProject(p);
                        setDraftState(normalizedPlan(p.plan));
                        setNameState(p.name);
                        urlUpdate(initialView(), p.project_id);
                    }
                }
                else {
                    const p = await api.template();
                    if (active)
                        setDraftState(normalizedPlan(p));
                }
            }
            catch (e) {
                if (active)
                    setError(e);
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);
    useEffect(() => { const f = (e: BeforeUnloadEvent) => { if (dirty) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f); }, [dirty]);
    useEffect(() => { if (!message)
        return; const timer = setTimeout(() => setMessage(''), 4500); return () => clearTimeout(timer); }, [message]);
    async function execute<T>(label: string, work: () => Promise<T>): Promise<T | undefined> {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(label);
        setError(null);
        setMessage('');
        try {
            return await work();
        }
        catch (e) {
            setError(e);
            return undefined;
        }
        finally {
            lock.current = false;
            setBusy('');
        }
    }
    function assertValid() { if (!draft)
        throw new Error('Сначала создайте или откройте план.'); const errors = validateDraft(name, draft); if (errors.length)
        throw new Error(errors.join('\n')); return draft; }
    async function persist(): Promise<Project> {
        const p = assertValid();
        if (project && !dirty)
            return project;
        const saved = project ? await api.update(project.project_id, name.trim(), p, project.revision) : await api.create(name.trim(), p);
        adopt(saved);
        return saved;
    }
    async function listAfterSuccess() { try {
        await refreshList();
    }
    catch {
        setMessage('Изменение сохранено. Не удалось обновить список планов.');
    } }
    async function save() { return execute('Сохраняем…', async () => { const p = await persist(); await listAfterSuccess(); setMessage('План сохранён'); return p; }); }
    async function calculate() {
        return execute('Рассчитываем…', async () => {
            const saved = await persist();
            const calculated = await api.calculate(saved.project_id, saved.revision);
            adopt(calculated);
            await listAfterSuccess();
            if (both) {
                const basis = normalizedPlan(calculated.plan);
                const otherPlan = otherScenario(basis);
                const other = await api.simulate(otherPlan);
                setPair({ basis, otherPlan, other, createdAt: new Date().toISOString() });
            }
            setViewState('plan');
            urlUpdate('plan', calculated.project_id);
            setMessage(both ? 'Оба сценария рассчитаны' : 'Результат получен');
        });
    }
    async function load(id: string) { return execute('Открываем…', async () => { adopt(await api.project(id)); }); }
    async function newPlan() {
        return execute('Создаём…', async () => {
            setPair(null);
            const p = normalizedPlan(await api.template());
            setProject(null);
            setNameState('Новый план');
            setDraftState({ ...p, plan_id: newPlanId() });
            setEdited(false);
            setViewState('plan');
            urlUpdate('plan');
        });
    }
    async function copy(copyName: string, scenarioId: string) {
        return execute('Создаём копию…', async () => {
            const p = assertValid();
            const saved = await api.create(copyName.trim(), { ...p, plan_id: newPlanId(), scenario_id: scenarioId });
            adopt(saved);
            await listAfterSuccess();
            setMessage('Копия создана. Рассчитайте её для сравнения.');
            return saved;
        });
    }
    async function remove() {
        return execute('Удаляем…', async () => {
            if (!project)
                return;
            await api.remove(project.project_id, project.revision);
            const list = await api.list();
            setProjects(list);
            if (list.length)
                adopt(await api.project(list[0].project_id));
            else {
                setProject(null);
                setDraftState(normalizedPlan(await api.template()));
                setNameState('Новый план');
                setEdited(false);
                setViewState('plan');
                urlUpdate('plan');
            }
            setMessage('План удалён');
        });
    }
    async function importFile(file: File) {
        return execute('Импортируем…', async () => {
            if (file.size > (meta?.max_upload_bytes || 2097152))
                throw new Error('Файл превышает допустимый размер ' + (meta?.max_upload_bytes || 2097152) + ' байт.');
            if (!file.name.toLowerCase().endsWith('.json'))
                throw new Error('Выберите JSON-план или JSON-проект. CSV/XLSX ещё не подключены к модели.');
            let probe: unknown;
            try {
                probe = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
            }
            catch {
                throw new Error('Не удалось прочитать JSON. Проверьте синтаксис файла.');
            }
            if (probe && typeof probe === 'object' && 'schema_version' in probe && 'project_id' in probe) {
                const imported = await api.importProject(file);
                adopt(imported);
                urlUpdate('plan', imported.project_id);
                await listAfterSuccess();
                setMessage('Проект импортирован отдельной копией');
            }
            else {
                const p = await api.importPlan(file);
                setProject(null);
                setNameState(file.name.replace(/\.json$/i, '').slice(0, 140));
                setDraftState(normalizedPlan(p.plan));
                setEdited(true);
                urlUpdate('plan');
                setMessage(p.normalized ? 'План импортирован. API добавил поля по умолчанию — проверьте значения.' : 'План импортирован — сохраните или рассчитайте его.');
            }
            setViewState('plan');
        });
    }
    async function saveOther() {
        return execute('Сохраняем второй сценарий…', async () => {
            if (!pair || !draft || !samePlan(pair.basis, draft))
                throw new Error('Сначала рассчитайте оба сценария.');
            const saved = await api.create(name + ' — ' + (pair.otherPlan.scenario_id === 'BASE' ? 'BASE' : 'STRESS'), { ...pair.otherPlan, plan_id: newPlanId() });
            await api.calculate(saved.project_id, saved.revision);
            await listAfterSuccess();
            setMessage('Второй сценарий сохранён отдельным проектом');
        });
    }
    async function exportFile(kind: 'plan' | 'project' | 'json' | 'csv') {
        return execute('Готовим файл…', async () => {
            if (kind === 'plan') {
                await api.exportPlan(assertValid());
                return;
            }
            if (kind === 'project') {
                const p = await persist();
                await listAfterSuccess();
                await api.exportProject(p.project_id);
                return;
            }
            if (!project || !current || dirty)
                throw new Error('Сначала сохраните и пересчитайте текущий план.');
            await api.exportResult(project.project_id, kind);
        });
    }
    return { both, setBoth, pair: pair && draft && samePlan(pair.basis, draft) ? pair : null, saveOther, view, setView, project, draft, name, projects, catalog, meta, loading, busy, error, message, dirty, inputChanged, current,
        setDraft: (p: Plan) => { setDraftState(p); setEdited(true); setError(null); },
        setName: (v: string) => { setNameState(v); setEdited(true); },
        setError, clearError: () => setError(null), setMessage, execute, save, calculate, load, newPlan, copy, remove, importFile, exportFile, refreshList,
        errorMessage: error ? errorText(error) : '', requestId: error instanceof ApiError ? error.requestId : '',
    };
}
export type Workspace = ReturnType<typeof useWorkspace>;
