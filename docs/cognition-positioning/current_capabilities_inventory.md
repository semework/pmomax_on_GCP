# PMOMax Current Capabilities Inventory

Generated: 2026-05-27

## Purpose

This inventory grounds the Enterprise Cognitive Governance positioning package in verified PMOMax materials and repository evidence. It separates implemented capabilities from partial capabilities, roadmap concepts, and claims that should be avoided.

## Audited Sources

- [docs/corrected-materials/source-of-truth.md](../../docs/corrected-materials/source-of-truth.md)
- [docs/ai-audit-traceability.md](../../docs/ai-audit-traceability.md)
- [docs/future-agent-context.md](../../docs/future-agent-context.md)
- [docs/iso42001/pmomax-iso42001-alignment-guide.md](../../docs/iso42001/pmomax-iso42001-alignment-guide.md)
- [schema.yaml](../../schema.yaml)
- [deploy/schema.yaml](../../deploy/schema.yaml)
- [server.mjs](../../server.mjs)
- [lib/marketplace/usageReporter.js](../../lib/marketplace/usageReporter.js)
- [lib/security/promptDefense.ts](../../lib/security/promptDefense.ts)
- [lib/security/pidGuard.ts](../../lib/security/pidGuard.ts)
- [security_patch_report.md](../../security_patch_report.md)
- [pmomax_SAFE_cluster_decommission_plan.md](../../pmomax_SAFE_cluster_decommission_plan.md)

## Implemented Features

| Area | Verified capability | Evidence | Safe wording |
|---|---|---|---|
| PID creation | AI-assisted Project Initiation Document creation and refinement. | Source-of-truth doc, app code, schemas. | PMOMax helps teams create structured PIDs from project context. |
| Structured governance fields | Objectives, scope, assumptions, constraints, dependencies, deliverables, milestones, stakeholders, RACI, risks, mitigations, approvals, communications, decisions, open questions. | Source-of-truth doc and PID schema references. | PMOMax structures project governance inputs into reviewable sections. |
| AI-assisted review | Budget, risk, compliance, parse, and assistant workflows are referenced as supported AI endpoints. | Future agent context references `/api/ai/parse`, `/api/ai/budget`, `/api/ai/assistant`, `/api/ai/risk`, `/api/ai/compliance`. | PMOMax supports AI-assisted review workflows for project initiation artifacts. |
| Audit trace metadata | `_auditMeta` and `_auditTrace` can be attached to AI-assisted responses. | Source-of-truth and future agent context. | PMOMax supports configurable AI audit trace metadata. |
| Structured AI trace logging | Winston JSON stdout logging with `message="ai_decision_trace"`. | Source-of-truth and future agent context. | PMOMax can emit structured AI decision trace logs into customer-owned runtime logs. |
| Export-oriented workflow | Word, PDF, JSON, and governance collateral workflows are documented. | Corrected materials, source-of-truth, export modules. | PMOMax supports exportable governance records. |
| Marketplace packaging | Marketplace deployer and UBB agent images exist and have been validated/patched. | `schema.yaml`, `Dockerfile`, `ubbagent.Dockerfile`, security patch report. | PMOMax is packaged for Google Cloud Marketplace deployment workflows. |
| Hosted runtime | Cloud Run runtime exists and is healthy on `pmo-architect:1.4.2`. | `gcloud run services describe` verification on 2026-05-27. | PMOMax has a hosted Cloud Run runtime/demo environment. |
| Prompt defense and PID guard | Security modules exist for prompt defense and PID validation. | `lib/security/promptDefense.ts`, `lib/security/pidGuard.ts`, tests. | PMOMax includes defensive checks around prompt handling and PID structure. |
| ISO/IEC 42001 readiness framing | Conservative ISO 42001 supporting documented-information guide exists. | ISO alignment guide. | PMOMax can support project-level documented information for AI governance readiness. |

## Partially Implemented Capabilities

| Area | Current state | Boundary | Safe wording |
|---|---|---|---|
| Cognitive auditability | Metadata, trace fields, and structured logs exist; immutable retention is customer-owned and optional. | Not a default tamper-proof audit ledger. | PMOMax supports configurable traceability that can feed enterprise audit workflows. |
| Policy-constrained reasoning | PID guard, prompt defense, compliance review, and structured fields exist. | Not a hard enforcement policy engine. | PMOMax can help surface policy and compliance considerations during initiation. |
| Human accountability | Sponsor, owner, stakeholder, RACI, approvals, and decisions are represented in PID structures. | Actual approval execution depends on customer process. | PMOMax captures human ownership and approval context for review. |
| Regulated AI workflow support | Governance fields, audit metadata, compliance notes, and ISO readiness collateral exist. | Not a substitute for legal, compliance, certification, or sector-specific controls. | PMOMax can support regulated-workflow documentation and review readiness. |
| Marketplace metering | UBB and Service Control reporting paths exist. | Entitlement/usage behavior depends on deployment configuration. | PMOMax includes Marketplace usage reporting plumbing. |
| Gemini/AI provider support | `@google/generative-ai` and Gemini-related modules exist; deployed Cloud Run env currently uses OpenAI model variables. | Gemini is not clearly configured in current Cloud Run runtime env. | PMOMax has code paths for AI-provider integrations; current hosted runtime config should be described separately. |

## Roadmap Concepts

| Concept | Why roadmap | Safe wording |
|---|---|---|
| Multi-agent governance architecture | No verified production multi-agent planner/reviewer/compliance/risk runtime. | PMOMax can evolve toward multi-agent governance orchestration. |
| Formal Cognitive Governance Protocol | Specs do not yet exist as product API contracts. | This package proposes a v0.1 cognitive governance metadata model. |
| Autonomous policy enforcement | Current product supports review, trace, and structure, not guaranteed hard enforcement. | Future versions may add policy engines and automated checkpoints. |
| Agent-to-agent interoperability | Source-of-truth explicitly avoids A2A claims. | A2A interoperability should be treated as future integration potential. |
| Immutable audit ledger | Current logs are customer-owned runtime logs; immutable storage is not default. | Future architectures may support WORM retention, signed traces, or ledger-backed records. |
| Native Workspace add-ins | Source-of-truth explicitly avoids native Google Docs/Sheets add-in claims. | Workspace integrations are roadmap unless separately implemented. |

## Unsupported Claims To Avoid

- PMOMax guarantees compliance.
- PMOMax certifies ISO/IEC 42001 readiness.
- PMOMax provides immutable forensic audit logging by default.
- PMOMax centrally stores customer audit logs.
- PMOMax implements A2A runtime interoperability today.
- PMOMax has a fully autonomous agent governance engine today.
- PMOMax prevents all policy violations.
- PMOMax replaces legal, compliance, internal audit, security, or certification-body review.

## Positioning Boundary

PMOMax should be positioned as an AI-assisted PID and governance workspace that creates structured, reviewable, exportable project initiation records with configurable AI audit traceability. Enterprise Cognitive Governance is the broader category framing: it is defensible when stated as a category and architecture direction, with PMOMax mapped to the initiation/control-artifact layer rather than overstated as a complete AI governance platform.
