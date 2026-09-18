from typing import List
from pydantic import BaseModel


class CalculationRequest(BaseModel):
    """Входной контракт: три числа a, b, c."""
    a: float
    b: float
    c: float


class CalculationResponse(BaseModel):
    """Выходной контракт: список точек."""
    points: List[float]
