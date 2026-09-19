"""
Модуль готовых архетипов (стратегий) развития орбитального топливного узла.
Содержит 3 эталонные управленческие модели для сравнения.
"""

from typing import Dict, Any


def get_earth_fortress_strategy() -> Dict[str, Any]:
    """Оптимизированная стратегия «Земная крепость» с высокой устойчивостью по Монте-Карло."""
    return {
        "plan_id": "strategy_earth_fortress_optimized",
        "description": "Оптимизированная стратегия «Земная крепость»",
        "investments": [
            {
                "investment_id": "ZBO",
                "commissioning_year": 2036
            }
        ],
        "capacity_reservations": [
            {
                "year": 2035,
                "source_id": "Earth-Core",
                "reserved_capacity_t": 140.0
            },
            {
                "year": 2036,
                "source_id": "Earth-Core",
                "reserved_capacity_t": 170.0
            },
            {
                "year": 2037,
                "source_id": "Earth-Core",
                "reserved_capacity_t": 190.0
            },
            {
                "year": 2037,
                "source_id": "Earth-Flex",
                "reserved_capacity_t": 31.6
            },
            {
                "year": 2038,
                "source_id": "Earth-Core",
                "reserved_capacity_t": 190.0
            },
            {
                "year": 2038,
                "source_id": "Earth-Flex",
                "reserved_capacity_t": 83.5
            },
            {
                "year": 2039,
                "source_id": "Earth-Core",
                "reserved_capacity_t": 190.0
            },
            {
                "year": 2039,
                "source_id": "Earth-Flex",
                "reserved_capacity_t": 110.0
            },
            {
                "year": 2039,
                "source_id": "Emergency",
                "reserved_capacity_t": 32.0
            },
            {
                "year": 2040,
                "source_id": "Earth-Core",
                "reserved_capacity_t": 190.0
            },
            {
                "year": 2040,
                "source_id": "Earth-Flex",
                "reserved_capacity_t": 110.0
            },
            {
                "year": 2040,
                "source_id": "Emergency",
                "reserved_capacity_t": 80.0
            }
        ],
        "supply_orders": [
            {
                "year": 2035,
                "source_id": "Earth-Core",
                "order_volume_t": 124.4
            },
            {
                "year": 2036,
                "source_id": "Earth-Core",
                "order_volume_t": 160.5
            },
            {
                "year": 2037,
                "source_id": "Earth-Core",
                "order_volume_t": 188.5
            },
            {
                "year": 2037,
                "source_id": "Earth-Flex",
                "order_volume_t": 21.6
            },
            {
                "year": 2038,
                "source_id": "Earth-Core",
                "order_volume_t": 190.0
            },
            {
                "year": 2038,
                "source_id": "Earth-Flex",
                "order_volume_t": 73.5
            },
            {
                "year": 2039,
                "source_id": "Earth-Core",
                "order_volume_t": 190.0
            },
            {
                "year": 2039,
                "source_id": "Earth-Flex",
                "order_volume_t": 106.6
            },
            {
                "year": 2039,
                "source_id": "Emergency",
                "order_volume_t": 22.0
            },
            {
                "year": 2040,
                "source_id": "Earth-Core",
                "order_volume_t": 190.0
            },
            {
                "year": 2040,
                "source_id": "Earth-Flex",
                "order_volume_t": 108.2
            },
            {
                "year": 2040,
                "source_id": "Emergency",
                "order_volume_t": 70.1
            }
        ],
        "inventory_policy": {
            "initial_inventory_t": 15.0
        }
    }


def get_optimized_earth_fortress_strategy() -> Dict[str, Any]:
    """Оптимизированная стратегия «Земная крепость» с высокой устойчивостью по Монте-Карло."""
    return get_earth_fortress_strategy()


def get_lunar_pioneer_strategy() -> Dict[str, Any]:
    """
    Стратегия 2: «Лунный прорыв» (Агрессивная).
    - Полное финансирование Lunar-ISRU (450 млн в 2036, 800 млн в 2037).
    - Ввод ZBO в 2037 году.
    - Максимальный выкуп дешевого топлива с Луны (по 3.0 млн/т) с 2038 года.
    """
    orders = []
    reservations = []

    # 2035: спрос 100
    orders.append({"year": 2035, "source_id": "Earth-Core", "order_volume_t": 100.0})
    reservations.append({"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 120.0})

    # 2036: спрос 140
    orders.append({"year": 2036, "source_id": "Earth-Core", "order_volume_t": 140.0})
    reservations.append({"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 150.0})

    # 2037: спрос 190
    orders.append({"year": 2037, "source_id": "Earth-Core", "order_volume_t": 190.0})
    reservations.append({"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0})

    # 2038: спрос 250 (Core 130 + Луна 120)
    orders.append({"year": 2038, "source_id": "Earth-Core", "order_volume_t": 130.0})
    reservations.append({"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 140.0})
    orders.append({"year": 2038, "source_id": "Lunar-ISRU", "order_volume_t": 120.0})
    reservations.append({"year": 2038, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0})

    # 2039: спрос 320 (Core 190 + Луна 120 + Flex 10)
    orders.append({"year": 2039, "source_id": "Earth-Core", "order_volume_t": 190.0})
    reservations.append({"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 190.0})
    orders.append({"year": 2039, "source_id": "Lunar-ISRU", "order_volume_t": 120.0})
    reservations.append({"year": 2039, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0})
    orders.append({"year": 2039, "source_id": "Earth-Flex", "order_volume_t": 10.0})
    reservations.append({"year": 2039, "source_id": "Earth-Flex", "reserved_capacity_t": 20.0})

    # 2040: спрос 390 (Core 190 + Луна 120 + Flex 80)
    orders.append({"year": 2040, "source_id": "Earth-Core", "order_volume_t": 190.0})
    reservations.append({"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 190.0})
    orders.append({"year": 2040, "source_id": "Lunar-ISRU", "order_volume_t": 120.0})
    reservations.append({"year": 2040, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0})
    orders.append({"year": 2040, "source_id": "Earth-Flex", "order_volume_t": 80.0})
    reservations.append({"year": 2040, "source_id": "Earth-Flex", "reserved_capacity_t": 90.0})

    return {
        "plan_id": "strategy_lunar_pioneer",
        "description": "Стратегия 2: «Лунный прорыв» (Фокус на добыче Луны)",
        "investments": [
            {"investment_id": "ZBO", "commissioning_year": 2037},
            {"investment_id": "LUNAR_ISRU", "commissioning_year": 2038, "capex_schedule": {2036: 450.0, 2037: 800.0}}
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0}
    }


def get_balanced_strategy() -> Dict[str, Any]:
    """
    Стратегия 3: «Сбалансированный дуальный контур» (Оптимальная).
    - Луна ISRU (ввод 2038) + ZBO в 2036.
    - Опцион Earth-New (опцион 2036, ввод 2038).
    - Постоянная резервная бронь Emergency (20 т) для страхования от сбоя Луны.
    """
    orders = []
    reservations = []

    # 2035: спрос 100
    orders.append({"year": 2035, "source_id": "Earth-Core", "order_volume_t": 100.0})
    reservations.append({"year": 2035, "source_id": "Earth-Core", "reserved_capacity_t": 120.0})
    reservations.append({"year": 2035, "source_id": "Emergency", "reserved_capacity_t": 20.0})

    # 2036: спрос 140
    orders.append({"year": 2036, "source_id": "Earth-Core", "order_volume_t": 140.0})
    reservations.append({"year": 2036, "source_id": "Earth-Core", "reserved_capacity_t": 150.0})
    reservations.append({"year": 2036, "source_id": "Emergency", "reserved_capacity_t": 20.0})

    # 2037: спрос 190
    orders.append({"year": 2037, "source_id": "Earth-Core", "order_volume_t": 190.0})
    reservations.append({"year": 2037, "source_id": "Earth-Core", "reserved_capacity_t": 190.0})
    reservations.append({"year": 2037, "source_id": "Emergency", "reserved_capacity_t": 20.0})

    # 2038: спрос 250 (Core 140 + Луна 100 + Flex 10)
    orders.append({"year": 2038, "source_id": "Earth-Core", "order_volume_t": 140.0})
    reservations.append({"year": 2038, "source_id": "Earth-Core", "reserved_capacity_t": 150.0})
    orders.append({"year": 2038, "source_id": "Lunar-ISRU", "order_volume_t": 100.0})
    reservations.append({"year": 2038, "source_id": "Lunar-ISRU", "reserved_capacity_t": 110.0})
    orders.append({"year": 2038, "source_id": "Earth-Flex", "order_volume_t": 10.0})
    reservations.append({"year": 2038, "source_id": "Earth-Flex", "reserved_capacity_t": 20.0})
    reservations.append({"year": 2038, "source_id": "Emergency", "reserved_capacity_t": 25.0})

    # 2039: спрос 320 (Core 150 + Луна 110 + Earth-New 60)
    orders.append({"year": 2039, "source_id": "Earth-Core", "order_volume_t": 150.0})
    reservations.append({"year": 2039, "source_id": "Earth-Core", "reserved_capacity_t": 160.0})
    orders.append({"year": 2039, "source_id": "Lunar-ISRU", "order_volume_t": 110.0})
    reservations.append({"year": 2039, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0})
    orders.append({"year": 2039, "source_id": "Earth-New", "order_volume_t": 60.0})
    reservations.append({"year": 2039, "source_id": "Earth-New", "reserved_capacity_t": 70.0})
    reservations.append({"year": 2039, "source_id": "Emergency", "reserved_capacity_t": 25.0})

    # 2040: спрос 390 (Core 160 + Луна 120 + Earth-New 110)
    orders.append({"year": 2040, "source_id": "Earth-Core", "order_volume_t": 160.0})
    reservations.append({"year": 2040, "source_id": "Earth-Core", "reserved_capacity_t": 170.0})
    orders.append({"year": 2040, "source_id": "Lunar-ISRU", "order_volume_t": 120.0})
    reservations.append({"year": 2040, "source_id": "Lunar-ISRU", "reserved_capacity_t": 120.0})
    orders.append({"year": 2040, "source_id": "Earth-New", "order_volume_t": 110.0})
    reservations.append({"year": 2040, "source_id": "Earth-New", "reserved_capacity_t": 120.0})
    reservations.append({"year": 2040, "source_id": "Emergency", "reserved_capacity_t": 25.0})

    return {
        "plan_id": "strategy_balanced_dual",
        "description": "Стратегия 3: «Сбалансированный дуальный контур» (Земля + Луна + New + Emergency)",
        "investments": [
            {"investment_id": "ZBO", "commissioning_year": 2036},
            {"investment_id": "LUNAR_ISRU", "commissioning_year": 2038, "capex_schedule": {2036: 450.0, 2037: 800.0}},
            {"investment_id": "EARTH_NEW", "option_year": 2036, "exercise_year": 2038}
        ],
        "capacity_reservations": reservations,
        "supply_orders": orders,
        "inventory_policy": {"initial_inventory_t": 15.0}
    }
