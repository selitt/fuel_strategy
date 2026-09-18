"""Exports values already returned by the model. No physics/finance recomputation."""
import csv
from io import BytesIO, StringIO
import json
from typing import Any
import zipfile

from src.app.dto.web_dto import ProjectDTO
from src.app.errors import ApiProblem
from src.app.service.json_io import dumps

TABLES = ("yearly_balance", "source_schedule", "inventory_trace", "financial_breakdown",
          "constraint_checks", "risk_register")


def csv_cell(value: Any):
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    if value is None:
        return ""
    if isinstance(value, str):
        # CSV/Excel formula injection protection. Numeric negatives stay numeric.
        stripped = value.lstrip()
        if (stripped.startswith(("=", "+", "-", "@"))
                or value.startswith(("\t", "\r", "\n"))):
            return "'" + value
    return value


def metadata(project: ProjectDTO) -> dict:
    run = project.last_run
    if run is None:
        raise ApiProblem(409, "RESULT_NOT_AVAILABLE", "Проект ещё не рассчитан")
    value = run.result.model_dump(mode="json")
    return {
        "schema_version": 1,
        "project_id": str(project.project_id), "project_revision": project.revision,
        "run_id": str(run.run_id), "input_revision": run.input_revision,
        "input_hash": run.input_hash, "plan_id": run.result.plan_id,
        "scenario_id": run.result.scenario_id,
        "created_at": run.created_at.isoformat(), "units": run.result.units,
        "assumptions_reference": run.result.assumptions_reference,
        "engine": run.engine.model_dump(mode="json"), "origin": run.origin,
        "table_rows": {name: len(value[name]) for name in TABLES},
        "warnings": [
            "Достоверность модели этим экспортом не подтверждается; смотрите engine/status и origin.",
            "Пустая таблица не доказывает нулевой риск или полноту проверок.",
            "В CSV опасные текстовые ячейки экранированы апострофом; исходные значения сохранены в JSON.",
            "Единицы и assumptions_reference переданы из результата; их полноту подтверждает владелец модели.",
        ],
    }


def result_document(project: ProjectDTO) -> dict:
    result = project.last_run.result.model_dump(mode="json")
    if "_web_export" in result:
        raise ApiProblem(500, "EXPORT_METADATA_CONFLICT", "Результат использует зарезервированное поле _web_export")
    # Official export.schema.json explicitly permits additionalProperties.
    result["_web_export"] = metadata(project)
    return result


def csv_archive(project: ProjectDTO) -> bytes:
    document = result_document(project)
    context_values = [project.plan.scenario_id, project.plan.plan_id, project.last_run.input_hash]
    meta = metadata(project)
    meta["csv_layout"] = {}
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for table in TABLES:
            rows = document[table]
            columns = list(dict.fromkeys(key for row in rows for key in row))
            prefix = "export_"
            while any(prefix + name in columns for name in ("scenario_id", "plan_id", "input_hash")):
                prefix += "_"
            context_columns = [prefix + name for name in ("scenario_id", "plan_id", "input_hash")]
            meta["csv_layout"][table] = {"context_columns": context_columns, "value_columns": columns}
            text = StringIO(newline="")
            writer = csv.writer(text)
            writer.writerow([csv_cell(name) for name in [*context_columns, *columns]])
            for row in rows:
                writer.writerow([csv_cell(value) for value in [*context_values, *(row.get(column) for column in columns)]])
            archive.writestr(f"{table}.csv", text.getvalue().encode("utf-8-sig"))
        archive.writestr("metadata.json", dumps(meta, pretty=True))
        archive.writestr("result.json", dumps(document, pretty=True))
        archive.writestr("plan.json", dumps(project.last_run.plan_snapshot.model_dump(mode="json"), pretty=True))
    return buffer.getvalue()
