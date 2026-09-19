"""Independent diagnostic controls, NOT mathematical acceptance or a passing pytest suite.

Run: python tests/engine_audit.py --output evidence/ENGINE_AUDIT.json
Exits 1 if any expectation fails, 2 if an unexpected execution error occurs.
Synthetic catalog changes are in memory only; engine, API and reference files stay intact.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import platform
import sys
import traceback

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.app.dto.calc_dto import ParticipantPlanDTO
from src.app.service.calc_service import CalculationService
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog
from src.engine.monte_carlo import extract_reliability, run_monte_carlo
from src.engine.simulation import simulate_daily

CASES = []


class Evidence:
    def __init__(self):
        self.inputs = []
        self.checks = []

    def equal(self, name, actual, expected):
        self.checks.append(dict(name=name, expected=expected, actual=actual, passed=actual == expected))

    def near(self, name, actual, expected, tolerance=0.0051):
        self.checks.append(dict(name=name, expected=expected, actual=actual, tolerance=tolerance,
                                passed=abs(actual - expected) <= tolerance))

    def finish(self):
        failures = [check['name'] for check in self.checks if not check['passed']]
        assert self.checks, 'Control contains no expectation'
        assert not failures, '; '.join(failures)


def case(case_id, title, priority, sources, rationale):
    def register(fn):
        CASES.append((dict(id=case_id, title=title, priority=priority, sources=sources,
                          independent_expectation=rationale), fn))
        return fn
    return register


def decisions(initial=0, orders=(), reserved=(), investments=()):
    return dict(inventory_policy={'initial_inventory_t': initial},
                supply_orders=[dict(year=y, source_id=s, order_t=q) for y, s, q in orders],
                capacity_reservations=[dict(year=y, source_id=s, reserved_capacity_t=q) for y, s, q in reserved],
                investments=copy.deepcopy(list(investments)))


def calculate(e, d, scenario='BASE'):
    plan = dict(plan_id='SYNTHETIC_ENGINE_AUDIT', scenario_id=scenario, decisions=d)
    e.inputs.append(plan)
    # Exercise the actual DTO/adapter as well as the engine, without starting HTTP.
    return CalculationService(ROOT / 'data').calculate(ParticipantPlanDTO.model_validate(plan)).model_dump()


def annual(result, year, table='yearly_balance'):
    return next(row for row in result[table] if row['year'] == year)


def source(result, year, name):
    return next(row for row in result['source_schedule'] if row['year'] == year and row['source_id'] == name)


@case('A01', 'Zero inflow: shortage is separate, critical demand belongs to total', 'control',
      ['docs/MODEL.md:13', 'data/demand.csv:2', 'data/validation/control_cases.md:14'],
      'With zero opening stock and no arrivals, 2035 served=0, shortage=100, closing=0; demand is 100, not 180.')
def zero_inflow(e):
    r = calculate(e, decisions())
    b = annual(r, 2035)
    for field, expected in dict(served_t=0, shortage_t=100, closing_inventory_t=0,
                                demand_total_t=100, demand_critical_t=80).items():
        e.equal(field, b[field], expected)
    e.equal('all 2190 daily physical stocks nonnegative', all(t['closing_inventory_t'] >= 0 for t in r['inventory_trace']), True)


@case('A02', 'Daily conservation and one-time throughput losses without overflow', 'control',
      ['docs/MODEL.md:16', 'data/storage_options.csv:2', 'data/validation/control_cases.md:59'],
      '20 initial + 60 gross - 60*0.045 losses = 77.3 served, 22.7 shortage, zero closing. Day16: 20-15*100/365+10-0.45-100/365=25.1664.')
def physical_balance(e):
    r = calculate(e, decisions(20, [(2035, 'Earth-Core', 60)]))
    b = annual(r, 2035)
    for field, expected in dict(delivered_t=60, losses_t=2.7, served_t=77.3, shortage_t=22.7, closing_inventory_t=0).items():
        e.near(field, b[field], expected)
    e.near('day16 closing', r['inventory_trace'][15]['closing_inventory_t'], 20 - 15*100/365 + 10 - .45 - 100/365)
    residual = max(abs(t['opening_inventory_t'] + t['delivered_t'] - t['losses_t'] - t['served_total_t'] - t['closing_inventory_t']) for t in r['inventory_trace'])
    e.near('daily balance, four rounded terms tolerance', residual, 0, tolerance=.0201)


@case('A03', 'Overflow must be accounted as discarded mass in exported balance', 'P2',
      ['docs/MODEL.md:16', 'src/engine/simulation.py:229', 'src/engine/engine.py:135'],
      'Day16 opening=70-15*100/365, gross=100, loss=4.5, served=100/365; uncapped closing=161.1164. A 70t tank discards 91.3904t before service; exported ledger must account for it.')
def overflow_ledger(e):
    r = calculate(e, decisions(70, [(2035, 'Earth-Core', 600)]))
    t = r['inventory_trace'][15]
    e.near('capped day16 closing', t['closing_inventory_t'], 70 - 100/365)
    e.equal('overflow is flagged', any(c['constraint_id'] == 'STORAGE_OVERFLOW' and not c['passed'] for c in r['constraint_checks']), True)
    e.near('explicit discarded mass or balanced exported ledger',
           t['opening_inventory_t'] + t['delivered_t'] - t['losses_t'] - t['served_total_t'] - t['closing_inventory_t'] - t.get('discarded_t', 0), 0, .0201)
    e.near('independent expected discarded mass', t.get('discarded_t', 0), 70 - 15*100/365 + 100 - 4.5 - 70, .0201)


@case('A04', 'Physical reserve uses scenario demand; Emergency reservation is not stock', 'control',
      ['docs/MODEL.md:17', 'docs/MODEL.md:19', 'data/scenarios/mandatory_stress.yaml:8'],
      'Zero physical stock with 80t Emergency capacity still fails reserve. Stress2038 target=250*1.15*45/365=35.4452t.')
def reserve(e):
    r = calculate(e, decisions(reserved=[(2035, 'Emergency', 80)]), 'MANDATORY_STRESS')
    e.equal('2035 physical reserve not met', annual(r, 2035)['reserve_45d_met'], False)
    e.near('2038 scenario reserve target', annual(r, 2038)['reserve_45d_target_t'], 250*1.15*45/365)


@case('A05', 'Reservation above physical channel capacity is diagnosed', 'control',
      ['data/supply_sources.csv:2', 'data/validation/control_cases.md:78'],
      'Earth-Core capacity190, reservation191: CAPACITY_EXCEEDED excess1.')
def reserved_capacity(e):
    r = calculate(e, decisions(reserved=[(2035, 'Earth-Core', 191)]))
    e.equal('capacity excesses', [c['excess'] for c in r['constraint_checks'] if c['constraint_id'] == 'CAPACITY_EXCEEDED'], [1.0])


@case('A06', 'Ordered/delivered volume cannot exceed channel capacity silently', 'P1',
      ['docs/MODEL.md:14', 'data/supply_sources.csv:2', 'src/engine/audit.py:57'],
      'Order191 exceeds physical annual capacity190 even with reservation190. It must be rejected, capacity-limited or explicitly diagnosed.')
def ordered_capacity(e):
    r = calculate(e, decisions(20, [(2035, 'Earth-Core', 191)], [(2035, 'Earth-Core', 190)]))
    s = source(r, 2035, 'Earth-Core')
    capacity_checks = [c for c in r['constraint_checks'] if 'CAPACITY' in c['constraint_id'] and not c['passed']]
    e.equal('capped delivery or explicit capacity diagnosis', s['delivered_t'] <= 190 or bool(capacity_checks), True)
    e.inputs.append({'observed_ordered_t': s['ordered_t'], 'observed_delivered_t': s['delivered_t'], 'capacity_checks': capacity_checks})


@case('A07', 'Annual TOP and reservation are separate, not repeated monthly', 'control',
      ['docs/MODEL.md:24', 'data/supply_sources.csv:2', 'data/validation/control_cases.md:29'],
      'Core order50/reserved100: max(50,.7*100)=70 paid; 70*6.2=434 procurement and100*.45=45 reservation. Gross delivered50.')
def top(e):
    s = source(calculate(e, decisions(0, [(2035, 'Earth-Core', 50)], [(2035, 'Earth-Core', 100)])), 2035, 'Earth-Core')
    for field, expected in dict(payable_volume_t=70, procurement_cost_mln=434, reservation_cost_mln=45, delivered_t=50).items():
        e.near(field, s[field], expected)


@case('A08', 'Mandatory multipliers, ISRU payment and loss ceiling semantics', 'control',
      ['data/scenarios/mandatory_stress.yaml:1', 'docs/MODEL.md:33', 'data/supply_sources.csv:5'],
      'Demand2038..40=287.5/368/448.5; critical195.5/241.5/287.5. Core60 costs465/465/372, Flex60 costs667.5/667.5/534. Lunar120 delivers66/90/120 and pays360 each year. BASE storage remains4.5% loss, violating2% ceiling.')
def mandatory(e):
    d = decisions(0, [(y, s, q) for y in (2038, 2039, 2040) for s, q in [('Earth-Core',60),('Earth-Flex',60),('Lunar-ISRU',120)]],
                  investments=[dict(investment_id='LUNAR_ISRU', year=2038)])
    r = calculate(e, d, 'MANDATORY_STRESS')
    for y, demand, critical, core, flex, lunar, losses in [(2038,287.5,195.5,465,667.5,66,8.37),(2039,368,241.5,465,667.5,90,9.45),(2040,448.5,287.5,372,534,120,10.8)]:
        b = annual(r, y)
        for name, actual, expected in [('total demand',b['demand_total_t'],demand),('critical demand',b['demand_critical_t'],critical),('Core payment',source(r,y,'Earth-Core')['procurement_cost_mln'],core),('Flex payment',source(r,y,'Earth-Flex')['procurement_cost_mln'],flex),('Lunar delivered',source(r,y,'Lunar-ISRU')['delivered_t'],lunar),('Lunar payment',source(r,y,'Lunar-ISRU')['procurement_cost_mln'],360),('gross losses',b['losses_t'],losses)]:
            e.near(f'{y} {name}', actual, expected)
        e.equal(f'{y} loss ceiling fails instead of changing coefficient', [c['passed'] for c in r['constraint_checks'] if c['year']==y and c['constraint_id']=='STRESS_LOSS_LIMIT'], [False])


@case('A09', 'BASE is deterministic and does not multiply by reliability', 'control',
      ['docs/MODEL.md:23', 'data/scenarios/base.yaml:1'],
      'Core60 is delivered60, not57.6. Identical ordinary calculations give identical result dictionaries.')
def deterministic(e):
    d = decisions(20, [(2035, 'Earth-Core', 60)])
    a, b = calculate(e,d), calculate(e,d)
    e.equal('identical full results', a == b, True)
    e.equal('gross Core delivery', source(a,2035,'Earth-Core')['delivered_t'],60)


@case('A10', 'Initial stock is charged, but using a fixed undisclosed source', 'control',
      ['docs/MODEL.md:18', 'src/engine/finance.py:18', 'src/engine/finance.py:79'],
      'Observation under prototype fixed6.2 price: 10 initial tonnes cost62 in2035. This checks arithmetic only, not source/date/preparation correctness.')
def initial_paid(e):
    r=calculate(e,decisions(10))
    e.near('initial procurement', annual(r,2035,'financial_breakdown')['procurement'],62)


@case('A11', 'Explicit Earth-New90+270 and one ZBO180 CAPEX', 'control',
      ['docs/MODEL.md:25', 'docs/MODEL.md:26', 'data/investment_options.csv:2'],
      'Explicit option2036/exercise2038 totals360. Together with ZBO2036 totalCAPEX=540, not720 or900; ZBO OPEX12/year2036..40.')
def explicit_capex(e):
    r=calculate(e,decisions(investments=[dict(investment_id='EARTH_NEW',year=2038,option_year=2036,exercise_year=2038),dict(investment_id='ZBO',year=2036)]))
    e.near('2036 CAPEX',annual(r,2036,'financial_breakdown')['capex'],270)
    e.near('2038 CAPEX',annual(r,2038,'financial_breakdown')['capex'],270)
    e.near('whole CAPEX',sum(f['capex'] for f in r['financial_breakdown']),540)
    e.near('ZBO OPEX',sum(f['opex'] for f in r['financial_breakdown']),60)


@case('A12', 'Year-only Earth-New must not silently omit option90', 'P1',
      ['docs/MODEL.md:25', 'data/investment_options.csv:2', 'src/engine/finance.py:46'],
      'The ordinary UI/DTO EARTH_NEW year2036 activates the investment. Total obligation is360; missing option timing requires explicit rejection/diagnosis, not a silently complete270-cost investment.')
def missing_option(e):
    r=calculate(e,decisions(investments=[dict(investment_id='EARTH_NEW',year=2036)]))
    e.near('Earth-New total CAPEX',sum(f['capex'] for f in r['financial_breakdown']),360)


@case('A13', 'Delayed Lunar commissioning cannot remove1250 CAPEX', 'P1',
      ['data/investment_options.csv:3', 'src/engine/finance.py:95'],
      'Lunar commissioned2039 still needs1250 CAPEX, or must be rejected for absent financing. Its cost cannot be zero merely because commissioning differs from2038.')
def delayed_lunar(e):
    r=calculate(e,decisions(orders=[(2039,'Lunar-ISRU',60)],investments=[dict(investment_id='LUNAR_ISRU',year=2039,commissioning_year=2039)]))
    e.equal('active delivery',source(r,2039,'Lunar-ISRU')['delivered_t'],60)
    e.near('Lunar total CAPEX',sum(f['capex'] for f in r['financial_breakdown']),1250)


@case('A14', 'Channel availability and explicit preparation lead time', 'P1',
      ['data/supply_sources.csv:5', 'data/investment_options.csv:2', 'data/investment_options.csv:3', 'src/engine/simulation.py:106'],
      'Lunar requested commissioning2035 cannot override earliest availability2038. Earth-New explicit exercise2038 requires18-24months preparation, so no2038 delivery is possible even if exercise is on January1. Expected delivery0 or rejection for each impossible request.')
def early_lunar(e):
    r=calculate(e,decisions(orders=[(2035,'Lunar-ISRU',60)],investments=[dict(investment_id='LUNAR_ISRU',year=2035,commissioning_year=2035)]))
    e.near('2035 Lunar delivery',source(r,2035,'Lunar-ISRU')['delivered_t'],0)
    r=calculate(e,decisions(orders=[(2038,'Earth-New',60)],investments=[dict(investment_id='EARTH_NEW',year=2038,commissioning_year=2038,option_year=2036,exercise_year=2038)]))
    e.near('Earth-New delivery in same year as explicit exercise',source(r,2038,'Earth-New')['delivered_t'],0)


@case('A15', 'Monte Carlo fixed-seed reproducibility', 'control',
      ['src/engine/monte_carlo.py:33', 'src/app/service/calc_service.py:81'],
      'Two independent20-iteration runs with seed42 and identical input must yield equal summaries. This is reproducibility, not calibration or confidence.')
def mc_reproducible(e):
    d=decisions(20,[(2035,'Earth-Core',60)])
    e.inputs.append(dict(decisions=d,iterations=20,seed=42))
    a=run_monte_carlo(CaseCatalog(ROOT/'data'),'BASE',d,iterations=20,seed=42)
    b=run_monte_carlo(CaseCatalog(ROOT/'data'),'BASE',d,iterations=20,seed=42)
    e.equal('identical summary',a==b,True)
    e.equal('declared seed',a['seed'],42)


@case('A16', 'Reported zero-shortage probability must measure zero shortage', 'P1',
      ['src/engine/monte_carlo.py:73', 'src/engine/monte_carlo.py:88'],
      'SYNTHETIC one-year demand10/critical8, initial70, Core60, all reliability1: stock alone covers demand so zero-shortage probability1. Overflow exists but cannot change the event named probability_of_zero_shortage.')
def mc_probability(e):
    cat=CaseCatalog(ROOT/'data')
    cat.demands={2035:copy.deepcopy(cat.demands[2035])}
    cat.demands[2035].base_total_t=10
    cat.demands[2035].base_critical_t=8
    for s in cat.sources.values(): s.reliability_profile='constant:1'
    d=decisions(70,[(2035,'Earth-Core',60)])
    e.inputs.append(dict(SYNTHETIC='one year, demand10/critical8, reliability1 in memory',decisions=d,iterations=20,seed=42))
    r=run_monte_carlo(cat,'BASE',d,iterations=20,seed=42)
    e.equal('maximum shortage',r['max_shortage_t'],0)
    e.equal('probability of zero shortage',r['probability_of_zero_shortage'],1)


@case('A17', 'Earth-New reliability is relative to first operating year', 'P1',
      ['data/supply_sources.csv:4', 'src/engine/monte_carlo.py:25'],
      'For a channel first operating2038, first_operating_year:0.88 means0.88 in2038, not0.94. Calendar year2035 is not a universal first operating year.')
def first_operating_reliability(e):
    profile=CaseCatalog(ROOT/'data').sources['Earth-New'].reliability_profile
    e.inputs.append(dict(first_operating_year=2038,profile=profile))
    e.near('first operation reliability2038',extract_reliability(profile,2038),.88,1e-12)


@case('A18', 'MC actual source delivery matches failed-batch physical trace', 'P2',
      ['docs/MODEL.md:14', 'src/engine/simulation.py:137', 'src/engine/simulation.py:151'],
      'Force all six2035 Core batches to fail: ordered60 and paid60 remain, actual delivered must be0 both in source schedule and physical balance.')
def failed_batches_schedule(e):
    d=decisions(0,[(2035,'Earth-Core',60)])
    failures={(2035,'A',i):True for i in range(6)}
    e.inputs.append(dict(decisions=d,forced_failed_batches=[[2035,'A',i] for i in range(6)]))
    balances,schedules,_,_,_=simulate_daily(CaseCatalog(ROOT/'data'),'BASE',d,failures)
    s=next(s for s in schedules if s.year==2035 and s.source_id=='A')
    e.equal('physical delivery',balances[0].delivered_t,0)
    e.equal('actual source delivery',s.delivered_t,0)
    e.equal('obligation retained',s.payable_volume_t,60)


@case('A19', 'Loaded storage coefficient is actually used by calculation', 'P1',
      ['docs/MODEL.md:7', 'src/engine/loader.py:154', 'src/engine/simulation.py:198'],
      'SYNTHETIC in-memory catalog BASE loss0.10 with60t gross must lose6t. This is dependency routing evidence, not a proposed change to reference data.')
def catalog_storage(e):
    cat=CaseCatalog(ROOT/'data')
    cat.storages['BASE'].loss_rate_on_throughput=.10
    d=decisions(20,[(2035,'Earth-Core',60)])
    e.inputs.append(dict(SYNTHETIC='catalog.storages.BASE.loss_rate_on_throughput=0.10 in memory only',decisions=d))
    r=SimulationEngine(cat).run('SYNTHETIC_ENGINE_AUDIT','BASE',d)
    e.near('losses for60 gross',annual(r,2035)['losses_t'],6)


@case('A20', 'Holding uses time-weighted daily closing stock, not annual endpoints', 'control',
      ['docs/MODEL.md:16', 'src/engine/finance.py:84', 'src/engine/simulation.py:267'],
      '20 initial, no supply, annual demand100: stock reaches0 after73 days. Under disclosed daily-end rectangular convention, sum closing stock=72*20-(100/365)*72*73/2=720 tonne-days; holding=.72*720/365=1.42027, rounded1.42. Continuous demand would1.44; within-day convention remains unapproved.')
def holding(e):
    r=calculate(e,decisions(20))
    expected=.72*(72*20-(100/365)*72*73/2)/365
    e.near('2035 holding under daily-end convention',annual(r,2035,'financial_breakdown')['holding'],expected)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'evidence/ENGINE_AUDIT.json')
    args=parser.parse_args()
    results=[]
    for metadata,fn in CASES:
        e=Evidence()
        result=dict(metadata)
        try:
            fn(e)
            e.finish()
            result['status']='PASS'
        except AssertionError as exc:
            result.update(status='FAIL',error=str(exc))
        except Exception as exc:
            result.update(status='ERROR',error=f'{type(exc).__name__}: {exc}',traceback=traceback.format_exc())
        result.update(inputs=e.inputs,checks=e.checks)
        results.append(result)
        print(f"{result['status']:5} {result['id']} {result['title']}",flush=True)
        for check in e.checks:
            if not check['passed']:
                print(f"      {check['name']}: expected={check['expected']!r}; actual={check['actual']!r}",flush=True)
    hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted([*ROOT.glob('src/engine/*.py'),ROOT/'src/app/service/calc_service.py',ROOT/'src/app/dto/calc_dto.py',*ROOT.glob('data/*.csv'),*ROOT.glob('data/scenarios/*.yaml'),ROOT/'docs/MODEL.md'])}
    counts={status:sum(r['status']==status for r in results) for status in ['PASS','FAIL','ERROR']}
    report=dict(scope='20 independent diagnostic controls; NOT V01-V10 acceptance; no engine/data/API mutations',
                runtime=platform.python_version(),rounding='Compare exported two-decimal scalar with tolerance0.0051; rounded multi-term ledger tolerance0.0201.',
                counts=counts,source_sha256=hashes,cases=results)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps(counts),flush=True)
    return 2 if counts['ERROR'] else 1 if counts['FAIL'] else 0


if __name__=='__main__':
    raise SystemExit(main())
