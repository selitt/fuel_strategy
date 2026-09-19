from copy import deepcopy

import pytest

from src.engine.calendar import PlanValidationError, normalize_plan
from src.engine.loader import CaseCatalog


@pytest.mark.parametrize("route", ["/api/calc", "/api/calc/risk"])
def test_calc_capacity_error_keeps_detail_and_adds_actionable_issue(
    client, plan, route
):
    plan["decisions"]["supply_orders"][0]["order_t"] = 191.0

    response = client.post(route, json=plan)

    assert response.status_code == 422
    payload = response.json()
    assert payload["detail"] == (
        "Заказано 191 т — это превышает source capacity "
        "190 т/год канала Earth-Core в 2035"
    )
    assert payload["issues"] == [
        {
            "code": "source_capacity_exceeded",
            "message": (
                "Earth-Core: в 2035 году заказано 191 т при доступной "
                "мощности 190 т/год. Уменьшите поставки этого источника."
            ),
            "loc": ["decisions", "supply_orders"],
            "source_id": "Earth-Core",
            "year": 2035,
            "actual": 191.0,
            "limit": 190.0,
        }
    ]


def test_project_calculation_uses_same_structured_error_contract(client, plan):
    plan["decisions"]["capacity_reservations"][0]["reserved_capacity_t"] = 191.0
    created = client.post("/api/projects", json={"name": "Capacity", "plan": plan})
    assert created.status_code == 201

    response = client.post(
        f"/api/projects/{created.json()['project_id']}/calculate",
        json={"expected_revision": 1},
    )

    assert response.status_code == 422
    issue = response.json()["issues"][0]
    assert issue == {
        "code": "reservation_capacity_exceeded",
        "message": (
            "Earth-Core: бронь на 2035 год составляет 191 т при мощности "
            "190 т/год. Уменьшите бронь."
        ),
        "loc": [
            "decisions",
            "capacity_reservations",
            0,
            "reserved_capacity_t",
        ],
        "source_id": "Earth-Core",
        "year": 2035,
        "actual": 191.0,
        "limit": 190.0,
    }


@pytest.mark.parametrize(
    ("change", "code", "loc"),
    [
        (
            lambda decisions: decisions["supply_orders"][0].update(
                order_t=float("nan")
            ),
            "invalid_number",
            ["decisions", "supply_orders", 0, "order_t"],
        ),
        (
            lambda decisions: decisions["supply_orders"][0].update(
                delivery_date="2035/05/01"
            ),
            "invalid_date",
            ["decisions", "supply_orders", 0, "delivery_date"],
        ),
        (
            lambda decisions: decisions["supply_orders"][0].update(
                source_id="missing"
            ),
            "unknown_source",
            ["decisions", "supply_orders", 0, "source_id"],
        ),
        (
            lambda decisions: decisions["supply_orders"].append(
                {
                    **decisions["supply_orders"][0],
                    "batch_id": decisions["supply_orders"][0]["batch_id"],
                }
            ),
            "duplicate_batch_id",
            ["decisions", "supply_orders", 1, "batch_id"],
        ),
    ],
)
def test_engine_validation_issues_point_to_the_problem(change, code, loc, plan):
    decisions = deepcopy(plan["decisions"])
    change(decisions)

    with pytest.raises(PlanValidationError) as raised:
        normalize_plan(CaseCatalog(), decisions)

    issue = raised.value.issues[0]
    assert issue.code == code
    assert list(issue.loc) == loc
    assert issue.message


def test_reservation_shortfall_reports_annual_order_and_reserved_limit(plan):
    decisions = deepcopy(plan["decisions"])
    decisions["capacity_reservations"][0]["reserved_capacity_t"] = 4.0

    with pytest.raises(PlanValidationError) as raised:
        normalize_plan(CaseCatalog(), decisions)

    assert raised.value.issues[0].as_dict() == {
        "code": "reserved_capacity_exceeded",
        "message": (
            "Earth-Core: в 2035 году заказано 5 т при броне 4 т/год. "
            "Увеличьте бронь или уменьшите поставки."
        ),
        "loc": ["decisions", "capacity_reservations"],
        "source_id": "Earth-Core",
        "year": 2035,
        "actual": 5.0,
        "limit": 4.0,
    }


def test_unavailable_source_points_to_the_supply_year(plan):
    decisions = deepcopy(plan["decisions"])
    decisions["supply_orders"][0].update(
        source_id="Lunar-ISRU",
        year=2035,
        delivery_date="2035-05-01",
    )
    decisions["capacity_reservations"] = []

    with pytest.raises(PlanValidationError) as raised:
        normalize_plan(CaseCatalog(), decisions)

    assert raised.value.issues[0].code == "source_unavailable"
    assert raised.value.issues[0].loc == (
        "decisions",
        "supply_orders",
        0,
        "year",
    )
    assert raised.value.issues[0].source_id == "Lunar-ISRU"
    assert raised.value.issues[0].year == 2035


def test_openapi_error_schema_exposes_optional_validation_issues(client):
    schemas = client.get("/openapi.json").json()["components"]["schemas"]

    error_schema = schemas["ErrorDTO"]
    assert error_schema["properties"]["issues"]["anyOf"][0]["items"][
        "$ref"
    ].endswith("/ValidationIssueDTO")
    issue_schema = schemas["ValidationIssueDTO"]["properties"]
    assert {"code", "message", "loc"} <= set(issue_schema)
    assert {"source_id", "year", "actual", "limit"} <= set(issue_schema)
