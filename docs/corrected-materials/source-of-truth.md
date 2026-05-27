# PMOMax Source of Truth

## Current Product Description

PMOMax is an AI-assisted Project Initiation Document (PID) and governance workspace. It helps teams turn scattered project inputs into structured initiation documents, identify governance gaps, review risks and compliance considerations, and produce traceable AI-assisted outputs.

## Verified Current Capabilities

PMOMax currently supports:

- AI-assisted PID creation and refinement.
- Structured PID data covering objectives, scope, assumptions, constraints, dependencies, deliverables, milestones, stakeholders, risks, mitigations, approvals, communications, decisions, and open questions.
- AI-assisted budget review, risk review, compliance review, parsing, and assistant workflows.
- Configurable AI audit traceability with `_auditMeta` and `_auditTrace` on AI-assisted responses.
- Structured Winston JSON logging to stdout with `message="ai_decision_trace"`.
- Default Cloud Logging capture through customer-owned GKE or Cloud Run runtime infrastructure.
- Optional customer-managed GCS, BigQuery, or Firestore audit backends.
- Google Cloud Marketplace deployment packaging for customer-tenant deployment.
- Hosted Cloud Run runtime deployment for the PMOMax service/demo flow.
- About Video header link to the PMOMax YouTube channel.

## Deployment Model

PMOMax is designed to run inside the customer-controlled Google Cloud environment. The Marketplace package is Kubernetes/GKE-oriented. The hosted runtime flow uses Cloud Run. Runtime services are stateless and do not require a PMOMax-owned persistence layer.

## AI Audit Traceability

The default audit path is:

1. AI endpoint receives a request.
2. PMOMax creates a request-scoped audit context.
3. Deterministic and AI-assisted steps append trace data.
4. Response receives `_auditMeta` and `_auditTrace`.
5. Winston emits structured JSON to stdout.
6. GKE or Cloud Run captures stdout into customer-owned Cloud Logging.

Trace levels:

- `meta`: records shapes only, not full prompts or outputs.
- `summary`: records redacted and truncated summaries. This is the default.
- `full`: records full redacted trace content only when explicitly enabled.

Redaction and truncation controls:

- `AUDIT_TRACE_LEVEL=meta|summary|full`
- `AUDIT_MAX_FIELD_CHARS=8000`
- `AUDIT_REDACT_KEYS=apiKey,password,token,authorization,secret,cookie,bearer`

## What PMOMax Does Not Claim

PMOMax does not currently claim:

- Implemented Agent-to-Agent (A2A) protocol runtime interoperability.
- Native Google Docs or Google Sheets add-ins.
- Immutable forensic audit logging by default.
- Central PMOMax storage of customer audit logs.
- Cross-tenant customer data collection.
- Anthos-specific deployment.
- A fully autonomous hard enforcement policy engine where agents cannot bypass rules.

## Safe Language

Use these verbs when describing current capabilities:

- helps
- supports
- structures
- surfaces
- reviews
- traces
- logs
- exports
- is designed to

Avoid these unless separately implemented and verified:

- guarantees
- enforces without exception
- immutable by default
- built on A2A
- native Workspace add-in
- centrally audited by PMOMax
