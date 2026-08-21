from __future__ import annotations

import asyncio
import logging
import secrets
from typing import Any

import httpx
from mcp.server.auth.middleware.auth_context import get_access_token
from mcp.server.auth.provider import AccessToken

from .auth import development_access_token
from .config import Settings

logger = logging.getLogger("pmomax.mcp")


class PMOMaxError(RuntimeError):
    def __init__(self, code: str, message: str, status: int = 500, details: Any = None):
        super().__init__(message)
        self.code, self.status, self.details = code, status, details

    def response(self) -> dict[str, Any]:
        return {
            "ok": False,
            "error": {
                "code": self.code,
                "message": str(self),
                **({"details": self.details} if self.details is not None else {}),
            },
        }


class BackendClient:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings
        self._client = httpx.AsyncClient(
            base_url=str(settings.backend_url).rstrip("/") + "/",
            timeout=httpx.Timeout(
                settings.request_timeout_seconds, connect=min(5.0, settings.request_timeout_seconds)
            ),
            transport=transport,
            limits=httpx.Limits(
                max_connections=settings.max_concurrent_requests,
                max_keepalive_connections=max(4, settings.max_concurrent_requests // 2),
            ),
        )
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_requests)

    async def close(self) -> None:
        await self._client.aclose()

    async def readiness(self) -> bool:
        internal = self.settings.backend_internal_token
        if internal:
            headers = {
                "Authorization": f"Bearer {internal.get_secret_value()}",
                "X-PMOMax-User-Id": "mcp-readiness",
                "X-PMOMax-Tenant-Id": "system-health",
                "X-PMOMax-Roles": "service_account",
            }
        elif self.settings.auth_mode == "disabled":
            headers = self._headers(development_access_token())
        else:
            return False
        try:
            response = await self._client.get("ready", headers=headers)
            payload = self._json(response)
            return response.status_code == 200 and payload.get("ok") is True
        except (httpx.HTTPError, PMOMaxError):
            return False

    async def request(self, method: str, path: str, json: dict[str, Any] | None = None) -> dict[str, Any]:
        token = get_access_token() or (
            development_access_token() if self.settings.auth_mode == "disabled" else None
        )
        if token is None:
            raise PMOMaxError("AUTHENTICATION_FAILED", "Authentication is required.", 401)
        headers = self._headers(token)
        attempts = self.settings.max_retries + 1
        async with self._semaphore:
            for attempt in range(attempts):
                try:
                    response = await self._client.request(
                        method, path.lstrip("/"), json=json, headers=headers
                    )
                except (httpx.ConnectError, httpx.ReadTimeout, httpx.ConnectTimeout) as exc:
                    if attempt + 1 >= attempts:
                        raise PMOMaxError(
                            "PROVIDER_UNAVAILABLE", "PMOMax core service is unavailable.", 503
                        ) from exc
                    await asyncio.sleep((0.2 * (2**attempt)) + secrets.randbelow(100) / 1000)
                    continue
                payload = self._json(response)
                if response.status_code in {502, 503, 504} and attempt + 1 < attempts:
                    await asyncio.sleep((0.2 * (2**attempt)) + secrets.randbelow(100) / 1000)
                    continue
                if response.is_error or not payload.get("ok"):
                    error = payload.get("error", {})
                    raise PMOMaxError(
                        str(error.get("code", "INTERNAL_PROCESSING_FAILURE")),
                        str(error.get("message", "The operation failed.")),
                        response.status_code,
                        error.get("details"),
                    )
                return dict(payload["data"])
        raise PMOMaxError("INTERNAL_PROCESSING_FAILURE", "The operation failed.")

    def _headers(self, token: AccessToken) -> dict[str, str]:
        claims = token.claims or {}
        internal = self.settings.backend_internal_token
        if internal:
            return {
                "Authorization": f"Bearer {internal.get_secret_value()}",
                "X-PMOMax-User-Id": str(token.subject or token.client_id),
                "X-PMOMax-Tenant-Id": str(claims.get("tenant_id", "")),
                "X-PMOMax-Roles": ",".join(str(role) for role in claims.get("roles", [])),
            }
        return {"Authorization": f"Bearer {token.token}"}

    @staticmethod
    def _json(response: httpx.Response) -> dict[str, Any]:
        try:
            value = response.json()
            return value if isinstance(value, dict) else {}
        except ValueError as exc:
            raise PMOMaxError(
                "PROVIDER_UNAVAILABLE", "PMOMax core returned an invalid response.", 502
            ) from exc
