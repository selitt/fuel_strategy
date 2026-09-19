import copy

from src.engine.finance import reservation_payment
from src.engine.loader import CaseCatalog
from src.engine.monte_carlo import run_monte_carlo
from src.engine.simulation import simulate_daily


def _catalog(*years: int) -> CaseCatalog:
    catalog = CaseCatalog()
    selected = years or (2035,)
    catalog.demands = {
        year: copy.deepcopy(catalog.demands[year])
        for year in selected
    }
    for demand in catalog.demands.values():
        demand.base_total_t = 0.0
        demand.base_critical_t = 0.0
    catalog.storages["BASE"].capacity_t = 10_000.0
    catalog.storages["BASE"].loss_rate_on_throughput = 0.0
    return catalog


def _order(
    batch_id: str,
    delivery_date: str,
    tonnes: float,
    *,
    source_id: str = "A",
):
    return {
        "year": int(delivery_date[:4]),
        "source_id": source_id,
        "batch_id": batch_id,
        "delivery_date": delivery_date,
        "order_t": tonnes,
    }


def _plan(*orders, reservations=()):
    return {
        "supply_orders": list(orders),
        "capacity_reservations": [
            {
                "year": year,
                "source_id": source_id,
                "reserved_capacity_t": tonnes,
            }
            for year, source_id, tonnes in reservations
        ],
        "investments": [],
        "inventory_policy": {"initial_inventory_t": 0.0},
    }


def _schedule(schedules, year: int, source_id: str):
    return next(
        schedule
        for schedule in schedules
        if schedule.year == year and schedule.source_id == source_id
    )


def test_rescue_uses_arrival_year_reserve_capacity_and_catalog_lead_time():
    catalog = _catalog(2035, 2036)
    catalog.sources["E"].capacity_t_per_year = 6.0
    plan = _plan(
        _order("failed-core", "2035-12-20", 10.0),
        _order("planned-emergency", "2036-01-10", 3.0, source_id="E"),
        reservations=((2035, "A", 10.0), (2036, "E", 6.0)),
    )

    _, schedules, trace, _, _ = simulate_daily(
        catalog,
        "BASE",
        plan,
        monte_carlo_failures={(2035, "A", "failed-core"): True},
    )

    core = _schedule(schedules, 2035, "A")
    emergency = _schedule(schedules, 2036, "E")
    rescue = next(batch for batch in emergency.batches if batch.parent_batch_id)

    assert core.ordered_t == 10.0
    assert core.delivered_t == 0.0
    assert core.procurement_cost_mln == 62.0
    assert emergency.reserved_capacity_t == 6.0
    assert emergency.ordered_t == 6.0
    assert emergency.delivered_t == 6.0
    assert emergency.procurement_cost_mln == 82.8
    assert emergency.reservation_cost_mln == 2.1
    assert rescue.parent_batch_id == "failed-core"
    assert rescue.order_date == "2035-12-20"
    assert rescue.delivery_date == "2036-01-31"
    assert rescue.ordered_t == 3.0
    assert rescue.delivered_t == 3.0
    assert trace[365 + 30].delivered_t == 3.0


def test_scarce_rescue_allocation_is_chronological_with_stable_id_ties():
    catalog = _catalog(2035)
    catalog.sources["E"].capacity_t_per_year = 8.0
    orders = (
        _order("zeta", "2035-02-01", 6.0),
        _order("alpha", "2035-02-01", 6.0),
    )

    def rescued_for(input_orders):
        plan = _plan(
            *input_orders,
            reservations=((2035, "A", 12.0), (2035, "E", 8.0)),
        )
        _, schedules, _, _, _ = simulate_daily(
            catalog,
            "BASE",
            plan,
            monte_carlo_failures={
                (2035, "A", "alpha"): True,
                (2035, "A", "zeta"): True,
            },
        )
        emergency = _schedule(schedules, 2035, "E")
        return {
            batch.parent_batch_id: batch.ordered_t
            for batch in emergency.batches
            if batch.parent_batch_id
        }

    assert rescued_for(orders) == {"alpha": 6.0, "zeta": 2.0}
    assert rescued_for(reversed(orders)) == {"alpha": 6.0, "zeta": 2.0}


def test_failed_rescue_is_paid_recorded_and_does_not_recurse():
    catalog = _catalog(2035)
    plan = _plan(
        _order("core", "2035-03-01", 10.0),
        reservations=((2035, "A", 10.0), (2035, "E", 10.0)),
    )

    _, schedules, trace, _, _ = simulate_daily(
        catalog,
        "BASE",
        plan,
        monte_carlo_failures={
            (2035, "A", "core"): True,
            ("emergency_rescue", 2035, "A", "core"): True,
        },
    )

    emergency = _schedule(schedules, 2035, "E")
    rescues = [batch for batch in emergency.batches if batch.parent_batch_id]
    assert len(rescues) == 1
    assert rescues[0].status == "failed"
    assert rescues[0].ordered_t == 10.0
    assert rescues[0].delivered_t == 0.0
    assert emergency.ordered_t == 10.0
    assert emergency.delivered_t == 0.0
    assert emergency.procurement_cost_mln == 138.0
    assert sum(day.delivered_t for day in trace) == 0.0


def test_generated_rescue_batch_id_cannot_collide_with_original_batch_ids():
    catalog = _catalog(2035)
    plan = _plan(
        _order("core", "2035-03-01", 2.0),
        _order(
            "emergency-rescue:A:core",
            "2035-01-10",
            1.0,
            source_id="E",
        ),
        reservations=((2035, "A", 2.0), (2035, "E", 3.0)),
    )

    _, schedules, _, _, _ = simulate_daily(
        catalog,
        "BASE",
        plan,
        monte_carlo_failures={(2035, "A", "core"): True},
    )

    batch_ids = [
        batch.batch_id
        for schedule in schedules
        for batch in schedule.batches
    ]
    assert len(batch_ids) == len(set(batch_ids))


def test_rescue_arriving_beyond_horizon_cannot_help_inside_horizon():
    catalog = _catalog(2035)
    plan = _plan(
        _order("late", "2035-12-20", 10.0),
        reservations=((2035, "A", 10.0), (2035, "E", 10.0)),
    )

    _, schedules, trace, _, _ = simulate_daily(
        catalog,
        "BASE",
        plan,
        monte_carlo_failures={(2035, "A", "late"): True},
    )

    emergency = _schedule(schedules, 2035, "E")
    assert emergency.ordered_t == 0.0
    assert all(batch.parent_batch_id is None for batch in emergency.batches)
    assert sum(day.delivered_t for day in trace) == 0.0


def test_base_is_deterministic_and_does_not_apply_reliability_or_rescue():
    catalog = _catalog(2035)
    catalog.sources["A"].reliability_profile = "constant:0"
    plan = _plan(
        _order("core", "2035-03-01", 10.0),
        reservations=((2035, "A", 10.0), (2035, "E", 10.0)),
    )

    _, schedules, trace, _, _ = simulate_daily(catalog, "BASE", plan)

    assert _schedule(schedules, 2035, "A").delivered_t == 10.0
    assert _schedule(schedules, 2035, "E").ordered_t == 0.0
    assert sum(day.delivered_t for day in trace) == 10.0


def test_monte_carlo_is_input_order_stable_and_includes_rescue_costs():
    catalog = _catalog(2035)
    catalog.sources["A"].reliability_profile = "constant:0"
    catalog.sources["E"].reliability_profile = "constant:1"
    orders = (
        _order("second", "2035-05-01", 4.0),
        _order("first", "2035-03-01", 6.0),
    )

    def run(input_orders):
        return run_monte_carlo(
            catalog,
            "BASE",
            _plan(
                *input_orders,
                reservations=((2035, "A", 10.0), (2035, "E", 10.0)),
            ),
            iterations=3,
            seed=19,
            include_trajectories=False,
        )

    first = run(orders)
    second = run(reversed(orders))

    assert first["shortage_samples_t"] == second["shortage_samples_t"]
    assert first["total_cost_samples_mln"] == second["total_cost_samples_mln"]
    assert first["emergency_procurement_samples_mln"] == [138.0, 138.0, 138.0]
    assert first["mean_emergency_procurement_mln"] == 138.0
    assert first["p95_emergency_procurement_mln"] == 138.0
    assert first["total_cost_samples_mln"] == [212.73, 212.73, 212.73]
    assert first["mean_total_cost_mln"] == 212.73
    assert first["p95_total_cost_mln"] == 212.73
    assert first["daily_trajectories"]["runs"] == []


def test_emergency_procurement_sample_uses_unrounded_rescue_volume():
    catalog = _catalog(2035)
    catalog.sources["A"].reliability_profile = "constant:0"
    catalog.sources["E"].reliability_profile = "constant:1"
    plan = _plan(
        _order("fractional", "2035-03-01", 1.005),
        reservations=((2035, "A", 1.005), (2035, "E", 1.005)),
    )

    result = run_monte_carlo(
        catalog,
        "BASE",
        plan,
        iterations=1,
        seed=1,
        include_trajectories=False,
    )

    assert result["emergency_procurement_samples_mln"] == [13.87]
    assert result["mean_emergency_procurement_mln"] == 13.87
    assert result["p95_emergency_procurement_mln"] == 13.87


def test_seeded_original_and_rescue_reliability_is_input_order_stable():
    catalog = _catalog(2035)
    catalog.sources["A"].reliability_profile = "constant:0.5"
    catalog.sources["E"].reliability_profile = "constant:0.5"
    orders = (
        _order("second", "2035-05-01", 4.0),
        _order("first", "2035-03-01", 6.0),
    )

    def run(input_orders):
        return run_monte_carlo(
            catalog,
            "BASE",
            _plan(
                *input_orders,
                reservations=((2035, "A", 10.0), (2035, "E", 10.0)),
            ),
            iterations=20,
            seed=73,
            include_trajectories=False,
        )

    first = run(orders)
    second = run(reversed(orders))

    assert first["shortage_samples_t"] == second["shortage_samples_t"]
    assert first["total_cost_samples_mln"] == second["total_cost_samples_mln"]
    assert (
        first["emergency_procurement_samples_mln"]
        == second["emergency_procurement_samples_mln"]
    )


def test_failed_rescue_reliability_does_not_create_recursive_procurement():
    catalog = _catalog(2035)
    catalog.sources["A"].reliability_profile = "constant:0"
    catalog.sources["E"].reliability_profile = "constant:0"
    plan = _plan(
        _order("core", "2035-03-01", 10.0),
        reservations=((2035, "A", 10.0), (2035, "E", 10.0)),
    )

    result = run_monte_carlo(catalog, "BASE", plan, iterations=2, seed=11)

    assert result["emergency_procurement_samples_mln"] == [138.0, 138.0]
    assert [
        sum(run["delivered_t"])
        for run in result["daily_trajectories"]["runs"]
    ] == [0.0, 0.0]


def test_probability_of_all_constraints_uses_full_audit_not_only_stock_checks():
    catalog = _catalog(2035, 2036, 2037)
    catalog.sources["E"].reliability_profile = "constant:1"
    plan = _plan(
        _order("e-2035", "2035-06-01", 1.0, source_id="E"),
        _order("e-2036", "2036-06-01", 1.0, source_id="E"),
        _order("e-2037", "2037-06-01", 1.0, source_id="E"),
        reservations=(
            (2035, "E", 1.0),
            (2036, "E", 1.0),
            (2037, "E", 1.0),
        ),
    )

    result = run_monte_carlo(
        catalog,
        "BASE",
        plan,
        iterations=2,
        seed=42,
        include_trajectories=False,
    )

    assert result["probability_of_no_shortage"] == 1.0
    assert result["probability_of_zero_shortage"] == 1.0
    assert result["probability_of_all_constraints"] == 0.0


def test_reservation_payment_supports_explicit_period_fraction():
    assert reservation_payment(100.0, 0.4, period_fraction=0.5) == 20.0
