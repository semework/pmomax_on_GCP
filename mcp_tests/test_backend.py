from __future__ import annotations

import httpx
import pytest

from pmomax_mcp.backend import BackendClient, PMOMaxError
from pmomax_mcp.config import Settings


@pytest.mark.asyncio
async def test_backend_returns_structured_data() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json={"ok": True, "data": {"projectId": "pmx_12345678"}})
    )
    client = BackendClient(Settings(environment="test", auth_mode="disabled"), transport=transport)
    try:
        assert await client.request("GET", "/projects/pmx_12345678") == {"projectId": "pmx_12345678"}
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_backend_normalizes_errors_without_stack_traces() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            403, json={"ok": False, "error": {"code": "AUTHORIZATION_FAILED", "message": "Forbidden"}}
        )
    )
    client = BackendClient(Settings(environment="test", auth_mode="disabled"), transport=transport)
    try:
        with pytest.raises(PMOMaxError) as raised:
            await client.request("GET", "/projects/pmx_12345678")
        assert raised.value.response() == {
            "ok": False,
            "error": {"code": "AUTHORIZATION_FAILED", "message": "Forbidden"},
        }
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_backend_timeout_is_controlled() -> None:
    def timeout(_request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timeout")

    client = BackendClient(
        Settings(environment="test", auth_mode="disabled", max_retries=0),
        transport=httpx.MockTransport(timeout),
    )
    try:
        with pytest.raises(PMOMaxError, match="unavailable") as raised:
            await client.request("GET", "/projects/pmx_12345678")
        assert raised.value.code == "PROVIDER_UNAVAILABLE"
    finally:
        await client.close()
