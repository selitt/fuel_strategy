"""Controlled concurrency checks; no mathematical assertions."""
from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest
from fastapi import HTTPException

from src.app.service.calculation_admission import CalculationAdmission, AdmittedCalculationService


def test_one_active_four_waiting_and_overflow():
    gate = CalculationAdmission(wait_seconds=2)
    entered = Event()
    release = Event()
    order = []

    def work(index):
        with gate.enter():
            order.append(index)
            if index == 0:
                entered.set()
                assert release.wait(5)

    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(work, 0)]
        assert entered.wait(2)
        try:
            for index in range(1, 5):
                futures.append(pool.submit(work, index))
                with gate.condition:
                    assert gate.condition.wait_for(lambda: len(gate.waiters) == index, timeout=2)
            with pytest.raises(HTTPException) as exc:
                with gate.enter():
                    pytest.fail("full queue entered")
            assert exc.value.status_code == 503
            assert exc.value.headers == {"Retry-After": "5"}
            assert order == [0]
        finally:
            release.set()
        for future in futures:
            future.result(timeout=3)
    assert order == [0, 1, 2, 3, 4]


def test_wait_timeout_does_not_release_active_worker():
    gate = CalculationAdmission(wait_seconds=.02)
    with gate.enter():
        with ThreadPoolExecutor(max_workers=1) as pool:
            def wait():
                with gate.enter():
                    pytest.fail("active worker was bypassed")
            with pytest.raises(HTTPException) as exc:
                pool.submit(wait).result(timeout=2)
        assert exc.value.status_code == 503
        assert gate.active
        assert not gate.waiters
    with gate.enter():
        assert gate.active


def test_engine_exception_releases_slot_and_risk_shares_gate():
    gate = CalculationAdmission(max_waiting=0)
    class Backend:
        def calculate(self, plan):
            raise ValueError("controlled error")
        def calculate_risk(self, plan):
            return "risk-result"
    service = AdmittedCalculationService(Backend(), gate)
    with pytest.raises(ValueError):
        service.calculate(None)
    assert service.calculate_risk(None) == "risk-result"
    with gate.enter():
        with pytest.raises(HTTPException):
            service.calculate_risk(None)


def test_all_http_calculation_routes_use_same_admission(client, plan):
    project = client.post('/api/projects', json={'name': 'Admission', 'plan': plan}).json()
    gate = client.app.state.calculation_admission
    gate.max_waiting = 0
    with gate.enter():
        for path, payload in [('/api/calc', plan), ('/api/calc/risk', plan),
                              (f"/api/projects/{project['project_id']}/calculate", {'expected_revision': 1})]:
            response = client.post(path, json=payload)
            assert response.status_code == 503, response.text
            assert response.headers['Retry-After'] == '5'
        assert client.get('/api/health').status_code == 200
    assert client.get(f"/api/projects/{project['project_id']}").json()['revision'] == 1
