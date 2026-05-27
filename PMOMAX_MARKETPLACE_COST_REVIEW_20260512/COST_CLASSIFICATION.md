# Cost Classification

## Executive Summary

The Jan-Apr 2026 workbook totals `$1,865.66` gross. Only `$210.08` is directly labeled under `PID Architect`, including `$209.36` of `PMO-Max Pricing By Tokens Tokens Usage` in April. A broader PMOMax infrastructure allocation is defensible for GKE, networking, monitoring/logging, Artifact Registry, Cloud Build, Cloud Run, Cloud Storage, Secret Manager, and scanning, but the full workbook total should not be represented as normal PMOMax runtime cost. The largest questionable non-runtime line is Vertex AI Veo/video generation at `$513.61`, which appears media/demo related, not required production Marketplace runtime.

## Sources

| Source | Use |
|---|---|
| `PMO Max Costs Jan to Apr - 2026-05-12.xlsx` | Gross Jan-Apr service/SKU cost by month |
| BigQuery export `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C` | Detailed export; observed March/April rows; April gross usage largely offset by credits |
| Live GCP inventory | Resource purpose and active/runtime state |

Important caveat: the spreadsheet appears to show gross usage amounts. The billing export shows large credits in April, for example `pid-architect-ehlu1` had `$209.47` gross and `$0.00` net after credits. Credit treatment should be confirmed against invoice and Marketplace disbursement reports before making a reimbursement claim.

## Classification Summary

| Category | Gross amount | Classification | Notes |
|---|---:|---|---|
| A. PMOMax core runtime / Marketplace infra | `$812.40` | Required or likely required | GKE, networking/LB/PSC, Artifact Registry, Cloud Build, Cloud Logging, Cloud Monitoring, Cloud Run, Cloud Storage, Secret Manager. Some items are baseline Marketplace/runtime, others can be optimized. |
| B. PID Architect runtime/demo | `$210.08` | Demo/runtime and Marketplace metering test | `PID Architect` bucket, mostly `$209.36` PMOMax token usage in April. BigQuery export shows this was credited to `$0.00` net in April. |
| C. Marketplace validation/testing | included in A/B plus `$0.52` explicit scan | Testing/remediation | Cloud Build, On-Demand Scanning, UBB validation, forensic namespaces/jobs, many image builds. Do not overstate as separate without resource-level labels. |
| D. GKE/cluster redundancy | no second active cluster found | Not duplicate cluster; old objects exist | One active cluster only. Redundancy is old namespaces/jobs/ReplicaSets/images, not multiple live clusters. |
| E. Vertex AI / AI token usage | `$6.34` Gemini API | Uncertain / possibly PMOMax AI testing | Small Gemini API cost in Jan-Feb; label does not prove production PMOMax use. |
| F. Veo/audio/video generation | `$513.61` | Media/demo, likely not runtime | `Veo 3 Audio Video Generation` `$444.80`; `Veo 3 Video Generation` `$68.80`. |
| G. Security/scanning/SCC/shared org costs | `$79.76` | Security/remediation/shared overhead | SCC `$79.24`; On-Demand Scanning `$0.52`. Some SCC tied to GKE/App Engine/Artifact Registry. |
| H. Unrelated or uncertain | `$243.99+` | Verify before claiming | App Engine `$109.35`, Compute Engine `$134.64`, Gemini `$6.34` overlap noted above. App Engine services include CRMint names. |

## Jan-Apr Gross Table From Workbook

| Service / SKU | Jan | Feb | Mar | Apr | Total | Project/bucket | Classification | Notes |
|---|---:|---:|---:|---:|---:|---|---|---|
| App Engine / Frontend Instances | 31.53 | 19.10 | 28.51 | 30.21 | 109.35 | `KatalystStreet-Public` | H uncertain / likely legacy | App Engine services observed: `crmint-controller`, `crmint-jobs`, `default`; not proven PMOMax. |
| Artifact Registry | 1.29 | 2.24 | 3.53 | 4.41 | 11.47 | `KatalystStreet-Public` | A core / C testing | Required for images; many old images create cleanup opportunity. |
| Cloud Build | 0.71 | 7.72 | 0.17 | 0.29 | 8.89 | `KatalystStreet-Public` | C validation/testing | Builds for deployer, UBB, app, vulnerability fix. |
| Cloud Logging | 0.96 | 18.57 | 0.00 | 0.00 | 19.53 | `KatalystStreet-Public` | A core | Required for runtime evidence and Marketplace diagnostics; retention can be optimized. |
| Cloud Monitoring / Prometheus samples | 14.18 | 35.34 | 25.38 | 27.26 | 102.16 | `KatalystStreet-Public` | A core, optimize | GKE managed Prometheus observed; monitor ingestion likely reducible. |
| Cloud Run | 0.07 | 3.07 | 0.01 | 0.01 | 3.16 | `KatalystStreet-Public` | A core/test | Hosted runtime/test service `pmo-architect` is active with Marketplace test mode. |
| Cloud Storage | 0.50 | 0.45 | 0.13 | 0.18 | 1.26 | `KatalystStreet-Public` | A/H mixed | Cloud Build/App Engine/media buckets; classify by bucket after storage inventory. |
| Compute Engine | 11.47 | 25.96 | 12.17 | 85.04 | 134.64 | `KatalystStreet-Public` | H uncertain / verify | Terminated VMs observed; costs include disks/images/N1 runtime; exact PMOMax link not proven. |
| Gemini API | 1.19 | 5.15 | 0.00 | 0.00 | 6.34 | `KatalystStreet-Public` | E uncertain | Could be PMOMax AI testing; not labeled by app/resource. |
| Kubernetes Engine | 34.54 | 112.02 | 160.93 | 158.14 | 465.63 | `KatalystStreet-Public` | A core | Active Autopilot PMOMax cluster found. |
| Networking | 26.98 | 80.71 | 49.36 | 42.67 | 199.72 | `KatalystStreet-Public` | A core / optimize | Ingress/LB/PSC/NIC. PSC and NIC should be reviewed. |
| On-Demand Scanning | 0.00 | 0.00 | 0.00 | 0.52 | 0.52 | `KatalystStreet-Public` | C/G validation/security | Vulnerability remediation evidence. |
| Secret Manager | 0.02 | 0.02 | 0.01 | 0.01 | 0.06 | `KatalystStreet-Public` | A core | Low cost; secrets required for runtime/keys. |
| Security Command Center | 3.22 | 8.79 | 45.27 | 21.96 | 79.24 | `KatalystStreet-Public` | G security/shared | Includes artifact scanning, GKE pod CPU, App Engine, Compute. |
| Vertex AI / Metadata storage | 0.01 | 0.00 | 0.00 | 0.00 | 0.01 | `KatalystStreet-Public` | E uncertain | Tiny metadata charge. |
| Vertex AI / Veo 3 Audio Video Generation | 0.00 | 444.80 | 0.00 | 0.00 | 444.80 | `KatalystStreet-Public` | F media/demo | Not required for Marketplace runtime. |
| Vertex AI / Veo 3 Video Generation | 0.00 | 68.80 | 0.00 | 0.00 | 68.80 | `KatalystStreet-Public` | F media/demo | Not required for Marketplace runtime. |
| PID Architect / Artifact Registry | 0.41 | 0.00 | 0.00 | 0.04 | 0.45 | `PID Architect` | B demo/runtime | Low-cost artifact storage. |
| PID Architect / Cloud Run | 0.02 | 0.02 | 0.02 | 0.03 | 0.09 | `PID Architect` | B demo/runtime | Active Cloud Run services in `pid-architect-ehlu1`. |
| PID Architect / PMOMax token usage | 0.00 | 0.00 | 0.00 | 209.36 | 209.36 | `PID Architect` | B/C Marketplace UBB | Gross usage; BigQuery export shows matching April credit. |
| PID Architect / Secret Manager | 0.06 | 0.07 | 0.02 | 0.03 | 0.18 | `PID Architect` | B demo/runtime | Low-cost secret storage. |

## April Billing Export Credit Observation

For April 2026, BigQuery showed these relevant gross and net amounts:

| Project | Gross | Credits | Net | Interpretation |
|---|---:|---:|---:|---|
| `katalyststreet-public` | `$356.79` | `-$352.40` | `$4.39` | Gross infrastructure largely credited in export. |
| `pid-architect-ehlu1` | `$209.47` | `-$209.47` | `$0.00` | PMOMax token usage and small runtime costs credited to zero net. |
| all rows with `project_id` null | `$37.67` | `-$36.91` | `$0.76` | Includes AlloyDB Omni subscription; unrelated/uncertain. |

The export did not provide comparable Jan-Feb detail during this run. Use the workbook for gross Jan-Feb classification and invoice/export data for final credit math.

## Unexpected / Testing-Only Flags

| Item | Why flagged | Recommended action |
|---|---|---|
| Veo 3 audio/video generation `$513.60` | Media/demo generation, not production Marketplace runtime | Exclude from normal PMOMax runtime; include only as PMOMax marketing/demo if true. |
| On-Demand Scanning and SCC artifact scanning | Vulnerability remediation and Marketplace compliance work | Include in support request as validation/remediation, not baseline runtime. |
| Many `pmo-architect` app image digests, 26.7 GB in `us-east1/apps` | Build/deployment experimentation and release attempts | Keep current/release digests; plan retention cleanup after verification. |
| Forensic namespaces/jobs | 60-day-old test artifacts | Verify no dependency; safe cleanup candidate. |
| App Engine CRMint services | Not PMOMax-named | Verify ownership; likely unrelated/legacy. |
| Cloud Run `MARKETPLACE_TEST_MODE=true` in `katalyststreet-public` | Indicates hosted runtime/test path | Confirm whether required for live listing/demo. |

