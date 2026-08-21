from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ProjectInput(StrictModel):
    text: str = Field(default="", max_length=1_000_000)
    structured: dict[str, Any] | None = None
    requirements: list[str] = Field(default_factory=list, max_length=100)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("structured")
    @classmethod
    def reject_prototype_keys(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        if value is not None and any(key in {"__proto__", "constructor", "prototype"} for key in value):
            raise ValueError("unsafe object key")
        return value


class UpdateInput(StrictModel):
    project_id: str = Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$")
    expected_version: int = Field(ge=1)
    patch: dict[str, Any]
    replace: bool = False


class ProjectRef(StrictModel):
    project_id: str = Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$")


class CompareInput(ProjectRef):
    from_version: int = Field(ge=1)
    to_version: int = Field(ge=1)


class ExportInput(ProjectRef):
    format: Literal["json", "pdf", "docx", "svg", "png", "jpeg"] = "json"


class SearchInput(ProjectRef):
    query: str = Field(min_length=3, max_length=500)
    limit: int = Field(default=10, ge=1, le=25)
