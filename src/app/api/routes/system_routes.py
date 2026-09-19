"""
Контроллер системных метаданных и справочников кейса (/api/health, /api/meta, /api/schemas, /api/catalog).
Предоставляет неизменённые справочники кейса для построения форм и графиков во фронтенде.
"""

import csv
import hashlib
from io import StringIO
import json
from typing import Literal

from fastapi import APIRouter, Depends, Request
import yaml

from src.app.api.deps import get_settings
from src.app.config.config import Settings
from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO
from src.app.dto.web_dto import CatalogDTO, HealthDTO, MetaDTO, ReferenceTableDTO

router = APIRouter(prefix="/api", tags=["Веб-инфраструктура"])


@router.get(
    "/health",
    response_model=HealthDTO,
    summary="Состояние HTTP API; не проверка математики",
)
def health(request: Request):
    return HealthDTO(api_version=request.app.version, engine=request.app.state.engine_info)


@router.get(
    "/meta",
    response_model=MetaDTO,
    summary="Возможности и ограничения текущего backend",
)
def meta(request: Request, settings: Settings = Depends(get_settings)):
    return MetaDTO(
        api_version=request.app.version,
        engine=request.app.state.engine_info,
        plan_import_formats=["json"],
        result_export_formats=["json", "csv"],
        max_upload_bytes=settings.max_upload_bytes,
        max_request_bytes=settings.max_request_bytes,
        warnings=[
            "Общий локальный workspace без регистрации и разграничения доступа; не публикуйте API без защиты.",
            "Шаблон и defaults DTO унаследованы из 6.zip; это не оптимальный или подтверждённый план.",
            "Импорт произвольного CSV/XLSX в математическую модель ещё не подключён.",
        ],
    )


@router.get(
    "/schemas/{name}",
    summary="Исходная схема организатора или схема существующего DTO",
)
def schema(name: Literal["plan", "export", "input", "result"], settings: Settings = Depends(get_settings)):
    if name in {"plan", "export"}:
        return json.loads((settings.reference_dir / "schemas" / f"{name}.schema.json").read_text(encoding="utf-8"))
    model = ParticipantPlanDTO if name == "input" else ResultExportEnvelopeDTO
    return model.model_json_schema(mode="validation" if name == "input" else "serialization")


@router.get(
    "/catalog",
    response_model=CatalogDTO,
    summary="Неизменённые справочники кейса для форм и справки",
)
def catalog(settings: Settings = Depends(get_settings)):
    tables = []
    for name in ("demand", "supply_sources", "storage_options", "investment_options", "constraints"):
        path = settings.reference_dir / f"{name}.csv"
        data = path.read_bytes()
        reader = csv.DictReader(StringIO(data.decode("utf-8-sig")))
        tables.append(ReferenceTableDTO(
            table_id=name,
            source_path=f"data/{name}.csv",
            sha256=hashlib.sha256(data).hexdigest(),
            columns=reader.fieldnames or [],
            rows=list(reader),
        ))
    scenarios = [
        yaml.safe_load((settings.reference_dir / "scenarios" / name).read_text(encoding="utf-8"))
        for name in ("base.yaml", "mandatory_stress.yaml")
    ]
    return CatalogDTO(
        tables=tables,
        scenarios=scenarios,
        notes=[
            "CSV-значения переданы строками без изменения исходных значений, единиц и notes.",
            "Каталог и расчётный адаптер используют один reference_dir. Часть правил движка остаётся фиксированной в коде; математическая приёмка не завершена.",
        ],
    )
