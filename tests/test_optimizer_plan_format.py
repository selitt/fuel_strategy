"""Optimizer candidates export as regular monthly ParticipantPlan documents."""

import json
from types import ModuleType, SimpleNamespace

import pytest

import tools.optimize_strategy as cli_optimizer
from src.app.dto.calc_dto import ParticipantPlanDTO
from src.app.service.project_service import parse_json_file
from src.engine.calendar import normalize_plan
from src.engine.engine import SimulationEngine
from src.engine.loader import CaseCatalog
from src.engine.optimize import (
    WARM_START_X0,
    decode_params_to_plan,
    optimize_strategy,
    to_participant_plan,
)
from tools.optimize_strategy import decode_earth_fortress, decode_lunar_dual


EARTH_PARAMS = [118.0, 165.0, 190.0, 8.0, 63.0, 110.0, 23.0, 110.0, 70.0]
LUNAR_PARAMS = [
    118.0, 165.0, 190.0, 8.0,
    150.0, 100.0, 15.0,
    190.0, 120.0, 25.0,
    190.0, 120.0, 75.0, 20.0,
]


@pytest.mark.parametrize(
    ("decoder", "params", "expected_investments"),
    [
        (decode_earth_fortress, EARTH_PARAMS, [{"investment_id": "ZBO", "year": 2036}]),
        (
            decode_lunar_dual,
            LUNAR_PARAMS,
            [
                {"investment_id": "ZBO", "year": 2036},
                {"investment_id": "LUNAR_ISRU", "year": 2036},
            ],
        ),
    ],
)
def test_cli_archetypes_export_importable_monthly_participant_plans(
    decoder, params, expected_investments
):
    decisions = decoder(params)
    assert "decisions" not in decisions  # Internal optimizer compatibility.
    assert decisions["investments"] == expected_investments
    assert decisions["supply_orders"]
    assert all(
        set(("order_t", "delivery_date", "batch_id")) <= order.keys()
        and "order_volume_t" not in order
        for order in decisions["supply_orders"]
    )
    assert len({order["batch_id"] for order in decisions["supply_orders"]}) == len(
        decisions["supply_orders"]
    )

    exported = to_participant_plan(decisions)
    dto = ParticipantPlanDTO.model_validate(exported)
    parsed = parse_json_file(
        json.dumps(exported).encode("utf-8"), "optimized.json", 1_000_000
    )
    assert ParticipantPlanDTO.model_validate(parsed).model_dump() == dto.model_dump()

    catalog = CaseCatalog()
    normalize_plan(catalog, dto.decisions.model_dump())
    result = SimulationEngine(catalog).run(
        dto.plan_id, dto.scenario_id, dto.decisions.model_dump(), run_risk_analysis=False
    )
    assert result["plan_id"] == dto.plan_id
    assert result["risk_register"] == []


def test_python_optimizer_uses_scipy_seed_and_returns_envelope(monkeypatch, capsys):
    captured = {}
    scipy = ModuleType("scipy")
    scipy_optimize = ModuleType("scipy.optimize")

    def fake_de(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(x=WARM_START_X0)

    scipy_optimize.differential_evolution = fake_de
    scipy.optimize = scipy_optimize
    monkeypatch.setitem(__import__("sys").modules, "scipy", scipy)
    monkeypatch.setitem(__import__("sys").modules, "scipy.optimize", scipy_optimize)
    monkeypatch.setattr(
        "src.engine.optimize.run_engine",
        lambda *args, **kwargs: {
            "is_feasible": True,
            "total_cost_mln": 1.0,
            "risk_register": [{
                "probability_of_no_shortage": 0.25,
                "probability_of_zero_shortage": 0.75,
                "median_shortage_t": 0.0,
            }],
        },
    )

    exported = optimize_strategy(max_iter=1, pop_size=9, seed=77)

    assert captured["seed"] == 77
    assert ParticipantPlanDTO.model_validate(exported).plan_id == "strategy_earth_fortress_optimized"
    assert "decisions" in exported and "supply_orders" not in exported
    report = capsys.readouterr().err
    assert "Вероятность нулевого дефицита MC: 25.00%" in report
    assert "75.00%" not in report


def test_internal_python_decoder_keeps_flat_monthly_decisions():
    decisions = decode_params_to_plan(WARM_START_X0)

    assert "decisions" not in decisions
    assert decisions["supply_orders"]
    assert all("order_t" in order and "delivery_date" in order for order in decisions["supply_orders"])


def test_python_optimizer_does_not_silently_fallback_without_scipy(monkeypatch):
    monkeypatch.setitem(__import__("sys").modules, "scipy", None)
    monkeypatch.setattr(
        "src.engine.optimize.run_pure_python_de",
        lambda *args, **kwargs: pytest.fail("pure Python fallback must not run"),
    )

    with pytest.raises(RuntimeError, match="SciPy"):
        optimize_strategy(max_iter=1, pop_size=9)


def test_cli_returns_and_writes_the_same_participant_plan(monkeypatch, tmp_path, capsys):
    captured = {}
    scipy = ModuleType("scipy")
    scipy_optimize = ModuleType("scipy.optimize")

    def fake_de(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(x=EARTH_PARAMS)

    scipy_optimize.differential_evolution = fake_de
    scipy.optimize = scipy_optimize
    monkeypatch.setitem(__import__("sys").modules, "scipy", scipy)
    monkeypatch.setitem(__import__("sys").modules, "scipy.optimize", scipy_optimize)
    monkeypatch.setattr(
        cli_optimizer,
        "run_engine",
        lambda *args, **kwargs: {
            "is_feasible": True,
            "total_cost_mln": 1.0,
            "risk_register": [],
            "constraint_checks": [],
        },
    )
    output = tmp_path / "optimized.json"
    monkeypatch.setattr(
        __import__("sys"),
        "argv",
        ["optimize_strategy.py", "--iter", "1", "--pop", "9", "--output", str(output)],
    )

    exported = cli_optimizer.main()

    assert captured["seed"] == 42
    parsed = parse_json_file(output.read_bytes(), "optimized.json", 1_000_000)
    assert parsed == exported
    ParticipantPlanDTO.model_validate(parsed)
    assert "Вероятность нулевого дефицита MC: недоступно" in capsys.readouterr().err
