"""
Модуль динамической загрузки данных из CSV и YAML.
Обеспечивает расширяемость: подхватывает любые новые источники и года без хардкода.
"""

import csv
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .models import (
    DemandRecord,
    SupplySource,
    StorageOption,
    InvestmentOption,
    ConstraintRule,
)


def find_data_root() -> Path:
    """Возвращает единственный рабочий каталог data/ проекта."""
    current = Path(__file__).resolve().parent
    for parent in [current] + list(current.parents):
        candidate = parent / "data"
        if candidate.is_dir() and (candidate / "demand.csv").is_file():
            return candidate
    raise FileNotFoundError("Не удалось найти каталог с данными кейса (data/*.csv).")


def find_scenarios_root() -> Path:
    """Возвращает каталог сценариев внутри единственного рабочего data/."""
    scenarios = find_data_root() / "scenarios"
    if scenarios.is_dir() and (scenarios / "base.yaml").is_file():
        return scenarios
    raise FileNotFoundError("Не удалось найти каталог сценариев (data/scenarios/*.yaml).")


def load_demand(data_root: Optional[Path] = None) -> Dict[int, DemandRecord]:
    root = data_root or find_data_root()
    path = root / "demand.csv"
    res = {}
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            y = int(row["year"])
            res[y] = DemandRecord(
                year=y,
                base_total_t=float(row["base_total_t"]),
                base_critical_t=float(row["base_critical_t"]),
                low_total_t=float(row["low_total_t"]),
                high_total_t=float(row["high_total_t"]),
            )
    return res


def load_supply_sources(data_root: Optional[Path] = None) -> Dict[str, SupplySource]:
    root = data_root or find_data_root()
    path = root / "supply_sources.csv"
    res = {}
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            s_id = row["source_id"].strip()
            avail = row.get("available_from_year", "").strip()
            avail_year = int(avail) if avail and avail != "null" else None

            source = SupplySource(
                source_id=s_id,
                name=row["name"].strip(),
                capacity_t_per_year=float(row["capacity_t_per_year"]),
                variable_cost_mln_per_t=float(row["variable_cost_mln_per_t"]),
                reservation_rate=float(row["reservation_rate_mln_per_t_year_capacity"]),
                take_or_pay_share=float(row["take_or_pay_share"]),
                lead_time_min_value=float(row["lead_time_min_value"]),
                lead_time_max_value=float(row["lead_time_max_value"]),
                lead_time_unit=row["lead_time_unit"].strip(),
                reliability_profile=row["reliability_profile"].strip(),
                available_from_year=avail_year,
                notes=row.get("notes", "").strip(),
            )
            # Доступ по ID (A) и по имени (Earth-Core)
            res[s_id] = source
            res[source.name] = source
    return res


def load_storage_options(data_root: Optional[Path] = None) -> Dict[str, StorageOption]:
    root = data_root or find_data_root()
    path = root / "storage_options.csv"
    res = {}
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            s_id = row["storage_id"].strip()
            res[s_id] = StorageOption(
                storage_id=s_id,
                name=row["name"].strip(),
                capacity_t=float(row["capacity_t"]),
                loss_rate_on_throughput=float(row["loss_rate_on_throughput"]),
                holding_cost_mln_per_t_year=float(row["holding_cost_mln_per_t_year"]),
                capex_mln=float(row["capex_mln"]),
                fixed_opex_mln_per_year=float(row["fixed_opex_mln_per_year"]),
                available_from_year=int(row["available_from_year"]),
            )
    return res


def load_investment_options(data_root: Optional[Path] = None) -> Dict[str, InvestmentOption]:
    root = data_root or find_data_root()
    path = root / "investment_options.csv"
    res = {}
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            inv_id = row["investment_id"].strip()
            res[inv_id] = InvestmentOption(
                investment_id=inv_id,
                name=row["name"].strip(),
                option_fee_mln=float(row["option_fee_mln"]),
                exercise_cost_mln=float(row["exercise_cost_mln"]),
                total_capex_mln=float(row["total_capex_mln"]),
                commissioning_rule=row["commissioning_rule"].strip(),
                fixed_opex_mln_per_year=float(row["fixed_opex_mln_per_year"]),
            )
    return res


def load_constraints(data_root: Optional[Path] = None) -> List[ConstraintRule]:
    root = data_root or find_data_root()
    path = root / "constraints.csv"
    res = []
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            res.append(ConstraintRule(
                constraint_id=row["constraint_id"].strip(),
                metric=row["metric"].strip(),
                operator=row["operator"].strip(),
                value=float(row["value"]),
                unit=row["unit"].strip(),
                period=row["period"].strip(),
                scenario=row["scenario"].strip(),
                severity=row["severity"].strip(),
                description=row.get("description", "").strip(),
            ))
    return res


class CaseCatalog:
    """Единый динамический контейнер справочных данных кейса."""
    def __init__(self, data_root: Optional[Path] = None):
        self.data_root = data_root or find_data_root()
        self.demands = load_demand(self.data_root)
        self.sources = load_supply_sources(self.data_root)
        self.storages = load_storage_options(self.data_root)
        self.investments = load_investment_options(self.data_root)
        self.constraints = load_constraints(self.data_root)
        self.years = sorted(self.demands.keys())
