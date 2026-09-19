"""Single-process FIFO admission around synchronous calculations, not engine cancellation."""
from collections import deque
from contextlib import contextmanager
from threading import Condition
from time import monotonic

from fastapi import HTTPException


class CalculationAdmission:
    def __init__(self, max_waiting: int = 4, wait_seconds: float = 30):
        self.condition = Condition()
        self.waiters = deque()
        self.active = False
        self.max_waiting = max_waiting
        self.wait_seconds = wait_seconds

    @staticmethod
    def busy():
        return HTTPException(503, "Расчётный сервис занят. Показан предыдущий результат; повторите позже.",
                             headers={"Retry-After": "5"})

    @contextmanager
    def enter(self):
        ticket = object()
        with self.condition:
            if self.active or self.waiters:
                if len(self.waiters) >= self.max_waiting:
                    raise self.busy()
                self.waiters.append(ticket)
                self.condition.notify_all()
                deadline = monotonic() + self.wait_seconds
                try:
                    while self.active or self.waiters[0] is not ticket:
                        remaining = deadline - monotonic()
                        if remaining <= 0:
                            raise self.busy()
                        self.condition.wait(remaining)
                finally:
                    self.waiters.remove(ticket)
                    self.condition.notify_all()
            self.active = True
        try:
            yield
        finally:
            # A disconnected HTTP caller must not release this until the synchronous
            # worker actually finishes its engine call.
            with self.condition:
                self.active = False
                self.condition.notify_all()


class AdmittedCalculationService:
    def __init__(self, service, admission):
        self.service = service
        self.admission = admission

    def get_template_plan(self):
        return self.service.get_template_plan()

    def calculate(self, plan):
        with self.admission.enter():
            return self.service.calculate(plan)

    def calculate_risk(self, plan):
        runner = getattr(self.service, "calculate_risk", None)
        if not callable(runner):
            raise HTTPException(503, "Анализ рисков не подключён")
        with self.admission.enter():
            return runner(plan)
