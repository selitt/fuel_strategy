import math
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from src.engine.monte_carlo import run_monte_carlo


def _catalog(*, reliability: str | None = None):
    sources = {}
    if reliability is not None:
        sources["A"] = SimpleNamespace(
            source_id="A",
            reliability_profile=reliability,
        )
    return SimpleNamespace(demands={2035: object()}, sources=sources)


def _daily_result(shortage: float, violations=()):
    return ([SimpleNamespace(shortage_t=shortage)], [], [], list(violations), {})


def _trace_day(
    day: int,
    *,
    inventory: float,
    shortage: float,
    delivered: float,
    year: int = 2035,
):
    return SimpleNamespace(
        day=day,
        year=year,
        day_of_year=day + 1,
        closing_inventory_t=inventory,
        shortage_t=shortage,
        delivered_t=delivered,
    )


def _daily_result_with_trace(shortage: float, trace, violations=()):
    return ([SimpleNamespace(shortage_t=shortage)], [], trace, list(violations), {})


def test_exports_samples_in_run_order_and_uses_documented_statistics():
    # The outlier is deliberately first: exporting a sorted list would hide the
    # actual iteration order. For n=100 nearest-rank p95 is index 94, not 95.
    samples = [1000.0, 0.0, *map(float, range(1, 99))]
    results = iter(
        _daily_result(value, ["reserve violation"] if index == 1 else ())
        for index, value in enumerate(samples)
    )

    with patch("src.engine.monte_carlo.simulate_daily", side_effect=lambda **_: next(results)):
        result = run_monte_carlo(_catalog(), "BASE", {}, iterations=100, seed=42)

    assert result["shortage_samples_t"] == samples
    assert result["median_shortage_t"] == 49.5
    assert result["p95_shortage_t"] == 94.0
    assert result["max_shortage_t"] == 1000.0
    assert result["quantile_method"] == "nearest_rank"
    assert result["median_method"] == "arithmetic_middle"

    assert result["zero_shortage_runs"] == 1
    assert result["probability_of_no_shortage"] == 0.01
    assert result["successful_runs"] == 0
    # Kept for compatibility: this is the compound event, despite its old name.
    assert result["probability_of_zero_shortage"] == 0.0


def test_histogram_covers_each_rounded_sample_once_with_last_upper_inclusive():
    samples = [float(value) for value in range(100)]
    results = iter(_daily_result(value) for value in samples)

    with patch("src.engine.monte_carlo.simulate_daily", side_effect=lambda **_: next(results)):
        result = run_monte_carlo(_catalog(), "BASE", {}, iterations=100)

    histogram = result["shortage_histogram"]
    assert len(histogram) == 10
    assert sum(bin_["count"] for bin_ in histogram) == 100
    assert histogram[0]["lower_t"] == 0.0
    assert histogram[-1]["upper_t"] == 99.0

    for index, sample in enumerate(result["shortage_samples_t"]):
        memberships = [
            bin_["lower_t"] <= sample < bin_["upper_t"]
            or (bin_index == len(histogram) - 1 and sample == bin_["upper_t"])
            for bin_index, bin_ in enumerate(histogram)
        ]
        assert sum(memberships) == 1, (index, sample, histogram)


def test_histogram_uses_one_degenerate_bin_when_all_samples_are_equal():
    with patch(
        "src.engine.monte_carlo.simulate_daily",
        side_effect=[_daily_result(0.0) for _ in range(4)],
    ):
        result = run_monte_carlo(_catalog(), "BASE", {}, iterations=4)

    assert result["shortage_samples_t"] == [0.0, 0.0, 0.0, 0.0]
    assert result["shortage_histogram"] == [
        {"lower_t": 0.0, "upper_t": 0.0, "count": 4}
    ]


@pytest.mark.parametrize("iterations", [0, -1, 1.5, True, False, "2"])
def test_iterations_must_be_a_positive_non_boolean_integer(iterations):
    with pytest.raises(ValueError, match="iterations"):
        run_monte_carlo(_catalog(), "BASE", {}, iterations=iterations)


@pytest.mark.parametrize("sample", [-0.01, math.inf, -math.inf, math.nan])
def test_rejects_non_finite_or_negative_shortage_samples(sample):
    with patch(
        "src.engine.monte_carlo.simulate_daily",
        return_value=_daily_result(sample),
    ):
        with pytest.raises(ValueError, match="shortage"):
            run_monte_carlo(_catalog(), "BASE", {}, iterations=1)


def test_seed_reproduces_original_sample_order():
    catalog = _catalog(reliability="constant:0.5")

    def simulation_from_failures(*, monte_carlo_failures, **_):
        return _daily_result(float(len(monte_carlo_failures)))

    with patch("src.engine.monte_carlo.simulate_daily", side_effect=simulation_from_failures):
        first = run_monte_carlo(catalog, "BASE", {}, iterations=8, seed=91)
        second = run_monte_carlo(catalog, "BASE", {}, iterations=8, seed=91)

    assert first["shortage_samples_t"] == second["shortage_samples_t"]
    assert first["shortage_histogram"] == second["shortage_histogram"]


def test_exports_real_daily_runs_and_pointwise_nearest_rank_bands():
    traces = [
        [
            _trace_day(0, inventory=10.0, shortage=0.0, delivered=1.0),
            _trace_day(1, inventory=4.0, shortage=6.0, delivered=0.0),
        ],
        [
            _trace_day(0, inventory=20.0, shortage=1.0, delivered=2.0),
            _trace_day(1, inventory=3.0, shortage=7.0, delivered=0.0),
        ],
        [
            _trace_day(0, inventory=30.0, shortage=2.0, delivered=3.0),
            _trace_day(1, inventory=2.0, shortage=8.0, delivered=0.0),
        ],
        [
            _trace_day(0, inventory=40.0, shortage=3.0, delivered=4.0),
            _trace_day(1, inventory=1.0, shortage=9.0, delivered=0.0),
        ],
    ]
    results = iter(
        _daily_result_with_trace(float(run), trace)
        for run, trace in enumerate(traces, start=1)
    )

    with patch("src.engine.monte_carlo.simulate_daily", side_effect=lambda **_: next(results)):
        result = run_monte_carlo(_catalog(), "BASE", {}, iterations=4)

    trajectories = result["daily_trajectories"]
    assert trajectories["days"] == [
        {"day": 0, "year": 2035, "day_of_year": 1},
        {"day": 1, "year": 2035, "day_of_year": 2},
    ]
    assert trajectories["runs"] == [
        {
            "run": 1,
            "inventory_t": [10.0, 4.0],
            "shortage_t": [0.0, 6.0],
            "delivered_t": [1.0, 0.0],
        },
        {
            "run": 2,
            "inventory_t": [20.0, 3.0],
            "shortage_t": [1.0, 7.0],
            "delivered_t": [2.0, 0.0],
        },
        {
            "run": 3,
            "inventory_t": [30.0, 2.0],
            "shortage_t": [2.0, 8.0],
            "delivered_t": [3.0, 0.0],
        },
        {
            "run": 4,
            "inventory_t": [40.0, 1.0],
            "shortage_t": [3.0, 9.0],
            "delivered_t": [4.0, 0.0],
        },
    ]
    assert trajectories["bands"] == {
        "inventory_t": {
            "p05": [10.0, 1.0],
            "median": [25.0, 2.5],
            "p95": [40.0, 4.0],
        },
        "shortage_t": {
            "p05": [0.0, 6.0],
            "median": [1.5, 7.5],
            "p95": [3.0, 9.0],
        },
    }


def test_empty_mock_traces_keep_backward_compatible_empty_trajectories():
    with patch(
        "src.engine.monte_carlo.simulate_daily",
        side_effect=[_daily_result(0.0) for _ in range(3)],
    ):
        result = run_monte_carlo(_catalog(), "BASE", {}, iterations=3)

    assert result["daily_trajectories"] == {
        "days": [],
        "runs": [],
        "bands": {
            "inventory_t": {"p05": [], "median": [], "p95": []},
            "shortage_t": {"p05": [], "median": [], "p95": []},
        },
    }


def test_rejects_daily_trace_with_an_axis_different_from_first_run():
    first = [_trace_day(0, inventory=1.0, shortage=0.0, delivered=0.0)]
    second = [
        _trace_day(
            0,
            inventory=2.0,
            shortage=0.0,
            delivered=0.0,
            year=2036,
        )
    ]

    with patch(
        "src.engine.monte_carlo.simulate_daily",
        side_effect=[
            _daily_result_with_trace(0.0, first),
            _daily_result_with_trace(0.0, second),
        ],
    ):
        with pytest.raises(ValueError, match="daily trace axis"):
            run_monte_carlo(_catalog(), "BASE", {}, iterations=2)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("closing_inventory_t", math.nan),
        ("shortage_t", math.inf),
        ("delivered_t", -0.01),
    ],
)
def test_rejects_invalid_daily_trace_values(field, value):
    day = _trace_day(0, inventory=1.0, shortage=0.0, delivered=0.0)
    setattr(day, field, value)

    with patch(
        "src.engine.monte_carlo.simulate_daily",
        return_value=_daily_result_with_trace(0.0, [day]),
    ):
        with pytest.raises(ValueError, match="daily trace"):
            run_monte_carlo(_catalog(), "BASE", {}, iterations=1)
