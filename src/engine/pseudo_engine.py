from typing import List


def run_pseudo_engine(a: float, b: float, c: float) -> List[float]:
    """
    Псевдо-движок расчёта.
    Принимает входные числа и возвращает вычисленный список точек.
    """
    # Простой расчёт для примера: возвращает сами числа и их сумму
    return [a, b, c, a + b + c]
