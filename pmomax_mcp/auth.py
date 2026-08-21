from __future__ import annotations

import asyncio
import time
from typing import Any

import jwt
from mcp.server.auth.provider import AccessToken

from .config import Settings

VALID_ROLES = frozenset({"user", "project_manager", "administrator", "service_account"})


class JwtTokenVerifier:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._jwks = (
            jwt.PyJWKClient(str(settings.oidc_jwks_url), cache_keys=True, lifespan=300)
            if settings.oidc_jwks_url
            else None
        )

    async def verify_token(self, token: str) -> AccessToken | None:
        try:
            claims = await asyncio.to_thread(self._decode, token)
            subject = str(claims.get("sub", ""))
            tenant_id = str(claims.get("tenant_id") or claims.get("organization_id") or "")
            roles = sorted(self._roles(claims))
            if not subject or not tenant_id or not roles:
                return None
            scopes = self._scopes(claims)
            if self.settings.required_scope and self.settings.required_scope not in scopes:
                return None
            safe_claims = {"iss": claims.get("iss"), "tenant_id": tenant_id, "roles": roles}
            return AccessToken(
                token=token,
                client_id=str(claims.get("client_id") or claims.get("azp") or subject),
                scopes=scopes,
                expires_at=int(claims["exp"]),
                subject=subject,
                claims=safe_claims,
            )
        except (jwt.PyJWTError, KeyError, TypeError, ValueError):
            return None

    def _decode(self, token: str) -> dict[str, Any]:
        common: dict[str, Any] = {
            "algorithms": ["HS256"] if self.settings.auth_mode == "hs256" else ["RS256", "ES256"],
            "options": {"require": ["exp", "sub"]},
            "leeway": 30,
        }
        if self.settings.jwt_issuer:
            common["issuer"] = self.settings.jwt_issuer
        if self.settings.jwt_audience:
            common["audience"] = self.settings.jwt_audience
        else:
            common["options"]["verify_aud"] = False
        if self.settings.auth_mode == "hs256":
            assert self.settings.jwt_secret is not None
            return jwt.decode(token, self.settings.jwt_secret.get_secret_value(), **common)
        if self._jwks is None:
            raise ValueError("JWKS is not configured")
        key = self._jwks.get_signing_key_from_jwt(token)
        return jwt.decode(token, key.key, **common)

    @staticmethod
    def _roles(claims: dict[str, Any]) -> set[str]:
        value = claims.get("roles", claims.get("role", []))
        values = value if isinstance(value, list) else str(value).split(",")
        return {str(role).strip() for role in values if str(role).strip() in VALID_ROLES}

    @staticmethod
    def _scopes(claims: dict[str, Any]) -> list[str]:
        value = claims.get("scope", claims.get("scopes", ""))
        return [str(scope) for scope in (value if isinstance(value, list) else str(value).split()) if scope]


def development_access_token() -> AccessToken:
    return AccessToken(
        token=f"development-{time.time_ns()}",
        client_id="local-client",
        scopes=["pmomax:mcp"],
        expires_at=int(time.time()) + 3600,
        subject="local-user",
        claims={"tenant_id": "local-tenant", "roles": ["administrator"], "iss": "local"},
    )
