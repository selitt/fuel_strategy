from src.engine.finance import calculate_finances
from src.engine.loader import CaseCatalog


def test_investment_decisions_charge_catalog_total_once():
    catalog = CaseCatalog()
    rows, total, capex = calculate_finances(catalog, [], {}, [
        {'investment_id':'EARTH_NEW','year':2035},
        {'investment_id':'LUNAR_ISRU','year':2036},
    ], initial_inventory_t=0)
    assert rows[0].capex == catalog.investments['EARTH_NEW'].total_capex_mln
    assert rows[1].capex == catalog.investments['LUNAR_ISRU'].total_capex_mln
    assert rows[1].opex == 0
    assert rows[3].opex == catalog.investments['LUNAR_ISRU'].fixed_opex_mln_per_year
    assert capex == 1610


def test_storage_finance_reads_changed_catalog():
    catalog = CaseCatalog()
    catalog.storages['BASE'].holding_cost_mln_per_t_year = 2
    catalog.investments['ZBO'].total_capex_mln = 211
    rows, _, _ = calculate_finances(catalog, [], {2035:10}, [{'investment_id':'ZBO','year':2036}], initial_inventory_t=0)
    assert rows[0].holding == 20
    assert rows[1].capex == 211


def test_hidden_payment_aliases_cannot_override_decision_year():
    import pytest
    from src.engine.engine import SimulationEngine
    from src.engine.calendar import PlanValidationError
    for investment in (
        {'investment_id':'EARTH_NEW','year':2035,'exercise_year':2038},
        {'investment_id':'LUNAR_ISRU','year':2036,'capex_schedule':{'2036':0}},
    ):
        with pytest.raises(PlanValidationError):
            SimulationEngine().run('hidden','BASE',{'investments':[investment]})
