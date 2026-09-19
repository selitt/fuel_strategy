"""The operator template is empty and does not affect saved projects."""


def test_operator_template_has_no_prefilled_decisions(client):
    response = client.get("/api/calc/template")

    assert response.status_code == 200, response.text
    plan = response.json()
    assert plan["plan_id"] == "example-empty-plan"
    assert plan["scenario_id"] == "BASE"
    assert plan["decisions"] == {
        "supply_orders": [],
        "capacity_reservations": [],
        "investments": [],
        "inventory_policy": {"initial_inventory_t": 0.0},
    }


def test_reading_empty_template_does_not_change_saved_extended_plan(client, plan):
    plan["unrecognized_team_field"] = {"keep": ["as", "saved"]}
    created = client.post("/api/projects", json={"name": "Existing", "plan": plan})
    assert created.status_code == 201, created.text
    saved = created.json()

    template = client.get("/api/calc/template")
    reopened = client.get(f"/api/projects/{saved['project_id']}")

    assert template.status_code == 200, template.text
    assert reopened.status_code == 200, reopened.text
    assert reopened.json() == saved
    assert reopened.json()["plan"]["unrecognized_team_field"] == {"keep": ["as", "saved"]}
