# PMOMax PID Architect - Pricing and Log Storage Requirements

## Production Baseline: 3,900,000 Tokens / Month

### Google Cloud Platform (GCP) Deployment
### Multi-Environment Configuration (Dev | Test | UAT | Production)

---

## 1. Introduction

This document provides a PMOMax-specific estimate for monthly operating cost and log storage requirements on Google Cloud. The structure mirrors the Marketplace sizing format used in the reference package, but all assumptions and values are PMOMax-centered.

The pricing baseline used for plan calibration is:

- **$4,250 per 3,900,000 tokens per month**

This baseline is used as the anchor to scale lower and higher usage bands.

---

## 2. Assumptions

> Note: Estimates are planning values and should be validated against billing export data and real production telemetry.

### 2.1 Usage Assumptions

| Assumption | Min | Mean | Max |
|------------|-----|------|-----|
| Documents per request | 1 | 5 | 10 |
| Pages per request | 1 | 5 | 10 |
| Input tokens per page | 600 | 700 | 1300 |
| Requests per day | 1 | 5 | 10 |
| Output pages per request | 1 | 5 | 10 |
| Output tokens per page | 600 | 700 | 6000 |

Derived token volumes used for pricing:

- Input tokens/day: **600**, **87,500**, **1,300,000**
- Output tokens/day: **600**, **17,500**, **600,000**
- Total tokens/day: **1,200**, **105,000**, **1,900,000**

Monthly token equivalents (30-day month):

- Min: **36,000 input + 18,000 output = 54,000 total**
- Mean: **2,625,000 input + 525,000 output = 3,150,000 total**
- Max: **39,000,000 input + 18,000,000 output = 57,000,000 total**

### 2.2 PMOMax Service/API Footprint Considered

The estimate includes services used by PMOMax packaging and runtime in this folder and parent `pmo26` runtime:

- Gemini 2.5 Pro (text input/output)
- Cloud Run
- GKE (cluster control + node resources)
- Firestore
- Cloud Storage
- Secret Manager
- Cloud Logging
- Artifact Registry
- Cloud Build

### 2.3 Baseline Cost Anchors

From prior PMOMax estimates and current target pricing:

- Prior detailed infrastructure subtotal (non-model): **~$710.89 / month**
- Current commercial anchor: **$4,250 / 3,900,000 tokens / month**

Derived blended unit rate from anchor:

- **$0.00108974 per token**
- **$1,089.74 per 1M tokens**

---

## 3. Pricing Model

### 3.1 Token-Scaled Monthly Cost

| Scenario | Total Tokens / Month | Estimated Monthly Cost |
|----------|----------------------|------------------------|
| Min | 54,000 | $59 |
| Mean | 3,150,000 | $3,433 |
| Baseline Anchor | 3,900,000 | $4,250 |
| Max | 57,000,000 | $62,115 |

### 3.2 PMOMax Plan Bands (Adjusted to New Anchor)

| Tier | Token Budget / Month | Estimated Monthly Price |
|------|----------------------|-------------------------|
| Starter | 390,000 | $425 |
| Professional | 3,900,000 | $4,250 |
| Enterprise | 39,000,000 | $42,500 |

### 3.3 Operational Reality Check

A practical PMOMax bill should be reviewed in two components:

1. Variable token-driven model usage
2. Platform baseline (Kubernetes/Cloud Run/storage/logging/secrets/build/deploy)

Where enterprise commitments include higher availability, support, and compliance controls, apply additional margin policy on top of token-scaled cost.

---

## 4. Infrastructure Pricing Snapshot (Reference Inputs)

The following values were carried from the previously supplied line-item estimate and used as a reference baseline for service coverage.

| Service | Estimated Monthly Cost (USD) |
|---------|-------------------------------|
| Artifact Registry | $4.95 |
| Secret Manager | $0.24 |
| GKE (cluster + compute + storage) | $679.29 |
| Cloud Run | $18.91 |
| Cloud Build | $3.60 |
| Cloud Storage | $3.90 |
| Gemini model usage (prior estimate set) | $2,129.17 |
| **Reference Total** | **$2,840.05** |

This reference total is not the commercial anchor. The active commercial anchor remains **$4,250 / 3,900,000 tokens**.

---

## 5. Log Storage Requirements

### 5.1 Log Categories

| Log Category | Description |
|--------------|-------------|
| API Request/Response Logs | Request metadata, latency, status codes, endpoint traces |
| Workflow/PID Logs | PID generation steps, parser/extractor milestones, export events |
| Exception Logs | Runtime errors, stack traces, failed model calls |
| Application Logs | Startup, health checks, config switches, deployment events |
| Background Job Logs | Scheduled tasks, async jobs, ingestion and indexing events |

### 5.2 Retention Baseline by Environment

| Environment | Suggested Retention |
|-------------|---------------------|
| Development | 7 days |
| Test | 14 days |
| UAT | 30 days |
| Production | 90 days hot + archival policy |

### 5.3 Storage Estimation Formula

- Daily storage (MB) = `(events_per_day * avg_event_size_kb) / 1024`
- Retained storage = `daily_storage * retention_days`
- Add **20% buffer** for incident spikes and verbose logging windows

---

## 6. Final Recommendations

1. Keep **Professional** anchored at **$4,250 / 3,900,000 tokens/month**.
2. Price Starter and Enterprise by token-scaling from the same anchor unless sales policy applies committed-use discounts.
3. Enable billing export and monthly recalibration against:
   - Gemini input/output token counters
   - Cloud Logging ingestion and retention costs
   - GKE/Cloud Run utilization drift
4. Revisit this document quarterly as PMOMax model mix, context windows, and grounding usage evolve.
