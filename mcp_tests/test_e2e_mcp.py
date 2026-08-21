from __future__ import annotations

import asyncio
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from collections.abc import Iterator
from pathlib import Path

import httpx
import pytest
from mcp.client import Client

ROOT = Path(__file__).resolve().parents[1]


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_for(url: str, process: subprocess.Popen[bytes]) -> None:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"service exited with {process.returncode}")
        try:
            if httpx.get(url, timeout=0.5).status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(0.1)
    raise RuntimeError(f"service did not become ready: {url}")


@pytest.fixture(scope="module")
def running_services() -> Iterator[str]:
    backend_port, mcp_port = free_port(), free_port()
    with tempfile.TemporaryDirectory(prefix="pmomax-e2e-") as data_dir:
        backend_env = {
            **os.environ,
            "PORT": str(backend_port),
            "NODE_ENV": "test",
            "PMOMAX_AUTH_MODE": "disabled",
            "PMOMAX_DATA_DIR": data_dir,
            "GOOGLE_API_KEY": "",
            "OPENAI_API_KEY": "",
        }
        node = shutil.which("node")
        assert node is not None
        backend = subprocess.Popen(  # noqa: S603 - fixed executable and arguments
            [node, "server.mjs"],
            cwd=ROOT,
            env=backend_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        try:
            wait_for(f"http://127.0.0.1:{backend_port}/health", backend)
            mcp_env = {
                **os.environ,
                "PMOMAX_MCP_ENVIRONMENT": "test",
                "PMOMAX_MCP_AUTH_MODE": "disabled",
                "PMOMAX_MCP_PORT": str(mcp_port),
                "PMOMAX_MCP_BACKEND_URL": f"http://127.0.0.1:{backend_port}/api/enterprise/v1",
                "PMOMAX_MCP_PUBLIC_URL": f"http://127.0.0.1:{mcp_port}/mcp",
            }
            mcp = subprocess.Popen(  # noqa: S603 - fixed interpreter and module
                [sys.executable, "-m", "pmomax_mcp.server", "--transport", "streamable-http"],
                cwd=ROOT,
                env=mcp_env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            try:
                wait_for(f"http://127.0.0.1:{mcp_port}/healthz", mcp)
                yield f"http://127.0.0.1:{mcp_port}/mcp"
            finally:
                mcp.terminate()
                mcp.wait(timeout=10)
        finally:
            backend.terminate()
            backend.wait(timeout=10)


def data(result: object) -> dict[str, object]:
    structured = getattr(result, "structured_content", None)
    assert isinstance(structured, dict)
    assert structured.get("ok") is True
    payload = structured.get("data")
    assert isinstance(payload, dict)
    return payload


@pytest.mark.asyncio
async def test_complete_mcp_discovery_workflow_and_concurrency(running_services: str) -> None:
    async with Client(running_services) as client:
        tools = await client.list_tools()
        names = {tool.name for tool in tools.tools}
        expected = {
            "create_project",
            "generate_pid",
            "analyze_project",
            "get_project",
            "update_project",
            "identify_risks",
            "run_compliance_check",
            "generate_gantt",
            "estimate_schedule",
            "estimate_cost",
            "compare_project_versions",
            "export_project",
            "search_project_knowledge",
        }
        assert names == expected
        assert all(tool.input_schema for tool in tools.tools)

        templates = await client.list_resource_templates()
        assert len(templates.resource_templates) == 7

        created = data(
            await client.call_tool(
                "create_project",
                {
                    "input": {
                        "text": (
                            "Migrate enterprise payments with security review, staged testing, "
                            "and a governed launch."
                        ),
                        "idempotency_key": "e2e-request-0001",
                    }
                },
            )
        )
        project_id = str(created["projectId"])
        assert (
            data(
                await client.call_tool(
                    "generate_pid", {"input": {"text": "A second canonical PID for discovery validation."}}
                )
            )["canonicalFieldCount"]
            == 28
        )
        assert (
            data(await client.call_tool("analyze_project", {"input": {"project_id": project_id}}))[
                "projectId"
            ]
            == project_id
        )
        current = data(await client.call_tool("get_project", {"input": {"project_id": project_id}}))
        updated = data(
            await client.call_tool(
                "update_project",
                {
                    "input": {
                        "project_id": project_id,
                        "expected_version": current["version"],
                        "patch": {"timelineOverview": "Approved revised schedule"},
                    }
                },
            )
        )
        assert updated["version"] == 2
        assert data(await client.call_tool("identify_risks", {"input": {"project_id": project_id}}))["risks"]
        assert (
            len(
                data(await client.call_tool("run_compliance_check", {"input": {"project_id": project_id}}))[
                    "findings"
                ]
            )
            == 5
        )
        assert (
            data(await client.call_tool("generate_gantt", {"input": {"project_id": project_id}}))["gantt"][
                "canRender"
            ]
            is True
        )
        assert data(await client.call_tool("estimate_schedule", {"input": {"project_id": project_id}}))[
            "schedule"
        ]["calculatedEnd"]
        assert (
            data(await client.call_tool("estimate_cost", {"input": {"project_id": project_id}}))["cost"][
                "totalCostUsd"
            ]
            == 0
        )
        comparison = data(
            await client.call_tool(
                "compare_project_versions",
                {"input": {"project_id": project_id, "from_version": 1, "to_version": 2}},
            )
        )
        assert comparison["changedFields"]
        exported = data(
            await client.call_tool("export_project", {"input": {"project_id": project_id, "format": "json"}})
        )
        assert exported["mimeType"] == "application/json"
        search = data(
            await client.call_tool(
                "search_project_knowledge", {"input": {"project_id": project_id, "query": "security launch"}}
            )
        )
        assert search["results"]

        reads = await asyncio.gather(
            *[client.call_tool("get_project", {"input": {"project_id": project_id}}) for _ in range(20)]
        )
        assert all(data(result)["version"] == 2 for result in reads)
