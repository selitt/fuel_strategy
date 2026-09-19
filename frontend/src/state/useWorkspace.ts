import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, errorText } from '../api/client';
import type { Catalog, Meta, Plan, Project, Result, Summary } from '../api/types';
import { normalizedPlan, samePlan, validateDraft, newPlanId } from '../lib/plan';
import { otherScenario } from '../lib/matrix';
import { useLivePreview } from './useLivePreview';
import { calculateRisks } from '../lib/risk';
import type { RiskRun } from '../lib/risk';
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
    const [both, setBothState] = useState(false);
    const [scope, setScope] = useState(0);
    const [selection, setSelection] = useState<{source: string; year: number} | null>(null);
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
    const [risk, setRisk] = useState<{basis: Plan; both: boolean; runs: RiskRun[]; createdAt: string} | null>(null);
    const [riskBusy, setRiskBusy] = useState(false), [riskStage, setRiskStage] = useState('');
    const [riskError, setRiskError] = useState('');
    const riskLock = useRef(false), mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => {mounted.current = false;}; }, []);
    const lock = useRef(false);
    const live = useLivePreview(draft, both, !loading && !busy && !riskBusy, scope);
    const setBoth = (value: boolean) => { if (value !== both) { live.invalidate(); setBothState(value); } };
    const resetPreview = () => { live.invalidate(); setScope(v => v + 1); setSelection(null); };
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
        if (lock.current || riskLock.current)
            return;
        lock.current = true;
        setBusy(label);
        setError(null);
        setMessage('');
        try {
            await live.pause();
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
    async function save() {
        return execute('Сохраняем…', async () => {
            const saved = await persist();
            const calculated = saved.result_state === 'current' ? saved : await api.calculate(saved.project_id, saved.revision);
            adopt(calculated);
            const basis = normalizedPlan(calculated.plan);
            const createdAt = calculated.last_run?.created_at || new Date().toISOString();
            if (calculated.last_run) {
                if (both) {
                    const otherPlan = otherScenario(basis);
                    let other: Result;
                    try { other = await api.simulate(otherPlan); }
                    catch (error) { live.accept({basis, primary: calculated.last_run.result, createdAt}); throw error; }
                    setPair({ basis, otherPlan, other, createdAt });
                    live.accept({basis, primary: calculated.last_run.result, otherPlan, other, createdAt});
                } else live.accept({basis, primary: calculated.last_run.result, createdAt});
            }
            setMessage('План и результат сохранены'); await listAfterSuccess(); return calculated;
        });
    }
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
    async function load(id: string) { return execute('Открываем…', async () => { const loaded = await api.project(id); resetPreview(); adopt(loaded); }); }
    async function newPlan() {
        return execute('Создаём…', async () => {
            const p = normalizedPlan(await api.template());
            resetPreview(); setPair(null);
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
            resetPreview(); adopt(saved);
            await listAfterSuccess();
            setMessage('Копия создана');
            return saved;
        });
    }
    async function remove() {
        return execute('Удаляем…', async () => {
            if (!project)
                return;
            await api.remove(project.project_id, project.revision);
            const list = await api.list();
            resetPreview(); setProjects(list);
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
                resetPreview(); adopt(imported);
                urlUpdate('plan', imported.project_id);
                await listAfterSuccess();
                setMessage('Проект импортирован отдельной копией');
            }
            else {
                const p = await api.importPlan(file);
                resetPreview(); setProject(null);
                setNameState(file.name.replace(/\.json$/i, '').slice(0, 140));
                setDraftState(normalizedPlan(p.plan));
                setEdited(true);
                urlUpdate('plan');
                setMessage(p.normalized ? 'План импортирован. API добавил поля по умолчанию — проверьте значения.' : 'План импортирован — сохраните или рассчитайте его.');
            }
            setViewState('plan');
        });
    }
    async function analyzeRisk() {
        if (riskLock.current || lock.current) return;
        let basis: Plan;
        try { basis = structuredClone(assertValid()); }
        catch (error) { setRiskError(errorText(error)); return; }
        const pairMode = both;
        riskLock.current = true; setRiskBusy(true); setRiskError('');
        setRisk({basis, both: pairMode, runs: [], createdAt: new Date().toISOString()});
        try {
            await live.pause();
            if (!mounted.current) return;
            await calculateRisks(basis, pairMode, api.analyzeRisk,
                run => {if (mounted.current) setRisk(previous => previous ? {...previous, runs: [...previous.runs, run]} : previous);},
                scenario => {if (mounted.current) setRiskStage(scenario);});
        } catch (error) { if (mounted.current) setRiskError(errorText(error)); }
        finally { riskLock.current = false; if (mounted.current) {setRiskBusy(false);setRiskStage('');} }
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
    const displayed = live.displayed;
    const displayResult = displayed?.primary ?? (current ? project?.last_run?.result : null) ?? null;
    const displayOther = both ? displayed?.other ?? null : null;
    const reportedError = error || live.error;
    return { risk, riskBusy, riskStage, riskError, analyzeRisk, displayResult, displayOther, preview: displayed, previewFresh: live.fresh, selection, setSelection, both, setBoth, pair: pair && draft && samePlan(pair.basis, draft) ? pair : null, saveOther, view, setView, project, draft, name, projects, catalog, meta, loading, busy, error, message, dirty, inputChanged, current,
        setDraft: (p: Plan) => { live.invalidate(); setDraftState(p); setEdited(true); setError(null); },
        setName: (v: string) => { setNameState(v); setEdited(true); },
        setError, clearError: () => { setError(null); live.clearError(); }, setMessage, execute, save, calculate, load, newPlan, copy, remove, importFile, exportFile, refreshList,
        errorMessage: reportedError ? errorText(reportedError) : '', requestId: reportedError instanceof ApiError ? reportedError.requestId : '',
    };
}
export type Workspace = ReturnType<typeof useWorkspace>;
