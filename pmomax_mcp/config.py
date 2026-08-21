from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, HttpUrl, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PMOMAX_MCP_", env_file=None, extra="ignore")

    environment: Literal["development", "test", "staging", "production"] = "development"
    host: str = "127.0.0.1"
    port: int = Field(default=8081, ge=1, le=65535)
    transport: Literal["stdio", "streamable-http"] = "streamable-http"
    backend_url: HttpUrl = HttpUrl("http://127.0.0.1:8080/api/enterprise/v1")
    public_url: HttpUrl = HttpUrl("http://127.0.0.1:8081/mcp")
    backend_internal_token: SecretStr | None = None
    auth_mode: Literal["disabled", "hs256", "oidc"] = "disabled"
    jwt_secret: SecretStr | None = None
    jwt_issuer: str | None = None
    jwt_audience: str | None = None
    oidc_jwks_url: HttpUrl | None = None
    required_scope: str = "pmomax:mcp"
    request_timeout_seconds: float = Field(default=30.0, ge=1, le=300)
    max_retries: int = Field(default=2, ge=0, le=5)
    max_concurrent_requests: int = Field(default=32, ge=1, le=512)
    max_text_chars: int = Field(default=1_000_000, ge=1_000, le=3_500_000)

    @field_validator("host")
    @classmethod
    def host_is_safe(cls, value: str) -> str:
        if not value or any(char.isspace() for char in value):
            raise ValueError("host must be a hostname or IP address")
        return value

    @model_validator(mode="after")
    def validate_security(self) -> Settings:
        if self.environment == "production" and self.auth_mode == "disabled":
            raise ValueError("authentication cannot be disabled in production")
        if self.auth_mode == "hs256" and (
            self.jwt_secret is None or len(self.jwt_secret.get_secret_value()) < 32
        ):
            raise ValueError("HS256 requires a secret of at least 32 characters")
        if self.auth_mode == "oidc" and (
            not self.oidc_jwks_url or not self.jwt_issuer or not self.jwt_audience
        ):
            raise ValueError("OIDC requires JWKS URL, issuer, and audience")
        if self.environment == "production" and self.backend_internal_token is None:
            raise ValueError("production mode requires an internal backend token")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
