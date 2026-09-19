import { useState } from 'react';
import type { Workspace } from '../state/useWorkspace';
import { Button, Notice, Spinner } from '../components/Ui';
import { number, percent, scenario } from '../lib/format';
import { samePlan } from '../lib/plan';
import { DailyChart } from '../components/DailyChart';
export function RiskPanel({w}: {w: Workspace}) {
 const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
 const [selectedYear, setSelectedYear] = useState<number | null>(null);
 const analysis = w.risk;
 const run = analysis?.runs.find(r => r.plan.scenario_id === selectedScenario) || analysis?.runs[0];
 const years = run?.result.yearly_balance?.map(row => row.year) || [];
 const year = selectedYear !== null && years.includes(selectedYear) ? selectedYear : years[0];
 const changed = !!analysis && (!!w.draft && !samePlan(analysis.basis, w.draft) || analysis.both !== w.both);
 const fields = [
  ['iterations','Прогоны'], ['seed','Seed'], ['probability_of_zero_shortage','Успешные прогоны'],
  ['median_shortage_t','Медианный дефицит, т'], ['p95_shortage_t','95-й процентиль дефицита, т'], ['max_shortage_t','Максимальный дефицит, т'],
 ] as const;
 return <div className="risk-panel">
  <div className="risk-toolbar"><span>{analysis ? `План: ${analysis.basis.plan_id}` : 'Текущие решения'}</span><Button disabled={w.riskBusy || !!w.busy} onClick={() => void w.analyzeRisk()}>Запустить заново</Button></div>
  {w.riskBusy && <div className="risk-progress" role="status"><Spinner/>Анализ {scenario(w.riskStage)}…</div>}
  {w.riskError && <Notice tone="error">{w.riskError}</Notice>}
  {changed && <Notice tone="warning">Решения изменены. Этот анализ относится к прежнему снимку плана.</Notice>}
  {!!analysis?.runs.length && <><div className="table-wrap"><table className="risk-summary"><caption>Монте-Карло: сводка случайных прогонов</caption><thead><tr><th>Показатель</th>{analysis.runs.map(item => <th key={item.plan.scenario_id}>{scenario(item.plan.scenario_id)}</th>)}</tr></thead><tbody>{fields.map(([key,label]) => <tr key={key}><th>{label}</th>{analysis.runs.map(item => {
   const summary = item.result.risk_register?.find(r => r.risk_id === 'R_LAUNCH_FAILURE_MONTE_CARLO');
   const value = summary?.[key], numeric = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
   return <td key={item.plan.scenario_id}>{key==='probability_of_zero_shortage' ? percent(numeric) : number(numeric)}</td>;
  })}</tr>)}</tbody></table></div>
  <p className="help">«Успешные прогоны» — доля прогонов без дефицита и других нарушений по критериям модели. 95-й процентиль — уровень дефицита, не превышенный примерно в 95% прогонов.</p>
  {analysis.runs.some(item => !item.result.risk_register?.some(r => r.risk_id === 'R_LAUNCH_FAILURE_MONTE_CARLO')) && <Notice>Модель не передала сводку рисков для одного из сценариев.</Notice>}
  <div className="risk-chart-heading"><h3>Дневная динамика обычного расчёта</h3><div className="segmented">{analysis.runs.map(item => <button type="button" key={item.plan.scenario_id} aria-pressed={item===run} onClick={() => setSelectedScenario(item.plan.scenario_id)}>{scenario(item.plan.scenario_id)}</button>)}</div><label>Год <select value={year} onChange={e=>setSelectedYear(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}</select></label></div>
  {run && year !== undefined && <DailyChart result={run.result} year={year}/>}
  <p className="help">Эта линия показывает обычный расчёт плана. Истории отдельных случайных прогонов и аварий модель пока не передаёт.</p>
  </>}
 </div>;
}
