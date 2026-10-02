"""Organizer V01–V10 exercised through production calculations on synthetic inputs.

These fixtures check arithmetic, not feasibility of a competition strategy.
Expected values are independently specified, never used as calculated outputs.
"""
import pytest

from src.engine import finance
from src.engine.audit import audit_constraints
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog


def catalog(*, daily_demand=0, loss_rate=0):
    value = CaseCatalog()
    for record in value.demands.values():
        record.base_total_t = daily_demand * 365
        record.base_critical_t = 0
    value.storages['BASE'].capacity_t = 100
    value.storages['BASE'].loss_rate_on_throughput = loss_rate
    value.storages['BASE'].holding_cost_mln_per_t_year = 0
    return value


def decisions(volume=0, *, initial=0, reserved=None, year=2035, source='A'):
    return {
        'supply_orders': ([{'year':year,'source_id':source,'order_t':volume,
                           'delivery_date':f'{year}-01-01','batch_id':'control'}] if volume else []),
        'capacity_reservations': [{'year':year,'source_id':source,
                                  'reserved_capacity_t':volume if reserved is None else reserved}],
        'investments': [],
        'inventory_policy': {'initial_inventory_t':initial},
    }


def run(value, plan, scenario='BASE'):
    return SimulationEngine(value).run('SYNTHETIC_CONTROL_ONLY',scenario,plan)


def test_v01_material_balance():
    result = run(catalog(daily_demand=25, loss_rate=2/30), decisions(30,initial=10))
    day = result['inventory_trace'][0]
    assert day['losses_t'] == 2
    assert day['served_total_t'] == 25
    assert day['closing_inventory_t'] == 13


def test_v02_shortage_is_not_negative_inventory():
    day = run(catalog(daily_demand=10),decisions(8))['inventory_trace'][0]
    assert (day['served_total_t'],day['shortage_t'],day['closing_inventory_t']) == (8,2,0)


@pytest.mark.parametrize('control',['V03','V04'])
def test_v03_v04_take_or_pay_is_paid_once(control):
    value = catalog()
    value.sources['A'].variable_cost_mln_per_t = 2
    value.sources['A'].reservation_rate = 0
    value.sources['A'].take_or_pay_share = .7
    result = run(value,decisions(50,reserved=100))
    source = next(s for s in result['source_schedule'] if s['year']==2035 and s['source_id']=='Earth-Core')
    assert source['payable_volume_t'] == 70
    assert source['procurement_cost_mln'] == 140
    assert result['financial_breakdown'][0]['procurement'] == 140


def test_v05_reservation_proportional_period_payment():
    # The plan contract uses annual reservations; this verifies the shared
    # monetary helper for the organizer's half-year arithmetic vector.
    assert hasattr(finance,'reservation_payment')
    assert finance.reservation_payment(100,.4,.5) == 20


def test_v06_throughput_losses_are_not_reapplied_to_stock():
    result = run(catalog(loss_rate=.05),decisions(20))
    assert result['inventory_trace'][0]['losses_t'] == 1
    assert result['yearly_balance'][0]['losses_t'] == 1
    assert result['yearly_balance'][0]['closing_inventory_t'] == 19


def test_v07_physical_45_day_reserve():
    year = run(catalog(daily_demand=1),decisions(initial=45))['yearly_balance'][0]
    assert year['reserve_45d_target_t'] == 45
    assert year['reserve_45d_met'] is True


def test_v08_capacity_audit_reports_excess():
    value = catalog()
    value.sources['A'].capacity_t_per_year = 10
    checks, feasible = audit_constraints(value,'BASE',[],[],[],[],decisions(reserved=12))
    check = next(c for c in checks if c.constraint_id=='CAPACITY_EXCEEDED')
    assert check.excess == 2
    assert check.passed is False
    assert feasible is False


def test_v09_critical_demand_is_part_of_total():
    value = catalog()
    value.demands[2035].base_total_t = 100
    value.demands[2035].base_critical_t = 60
    year = run(value,decisions())['yearly_balance'][0]
    assert year['demand_total_t'] == 100
    assert year['demand_critical_t'] == 60
    assert year['shortage_t'] == 100


def test_v10_mandatory_actual_share_not_multiplied_by_reliability():
    value = catalog()
    value.sources['D'].reliability_profile = 'constant:0.8'
    value.scenarios['MANDATORY_STRESS']['actual_delivery_share']['Lunar-ISRU'][2038] = .5
    plan = decisions(20,year=2038,source='D')
    plan['investments'] = [{'investment_id':'LUNAR_ISRU','year':2036}]
    result = run(value,plan,'MANDATORY_STRESS')
    source = next(s for s in result['source_schedule'] if s['year']==2038 and s['source_id']=='Lunar-ISRU')
    assert source['delivered_t'] == 10
