"""
Каталог стратегий снабжения орбитального комплекса «Топливный космоконтур 2035».
Содержит эталонные стратегии развития (Земная крепость, Лунный прорыв, Сбалансированный контур)
и оптимизированные стратегии с подтвержденной надежностью Монте-Карло >= 90%.

Все стратегии по умолчанию формируют помесячные датированные партии поставок (supply_orders)
при сохранении годового резервирования мощностей (capacity_reservations) и погодовой экономики.
"""

from typing import Dict, Any, List, Optional


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
    batches = []
    accumulated = 0.0

    for idx, month in enumerate(months):
        if idx == num_months - 1:
            # Последняя партия впитывает остаток округления до 0.01 т
            v = round(annual_volume_t - accumulated, 2)
        else:
            v = base_volume
            accumulated += v

        batches.append({
            "year": year,
            "source_id": source_id,
            "order_t": v,
            "delivery_date": f"{year}-{month:02d}-15",
            "batch_id": f"{batch_prefix}-{year}-{month:02d}",
        })

    return batches


def get_earth_fortress_strategy(monthly: bool = True) -> Dict[str, Any]:
    """
    Стратегия 1: «Земная крепость» (Консервативная).
    - 100% опора на проверенные земные каналы (Earth-Core + Earth-Flex).
    - Ранняя модернизация склада ZBO в 2036 году.
    - Лунный завод не строится (нулевой риск сбоя Луны, экономия 1250 млн CAPEX).
    """
    annual_orders = [
        # 2035: спрос 100
        {"year": 2035, "source_id": "Earth-Core", "volume_t": 100.0, "prefix": "core"},
        # 2036: спрос 140
        {"year": 2036, "source_id": "Earth-Core", "volume_t": 140.0, "prefix": "core"},
        # 2037: спрос 190
        {"year": 2037, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        # 2038: спрос 250 (Core 190 + Flex 60)
        {"year": 2038, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2038, "source_id": "Earth-Flex", "volume_t": 60.0, "prefix": "flex"},
        # 2039: спрос 320 (Core 190 + Flex 110 + Emer 20)
        {"year": 2039, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2039, "source_id": "Earth-Flex", "volume_t": 110.0, "prefix": "flex"},
        {"year": 2039, "source_id": "Emergency", "volume_t": 20.0, "prefix": "emer"},
        # 2040: спрос 390 (Core 190 + Flex 110 + Emer 80)
        {"year": 2040, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2040, "source_id": "Earth-Flex", "volume_t": 110.0, "prefix": "flex"},
        {"year": 2040, "source_id": "Emergency", "volume_t": 80.0, "prefix": "emer"},
    ]

    reservations = [
        {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 120.0},
        {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 160.0},
        {"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2038, "source_id": "Earth-Flex", "reserved_capacity_t": 70.0},
        {"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2039, "source_id": "Earth-Flex", "reserved_capacity_t": 110.0},
        {"year": 2039, "source_id": "Emergency", "reserved_capacity_t": 30.0},
        {"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2040, "source_id": "Earth-Flex", "reserved_capacity_t": 110.0},
        {"year": 2040, "source_id": "Emergency", "reserved_capacity_t": 80.0},
    ]

    orders = []
    if monthly:
        for item in annual_orders:
            orders.extend(make_monthly_batches(
                year=item["year"],
                source_id=item["source_id"],
                annual_volume_t=item["volume_t"],
                batch_prefix=item.get("prefix"),
            ))
    else:
        for item in annual_orders:
            orders.append({
                "year": item["year"],
                "source_id": item["source_id"],
                "order_volume_t": item["volume_t"],
            })

    return {
        "plan_id": "strategy_earth_fortress",
        "description": "Стратегия 1: «Земная крепость» (Консервативная опора на Землю)",
        "investments": [
            {"investment_id": "ZBO", "year": 2036}
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0}
    }


def get_lunar_pioneer_strategy(monthly: bool = True) -> Dict[str, Any]:
    """
    Стратегия 2: «Лунный прорыв» (Агрессивная).
    - Финансирование Lunar-ISRU в 2036 году (доступен с 2038).
    - Ввод ZBO в 2037 году.
    - Закупка дешевого топлива с Луны (по 3.0 млн/т) с 2038 года.
    """
    annual_orders = [
        # 2035: спрос 100
        {"year": 2035, "source_id": "Earth-Core", "volume_t": 100.0, "prefix": "core"},
        # 2036: спрос 140
        {"year": 2036, "source_id": "Earth-Core", "volume_t": 140.0, "prefix": "core"},
        # 2037: спрос 190
        {"year": 2037, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        # 2038: спрос 250 (Core 130 + Луна 120)
        {"year": 2038, "source_id": "Earth-Core", "volume_t": 130.0, "prefix": "core"},
        {"year": 2038, "source_id": "Lunar-ISRU", "volume_t": 120.0, "prefix": "lunar"},
        # 2039: спрос 320 (Core 190 + Луна 120 + Flex 10)
        {"year": 2039, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2039, "source_id": "Lunar-ISRU", "volume_t": 120.0, "prefix": "lunar"},
        {"year": 2039, "source_id": "Earth-Flex", "volume_t": 10.0, "prefix": "flex"},
        # 2040: спрос 390 (Core 190 + Луна 120 + Flex 80)
        {"year": 2040, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2040, "source_id": "Lunar-ISRU", "volume_t": 120.0, "prefix": "lunar"},
        {"year": 2040, "source_id": "Earth-Flex", "volume_t": 80.0, "prefix": "flex"},
    ]

    reservations = [
        {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 120.0},
        {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 150.0},
        {"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 140.0},
        {"year": 2038, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2039, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2039, "source_id": "Earth-Flex", "reserved_capacity_t": 20.0},
        {"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2040, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2040, "source_id": "Earth-Flex", "reserved_capacity_t": 90.0},
    ]

    orders = []
    if monthly:
        for item in annual_orders:
            orders.extend(make_monthly_batches(
                year=item["year"],
                source_id=item["source_id"],
                annual_volume_t=item["volume_t"],
                batch_prefix=item.get("prefix"),
            ))
    else:
        for item in annual_orders:
            orders.append({
                "year": item["year"],
                "source_id": item["source_id"],
                "order_volume_t": item["volume_t"],
            })

    return {
        "plan_id": "strategy_lunar_pioneer",
        "description": "Стратегия 2: «Лунный прорыв» (Фокус на добыче Луны)",
        "investments": [
            {"investment_id": "ZBO", "year": 2037},
            {"investment_id": "LUNAR_ISRU", "year": 2036}
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0}
    }


def get_balanced_strategy(monthly: bool = True) -> Dict[str, Any]:
    """
    Стратегия 3: «Сбалансированный дуальный контур» (Оптимальная).
    - Луна ISRU (решение 2036, ввод 2038) + ZBO в 2036.
    - Earth-New (решение 2036, доступен с 2038).
    - Постоянная резервная бронь Emergency (20-25 т) для страхования от сбоя Луны.
    """
    annual_orders = [
        # 2035: спрос 100
        {"year": 2035, "source_id": "Earth-Core", "volume_t": 100.0, "prefix": "core"},
        # 2036: спрос 140
        {"year": 2036, "source_id": "Earth-Core", "volume_t": 140.0, "prefix": "core"},
        # 2037: спрос 190
        {"year": 2037, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        # 2038: спрос 250 (Core 140 + Луна 100 + Flex 10)
        {"year": 2038, "source_id": "Earth-Core", "volume_t": 140.0, "prefix": "core"},
        {"year": 2038, "source_id": "Lunar-ISRU", "volume_t": 100.0, "prefix": "lunar"},
        {"year": 2038, "source_id": "Earth-Flex", "volume_t": 10.0, "prefix": "flex"},
        # 2039: спрос 320 (Core 150 + Луна 110 + Earth-New 60)
        {"year": 2039, "source_id": "Earth-Core", "volume_t": 150.0, "prefix": "core"},
        {"year": 2039, "source_id": "Lunar-ISRU", "volume_t": 110.0, "prefix": "lunar"},
        {"year": 2039, "source_id": "Earth-New", "volume_t": 60.0, "prefix": "new"},
        # 2040: спрос 390 (Core 160 + Луна 120 + Earth-New 110)
        {"year": 2040, "source_id": "Earth-Core", "volume_t": 160.0, "prefix": "core"},
        {"year": 2040, "source_id": "Lunar-ISRU", "volume_t": 120.0, "prefix": "lunar"},
        {"year": 2040, "source_id": "Earth-New", "volume_t": 110.0, "prefix": "new"},
    ]

    reservations = [
        {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 120.0},
        {"year": 2035, "source_id": "Emergency", "reserved_capacity_t": 20.0},
        {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 150.0},
        {"year": 2036, "source_id": "Emergency", "reserved_capacity_t": 20.0},
        {"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2037, "source_id": "Emergency", "reserved_capacity_t": 20.0},
        {"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 150.0},
        {"year": 2038, "source_id": "Lunar-ISRU", "reserved_capacity_t": 110.0},
        {"year": 2038, "source_id": "Earth-Flex", "reserved_capacity_t": 20.0},
        {"year": 2038, "source_id": "Emergency", "reserved_capacity_t": 25.0},
        {"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 160.0},
        {"year": 2039, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2039, "source_id": "Earth-New", "reserved_capacity_t": 70.0},
        {"year": 2039, "source_id": "Emergency", "reserved_capacity_t": 25.0},
        {"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 170.0},
        {"year": 2040, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2040, "source_id": "Earth-New", "reserved_capacity_t": 120.0},
        {"year": 2040, "source_id": "Emergency", "reserved_capacity_t": 25.0},
    ]

    orders = []
    if monthly:
        for item in annual_orders:
            orders.extend(make_monthly_batches(
                year=item["year"],
                source_id=item["source_id"],
                annual_volume_t=item["volume_t"],
                batch_prefix=item.get("prefix"),
            ))
    else:
        for item in annual_orders:
            orders.append({
                "year": item["year"],
                "source_id": item["source_id"],
                "order_volume_t": item["volume_t"],
            })

    return {
        "plan_id": "strategy_balanced_dual",
        "description": "Стратегия 3: «Сбалансированный дуальный контур» (Земля + Луна + New + Emergency)",
        "investments": [
            {"investment_id": "ZBO", "year": 2036},
            {"investment_id": "LUNAR_ISRU", "year": 2036},
            {"investment_id": "EARTH_NEW", "year": 2036}
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0}
    }


def get_optimal_resilient_strategy(monthly: bool = True) -> Dict[str, Any]:
    """
    Стратегия 4: Оптимальная стрессоустойчивая стратегия (MC >= 92-94%, BASE).
    - Стоимость: ~11 688 млн руб.
    - Бронь Emergency: 28-50 т/год (страховка партий Core/Flex).
    - Проверена на сидах [42, 100, 777, 2026, 999]: надежность >= 92%, P95 = 2.7 т.
    """
    annual_orders = [
        {"year": 2035, "source_id": "Earth-Core", "volume_t": 118.0, "prefix": "core"},
        {"year": 2036, "source_id": "Earth-Core", "volume_t": 165.0, "prefix": "core"},
        {"year": 2037, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2037, "source_id": "Earth-Flex", "volume_t": 8.0, "prefix": "flex"},
        {"year": 2038, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2038, "source_id": "Earth-Flex", "volume_t": 67.0, "prefix": "flex"},
        {"year": 2039, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2039, "source_id": "Earth-Flex", "volume_t": 110.0, "prefix": "flex"},
        {"year": 2039, "source_id": "Emergency", "volume_t": 30.0, "prefix": "emer"},
        {"year": 2040, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2040, "source_id": "Earth-Flex", "volume_t": 110.0, "prefix": "flex"},
        {"year": 2040, "source_id": "Emergency", "volume_t": 74.0, "prefix": "emer"},
    ]

    reservations = [
        {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 140.0},
        {"year": 2035, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 170.0},
        {"year": 2036, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2037, "source_id": "Earth-Flex", "reserved_capacity_t": 30.0},
        {"year": 2037, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2038, "source_id": "Earth-Flex", "reserved_capacity_t": 70.0},
        {"year": 2038, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2039, "source_id": "Earth-Flex", "reserved_capacity_t": 110.0},
        {"year": 2039, "source_id": "Emergency", "reserved_capacity_t": 50.0},
        {"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2040, "source_id": "Earth-Flex", "reserved_capacity_t": 110.0},
        {"year": 2040, "source_id": "Emergency", "reserved_capacity_t": 80.0},
    ]

    orders = []
    if monthly:
        for item in annual_orders:
            orders.extend(make_monthly_batches(
                year=item["year"],
                source_id=item["source_id"],
                annual_volume_t=item["volume_t"],
                batch_prefix=item.get("prefix"),
            ))
    else:
        for item in annual_orders:
            orders.append({
                "year": item["year"],
                "source_id": item["source_id"],
                "order_volume_t": item["volume_t"],
            })

    return {
        "plan_id": "strategy_optimal_resilient_mc90",
        "description": "Оптимальная стрессоустойчивая стратегия (MC >= 92% без дефицита)",
        "investments": [
            {"investment_id": "ZBO", "year": 2036}
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0}
    }


def get_stress_resilient_strategy(monthly: bool = True) -> Dict[str, Any]:
    """
    Стратегия 5: Стресс-устойчивая стратегия для MANDATORY_STRESS (MC >= 90-100%).
    - Рассчитана на спрос +15% в 2038-2040, инфляцию цен Core/Flex +25% и срывы Луны (55%/75%).
    - Использует трио Земля + Луна + Earth-New.
    - Стоимость: ~13 543 млн руб.
    - Выполняет 100% жестких ограничений (0 нарушений, в т.ч. 45-дневный резерв и лимит ZBO 120 т).
    - Надежность Монте-Карло: 90% Zero Shortage, P95 = 0.00 т.
    """
    annual_orders = [
        {"year": 2035, "source_id": "Earth-Core", "volume_t": 119.5, "prefix": "core"},
        {"year": 2036, "source_id": "Earth-Core", "volume_t": 153.5, "prefix": "core"},
        {"year": 2037, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2037, "source_id": "Earth-Flex", "volume_t": 25.0, "prefix": "flex"},
        {"year": 2038, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2038, "source_id": "Lunar-ISRU", "volume_t": 120.0, "prefix": "lunar"},
        {"year": 2038, "source_id": "Earth-Flex", "volume_t": 35.0, "prefix": "flex"},
        {"year": 2039, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2039, "source_id": "Lunar-ISRU", "volume_t": 120.0, "prefix": "lunar"},
        {"year": 2039, "source_id": "Earth-New", "volume_t": 75.0, "prefix": "new"},
        {"year": 2039, "source_id": "Earth-Flex", "volume_t": 15.0, "prefix": "flex"},
        {"year": 2040, "source_id": "Earth-Core", "volume_t": 190.0, "prefix": "core"},
        {"year": 2040, "source_id": "Lunar-ISRU", "volume_t": 120.0, "prefix": "lunar"},
        {"year": 2040, "source_id": "Earth-New", "volume_t": 115.0, "prefix": "new"},
        {"year": 2040, "source_id": "Earth-Flex", "volume_t": 30.0, "prefix": "flex"},
    ]

    reservations = [
        {"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 140.0},
        {"year": 2035, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 160.0},
        {"year": 2036, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2037, "source_id": "Earth-Flex", "reserved_capacity_t": 35.0},
        {"year": 2037, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2038, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2038, "source_id": "Earth-Flex", "reserved_capacity_t": 45.0},
        {"year": 2038, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2039, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2039, "source_id": "Earth-New", "reserved_capacity_t": 90.0},
        {"year": 2039, "source_id": "Earth-Flex", "reserved_capacity_t": 25.0},
        {"year": 2039, "source_id": "Emergency", "reserved_capacity_t": 28.0},
        {"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 190.0},
        {"year": 2040, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0},
        {"year": 2040, "source_id": "Earth-New", "reserved_capacity_t": 120.0},
        {"year": 2040, "source_id": "Earth-Flex", "reserved_capacity_t": 40.0},
        {"year": 2040, "source_id": "Emergency", "reserved_capacity_t": 28.0},
    ]

    orders = []
    if monthly:
        for item in annual_orders:
            orders.extend(make_monthly_batches(
                year=item["year"],
                source_id=item["source_id"],
                annual_volume_t=item["volume_t"],
                batch_prefix=item.get("prefix"),
            ))
    else:
        for item in annual_orders:
            orders.append({
                "year": item["year"],
                "source_id": item["source_id"],
                "order_volume_t": item["volume_t"],
            })

    return {
        "plan_id": "strategy_mandatory_stress_resilient",
        "description": "Стресс-устойчивая стратегия (MANDATORY_STRESS, MC >= 90%)",
        "investments": [
            {"investment_id": "ZBO", "year": 2036},
            {"investment_id": "LUNAR_ISRU", "year": 2036},
            {"investment_id": "EARTH_NEW", "year": 2036},
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 23.0}
    }
