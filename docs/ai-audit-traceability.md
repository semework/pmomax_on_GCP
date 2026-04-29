# PMOMax AI Audit Traceability

PMOMax provides configurable AI decision traceability for AI-assisted project outputs inside the customer tenant. The default implementation does not require a PMOMax-owned database or cross-tenant audit transport.

## Architecture

PMOMax is designed for customer-tenant deployment on GCP. Runtime pods/services are stateless. The audit path uses infrastructure the customer already owns:

1. PMOMax AI endpoint handles a request.
2. The server creates a `requestId` and endpoint-scoped audit context.
3. Deterministic and LLM operations append trace steps.
4. The response receives `_auditMeta` and `_auditTrace`.
5. Winston emits a structured JSON event to stdout.
6. GKE or Cloud Run captures stdout into Cloud Logging.

Default structured event:

```text
message="ai_decision_trace"
```

Cloud Logging query pattern:

```text
jsonPayload.message="ai_decision_trace" AND jsonPayload.requestId="REQUEST_ID"
```

## Response Fields

`_auditMeta` contains:

- `requestId`
- `endpoint`
- `modelId`
- `source` (`deterministic`, `ai`, or `hybrid`)
- `inputLengthChars`
- `fieldsPopulated`
- `warningCount`
- `durationMs`
- `generatedAt`

`_auditTrace` contains:

- `requestId`
- `endpoint`
- `source`
- `durationMs`
- `timestamp`
- `traceLevel`
- `stepCount`
- `stepLabels`
- `steps[]`

Each step includes:

- `name`
- `type` (`llm` or `deterministic`)
- `timestamp`
- `input`
- `output`
- optional `modelId`
- optional `durationMs`

## Trace Levels and Redaction

The implementation uses these environment variables from `server.mjs`:

- `AUDIT_TRACE_LEVEL=meta|summary|full`
- `AUDIT_MAX_FIELD_CHARS=8000`
- `AUDIT_REDACT_KEYS=apiKey,password,token,authorization,secret,cookie,bearer`

Behavior:

- `meta`: records only input/output shapes, not full prompts or outputs.
- `summary`: records redacted and truncated summaries. This is the default.
- `full`: records full redacted trace content and must be explicitly enabled.

Redaction is applied recursively by key name and also masks bearer/API-token-like strings.

## Optional Backends

Optional persistence is disabled by default. It is enabled only by env vars:

- `AUDIT_GCS_BUCKET` writes `pmomax-audit/<requestId>.json`.
- `AUDIT_BIGQUERY_TABLE` writes to `dataset.table`.
- `AUDIT_FIRESTORE_COLLECTION` writes one document per `requestId`.

The backend packages are loaded by dynamic `import()` only when configured. Missing packages or IAM failures are handled asynchronously and do not block AI endpoint responses.

## Retrieval

`GET /api/audit/:requestId` checks optional backends when configured. If no backend is configured, the route returns `queryable:false` and Cloud Logging instructions instead of falsely claiming the trace is not found.

## Customer Ownership

Customers receive and own the audit trail because deployment occurs inside their GCP tenant. By default, PMOMax emits audit events to the customer runtime logs, and Cloud Logging retention/access controls are customer-managed.

## Non-Claims

PMOMax does not claim, by default, to provide:

- an immutable forensic ledger;
- central PMOMax storage of customer audit logs;
- cross-tenant audit collection;
- retention beyond the customer's configured Cloud Logging or optional backend policies.

Immutable retention requires customer-configured GCP controls such as log buckets with retention locks, BigQuery governance, or other customer-managed compliance controls.
