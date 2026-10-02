import { Button, Spinner } from '../components/Ui';
import { Icon } from '../components/Icon';
import { riskAnalysisStatus, riskCanRun } from '../lib/risk';
import type { Workspace } from '../state/useWorkspace';

export function RiskLauncher({w,onOpen}:{w:Workspace;onOpen:(run:boolean)=>void}) {
 const status=riskAnalysisStatus(w.draft,w.both,w.risk,w.riskBusy,w.riskError);
 const invalid=!riskCanRun(w.name,w.draft);
 const scenarioLabel=w.both?'BASE + STRESS':w.draft?.scenario_id==='MANDATORY_STRESS'?'STRESS':'BASE';
 const copy={
  idle:['Как сбои поставок повлияют на запас','Проверить Монте-Карло'],
  running:[`Выполняется: ${scenarioLabel}`,'Проверяем…'],
  ready:['Расчёт готов · параметры не изменились','Посмотреть результат'],
  stale:['Параметры изменились · запустите проверку снова','Проверить снова'],
  error:[w.riskError||'Проверка завершилась с ошибкой','Повторить проверку'],
 }[status];
 return <div className={`risk-launcher risk-launcher-${status}`} data-testid="risk-launcher">
  <div className="risk-launcher-mark"><Icon name="chart" size={19}/></div>
  <div className="risk-launcher-copy"><strong>Проверка устойчивости</strong><span>Монте-Карло · 100 прогонов · {scenarioLabel} · 2035–2040</span><small role={status==='error'?'alert':'status'}>{invalid?'Сначала исправьте ошибки в плане':copy[0]}</small></div>
  <Button kind="primary" data-testid="run-risk-button" disabled={status==='running'||!!w.busy||invalid} onClick={()=>onOpen(status!=='ready')}>
   {status==='running'?<Spinner/>:<Icon name={status==='ready'?'right':'play'} size={14}/>}<span>{copy[1]}</span>
  </Button>
 </div>;
}
