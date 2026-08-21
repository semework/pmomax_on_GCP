from __future__ import annotations

import time

import jwt
import pytest
from pydantic import SecretStr, ValidationError

from pmomax_mcp.auth import JwtTokenVerifier
from pmomax_mcp.config import Settings
from pmomax_mcp.models import ProjectInput, ProjectRef, UpdateInput


def secure_settings(**overrides: object) -> Settings:
    values = {
        "environment": "test",
        "auth_mode": "hs256",
        "jwt_secret": SecretStr("x" * 32),
        "jwt_issuer": "https://issuer.example",
        "jwt_audience": "pmomax",
    }
    values.update(overrides)
    return Settings(**values)


@pytest.mark.asyncio
async def test_valid_jwt_maps_identity_tenant_roles_and_scope() -> None:
    settings = secure_settings()
    token = jwt.encode(
        {
            "sub": "user-1",
            "tenant_id": "tenant-a",
            "roles": ["user"],
            "scope": "pmomax:mcp",
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "exp": int(time.time()) + 300,
        },
        settings.jwt_secret.get_secret_value(),
        algorithm="HS256",
    )
    access = await JwtTokenVerifier(settings).verify_token(token)
    assert access is not None
    assert access.subject == "user-1"
    assert access.claims == {"iss": settings.jwt_issuer, "tenant_id": "tenant-a", "roles": ["user"]}


@pytest.mark.asyncio
@pytest.mark.parametrize("change", [{"tenant_id": None}, {"roles": []}, {"scope": "wrong"}, {"exp": 1}])
async def test_invalid_identity_claims_are_rejected(change: dict[str, object]) -> None:
    settings = secure_settings()
    claims: dict[str, object] = {
        "sub": "user-1",
        "tenant_id": "tenant-a",
        "roles": ["user"],
        "scope": "pmomax:mcp",
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "exp": int(time.time()) + 300,
    }
    claims.update(change)
    token = jwt.encode(claims, settings.jwt_secret.get_secret_value(), algorithm="HS256")
    assert await JwtTokenVerifier(settings).verify_token(token) is None


def test_production_refuses_disabled_authentication() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", auth_mode="disabled")


def test_argument_models_reject_extra_fields_traversal_and_unsafe_keys() -> None:
    with pytest.raises(ValidationError):
        ProjectRef(project_id="../secrets")
    with pytest.raises(ValidationError):
        ProjectInput(text="valid", structured={"__proto__": {"admin": True}})
    with pytest.raises(ValidationError):
        UpdateInput(project_id="pmx_12345678", expected_version=0, patch={}, unexpected=True)
