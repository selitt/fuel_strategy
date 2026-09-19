"""Additive transport contracts. calc_dto.py and the organizer schemas stay unchanged."""
from typing import Annotated, Any, Literal
from uuid import UUID
from pydantic import (AwareDatetime, BaseModel, ConfigDict, Field,
                      StringConstraints, model_validator)
from src.app.dto.calc_dto import ParticipantPlanDTO, ResultExportEnvelopeDTO


class WebDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EngineInfoDTO(WebDTO):
    engine_id: str
    version: str
    status: Literal["prototype", "unverified", "unavailable"]
    model_verified: Literal[False] = False
    limitations: list[str]


class HealthDTO(WebDTO):
    status: Literal["ok"] = "ok"
    api_version: str
    engine: EngineInfoDTO


class MetaDTO(WebDTO):
    api_version: str
    engine: EngineInfoDTO
    plan_import_formats: list[Literal["json", "csv", "xlsx", "xls"]]
    result_export_formats: list[Literal["json", "csv"]]
    max_upload_bytes: int
    max_request_bytes: int
    background_jobs: bool = False
    workspace_mode: Literal["single_shared_local_workspace"] = "single_shared_local_workspace"
    warnings: list[str]


class ReferenceTableDTO(WebDTO):
    table_id: str
    source_path: str
    sha256: str
    columns: list[str]
    rows: list[dict[str, str]]


class CatalogDTO(WebDTO):
    read_only: Literal[True] = True
    tables: list[ReferenceTableDTO]
    scenarios: list[dict[str, Any]]
    notes: list[str]


class ErrorDTO(WebDTO):
    detail: str | list[dict[str, Any]]


ProjectName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=140)]
ResultState = Literal["not_calculated", "current", "stale"]


class PlanValidationDTO(WebDTO):
    validation_scope: Literal["structure_only"] = "structure_only"
    model_checked: Literal[False] = False
    plan: ParticipantPlanDTO
    normalized: bool
    warnings: list[str]


class ProjectCreateDTO(WebDTO):
    name: ProjectName
    plan: ParticipantPlanDTO


class ProjectUpdateDTO(ProjectCreateDTO):
    expected_revision: int = Field(ge=1)


class CalculationCommandDTO(WebDTO):
    expected_revision: int = Field(ge=1)


class RunRecordDTO(WebDTO):
    run_id: UUID
    input_revision: int = Field(ge=1)
    input_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    plan_snapshot: ParticipantPlanDTO
    result: ResultExportEnvelopeDTO
    created_at: AwareDatetime
    duration_ms: float = Field(ge=0, allow_inf_nan=False)
    engine: EngineInfoDTO
    origin: Literal["server", "imported"] = "server"

    @model_validator(mode="after")
    def matching_identity(self):
        if (self.plan_snapshot.plan_id != self.result.plan_id
                or self.plan_snapshot.scenario_id != self.result.scenario_id):
            raise ValueError("Result plan/scenario must match its saved input snapshot")
        return self


class ProjectDTO(WebDTO):
    schema_version: Literal[1] = 1
    project_id: UUID
    name: ProjectName
    revision: int = Field(ge=1)
    plan: ParticipantPlanDTO
    created_at: AwareDatetime
    updated_at: AwareDatetime
    result_state: ResultState = "not_calculated"
    last_run: RunRecordDTO | None = None


class ProjectSummaryDTO(WebDTO):
    project_id: UUID
    name: str
    revision: int
    plan_id: str
    scenario_id: str
    created_at: AwareDatetime
    updated_at: AwareDatetime
    result_state: ResultState


class ProjectListDTO(WebDTO):
    items: list[ProjectSummaryDTO]
    total: int
    limit: int
    offset: int


class ComparisonRequestDTO(WebDTO):
    project_ids: list[UUID] = Field(min_length=2, max_length=6)

    @model_validator(mode="after")
    def unique_projects(self):
        if len(set(self.project_ids)) != len(self.project_ids):
            raise ValueError("Выберите разные проекты")
        return self


class ComparisonItemDTO(WebDTO):
    project_id: UUID
    name: str
    revision: int
    run: RunRecordDTO


class ComparisonDTO(WebDTO):
    items: list[ComparisonItemDTO]
    warnings: list[str]


class ExportMetadataDTO(WebDTO):
    schema_version: Literal[1]
    project_id: UUID
    project_revision: int
    run_id: UUID
    input_revision: int
    input_hash: str
    plan_id: str
    scenario_id: str
    created_at: AwareDatetime
    units: dict[str, str]
    assumptions_reference: str | dict[str, Any]
    engine: EngineInfoDTO
    origin: Literal["server", "imported"]
    table_rows: dict[str, int]
    warnings: list[str]


class ResultDownloadDTO(ResultExportEnvelopeDTO):
    """Same mathematical DTO + named web provenance. No duplicated row contracts."""
    web_export: ExportMetadataDTO = Field(alias="_web_export")
