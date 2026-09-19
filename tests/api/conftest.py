"""HTTP tests exercise the real app and real disk storage in isolated directories."""
from contextlib import ExitStack
from copy import deepcopy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def plan():
    from src.app.service.calc_service import CalculationService
    value = CalculationService().get_template_plan().model_dump(mode="json")
    value["plan_id"] = "integration-plan"
    value["team_notes"] = {"text": "Входы сохраняются без потерь", "seed": 42}
    return deepcopy(value)


@pytest.fixture
def client_factory(tmp_path):
    from src.app import main
    assert callable(getattr(main, "create_app", None)), "HTTP app factory is not implemented"
    from src.app.config import Settings
    with ExitStack() as stack:
        def make(*, calculation_service=None, data_dir=None, **settings):
            config = Settings(data_dir=data_dir or tmp_path / "projects", **settings)
            app = main.create_app(settings=config, calculation_service=calculation_service)
            return stack.enter_context(TestClient(app, raise_server_exceptions=False))
        yield make


@pytest.fixture
def client(client_factory):
    return client_factory()


def create_project(client, plan, name="Первый план"):
    response = client.post("/api/projects", json={"name": name, "plan": plan})
    assert response.status_code == 201, response.text
    return response.json()
