import copy

import pytest

from src.engine.calendar import PlanValidationError, normalize_plan, source_operating_years
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog
from src.engine.monte_carlo import extract_reliability, run_monte_carlo
from src.engine.simulation import simulate_daily


def _catalog(*, one_year: bool = True) -> CaseCatalog:
    catalog = CaseCatalog()
    if one_year:
        catalog.demands = {2035: copy.deepcopy(catalog.demands[2035])}
    catalog.demands[2035].base_total_t = 0.0
    catalog.demands[2035].base_critical_t = 0.0
    catalog.storages["BASE"].capacity_t = 1_000.0
    catalog.storages["BASE"].loss_rate_on_throughput = 0.0
    return catalog


def _plan(*orders, reservation_t: float = 100.0):
    return {
        "supply_orders": list(orders),
        "capacity_reservations": [
            {
                "year": 2035,
                "source_id": "A",
                "reserved_capacity_t": reservation_t,
            }
        ],
        "investments": [],
        "inventory_policy": {"initial_inventory_t": 0.0},
    }


def _batch(batch_id: str, delivery_date: str, tonnes: float, **extra):
    return {
        "year": 2035,
        "source_id": "A",
        "batch_id": batch_id,
        "delivery_date": delivery_date,
        "order_t": tonnes,
        **extra,
    }


def test_delivery_arrives_on_the_exact_model_calendar_day():
    result = SimulationEngine(_catalog()).run(
        "dated",
        "BASE",
        _plan(_batch("core-feb", "2035-02-01", 10.0)),
    )

    assert result["inventory_trace"][30]["delivered_t"] == 0.0
    assert result["inventory_trace"][31]["delivered_t"] == 10.0
    assert result["source_schedule"][0]["ordered_t"] == 10.0
    assert result["source_schedule"][0]["delivered_t"] == 10.0
    assert result["delivery_schedule"] == [
        {
            "batch_id": "core-feb",
            "source_id": "Earth-Core",
            "year": 2035,
            "order_date": "2034-02-01",
            "delivery_date": "2035-02-01",
            "ordered_t": 10.0,
            "delivered_t": 10.0,
            "status": "delivered",
        }
    ]


def test_march_first_keeps_the_same_day_index_in_a_gregorian_leap_year():
    plan = {
        "supply_orders": [
            _batch("march", "2036-03-01", 10.0, year=2036),
        ],
        "capacity_reservations": [
            {"year": 2036, "source_id": "A", "reserved_capacity_t": 10.0}
        ],
        "investments": [],
        "inventory_policy": {"initial_inventory_t": 0.0},
    }

    result = SimulationEngine(_catalog(one_year=False)).run("leap", "BASE", plan)

    assert result["inventory_trace"][365 + 58]["delivered_t"] == 0.0
    assert result["inventory_trace"][365 + 59]["delivered_t"] == 10.0


def test_multiple_batches_are_aggregated_before_take_or_pay_is_charged():
    result = SimulationEngine(_catalog()).run(
        "annual-top",
        "BASE",
        _plan(
            _batch("core-1", "2035-03-01", 20.0),
            _batch("core-2", "2035-09-01", 30.0),
        ),
    )

    core = result["source_schedule"][0]
    assert core["ordered_t"] == 50.0
    assert core["payable_volume_t"] == 70.0
    assert core["procurement_cost_mln"] == 434.0
    assert sum(row["delivered_t"] for row in result["delivery_schedule"]) == 50.0


@pytest.mark.parametrize(
    ("order", "message"),
    [
        ({"year": 2035, "source_id": "A", "order_t": 1.0}, "delivery_date"),
        (_batch("leap", "2036-02-29", 1.0, year=2036), "29 February"),
        (_batch("wrong-year", "2036-01-01", 1.0), "receipt year"),
        (_batch("unknown", "2035-01-01", 1.0, source_id="NOPE"), "unknown source"),
    ],
)
def test_invalid_batches_are_blocked_instead_of_silently_rescheduled(order, message):
    with pytest.raises(PlanValidationError, match=message):
        SimulationEngine(_catalog(one_year=False)).run(
            "invalid",
            "BASE",
            _plan(order),
        )


def test_zero_order_may_remain_undated_but_still_requires_a_known_source():
    result = SimulationEngine(_catalog()).run(
        "zero",
        "BASE",
        _plan({"year": 2035, "source_id": "A", "order_t": 0.0}),
    )
    assert result["delivery_schedule"] == []

    with pytest.raises(PlanValidationError, match="unknown source"):
        SimulationEngine(_catalog()).run(
            "unknown-zero",
            "BASE",
            _plan({"year": 2035, "source_id": "NOPE", "order_t": 0.0}),
        )


def test_duplicate_batch_ids_and_conflicting_source_aliases_are_rejected():
    with pytest.raises(PlanValidationError, match="duplicate batch_id"):
        SimulationEngine(_catalog()).run(
            "duplicate",
            "BASE",
            _plan(
                _batch("same", "2035-01-10", 10.0),
                _batch("same", "2035-02-10", 10.0),
            ),
        )

    alias_order = _batch(
        "alias",
        "2035-02-10",
        10.0,
        source_id="Earth-Core",
    )
    with pytest.raises(PlanValidationError, match="conflicting aliases"):
        SimulationEngine(_catalog()).run(
            "aliases",
            "BASE",
            _plan(_batch("id", "2035-01-10", 10.0), alias_order),
        )


def test_conflicting_order_field_aliases_are_rejected():
    with pytest.raises(PlanValidationError, match="order_t and order_volume_t"):
        SimulationEngine(_catalog()).run(
            "volume-aliases",
            "BASE",
            _plan(
                _batch(
                    "conflict",
                    "2035-02-01",
                    10.0,
                    order_volume_t=20.0,
                )
            ),
        )


def test_unknown_and_duplicate_investment_decisions_are_rejected():
    plan = _plan()
    plan["investments"] = [{"investment_id": "UNKNOWN", "year": 2035}]
    with pytest.raises(PlanValidationError, match="неизвестная инвестиция"):
        SimulationEngine(_catalog()).run("unknown-investment", "BASE", plan)

    plan["investments"] = [
        {"investment_id": "ZBO", "year": 2035},
        {"investment_id": "ZBO", "year": 2035},
    ]
    with pytest.raises(PlanValidationError, match="повторяется"):
        SimulationEngine(_catalog()).run("duplicate-investment", "BASE", plan)


def test_channel_capacity_and_paid_reservation_are_blocking_inputs():
    with pytest.raises(PlanValidationError, match="reserved capacity"):
        SimulationEngine(_catalog()).run(
            "reservation",
            "BASE",
            _plan(_batch("too-large", "2035-06-01", 101.0), reservation_t=100.0),
        )

    with pytest.raises(PlanValidationError, match="source capacity"):
        SimulationEngine(_catalog()).run(
            "capacity",
            "BASE",
            _plan(_batch("too-large", "2035-06-01", 191.0), reservation_t=191.0),
        )


def test_prehorizon_preparation_date_is_reported_and_allowed():
    result = SimulationEngine(_catalog()).run(
        "pre-horizon",
        "BASE",
        _plan(_batch("january", "2035-01-15", 1.0)),
    )

    assert result["delivery_schedule"][0]["order_date"] == "2034-01-15"


def test_monte_carlo_uses_actual_batch_ids_and_failed_delivery_ledger():
    catalog = _catalog()
    catalog.sources["A"].reliability_profile = "constant:0.5"
    plan = _plan(
        _batch("small", "2035-02-01", 10.0),
        _batch("large", "2035-08-01", 30.0),
    )

    result = run_monte_carlo(catalog, "BASE", plan, iterations=1, seed=1)

    # Random(1): the first batch passes (0.134), the second fails (0.847).
    delivered = result["daily_trajectories"]["runs"][0]["delivered_t"]
    assert sum(delivered) == 10.0
    assert delivered[31] == 10.0
    assert delivered[212] == 0.0

    _, schedules, _, _, _ = simulate_daily(
        catalog,
        "BASE",
        plan,
        monte_carlo_failures={(2035, "A", "large"): True},
    )
    core = next(row for row in schedules if row.source_id == "A")
    assert core.ordered_t == 40.0
    assert core.delivered_t == 10.0
    assert [batch.status for batch in core.batches] == ["delivered", "failed"]


def test_mandatory_stress_lunar_share_is_not_failed_twice_by_bernoulli():
    catalog = _catalog(one_year=False)
    for demand in catalog.demands.values():
        demand.base_total_t = 0.0
        demand.base_critical_t = 0.0
    catalog.storages["BASE"].capacity_t = 1_000.0
    catalog.storages["BASE"].loss_rate_on_throughput = 0.0
    catalog.sources["D"].reliability_profile = "constant:0.0"
    plan = {
        "supply_orders": [
            {
                "year": 2038,
                "source_id": "D",
                "order_t": 100.0,
                "delivery_date": "2038-06-01",
                "batch_id": "lunar-2038",
            }
        ],
        "capacity_reservations": [],
        "investments": [{"investment_id": "LUNAR_ISRU", "year": 2037}],
        "inventory_policy": {"initial_inventory_t": 0.0},
    }

    result = run_monte_carlo(
        catalog,
        "MANDATORY_STRESS",
        plan,
        iterations=1,
        seed=1,
    )

    delivered = result["daily_trajectories"]["runs"][0]["delivered_t"]
    assert sum(delivered) == 55.0
    assert result["analysis_context"] == "RESEARCH_STRESS_RISK"


def test_first_operating_year_reliability_is_relative_to_the_actual_plan():
    profile = "first_operating_year:0.88;later:0.94"

    assert extract_reliability(profile, 2038, first_operating_year=2038) == 0.88
    assert extract_reliability(profile, 2039, first_operating_year=2038) == 0.94

    catalog = _catalog(one_year=False)
    plan = {
        "supply_orders": [],
        "capacity_reservations": [],
        "investments": [{"investment_id": "EARTH_NEW", "year": 2035}],
        "inventory_policy": {"initial_inventory_t": 0.0},
    }
    batches, _ = normalize_plan(catalog, plan)
    assert source_operating_years(catalog, plan, batches)["C"] == 2037
