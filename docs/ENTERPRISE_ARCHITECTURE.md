# Enterprise architecture

```mermaid
flowchart TB
  GUI[PMOMax React GUI] --> REST[Express REST/API]
  AI[AI clients: ChatGPT / Claude / Gemini / Cursor / Codex] --> MCP[Official MCP server\nStreamable HTTP or stdio]
  MCP --> AUTHN[OAuth/OIDC or bearer authentication]
  AUTHN --> AUTHZ[RBAC + tenant/project authorization]
  REST --> CORE[PMOMax Core Services]
  AUTHZ --> CORE
  CORE --> PID[Canonical 28-field PID]
  CORE --> RISK[Risk]
  CORE --> COMP[Compliance]
  CORE --> SCHED[Schedule]
  CORE --> COST[Cost]
  CORE --> GANTT[Gantt]
  CORE --> RAG[Grounded project search / RAG boundary]
  CORE --> EXPORT[Export]
  PID --> STORE[Tenant-isolated storage / models]
  RISK --> STORE
  COMP --> STORE
  SCHED --> STORE
  COST --> STORE
  GANTT --> STORE
  RAG --> STORE
  EXPORT --> STORE
  STORE --> GCP[Google Cloud / Marketplace deployment]
  CORE --> AUDIT[Structured audit + metrics/logs]
```

The original runtime remains React/Vite served by Express. Existing `/api/*` GUI routes, Gemini helpers, Marketplace usage and entitlement, exports, static assets, Docker deployer, schemas, and Google manifests remain in place. The enterprise router is mounted at `/api/enterprise/v1`; both it and MCP call `lib/enterprise/projectService.mjs`, which owns canonical normalization, persistence, RBAC, tenant isolation, analysis, planning, and export behavior.

The MCP process is horizontally scalable and stateless. Durable state belongs to the core service. Its HTTP client applies bounded connection pools, concurrency limits, deadlines, retry-with-jitter only for transient failures, and safe error translation. Production should replace local filesystem persistence with the existing organization-approved durable volume or a compatible tenant-aware storage adapter before multi-instance writes.
