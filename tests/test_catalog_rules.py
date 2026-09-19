import shutil
from pathlib import Path
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog

ROOT = Path(__file__).resolve().parents[1]


def test_scenario_and_limits_are_loaded_from_data(tmp_path):
    shutil.copytree(ROOT/'data', tmp_path/'data')
    path = tmp_path/'data/scenarios/mandatory_stress.yaml'
    path.write_text(path.read_text().replace('2038: 1.15','2038: 1.20'))
    rules = tmp_path/'data/constraints.csv'
    rules.write_text(rules.read_text().replace('<=,1800,','<=,100,'))
    engine = SimulationEngine(CaseCatalog(tmp_path/'data'))
    result = engine.run('data-check','MANDATORY_STRESS',{
        'investments':[{'investment_id':'ZBO','year':2036}],
        'supply_orders':[], 'capacity_reservations':[], 'inventory_policy':{'initial_inventory_t':0}})
    assert result['yearly_balance'][3]['demand_total_t'] == 300
    check = next(r for r in result['constraint_checks'] if r['constraint_id']=='CAPEX_2037')
    assert check['passed'] is False
    assert check['excess'] == 80


def test_overflow_keeps_an_explicit_mass_balance():
    result = SimulationEngine().run('overflow','BASE', {
        'supply_orders':[{'year':2035,'source_id':'A','order_t':100,'batch_id':'large','delivery_date':'2035-01-01'}],
        'capacity_reservations':[{'year':2035,'source_id':'A','reserved_capacity_t':100}],
        'investments':[], 'inventory_policy':{'initial_inventory_t':0}})
    day = result['inventory_trace'][0]
    assert day['spill_t'] == 25.5
    assert abs(day['opening_inventory_t'] + day['delivered_t'] - day['losses_t'] - day['spill_t'] - day['served_total_t'] - day['closing_inventory_t']) < .02
