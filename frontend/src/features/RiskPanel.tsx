import type { Workspace } from '../state/useWorkspace';
import { Button, Notice, Spinner } from '../components/Ui';
import { number, percent, scenario } from '../lib/format';
import { samePlan } from '../lib/plan';

const mainFields = [
  ['probability_of_zero_shortage', 'Прогоны без дефицита и проблем с запасом'],
  ['median_shortage_t', 'Типичный дефицит (медиана)'],
  ['p95_shortage_t', 'Дефицит, не превышенный примерно в 95% прогонов'],
] as const;

const detailFields = [
  ['iterations', 'Число прогонов'],
  ['max_shortage_t', 'Максимальный дефицит'],
  ['seed', 'Seed генератора'],
] as const;

export function RiskPanel({w}: {w: Workspace}) {
  const analysis = w.risk;
  const changed = !!analysis && ((!!w.draft && !samePlan(analysis.basis, w.draft)) || analysis.both !== w.both);
  const summaries = analysis?.runs.map(item => ({
    scenarioId: item.plan.scenario_id,
    value: item.result.risk_register?.find(record => record.risk_id === 'R_LAUNCH_FAILURE_MONTE_CARLO'),
  })) || [];
  const iterations = summaries.map(item => item.value?.iterations).find(value => typeof value === 'number' && Number.isFinite(value));

  return <div className="risk-panel">
    <div className="risk-toolbar"><div><strong>Проверка случайных сбоев поставок</strong><span>{analysis ? `План: ${analysis.basis.plan_id}` : 'Текущие решения'}</span></div><Button disabled={w.riskBusy || !!w.busy} onClick={() => void w.analyzeRisk()}>Повторить проверку</Button></div>
    <p className="risk-explanation">Для каждого сценария модель выполняет {typeof iterations === 'number' ? number(iterations) : '100'} случайных прогонов со сбоями партий поставок. Результаты ниже относятся к этому набору прогонов, а не к обычному дневному расчёту.</p>
    {w.riskBusy && <div className="risk-progress" role="status"><Spinner/>Проверяем сценарий {scenario(w.riskStage)}…</div>}
    {w.riskError && <Notice tone="error">{w.riskError}</Notice>}
    {changed && <Notice tone="warning">Решения изменены. Эта проверка относится к прежнему снимку плана.</Notice>}
    {!analysis && !w.riskBusy && <p className="help">Запустите проверку, чтобы получить агрегированную оценку устойчивости текущего плана.</p>}
    {!!analysis?.runs.length && <>
      <div className="table-wrap"><table className="risk-summary"><caption>Устойчивость плана при случайных сбоях</caption><thead><tr><th>Показатель</th>{analysis.runs.map(item => <th key={item.plan.scenario_id}>{scenario(item.plan.scenario_id)}</th>)}</tr></thead><tbody>{mainFields.map(([key, label]) => <tr key={key}><th>{label}</th>{summaries.map(item => <td key={item.scenarioId}>{riskValue(key, item.value?.[key])}</td>)}</tr>)}</tbody></table></div>
      <p className="help"><strong>Без дефицита и проблем с запасом</strong> означает: топлива хватило, начальный резерв соблюдён, хранилище не переполнялось. Проверки мощности и затрат в этот процент не входят. Показатель 95% — уровень суммарного дефицита, который не был превышен примерно в 95 из 100 прогонов.</p>
      {summaries.some(item => !item.value) && <Notice>Модель не передала сводку сбоев для одного из сценариев.</Notice>}
      <details className="risk-method"><summary>Методика и дополнительные показатели</summary><div className="risk-method-body">
        <p>Начальное значение генератора (seed) нужно для воспроизводимости этого набора случайных прогонов. Медиана и максимум описывают суммарный дефицит за весь горизонт.</p>
        <div className="table-wrap"><table className="risk-raw"><thead><tr><th>Параметр</th>{analysis.runs.map(item => <th key={item.plan.scenario_id}>{scenario(item.plan.scenario_id)}</th>)}</tr></thead><tbody>{detailFields.map(([key, label]) => <tr key={key}><th>{label}</th>{summaries.map(item => <td key={item.scenarioId}>{riskValue(key, item.value?.[key])}</td>)}</tr>)}</tbody></table></div>
      </div></details>
    </>}
  </div>;
}

function riskValue(key: string, value: unknown) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  if (key === 'probability_of_zero_shortage')
    return percent(numeric);
  if (key.endsWith('_shortage_t'))
    return `${number(numeric)} т`;
  return number(numeric);
}
