# PMOMax Enterprise MCP

PMOMax exposes the same tenant-aware project service to the existing React/Express application and to standards-compliant MCP clients. The MCP process uses the official Python SDK, stateless Streamable HTTP at `/mcp`, or stdio for local clients.

## Install and run

```bash
npm ci
python3 -m venv .venv-mcp
.venv-mcp/bin/pip install -r requirements-mcp.lock
npm run build
NODE_ENV=test PMOMAX_AUTH_MODE=disabled PORT=8080 node server.mjs
PMOMAX_MCP_ENVIRONMENT=test PMOMAX_MCP_AUTH_MODE=disabled \
  PMOMAX_MCP_BACKEND_URL=http://127.0.0.1:8080/api/enterprise/v1 \
  .venv-mcp/bin/python -m pmomax_mcp.server --transport streamable-http
```

Local MCP URL: `http://127.0.0.1:8081/mcp`. Liveness is `/healthz`; readiness is `/ready`. For stdio, use `python -m pmomax_mcp.server --transport stdio`.

Production refuses disabled authentication and requires an internal backend token. Set `PMOMAX_MCP_AUTH_MODE=oidc` with issuer, audience, and JWKS URL, or `hs256` for a controlled symmetric-token deployment. Tokens require `sub`, `tenant_id`, an allowed role, and the `pmomax:mcp` scope. The MCP server forwards identity claims to the core through a separate internal bearer credential; credentials are never tool arguments.

Roles are `user`, `project_manager`, `administrator`, and `service_account`. Tenant and project checks occur in the service layer for every read, write, export, version, and search. Cross-tenant lookups return `PROJECT_NOT_FOUND` to resist identifier enumeration.

## Tools

All tools require authentication. Errors use `{ok:false,error:{code,message,details?}}`; successful results use `{ok:true,data:{...}}`. Common codes are `INVALID_INPUT`, `AUTHENTICATION_FAILED`, `AUTHORIZATION_FAILED`, `PROJECT_NOT_FOUND`, `VERSION_CONFLICT`, `INVALID_EXPORT_FORMAT`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, and `INTERNAL_PROCESSING_FAILURE`.

| Tool | Purpose and input | Output | Access / behavior |
|---|---|---|---|
| `create_project` | `input:{text?,structured?,requirements?,idempotency_key?}` | ID, version, canonical PID, warnings, validation | Write; allowed roles; idempotent when key is supplied |
| `generate_pid` | `input:{text?,structured?,requirements?}`, optional `project_id` | Canonical 28-field PID or updated project | Write only when project ID is supplied |
| `analyze_project` | `input:{project_id}` | Summary, assumptions, issues, dependencies, risks, schedule implications, recommendations | Read-only |
| `get_project` | `input:{project_id}` | Authorized current project | Read-only |
| `update_project` | `input:{project_id,expected_version,patch,replace?}` | New version and canonical PID | Write; optimistic concurrency; idempotent for the same version boundary |
| `identify_risks` | `input:{project_id}` | Risk/category/severity/probability/impact/mitigation/evidence/confidence | Read-only analysis |
| `run_compliance_check` | `input:{project_id}` | Requirement/result/evidence/severity/remediation/confidence | Read-only; missing evidence remains missing |
| `generate_gantt` | `input:{project_id}` | Rows, dependency edges, renderability | Read-only |
| `estimate_schedule` | `input:{project_id}` | Known dates, calculated dates, assumptions, AI estimates | Read-only |
| `estimate_cost` | `input:{project_id}` | Supplied/calculated costs, assumptions, inferred values | Read-only |
| `compare_project_versions` | `input:{project_id,from_version,to_version}` | Field, schedule, cost, risk, and compliance changes | Read-only |
| `export_project` | `input:{project_id,format}` | Filename, MIME type, size, SHA-256, base64 content | Artifact-producing, idempotent; headless JSON currently supported |
| `search_project_knowledge` | `input:{project_id,query,limit?}` | Tenant-scoped, field-attributed results | Read-only |

Example discovery and call with the Python SDK:

```python
from mcp.client import Client

async with Client("http://127.0.0.1:8081/mcp") as client:
    tools = await client.list_tools()
    result = await client.call_tool("create_project", {
        "input": {"text": "Launch a governed service migration.", "idempotency_key": "req-12345678"}
    })
```

## Resources

Authorized templates are `project://{project_id}` plus `/pid`, `/status`, `/risks`, `/compliance`, `/schedule`, and `/gantt`. Resource IDs contain only opaque project identifiers. Resources use the same authorization path as tools.

## Security and operations

Documents are untrusted data. Instruction-like content is quarantined before deterministic generation; it cannot alter authorization or server policy. Identifiers and model inputs use Pydantic and server validation. There are no shell, filesystem, SQL, Python, or arbitrary network tools. Writes are atomic, tenant directories are isolated, project IDs are opaque, and versions prevent lost updates.

Per-user/tenant request rates, expensive-operation rates, payload size, concurrency, model timeouts, and retries are configurable. Audit records include time, request, user, tenant, project, operation, and outcome without tokens or document bodies. JSON logs are compatible with Google Cloud Logging.

## Verification

```bash
npm test -- --reporter=dot
npx tsc --noEmit
npx eslint App.tsx components hooks lib --ext .js,.jsx,.ts,.tsx
.venv-mcp/bin/ruff check pmomax_mcp mcp_tests
.venv-mcp/bin/mypy pmomax_mcp
.venv-mcp/bin/pytest -q
npm run build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npx playwright test
docker build -f Dockerfile.mcp -t pmomax-mcp:local .
```

Google Cloud Build uses `cloudbuild.mcp.yaml`; Kubernetes uses `deploy/manifest/pmomax-mcp-deployment.yaml`. Store all credential values in Secret Manager/Kubernetes Secrets, never in manifests.
