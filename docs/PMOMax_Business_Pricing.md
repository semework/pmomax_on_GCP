# PMOMax — Business & Pricing Overview

`Version: 2026-01-27`

## PMOMax — Business & Pricing Guide

Purpose
- This document is a market-ready business and pricing guide for PMOMax targeted at product, pricing, and website teams preparing Google Cloud Marketplace listings and customer-facing pricing pages. It uses the explicit unit prices supplied in the brief (Gemini Pro 3.0, Cloud Run, GKE, Firestore, Cloud Storage, Secret Manager, IAM/Identity, etc.) and documents clear assumptions and worked examples for three tiers: Startup, Growth, Enterprise.

Executive summary
- PMOMax converts unstructured project inputs (documents, spreadsheets, notes) into a structured Project Initiation Document (PID) and companion planning artifacts (objectives, scope, schedule, risks, governance, budget). It pairs deterministic parsing with an interactive Gemini-based AI assistant to accelerate drafting, identify risks, and produce shareable exports (Word/PDF/JSON and Gantt visuals).

Target customers and outcomes
- Users: PMO teams, program managers, professional services, and SMBs.
- Outcomes: Faster time-to-first-draft, fewer planning errors, auditable exports, and automated early risk/compliance checks.

Key product features (business descriptions)
- Input Parser: Extracts structured sections from uploaded documents (Word, PDF, spreadsheets) so users start from a usable PID rather than a blank page.
- AI Assistant (Gemini): Conversational drafting, summarization, and gap-filling for PID sections.
- Examples & Templates: Starter PIDs and examples to speed adoption.
- Risk & Compliance Agents: Automated scans that flag missing mitigations, governance items, and common planning gaps.
- Gantt Visualizer & Exporter: Creates timelines from schedule input and embeds them in exports.
- Export Suite: Generates Word, PDF, and JSON deliverables for stakeholder distribution.

Required Google Cloud services, short purpose, and API names
- Generative Language API (Gemini Pro 3.0): `generativelanguage.googleapis.com` — LLM for drafting, summarization, gap-filling.
- Document AI (optional for scanned/PDF-heavy customers): `documentai.googleapis.com` — OCR and structured extraction for scanned inputs.
- Cloud Run (recommended for simpler ops): `run.googleapis.com` — host web frontend and stateless APIs.
- Google Kubernetes Engine (optional alternative for high-scale/multi-tenant isolation): `container.googleapis.com` — orchestrate containers at scale; `compute.googleapis.com` for node VMs.
- Cloud Storage: `storage.googleapis.com` — store uploads and generated exports.
- Firestore: `firestore.googleapis.com` — store structured PID state, session data, and metadata.
- Secrets Manager: `secretmanager.googleapis.com` — store credentials and API keys.
- Artifact Registry: `artifactregistry.googleapis.com` — host container images for Marketplace packaging.
- Cloud Monitoring & Logging: `monitoring.googleapis.com`, `logging.googleapis.com` — observability.
- IAM & Identity / Identity Platform: `iam.googleapis.com`, `identitytoolkit.googleapis.com` — access control and optional SSO.
- Cloud Build & Container Analysis: `cloudbuild.googleapis.com`, `containeranalysis.googleapis.com` — CI/CD build and scanning.
- Redis / Memorystore (optional): `redis.googleapis.com` — caching for session/model results.

Pricing inputs (use these exact unit prices)
- Gemini Pro 3.0 (Generative Language API)
  - Input tokens: $0.0025 per 1,000 tokens
  - Output tokens: $0.0025 per 1,000 tokens
  - Combined per 1k tokens: $0.005 per 1,000 tokens
  - Typical parsed tokens per document (provided): 3,000–4,000 tokens. We use an average of 3,500 input tokens per document and assume output tokens are similar; see assumptions below.

- Cloud Natural Language API
  - Standard model: $1.00 per 1,000 units (1 unit = 1,000 characters)
  - Advanced model: $2.00 per 1,000 units
  - Typical document size assumption: 3,000–5,000 characters (3–5 units)

- Cloud Run
  - Egress: Free up to 2 GiB/month, then regional rates (e.g., $0.12–$0.23/GB).
  - CPU: $0.000024 per vCPU-second (first 180,000 vCPU-seconds free/month)
  - Memory: $0.0000025 per GiB-second (first 360,000 GiB-seconds free/month)

- Google Kubernetes Engine (GKE)
  - Cluster management fee: $0.10 per cluster-hour (~$72/month per cluster)
  - GKE Autopilot: $0.10 per vCPU-hour, $0.004 per GB-hour (plus cluster fee)
  - Example node (e2-standard-2): ~ $54.79/month (region dependent)

- Firestore
  - Writes: $0.18 per 100,000 writes
  - Reads: $0.06 per 100,000 reads
  - Deletes: $0.02 per 100,000 deletes
  - Storage: $0.18 per GiB/month

- Cloud Storage (Standard)
  - Storage: $0.026 per GB/month (first 5 GB free/month)
  - Operations: Class A $0.05 per 10,000, Class B $0.004 per 10,000

- IAM & Identity Platform
  - IAM: typically free
  - Identity Platform: free up to 50,000 MAUs, then $0.0055/user/month beyond

- Secret Manager
  - Secret versions: $0.06 per active version per month
  - Access operations: $0.03 per 10,000 operations

Assumptions used in calculations (explicit)
- Documents per workflow: 10 documents.
- Average parsed input tokens per document: 3,500 tokens (midpoint of 3k–4k).
- Average output tokens per document: 3,500 tokens (assumption: summarization + rewrite similar size).
- Combined tokens per document (input + output): 7,000 tokens.
- Token cost (combined): combined per-1k = $0.0025 + $0.0025 = $0.005 per 1k tokens.
- Storage per document: 1 MB original + 0.5 MB per export.
- Firestore ops: estimate 1,000 reads/writes per project lifecycle unless noted.
- Cloud Run request/compute examples below use a small runtime allocation (0.5 vCPU, 512 MiB memory) and average request duration 200ms unless noted.

Cost math — model (Gemini) examples
- Cost per 1,000 tokens: $0.005
- Combined tokens per document: 7,000 tokens → 7 * $0.005 = $0.035 per document
- Per-workflow model cost (10 documents): 10 * $0.035 = $0.35 per workflow

Tier definitions (business sizing)
- Startup
  - Monthly active projects: 20
  - Documents processed / month: 200
  - Peak concurrency: 1–3 users

- Growth
  - Monthly active projects: 500
  - Documents processed / month: 5,000
  - Peak concurrency: 10–30 users

- Enterprise
  - Monthly active projects: 2,000
  - Documents processed / month: 20,000
  - Peak concurrency: 50–200 users

Worked cost examples (monthly)

1) Gemini (Generative Language API)
- Startup: 200 docs * $0.035 = $7.00 / month
- Growth: 5,000 docs * $0.035 = $175.00 / month
- Enterprise: 20,000 docs * $0.035 = $700.00 / month

Notes: these model costs are directly proportional to document volume and conversation depth (more assistant rounds increase tokens). Consider tiering included tokens and charging overage per 1k tokens.

2) Cloud Natural Language API (optional enrichment)
Assume 50% of docs use Natural Language (entity/sentiment) at standard model; per-document units = 4 units (4,000 characters) → cost per doc = 4 * $1 = $4 when called.
- Startup (50% of 200 = 100 docs): 100 * $4 = $400 / month
- Growth (50% of 5,000 = 2,500 docs): 2,500 * $4 = $10,000 / month
- Enterprise (50% of 20,000 = 10,000 docs): 10,000 * $4 = $40,000 / month

Recommendation: Use Natural Language selectively (only for advanced risk/compliance tagging), or sample/enrich subsets to control cost. These NLP costs can be dominant unless usage is selective.

3) Cloud Run (runtime cost examples)
Assumptions: average request duration 200 ms, allocation 0.5 vCPU, 0.5 GiB memory.
- vCPU-seconds per request = 0.2s * 0.5 = 0.1 vCPU-s
- GiB-seconds per request = 0.2s * 0.5 GiB = 0.1 GiB-s

- Startup: assume 10,000 requests/month → vCPU-s = 1,000; GiB-s = 1,000
  - CPU cost = 1,000 * $0.000024 = $0.024
  - Memory cost = 1,000 * $0.0000025 = $0.0025
  - Egress: assume < 2 GiB → free
  - Total Cloud Run (Startup) ≈ $0.03 / month (effectively free given free tiers)

- Growth: assume 200,000 requests/month → vCPU-s = 20,000; GiB-s = 20,000
  - CPU cost = 20,000 * $0.000024 = $0.48
  - Memory cost = 20,000 * $0.0000025 = $0.05
  - Total Cloud Run (Growth) ≈ $0.53 / month

- Enterprise: assume 1,000,000 requests/month → vCPU-s = 100,000; GiB-s = 100,000
  - CPU cost = 100,000 * $0.000024 = $2.40
  - Memory cost = 100,000 * $0.0000025 = $0.25
  - Total Cloud Run (Enterprise) ≈ $2.65 / month (still small relative to model and NLP costs)

Observation: Cloud Run billed compute is often negligible compared to model and Natural Language API costs; free tiers absorb many small workloads.

4) Firestore (state + metadata)
Assumptions: 1,000 reads/writes per project lifecycle.
- Startup (20 projects): 20k reads, 20k writes
  - Reads cost = 20k /100k * $0.06 = $0.012
  - Writes cost = 20k /100k * $0.18 = $0.036
  - Storage negligible (<$0.10)

- Growth (500 projects): 500k reads/writes
  - Reads = 500k/100k * $0.06 = $0.30
  - Writes = 500k/100k * $0.18 = $0.90

- Enterprise (2,000 projects): 2M reads/writes
  - Reads = 2M/100k * $0.06 = $1.20
  - Writes = 2M/100k * $0.18 = $3.60

5) Cloud Storage
- Storage assumption per month: documents + exports
  - Startup (200 docs *1MB + exports): ~0.3 GB ≈ $0.008 / month
  - Growth (5,000 docs): ~5 GB ≈ $0.13 / month (first 5 GB free may reduce this)
  - Enterprise (20,000 docs): ~20 GB ≈ $0.52 / month

6) Secret Manager + IAM
- Secret Manager: assume 10 active secrets* $0.06 = $0.60 / month, access ops negligible at low volume.
- IAM: generally free; Identity Platform only relevant for >50k MAU.

7) GKE alternative (Enterprise)
- If Enterprise opts for GKE with a single small cluster and 3 e2-standard-2 nodes:
  - Cluster management: ~$72 / month
  - Nodes: 3 * $54.79 = $164.37 / month
  - Total baseline infra ≈ $236 / month (region-dependent)

Summary monthly infra cost (worked example)
- Startup
  - Gemini model: $7.00
  - Cloud Run: $0.03
  - Firestore: $0.05
  - Cloud Storage: $0.01
  - Secret Manager: $0.60
  - Natural Language API (selective; 50% docs): $400 (if used extensively) — recommended: disable by default
  - Total (without Natural Language): ≈ $7.69 / month
  - Total (with generous Natural Language usage): ≈ $407.69 / month

- Growth
  - Gemini model: $175.00
  - Cloud Run: $0.53
  - Firestore: $1.20
  - Cloud Storage: $0.13
  - Secret Manager: $1.20
  - Natural Language API (50% docs): $10,000 (if used extensively)
  - Total (without Natural Language): ≈ $178.06 / month
  - Total (with Natural Language): ≈ $10,178.06 / month

- Enterprise
  - Gemini model: $700.00
  - GKE cluster + nodes: $236.00
  - Firestore: $4.80
  - Cloud Storage: $0.52
  - Secret Manager: $2.40
  - Natural Language API (50% docs): $40,000 (if used extensively)
  - Total (without Natural Language): ≈ $943.72 / month
  - Total (with Natural Language): ≈ $40,943.72 / month

Pricing recommendations & commercial guidance
- Make Gemini usage a metered resource across plans. Example: include N free documents per month (or K free token budget) then charge per 1k tokens at cost + margin.
- Avoid enabling broad Natural Language analysis by default — instead offer it as an add-on or as part of Growth/Enterprise plans. Natural Language API costs can dominate unless usage is constrained.
- Offer pre-paid token packs and enterprise discounts for heavy usage.

Suggested SaaS plan table (example values)
| Plan | Included documents / month | Included token budget | Monthly price | Notes |
|---|---:|---:|---:|---|
| Startup | 200 docs | 200 * 7,000 = 1.4M tokens | $99/mo | Basic support; Cloud Run multi-tenant; Natural Language add-on |
| Growth | 5,000 docs | 35M tokens | $799/mo | Priority support; optional single-tenant; discounted token overage |
| Enterprise | 20,000 docs | 140M tokens | Custom (start $3,500/mo) | Dedicated cluster / SSO / onboarding; negotiate model discounts |

Notes on marketplace listing & copy
- Emphasize outcomes: "Turn documents into a ready-to-share PID in minutes" and "AI-assisted risk and compliance checks".
- For pricing tables, show included quotas and overage formulas (e.g., $X per 1k tokens over quota).
- Highlight security controls (Secrets Manager, IAM, optional customer-owned projects).

Operational considerations
- Quotas & rate limits: request quota increases for Generative Language API and Document AI early for enterprise customers.
- Identity/SSO: use Identity Platform or an SSO integration for Enterprise.
- Observability: use Cloud Monitoring & Logging with alerting for model-service latency and errors.

Appendix — API reference and links
- Generative Language API (Gemini Pro 3.0): https://cloud.google.com/generative-ai/pricing
- Cloud Natural Language API pricing: https://cloud.google.com/language/pricing
- Cloud Run pricing: https://cloud.google.com/run/pricing
- Google Kubernetes Engine pricing: https://cloud.google.com/kubernetes-engine/pricing
- Firestore pricing: https://cloud.google.com/firestore/pricing
- Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Secret Manager pricing: https://cloud.google.com/secret-manager/pricing
- IAM & Identity Platform: https://cloud.google.com/iam/pricing and https://cloud.google.com/identity-platform/pricing
- Google Cloud Pricing Calculator: https://cloud.google.com/products/calculator

Change log / notes
- This document uses the exact per-unit prices supplied in the brief for Gemini Pro 3.0, Cloud Run, GKE, Firestore, Cloud Storage, IAM/Identity, and Secret Manager. Natural Language API prices are also used as provided. All worked examples show explicit assumptions so financial review teams can modify token assumptions and usage patterns.

---

End of PMOMax Business & Pricing Guide


Tier definitions & customer profiles
- Startup
  - Users: small PMO / single project team.
  - Monthly active projects: 20
  - Documents processed per month: 200 (10 docs per project)
  - Peak concurrency: low (1–3 concurrent users)

- Growth
  - Users: multi-team PMO / mid-market.
  - Monthly active projects: 500
  - Documents processed per month: 5,000
  - Peak concurrency: medium (10–30 concurrent users)

- Enterprise
  - Users: large PMO organizations, multi-programs.
  - Monthly active projects: 2,000
  - Documents processed per month: 20,000
  - Peak concurrency: high (50–200 concurrent users)

Pricing inputs & unit cost examples (example values; verify with updated Google pricing)
-- Gemini model (Generative Language API): assume $0.03 per 1k input tokens and $0.06 per 1k output tokens (example placeholder). Use actual prices from Google contract.
- Cloud Storage (Standard): $0.02 per GB-month (example)
- Firestore: $0.18 per 100k reads, $0.18 per 100k writes (example)
- Cloud Run: $0.000024 per vCPU-second and $0.0000025 per GB-second, plus request overhead.
- GKE (E2 nodes): e.g., $0.020 per vCPU-hour and $0.0012 per GB-hour (example, varies by region)
- Memorystore (Redis): $0.10 per GB-hour (example)
- Secrets Manager: small per-secret storage charges + access calls
- Logging & Monitoring: ingestion and storage costs; assume $0.50 per GB of logs ingested (example)

Example cost calculations (illustrative)
- Model cost per processed document (single pass):
  - Tokens per doc: 3,500 (input + output combined)
  - Cost per 1k tokens (combined) = (X + Y) per 1k tokens; using example X=0.03 and Y=0.06 => 0.09 per 1k tokens
  - Token multiplier: 3.5 * (cost per 1k tokens) = 3.5 * 0.09 = $0.315 per document

- Storage cost per month (documents + exports)
  - Startup: 200 docs * 1 MB = 200 MB; exports 50 * 0.5 MB = 25 MB; total ~225 MB -> negligible (<$0.01)

- Firestore operations (reads/writes)
  - Assume 1k reads/writes per project lifecycle; Startup 20 projects -> 20k ops.
  - If 100k ops ~ $0.18, the monthly cost is small.

- Cloud Run / backend compute
  - Example: small Cloud Run service with 256MiB and 0.5 vCPU average usage; monthly cost < $50 for Startup.

SAMPLE Tiered Monthly Cost Table (illustrative)
- Note: Replace placeholder model costs with contract pricing before publishing.

Startup (example numbers)
- Gemini model calls (Language API): 200 workflows * 10 docs * $0.315 = $630
- Cloud Run: $40
- Cloud Storage: $1
- Firestore: $1
- Monitoring/Logging: $10
- Artifact Registry/Build: $5
- Misc (Secrets, IAM, small infra): $5
- Total cloud infra (monthly): ~$692

Growth
- Gemini model calls (Language API): 5,000 docs * $0.315 = $1,575
- Cloud Run / GKE: $400 (more compute)
- Cloud Storage: $10
- Firestore: $10
- Monitoring/Logging: $50
- Misc: $30
- Total cloud infra (monthly): ~$2,075

Enterprise
- Gemini model calls (Language API): 20,000 docs * $0.315 = $6,300
- GKE (provisioned nodes): $1,200
- Cloud Storage: $40
- Firestore: $40
- Monitoring/Logging: $200
- Memorystore, load balancers, etc.: $300
- Total cloud infra (monthly): ~$8,080

Recommended SaaS price plans (examples)
- Startup plan: $99 / month (includes up to 200 docs / month, limited concurrency, email support)
- Growth plan: $799 / month (includes up to 5,000 docs / month, priority support, single-tenant optional)
- Enterprise plan: Custom pricing (starting $3,500 / month) — includes SSO, dedicated onboarding, volume discounts on model usage, and optional dedicated GKE cluster.

Margin & commercial guidance
- Because model costs can be the dominant variable, consider:
  - Tiering or quota-based pricing that caps included model usage and charges overage per 1k tokens.
  - Offering pre-paid token packs for large customers.
  - Passing through usage-based Gemini/Language API costs for very large customers (or negotiated enterprise discounts).

Marketplace and website content advice
- Highlight core outcomes: "Turn documents into a ready-to-share PID in minutes" and "AI-assisted risk and compliance checks".
- Use customer-centric language: time saved, fewer meetings, clearer stakeholder communications.
- Present pricing with clear included quotas and overage formulas. Provide a calculator on the website to estimate token usage and costs.
- Security & compliance: emphasize use of Secrets Manager, IAM, and optional dedicated customer projects for Enterprise.

Google Cloud Pricing Calculator tips
- Break the estimate into components: Generative Language API / Gemini (token usage), Compute (Cloud Run or GKE nodes), Storage, Firestore, Monitoring/Logging.
- Use regional pricing that matches your target launch region.
- For the Generative Language API, use partner pricing or published per-call/token metrics and multiply by expected token volumes.

Operational notes & customer planning
- Quotas: Generative Language API (Gemini) and Document AI have quotas — large customers should request quota increases in advance.
- SSO / Identity: Enterprise customers often require SSO; plan Identity Platform or SAML SSO integration.
- Entitlements & Marketplace: For Google Cloud Marketplace, follow the partner guide for container packaging (Artifact Registry) and listing metadata.

Appendix — Exact API names to enable
- vertexai.googleapis.com
- generativeai.googleapis.com (if separate)
- documentai.googleapis.com
- run.googleapis.com
- container.googleapis.com
- storage.googleapis.com
- firestore.googleapis.com
- redis.googleapis.com
- secretmanager.googleapis.com
- artifactregistry.googleapis.com
- monitoring.googleapis.com
- logging.googleapis.com
- cloudbuild.googleapis.com
- containeranalysis.googleapis.com
- iam.googleapis.com
- serviceusage.googleapis.com
- sqladmin.googleapis.com (if Cloud SQL used)
- identitytoolkit.googleapis.com (optional)

Contact & next steps
- I can produce a formatted PowerPoint and Word doc version of this content next, and I can parameterize the pricing tables with live Gemini (Generative Language API) token prices if you provide contracted model rates or allow me to look up public pricing.

---

*End of document (draft). Replace placeholder model-per-token rates (X/Y) with current contracted Generative Language API / Gemini prices before publishing.*
