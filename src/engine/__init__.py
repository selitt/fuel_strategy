"""
Пакет расчётного ядра «Топливный космоконтур 2035».
"""

from .engine import SimulationEngine, get_engine, run_engine
from .pseudo_engine import run_pseudo_engine
from .strategies import (
    get_earth_fortress_strategy,
    get_lunar_pioneer_strategy,
    get_balanced_strategy,
)

__all__ = [
    "SimulationEngine",
    "get_engine",
    "run_engine",
    "run_pseudo_engine",
    "get_earth_fortress_strategy",
    "get_lunar_pioneer_strategy",
    "get_balanced_strategy",
]
