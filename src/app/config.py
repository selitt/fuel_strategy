"""Web-layer configuration. No model parameters or financial assumptions live here."""
from dataclasses import dataclass, field
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True, slots=True)
class Settings:
    data_dir: Path = field(default_factory=lambda: ROOT / ".local" / "projects")
    reference_dir: Path = field(default_factory=lambda: ROOT / "data")
    max_request_bytes: int = 8 * 1024 * 1024
    max_upload_bytes: int = 2 * 1024 * 1024
    cors_origins: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")

    def __post_init__(self):
        if not 0 < self.max_upload_bytes <= self.max_request_bytes:
            raise ValueError("Require 0 < max_upload_bytes <= max_request_bytes")
        if "*" in self.cors_origins:
            raise ValueError("Use explicit CORS origins, not '*'")

    @classmethod
    def from_env(cls) -> "Settings":
        defaults = cls()
        return cls(
            data_dir=Path(os.getenv("FUEL_DATA_DIR", str(defaults.data_dir))).resolve(),
            max_request_bytes=int(os.getenv("FUEL_MAX_REQUEST_BYTES", defaults.max_request_bytes)),
            max_upload_bytes=int(os.getenv("FUEL_MAX_UPLOAD_BYTES", defaults.max_upload_bytes)),
            cors_origins=tuple(value.strip() for value in os.getenv(
                "FUEL_CORS_ORIGINS", ",".join(defaults.cors_origins)
            ).split(",") if value.strip()),
        )
