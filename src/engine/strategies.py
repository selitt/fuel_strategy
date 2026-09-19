"""Готовые решения команды: явные месячные партии из data/strategies/."""

from typing import Dict, Any, List, Optional
from decimal import Decimal
import json
from pathlib import Path
from .loader import find_data_root


BUILTIN_STRATEGY_KINDS = ("earth_fortress", "lunar_pioneer", "balanced", "base", "stress", "diversified")


def load_builtin_strategy_data(kind: str, data_root: Optional[Path] = None) -> Dict[str, Any]:
    if kind not in BUILTIN_STRATEGY_KINDS:
        raise ValueError('Unknown builtin strategy')
    return json.loads(((data_root or find_data_root()) / 'strategies' / f'{kind}.json').read_text(encoding='utf-8'))


def load_builtin_strategy(kind: str, monthly: bool = True, data_root: Optional[Path] = None) -> Dict[str, Any]:
    data = load_builtin_strategy_data(kind, data_root)
    orders = data['supply_orders']
    if not monthly:
        totals = {}
        for row in orders:
            key = (row['year'], row['source_id'])
            totals[key] = totals.get(key, Decimal(0)) + Decimal(str(row['order_t']))
        orders = [{'year': year, 'source_id': source, 'order_volume_t': float(volume)}
                  for (year, source), volume in totals.items()]
    return {
        'plan_id': data['id'], 'description': data['description'],
        'supply_orders': orders, 'capacity_reservations': data['capacity_reservations'],
        'investments': data['investments'], 'inventory_policy': data['inventory_policy'],
    }


def make_monthly_batches(
    year: int,
    source_id: str,
    annual_volume_t: float,
    start_month: int = 1,
    batch_prefix: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Разбивает годовой объём заказа на ежемесячные партии с датами 15-го числа.
    Обеспечивает математически точное сохранение суммы (балансировка остатка в последнем месяце).
    """
    if annual_volume_t <= 1e-9:
        return []

    months = list(range(start_month, 13))
    num_months = len(months)
    if num_months <= 0:
        return []

    if not batch_prefix:
        # Короткий префикс из названия канала
        raw = source_id.lower().replace("earth-", "").replace("lunar-", "").replace(" ", "-")
        batch_prefix = raw

    base_volume = round(annual_volume_t / num_months, 2)
    if round(annual_volume_t - base_volume * (num_months - 1), 2) < 0:
        # Tiny optimizer candidates can otherwise round eleven parts above the total.
        base_volume = (int(Decimal(str(annual_volume_t)) * 100) // num_months) / 100
    batches = []
    accumulated = 0.0

    for idx, month in enumerate(months):
        if idx == num_months - 1:
            # Последняя партия впитывает остаток округления до 0.01 т
            v = round(annual_volume_t - accumulated, 2)
        else:
            v = base_volume
            accumulated += v

        if v <= 0:
            continue
        batches.append({
            "year": year,
            "source_id": source_id,
            "order_t": v,
            "delivery_date": f"{year}-{month:02d}-15",
            "batch_id": f"{batch_prefix}-{year}-{month:02d}",
        })

    return batches


def get_earth_fortress_strategy(monthly: bool = True) -> Dict[str, Any]:
    return load_builtin_strategy("earth_fortress", monthly=monthly)


def get_lunar_pioneer_strategy(monthly: bool = True) -> Dict[str, Any]:
    return load_builtin_strategy("lunar_pioneer", monthly=monthly)


def get_balanced_strategy(monthly: bool = True) -> Dict[str, Any]:
    return load_builtin_strategy("balanced", monthly=monthly)


def get_optimal_resilient_strategy(monthly: bool = True) -> Dict[str, Any]:
    return load_builtin_strategy("base", monthly=monthly)


def get_stress_resilient_strategy(monthly: bool = True) -> Dict[str, Any]:
    return load_builtin_strategy("stress", monthly=monthly)


def get_diversified_strategy(monthly: bool = True) -> Dict[str, Any]:
    return load_builtin_strategy("diversified", monthly=monthly)
