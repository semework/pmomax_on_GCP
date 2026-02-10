# PMOMax Pricing Tiers & Features

_Last updated: 2026-01-27_

This document is the market-ready pricing and features page for PMOMax, plus a transparent, step-by-step Pricing Logic section that documents the cloud cost inputs and assumptions used to set tier prices. Live GCP pricing pages were attempted but the environment could not retrieve pages; the cloud inputs below use the rates supplied with the brief (Jan 2024) and are annotated clearly.

---

## PMOMax Pricing Tiers & Features

🟢 **Starter — Individuals & Small Teams**  
**$29 / user / month**  
_Best for solo PMs, consultants, early pilots._

Includes:
- Create & edit all core PID sections
- AI Assistant (basic prompts)
- Upload & parse documents (PDF, Word, text)
- Risk & Compliance sections (manual + AI suggestions)
- Export to PDF / Word / JSON
- Gantt chart generation (basic)
- Email support

Limits:
- Up to 10 active PIDs
- AI usage cap: 100,000 tokens/month
- No collaboration/team features

---

🔵 **Professional — PMO Teams**  
**$79 / user / month**  
_Best for internal PMOs and delivery teams._

Everything in Starter, plus:
- Advanced AI Assistant (refine, fill gaps, summarize)
- AI Agents: Risk, Compliance, Executive Summary
- Full Governance export (Risks + Compliance)
- ZIP export (Word + Gantt)
- Structured section validation
- Collaboration-ready PIDs
- Priority email support

Limits:
- Up to 50 active PIDs
- AI usage cap: 500,000 tokens/month
- Standard concurrency

---

🟣 **Enterprise — Organizations & Regulated Environments**  
**$149 / user / month** _(or custom contract)_  
_Best for large PMOs, regulated industries, and compliance-heavy orgs._

Everything in Professional, plus:
- Unlimited PIDs
- Advanced Governance/Compliance workflows
- Custom PID templates
- Custom AI Agents (policy/security/industry-specific)
- Audit-ready exports/logs
- Role-based access (Admin/Editor/Viewer)
- SSO (SAML/OAuth)
- Usage analytics & reporting
- SLA-backed support

Optional Add-Ons:
- Private AI endpoints
- Dedicated or on-prem deployment (GKE, VPC)
- Data residency controls
- Custom integrations (Jira, Confluence, ServiceNow, etc.)

---

🟠 **Platform / Marketplace Tier (Optional)**
For partner/embedded/marketplace/high-scale deployments.

- Usage-based or contract pricing
- Base platform fee: **$500–$2,000 / month**
- Per-user or per-run metrics
- Metered AI and API calls

---

### Add-On Pricing Table

| Add-On                     | Price                  |
|----------------------------|------------------------|
| Extra AI usage pack        | $10 / 1M tokens        |
| Advanced Compliance Packs  | $20 / user / month     |
| Custom Templates           | One-time or contract   |
| Dedicated Cluster          | Cost + margin          |
| On-prem / private cloud    | Custom                 |

> Note: The `Extra AI usage pack` uses a simple block price for 1M tokens for predictability. Token packs are non-refundable and roll over per-account for 30 days.

---

### Features by Tier — Comparison Table

| Feature                  | Starter   | Professional | Enterprise |
|--------------------------|:--------:|:------------:|:----------:|
| PID Creation             | ✅       | ✅           | ✅         |
| AI Assistant             | Basic    | Advanced     | Advanced + Custom |
| AI Agents                | ❌       | ✅           | ✅         |
| Gantt                    | Basic    | Full         | Full       |
| Risk & Compliance        | Manual   | AI-assisted  | Advanced workflows |
| Exports                  | PDF/Word | ZIP/JSON     | All + Audit |
| Collaboration            | ❌       | Limited      | Full       |
| SSO                      | ❌       | ❌           | ✅         |
| Custom Templates         | ❌       | ❌           | ✅         |
| SLA                      | ❌       | ❌           | ✅         |

---

## Transparent Step-by-Step Pricing Logic

**Summary:** prices were set to reflect PMOMax’s value (time saved, risk reduction, governance value), cover variable cloud costs (primarily LLM token charges), and leave margin for product ops, engineering, and support. We benchmarked against mid-market PM and collaboration tools and sized tiers to create clear upgrade paths.

**Important note on data sources and live lookups:**
- I attempted to pull current Google Cloud pricing pages automatically, but the environment prevented fetching the live pages. The cloud unit rates used below are taken from the brief (Jan 2024) and are explicitly listed. If you want live verification, run a quick check against the GCP pages linked in the references section.

---

### 1) Market & value positioning
- PMOMax directly automates the project initiation phase (PID generation, stakeholder alignment, compliance, Gantt) which is higher-value than simple task tracking. That allows PMOMax to command premium pricing compared to generic productivity tools.
- We price for replaceability: a single subscription should replace multiple brittle workflows (templating, manual drafting, siloed exports) — this is defensible at $29–$149/user/mo.

### 2) Benchmarks used
- Smartsheet / Monday / Asana / MS Project ranges: $24–$40/user/mo for core functionality.
- Notion with AI features: lower-cost but not tailored to PMO initiation and governance.
- Pricing decision: Starter ($29) undercuts full-feature PM suites while delivering PID automation; Professional ($79) is a clear upgrade for team features and AI agents; Enterprise ($149) aligns to regulated org requirements and SSO/SLA.

### 3) Cloud cost inputs (rates used)
(These rates are the values provided in the brief; live verification was attempted but blocked.)

- Gemini Pro 3.0 (Generative AI): $0.0025 / 1k input tokens; $0.0025 / 1k output tokens. (Source: brief / GCP generative-ai/pricing)
- Cloud Natural Language API (where used): $1 / 1k units (standard), $2 / 1k units (advanced). (Source: brief)
- Cloud Run: $0.000024 / vCPU-second; $0.0000025 / GiB-second. (Source: brief)
- GKE: $0.10 / cluster / hr + standard node price (used when offering dedicated clusters). (Source: brief)
- Firestore: $0.18 / 100k writes; $0.06 / 100k reads; $0.18 / GiB / month storage. (Source: brief)
- Cloud Storage: $0.026 / GB / month. (Source: brief)
- IAM / Identity / Secret Manager: Mostly free with minimal costs; ignore for per-user marginal cost calculations except for rare API calls.

> All inputs above are recorded verbatim from the brief (Jan 2024). If you want me to re-run live verification against the GCP pages and update these numbers, I can do that next; a network-enabled environment or manual confirmation will be necessary.

---

### 4) Per-user cloud cost model (example calculations)
These are conservative, worked examples to show how much direct cloud cost PMOMax would incur at the per-user level; they do NOT include engineering, ops, sales, or overhead — those are priced into the final margin.

Assumptions (typical monthly usage per paid user):
- Starter: 10 active PIDs; AI usage ~100k tokens/month.
- Professional: 50 active PIDs; AI usage ~500k tokens/month.
- Enterprise: Heavy usage; assume 2M tokens/month per active power user (customer-managed contract usually applies).
- Each serverless PID generation & background processing uses ~10 minutes CPU-equivalent per user per month for Cloud Run-style invocations (600 seconds). Memory used ~0.5 GiB average during these tasks.
- Firestore operations are modest: 1k writes and 10k reads per month for Starter (activity and change logs).
- Document storage: 2 MB per PID average.

Calculations:

A) Gemini token cost (LLM cost) — Starter:
- 100k tokens = 100 x 1k units => 100 * $0.0025 = $0.25 input. If output equals input, total ~ $0.50 per user / month.

Professional:
- 500k tokens = 500 * $0.0025 = $1.25 input + $1.25 output ≈ $2.50 per user / month.

Enterprise example (2M tokens):
- 2000 x $0.0025 = $5 input + $5 output = ~$10 per user / month. (Many Enterprise agreements move to private endpoints and committed volume discounts.)

B) Cloud Run (serverless processing) — per-user monthly example:
- CPU: 600 sec * $0.000024/vCPU-sec = $0.0144
- Memory: 600 sec * $0.0000025/GiB-sec = $0.0015
- Combined ~ $0.0159 ≈ $0.016 per user / month

C) Firestore (reads/writes) — Starter example:
- Writes: 1,000 writes = 0.01 * 100k => (1,000/100k) * $0.18 = $0.0018
- Reads: 10,000 reads = (10k/100k) * $0.06 = $0.006
- Storage: 10 PIDs * 2MB = 20MB = 0.02GB * $0.026/GB = $0.00052
- Total Firestore ≈ $0.0083 per user / month

D) Cloud Storage (exported files): negligible at small volume, ~ $0.001–$0.02/user/month depending on export retention and frequency.

E) Aggregate per-user cloud marginal cost (Starter, conservative):
- LLM: $0.50
- Cloud Run: $0.016
- Firestore + Storage: $0.0083
- Total ≈ $0.525 ≈ $0.53 per user / month

For Professional (higher LLM usage):
- LLM: $2.50
- Cloud Run: $0.02 (slightly higher)
- Firestore & Storage: $0.02
- Total ≈ $2.54 per user / month

Enterprise (higher usage, but often discounted or on private endpoints):
- LLM: $10 (example)
- Infra: $0.05–$0.10
- Total ≈ $10.1 per user / month

**Interpretation:** cloud marginal costs (dominated by LLM token consumption) are small compared to customer-facing price points ($29–$149). This leaves a healthy margin for product and operational costs, plus growth investments.

---

### 5) Margin & pricing bands rationale
- Starter $29: after cloud marginal costs (~$0.5) and payment processing plus support overhead, this leaves sufficient margin per user to cover product ops and marketing. This price is also psychologically aligned with competing mid-market tools.
- Professional $79: aimed at collaborative teams where AI usage (and therefore cloud cost) is materially higher. The delta between Starter and Professional covers increased token consumption, storage, collaboration infra, and support SLAs.
- Enterprise $149: targets regulated, compliance-driven customers who require SSO, audit logs, dedicated infrastructure, and SLAs — all of which increase implementation & support costs. Enterprises typically accept custom contracts (annual, committed usage) and private endpoint add-ons.

---

### 6) ROI examples for buyers (simple, sales-ready bullets)
- If a PM saves 4 hours per PID and PM hourly labor cost is $60/hr, that’s $240 saved per PID. For teams producing 2–3 PIDs per month, PMOMax yields $480–$720 monthly value — quickly offsetting a $79/user license.
- For regulated deployments, the auditability and governance alone avoid rework risk and compliance penalties — intangible but material value.

---

### 7) Upgrade psychology and limits
- Starter caps (PIDs, tokens) create natural upgrade triggers.
- Professional adds collaboration and governance — obvious ROI for teams.
- Enterprise supports compliance and SSO — procurement-friendly.

---

### 8) Add-on & platform economics
- Token packs let customers scale predictably: $10 per 1M tokens is conservative versus model cost (1M tokens = $2.50 LLM cost using $0.0025/1k units), leaving margin for markup and platform costs. (Pricing above lists $10/1M as packaged, reflecting product and margin.)
- Dedicated clusters and private endpoints priced as cost + margin; refer to [scripts/generate_docs.py](scripts/generate_docs.py) if customers want on-prem doc generation options.

---

## References & Next Steps
- GCP pricing pages to verify live: (attempted programmatic fetch in this environment but blocked; please confirm these live links manually if you want spot-check refresh)
  - Generative AI: https://cloud.google.com/generative-ai/pricing
  - Cloud Run: https://cloud.google.com/run/pricing
  - Firestore: https://cloud.google.com/firestore/pricing
  - Cloud Storage: https://cloud.google.com/storage/pricing
  - GKE: https://cloud.google.com/kubernetes-engine/pricing
  - Natural Language: https://cloud.google.com/language/pricing

Files & scripts in this repo that can generate Word/PPTX from this Markdown:
- [scripts/generate_docs.py](scripts/generate_docs.py)
- [scripts/md_to_docx.py](scripts/md_to_docx.py)

If you want, I can:
- (A) Re-run a live verification of the GCP pricing pages and update the numeric inputs (requires network-enabled environment).  
- (B) Attempt to generate DOCX/PPTX here using the existing scripts — note previous attempts in this workspace encountered native dependency issues for Python libraries; running locally (your laptop or CI with build tools) is recommended.  

---

Prepared by: PMOMax product & pricing (draft).  
If you'd like this trimmed for a website hero panel, marketing one-pager, or a one-page sales sheet, tell me which format and I will produce it next (web hero HTML, single-slide PPTX, or one-page DOCX).
