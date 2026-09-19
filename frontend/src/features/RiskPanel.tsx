import { useState } from 'react';
import { RiskTrajectoryChart } from '../components/RiskTrajectoryChart';
import { RiskHistogram } from '../components/RiskHistogram';
import { riskDistribution, riskTrajectories } from '../lib/risk';
import type { Workspace } from '../state/useWorkspace';
import { Button, Notice, Spinner } from '../components/Ui';
import { number, percent, scenario } from '../lib/format';
import { samePlan } from '../lib/plan';

const mainFields = [
  ['probability_of_no_shortage', 'Прогоны без дефицита топлива'],
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
  const [chosenScenario,setChosenScenario]=useState<string>();
  const changed = !!analysis && ((!!w.draft && !samePlan(analysis.basis, w.draft)) || analysis.both !== w.both);
  const summaries = analysis?.runs.map(item => ({
    scenarioId: item.plan.scenario_id,
    value: item.result.risk_register?.find(record => record.risk_id === 'R_LAUNCH_FAILURE_MONTE_CARLO'),
  })) || [];
  const trajectories = summaries.map(item=>({...item,data:riskTrajectories(item.value)}));
  const trajectory = trajectories.find(item=>item.scenarioId===chosenScenario) || trajectories[0];
  const distributions = summaries.map(item=>({...item,data:riskDistribution(item.value)}));
  const valid = distributions.flatMap(item=>item.data?[item.data]:[]);
  const domain:[number,number] = valid.length ? [Math.min(...valid.flatMap(d=>d.bins.map(b=>b.lower_t))),Math.max(...valid.flatMap(d=>d.bins.map(b=>b.upper_t)))] : [0,0];
  const maxCount = Math.max(1,...valid.flatMap(d=>d.bins.map(b=>b.count)));
  const iterations = summaries.map(item => item.value?.iterations).find(value => typeof value === 'number' && Number.isFinite(value));

  return <div className="risk-panel">
    <div className="risk-toolbar"><div><strong>Проверка случайных сбоев поставок</strong><span>{analysis ? `План: ${analysis.basis.plan_id}` : 'Текущие решения'}</span></div><Button disabled={w.riskBusy || !!w.busy} onClick={() => void w.analyzeRisk()}>Повторить проверку</Button></div>
    <p className="risk-explanation">Для каждого сценария модель выполняет {typeof iterations === 'number' ? number(iterations) : '100'} прогонов со случайными сбоями поставок. На графике — дневные результаты этих прогонов.</p>
    {w.riskBusy && <div className="risk-progress" role="status"><Spinner/>Проверяем сценарий {scenario(w.riskStage)}…</div>}
    {w.riskError && <Notice tone="error">{w.riskError}</Notice>}
    {changed && <Notice tone="warning">Решения изменены. Эта проверка относится к прежнему снимку плана.</Notice>}
    {!analysis && !w.riskBusy && <p className="help">Запустите проверку, чтобы получить агрегированную оценку устойчивости текущего плана.</p>}
    {!!analysis?.runs.length && <>
      <p className="help">Прототип модели · ограничения расчёта описаны в методике ниже.</p>
      <div className="risk-path-heading"><h3>Как меняется запас при сбоях поставок</h3>{trajectories.length>1&&<div role="group" aria-label="Сценарий траекторий">{trajectories.map(item=><button type="button" key={item.scenarioId} aria-pressed={item.scenarioId===trajectory?.scenarioId} onClick={()=>setChosenScenario(item.scenarioId)}>{scenario(item.scenarioId)}</button>)}</div>}</div>
      {trajectory?.data ? <RiskTrajectoryChart key={trajectory.scenarioId} data={trajectory.data} label={scenario(trajectory.scenarioId)}/> : <Notice>Дневные траектории отсутствуют. Повторите проверку, чтобы увидеть реальные прогоны.</Notice>}
      <details className="risk-distribution-details"><summary>Распределение итогового дефицита и сводные показатели</summary>
      <div className="risk-histograms">{distributions.map(item=>item.data ? <RiskHistogram key={item.scenarioId} data={item.data} label={scenario(item.scenarioId)} domain={domain} maxCount={maxCount}/> : <Notice key={item.scenarioId}>Для сценария «{scenario(item.scenarioId)}» нет полной выборки прогонов. Повторите проверку для получения распределения.</Notice>)}</div>
      <div className="table-wrap"><table className="risk-summary"><caption>Устойчивость плана при случайных сбоях</caption><thead><tr><th>Показатель</th>{analysis.runs.map(item => <th key={item.plan.scenario_id}>{scenario(item.plan.scenario_id)}</th>)}</tr></thead><tbody>{mainFields.map(([key, label]) => <tr key={key}><th>{label}</th>{summaries.map(item => <td key={item.scenarioId}>{riskValue(key, item.value?.[key])}</td>)}</tr>)}</tbody></table></div>
      <p className="help"><strong>Без дефицита и проблем с запасом</strong> означает: топлива хватило, 45-дневный резерв соблюдён на начало каждого года, хранилище не переполнялось. Проверки мощности и затрат в этот процент не входят. Показатель 95% — уровень суммарного дефицита, который не был превышен как минимум в 95% этих прогонов. Это характеристика выборки, а не гарантия будущего результата.</p>
      {summaries.some(item => !item.value) && <Notice>Модель не передала сводку сбоев для одного из сценариев.</Notice>}
      <details className="risk-method"><summary>Методика и дополнительные показатели</summary><div className="risk-method-body">
        <p>Новый расчёт использует следующие правила (для старого ответа без выборки повторите проверку). Медиана — среднее двух центральных значений при чётном числе прогонов. 95%-уровень — элемент с номером ceil(0,95 × число прогонов) в упорядоченной выборке. Частоты столбцов и статистика рассчитаны сервером по возвращённым значениям дефицита, округлённым до 0,01 т. Столбцы включают левую границу, последний включает также правую. Границы в подсказках округлены до шести знаков.</p>
        <p>Начальное значение генератора (seed) нужно для воспроизводимости этого набора случайных прогонов. Медиана и максимум описывают суммарный дефицит за весь горизонт.</p>
        <div className="table-wrap"><table className="risk-raw"><thead><tr><th>Параметр</th>{analysis.runs.map(item => <th key={item.plan.scenario_id}>{scenario(item.plan.scenario_id)}</th>)}</tr></thead><tbody>{detailFields.map(([key, label]) => <tr key={key}><th>{label}</th>{summaries.map(item => <td key={item.scenarioId}>{riskValue(key, item.value?.[key])}</td>)}</tr>)}</tbody></table></div>
        <Notice tone="warning">Модель остаётся прототипом. Надёжность первого рабочего года Earth-New и календарь поставок требуют отдельного исправления и приёмки. Повтор с тем же seed воспроизводит выборку, а не создаёт независимую проверку.</Notice>
        {distributions.filter(item=>item.data).map(item=><details className="risk-samples" key={item.scenarioId}><summary>{scenario(item.scenarioId)}: все {item.data!.iterations} прогонов</summary><div className="table-wrap"><table><thead><tr><th>Прогон</th><th>Дефицит за весь период, т</th></tr></thead><tbody>{item.data!.samples.map((v,i)=><tr key={i}><td>{i+1}</td><td>{number(v)}</td></tr>)}</tbody></table></div></details>)}
      </div></details>
      </details>
    </>}
  </div>;
}

function riskValue(key: string, value: unknown) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  if (key === 'probability_of_zero_shortage' || key === 'probability_of_no_shortage')
    return percent(numeric);
  if (key.endsWith('_shortage_t'))
    return `${number(numeric)} т`;
  return number(numeric);
}
