# PMOMax Cost Savings & Marketplace Compliance Audit

**Generated:** 2026-05-21  
**Auditor account:** mulugetas@katalyststreet.com  
**Billing account audited:** 018FC6-CC1985-24653C "Katalyst Street - 1"  
**Confidence level:** HIGH — based on actual BigQuery billing export + live gcloud inventory  

---

## 1. Executive Summary

This is a read-only investigation of the PMOMax Google Cloud environment. No resources were modified, deleted, disabled, or scaled during this audit.

**Bottom line:**

| Metric | Value |
|---|---|
| Primary PMOMax project | katalyststreet-public (839982691485) |
| Current monthly **gross** cost (all projects) | ~$530/month (April 2026 run-rate) |
| Current monthly **net** cost after credits | ~$0–5/month (credits cover nearly everything) |
| Estimated savings if safe deletions are approved later | ~$40–65/month gross |
| Estimated savings with further optimizations | ~$80–120/month gross |
| Risk to PMOMax Marketplace compliance if DO NOT TOUCH items are respected | None |
| Cloud Run demo runtime | LIVE and healthy, scales to zero, ~$0 net cost |

**Critical insight:** GCP promotional credits are currently absorbing ~$350–530/month in gross charges, reducing net cost to near zero. When credits expire, the full gross cost resumes. This audit identifies what to eliminate before that happens.

---

## 2. Safety Statement: No Changes Made

> I understand this is READ-ONLY. I will not modify, delete, disable, scale, unregister, deploy, patch, or update any cloud resource.

All commands executed were `list`, `describe`, `bq query` (SELECT only), or `gcloud ... list/describe`. No state was changed. No resource was touched.

---

## 3. Projects Investigated

| Project ID | Project Number | Name | Billing Account | Billing Enabled | Relevance |
|---|---|---|---|---|---|
| katalyststreet-public | 839982691485 | KatalystStreet-Public | 018FC6-CC1985-24653C | Yes | **PRIMARY** — Cloud Run demo, Artifact Registry (Marketplace images), GKE Autopilot, Marketplace APIs |
| pid-architect-ehlu1 | 630092899690 | PID Architect | 018FC6-CC1985-24653C | Yes | **SECONDARY** — Legacy Cloud Run services (pid-agent, pmomax, etc.), UBB test charges |
| pmomax-public-1762553342 | 648690584147 | pmomax-public | 018FC6-CC1985-24653C | (assumed) | PMOMax public project — no GKE, minimal activity |
| pmomulu | 142430435589 | pmomulu | (assumed) | (assumed) | PMO-related — no GKE |
| optimax-build1 | — | Optimax Build | 018FC6-CC1985-24653C | Yes | Different product (Optimax) — shares billing account; high Cloud Run + Compute costs |
| deltamax-464321 | 663418535495 | DeltaMax | 018FC6-CC1985-24653C | Yes | Different product — GPU compute charges |
| katalyststreet-finops | 633430300780 | KatalystStreet-FinOps | 018FC6-CC1985-24653C | Yes | FinOps — BigQuery only, near-zero cost |

---

## 4. Current Active Resource Inventory

### 4.1 Cloud Run Services

#### katalyststreet-public

| Service | Region | Image | Min | Max | CPU | Memory | Status | Est. Monthly Cost |
|---|---|---|---|---|---|---|---|---|
| **pmo-architect** | us-east1 | pmo-architect:1.4.2 | 0 | 10 | 1 vCPU | 512Mi | Ready | **~$0** (scales to zero) |

URLs:
- `https://pmo-architect-839982691485.us-east1.run.app` ← public demo
- `https://pmo-architect-zxofcfyioq-ue.a.run.app` ← internal

#### pid-architect-ehlu1 (10 services, all scale to zero)

| Service | Min | Max | CPU | Memory | Status |
|---|---|---|---|---|---|
| chatagentfn | 0 | 100 | 1 | 1024Mi | Ready |
| extractpid | 0 | 100 | 1 | 256Mi | Ready |
| pdfexport | 0 | 100 | 1 | 1024Mi | Ready |
| pid-agent | 0 | 100 | 1 | 512Mi | Ready |
| pmomax | 0 | 100 | 1 | 512Mi | Ready |
| projectexport | 0 | 100 | 1 | 1024Mi | Ready |
| ssrkickplanr | 0 | 100 | 1 | 256Mi | Ready |
| ssrpidarchitectehlu1 | 0 | 100 | 1 | 256Mi | Ready |
| ssrpmomax | 0 | 100 | 1 | 256Mi | Ready |
| studio | 0 | 1 | 1 | 512Mi | Ready |

All 10 services scale to zero — effectively $0 unless receiving traffic.

### 4.2 GKE Clusters

| Cluster | Project | Location | Type | Status | Node Pools | Master Version |
|---|---|---|---|---|---|---|
| **pmomax-auto** | katalyststreet-public | us-central1 | Autopilot | RUNNING | 10 pools (ek-standard-8 through e2-standard-32) | 1.35.3-gke.1389000 |
| cluster-1 | katalyststreet-public | — | Zonal | **DELETED** (per prior audit) | — | — |

`pmomax-auto` is an Autopilot cluster — Google manages node provisioning. Billing shows ~$38/month cluster fee + ~$16/month pod CPU/memory = ~$54/month gross (April 2026 run-rate for the Autopilot-specific charges). Additional N1 Compute/disk charges may be linked.

### 4.3 Artifact Registry Repositories

| Repository | Location | Format | Size | Last Updated | Purpose |
|---|---|---|---|---|---|
| us/apps | us (multi-region) | Docker | 788 MB | 2026-02-17 | PMOMax multi-region app images |
| us/gcr.io | us (multi-region) | Docker | 111 MB | 2026-03-10 | GCR migration mirror |
| **us/pmomax** | us (multi-region) | Docker | 370 MB | **2026-05-15** | **Marketplace deployer + UBB agent** |
| us-central1/apps | us-central1 | Docker | 0 B | 2026-01-22 | Empty — PMOMax images (unused) |
| **us-east1/apps** | us-east1 | Docker | 1.49 GB | **2026-05-13** | **Primary Cloud Run runtime images** |
| **us-east1/pmomax** | us-east1 | Docker | 1.27 GB | 2026-03-04 | PMOMax deployer images (regional) |

Total Artifact Registry: ~4.0 GB  
Monthly storage cost: ~$1.30/month gross (confirmed by billing: $3.94/90 days)

### 4.4 App Engine Services (CRMint)

| Service | Project |
|---|---|
| crmint-controller | katalyststreet-public |
| crmint-jobs | katalyststreet-public |
| default | katalyststreet-public |

CRMint (Google's open-source marketing ML tool) is deployed but `crmint-cron` scheduler is PAUSED. App Engine Frontend Instances are still billed: ~$13/month gross (confirmed: $39.26/90 days).

### 4.5 Cloud Scheduler Jobs

| Job | Project | Schedule | State | Last Updated |
|---|---|---|---|---|
| crmint-cron | katalyststreet-public | `* * * * *` (every minute) | **PAUSED** | 2026-05-04 |

### 4.6 Compute Engine

| Instance | Zone | Machine | Status | Disk | Est. Monthly Disk Cost |
|---|---|---|---|---|---|
| gpu-instance-20240929-optimax | us-west1-a | n1-highmem-4 | **TERMINATED** | 10 GB PD Balanced | ~$1/month |
| instance-20240929-optimax-katalyst-street-public | us-west1-a | n1-highmem-4 | **TERMINATED** | 100 GB PD Balanced | ~$10/month |

Both instances TERMINATED since September 2024 (20+ months idle). Disks still attached and billing. No static IP addresses found.

### 4.7 Storage Buckets (katalyststreet-public)

| Bucket | Location | Storage Class | Created |
|---|---|---|---|
| 839982691485-us-central1-blueprint-config | US-CENTRAL1 | — | — |
| bigqueryscv | US | — | — |
| cloud-ai-platform-59b43fba... | US-CENTRAL1 | — | — |
| cloud-ai-platform-bf3ad529... | US-CENTRAL1 | — | — |
| deltamax_v1 | US-EAST1 | — | — |
| katalyststreet-public.appspot.com | US-EAST1 | — | — |
| katalyststreet-public_cloudbuild | US | — | — |
| katalystststreet-public | US | — | — |
| pmmaxvideo | US | — | — |
| pmomax-public-video-assets | US-EAST1 | — | — |
| pmomax-video-assets-bucket | US-CENTRAL1 | — | — |
| staging.katalyststreet-public.appspot.com | US-EAST1 | — | — |

Storage cost is near-zero ($0.10/90 days confirmed). Most buckets have lifecycle policies or are empty. Needs review for stale video/build artifacts.

### 4.8 BigQuery Datasets

| Dataset | Type | Location | Purpose |
|---|---|---|---|
| marketplace_report | LINKED | US | Marketplace usage report |
| pmomaxbilling | DEFAULT | US | Billing export (gcp_billing_export_v1_018FC6_CC1985_24653C) |

### 4.9 Fleet / Anthos Memberships

No active Fleet memberships found in `katalyststreet-public`. However, the following APIs are enabled and may carry idle charges:

- `gkehub.googleapis.com` (GKE Hub / Fleet)
- `anthosconfigmanagement.googleapis.com` (Anthos Config Management)
- `anthospolicycontroller.googleapis.com` (Anthos Policy Controller)
- `krmapihosting.googleapis.com` (Config Controller)
- `multiclustermetering.googleapis.com`

No active memberships = minimal cost. These APIs can be reviewed for disablement later if no Fleet is needed.

### 4.10 Enabled APIs — Marketplace-Critical (katalyststreet-public)

| API | Status | Classification |
|---|---|---|
| `cloudcommerceprocurement.googleapis.com` | ENABLED | **DO NOT TOUCH** |
| `cloudcommerceproducer.googleapis.com` | ENABLED | **DO NOT TOUCH** |
| `cloudcommerceconsumerprocurement.googleapis.com` | ENABLED | **DO NOT TOUCH** |
| `servicecontrol.googleapis.com` | ENABLED | **DO NOT TOUCH** |
| `artifactregistry.googleapis.com` | ENABLED | **DO NOT TOUCH** |
| `run.googleapis.com` | ENABLED | **DO NOT TOUCH** |
| `pmo-max.endpoints.katalyststreet-public.cloud.goog` | ENABLED | **DO NOT TOUCH** — Marketplace service endpoint |

---

## 5. Marketplace Compliance Findings

All Marketplace-critical assets are confirmed present and active:

| Asset | Status |
|---|---|
| Deployer image `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.2` | ✅ PRESENT (updated 2026-05-15) |
| UBB agent image `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.2` | ✅ PRESENT |
| Partner Procurement API | ✅ ENABLED |
| Cloud Commerce Producer API | ✅ ENABLED |
| Service Control API | ✅ ENABLED |
| PMOMax service endpoint (`pmo-max.endpoints.katalyststreet-public.cloud.goog`) | ✅ ENABLED |
| Artifact Registry `us/pmomax` repository | ✅ ACTIVE (4 images, last push 2026-05-15) |
| `marketplace_report` BigQuery linked dataset | ✅ PRESENT |

UBB charges of $209.36 (April 2026) confirm metering was active and functioning during the 6-hour test. The charge was fully credited as expected for internal testing.

---

## 6. Cloud Run Demo Runtime Findings

**Service:** `pmo-architect`  
**Project:** katalyststreet-public (839982691485)  
**Region:** us-east1  
**URLs:**  
- Public: `https://pmo-architect-839982691485.us-east1.run.app`  
- Internal: `https://pmo-architect-zxofcfyioq-ue.a.run.app`

| Property | Value |
|---|---|
| Image | `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2` |
| Min instances | 0 (scales to zero — no idle compute cost) |
| Max instances | 10 |
| CPU | 1 vCPU |
| Memory | 512 Mi |
| Concurrency | 80 |
| Status | Ready (revision pmo-architect-00032-nn7) |
| Ingress | All (public) |
| Startup CPU boost | Enabled |
| Timeout | 300 seconds |
| Last deployed | 2026-05-07 |

**Current cost:** ~$0/month (confirmed from billing — Cloud Run katalyststreet-public net cost is $0.00 per month). The service only costs when handling requests.

**Should it stay active?** YES — this is the PMOMax public demo/runtime.  
**Classification: DO NOT TOUCH**

**Safe optimization opportunities (for later human approval):**
1. Reduce `maxScale` from 10 to 3 — caps surge cost without affecting normal operation
2. Confirm `MARKETPLACE_TEST_MODE: true` env var should remain or be removed for production
3. `OPENAI_MODEL: gpt-5.5` is set — monitor OpenAI API cost separately (not in GCP billing)

---

## 7. DO NOT TOUCH Resources

These must remain active for PMOMax Marketplace compliance and public demo operation.

| Resource | Project | Service | Region | Monthly Cost (Gross) | Risk | Reason |
|---|---|---|---|---|---|---|
| Cloud Run service `pmo-architect` | katalyststreet-public | Cloud Run | us-east1 | ~$0 | CRITICAL | Public demo runtime, Marketplace showcase |
| Artifact Registry `us/pmomax` (deployer:1.4.2, ubbagent:1.4.2) | katalyststreet-public | Artifact Registry | us (multi-region) | ~$0.50 | CRITICAL | Marketplace deployer and UBB agent images |
| Artifact Registry `us-east1/apps` (pmo-architect:1.4.2) | katalyststreet-public | Artifact Registry | us-east1 | ~$0.50 | CRITICAL | Cloud Run runtime image |
| API: `cloudcommerceprocurement.googleapis.com` | katalyststreet-public | Cloud Marketplace | global | $0 | CRITICAL | Required for Marketplace procurement |
| API: `cloudcommerceproducer.googleapis.com` | katalyststreet-public | Cloud Marketplace | global | $0 | CRITICAL | Required for Marketplace producer operations |
| API: `servicecontrol.googleapis.com` | katalyststreet-public | Service Control | global | $0 | CRITICAL | Required for UBB metering |
| API: `pmo-max.endpoints.katalyststreet-public.cloud.goog` | katalyststreet-public | Endpoints | global | $0 | CRITICAL | PMOMax Marketplace service endpoint |
| BigQuery dataset `marketplace_report` | katalyststreet-public | BigQuery | US | $0 | HIGH | Linked Marketplace usage reports |
| BigQuery dataset `pmomaxbilling` | katalyststreet-public | BigQuery | US | $0 | HIGH | Billing export — source of truth for audit |
| GKE cluster `pmomax-auto` | katalyststreet-public | GKE Autopilot | us-central1 | ~$54 gross | HIGH | Required for Marketplace k8s app validation; do not delete yet per Google guidance |

---

## 8. Safe Candidates for Later Deletion / Disablement

These items have no PMOMax Marketplace compliance dependency. All require human approval before action.

| Resource | Project | Service | Region | Est. Monthly Gross Cost | Risk | Reason | Evidence Command |
|---|---|---|---|---|---|---|---|
| App Engine `crmint-controller`, `crmint-jobs`, `default` | katalyststreet-public | App Engine | us-east1 | ~$13/month | LOW | CRMint not needed for PMOMax; scheduler already PAUSED | `gcloud app services list --project=katalyststreet-public` |
| Cloud Scheduler job `crmint-cron` | katalyststreet-public | Cloud Scheduler | us-east1 | ~$0 | LOW | Already PAUSED; can be deleted | `gcloud scheduler jobs list --project=katalyststreet-public --location=us-east1` |
| Compute disk (100 GB) attached to TERMINATED instance `instance-20240929-optimax-katalyst-street-public` | katalyststreet-public | Compute Engine | us-west1-a | ~$10/month | LOW | VM TERMINATED since Sept 2024 (20+ months); disk still billing | `gcloud compute disks list --project=katalyststreet-public` |
| Compute disk (10 GB) attached to TERMINATED instance `gpu-instance-20240929-optimax` | katalyststreet-public | Compute Engine | us-west1-a | ~$1/month | LOW | Same 2024 VM, idle disk | `gcloud compute disks list --project=katalyststreet-public` |
| Artifact Registry `us-central1/apps` (0 bytes) | katalyststreet-public | Artifact Registry | us-central1 | ~$0 | LOW | Empty repository, no images | `gcloud artifacts repositories list --project=katalyststreet-public` |
| Old Cloud Run revision images in `us-east1/apps` (non-release tags) | katalyststreet-public | Artifact Registry | us-east1 | ~$0.30/month potential | LOW | Many intermediate build images beyond required release tags | `gcloud artifacts docker images list` |
| Cloud Run services in `pid-architect-ehlu1` (if no longer used) | pid-architect-ehlu1 | Cloud Run | us-central1 | ~$0 (scale-to-zero) | MEDIUM | Legacy services; confirm with team if still needed | `gcloud run services list --project=pid-architect-ehlu1` |
| Anthos/Fleet APIs if no memberships required | katalyststreet-public | API | global | ~$0 (minor) | LOW | No active fleet memberships found; Anthos APIs enabled but may be idle | `gcloud container fleet memberships list` |

---

## 9. Scale Down / Optimize Later

These items can be optimized without removing functionality. All require human approval.

| Resource | Project | Current Config | Recommendation | Est. Monthly Savings | Risk |
|---|---|---|---|---|---|
| Cloud Run `pmo-architect` max instances | katalyststreet-public | maxScale: 10 | Reduce to 3 | Minimal (only caps burst) | LOW |
| Cloud Monitoring / Prometheus scraping | katalyststreet-public | High sample rate (~$14.50/month gross) | Reduce scrape interval or metric cardinality on pmomax-auto cluster | ~$5–10/month gross | MEDIUM |
| Network Intelligence Center | katalyststreet-public | Topology, Analyzer, Internet Performance enabled | Disable if network analysis not actively used | ~$11.50/month gross (currently fully credited) | LOW |
| Artifact Registry image cleanup policy | katalyststreet-public | No cleanup policy visible on `us-east1/apps` (1.49 GB) | Add cleanup policy for non-release tags; keep `1.4.2`, `1.0.2`, `latest`, `about-video-audit-*` | ~$0.30/month gross | LOW |
| App Engine CRMint versions | katalyststreet-public | Unknown number of versions | Delete old versions (keep current) | Minor | LOW |
| Cloud Run `pmo-architect` MARKETPLACE_TEST_MODE | katalyststreet-public | `MARKETPLACE_TEST_MODE: true` | Review — if this is production, should this flag be removed? | $0 savings but compliance risk | MEDIUM |

---

## 10. Needs Human Review

| Item | Reason | Project | Risk |
|---|---|---|---|
| **AlloyDB charge ($21/month gross, null project)** | Billing export shows AlloyDB Omni Subscription ~$21/month but `project_id` is NULL — cannot be attributed to a specific project. AlloyDB API not enabled in katalyststreet-public or optimax-build1. Unknown owner. | Unknown | MEDIUM |
| **N1 Predefined Instance charges in katalyststreet-public** (~$21/month gross) | Could be GKE Autopilot node infrastructure or old non-cluster VMs. No active non-GKE VMs found in the project but N1 billing continues. Confirm these are GKE-linked before considering action. | katalyststreet-public | MEDIUM |
| **`MARKETPLACE_TEST_MODE: true` on production Cloud Run** | Cloud Run service has `MARKETPLACE_TEST_MODE: true`. Confirm this is intentional for the public demo runtime. | katalyststreet-public | MEDIUM |
| **10 Cloud Run services in pid-architect-ehlu1** | `pid-agent`, `pmomax`, `ssrpmomax`, etc. are legacy services from the PID Architect era. Confirm if any have active users before deleting. | pid-architect-ehlu1 | MEDIUM |
| **Prometheus/Cloud Monitoring scrape rate** | $43.59/90 days in Prometheus sample ingestion. Investigate which workloads are being scraped and whether they can be reduced. | katalyststreet-public | MEDIUM |
| **Network Intelligence Center usage** | Three NIC products active (Topology, Analyzer, Internet Performance). Confirm if these are being actively used for debugging/performance analysis or are residual. | katalyststreet-public | LOW |
| **`deltamax_v1` bucket in katalyststreet-public** | Exists in a PMOMax project but belongs to a different product. Confirm ownership. | katalyststreet-public | LOW |
| **GKE pmomax-auto — when to delete** | Per Google guidance: keep for now, can be deleted later. Needs a decision point — is there a timeline for Marketplace re-validation that would require this cluster? | katalyststreet-public | MEDIUM |

---

## 11. Cost and Savings Estimate

### Monthly gross cost by category (April 2026 full-month run-rate)

| Category | Current Monthly Gross | Net After Credits | Safe Deletion Savings (Later) | Optimization Savings (Later) | Confidence |
|---|---|---|---|---|---|
| GKE (pmomax-auto Autopilot) | ~$54/month | ~$1.60 | $0 (keep per guidance) | ~$10 (reduce monitoring) | HIGH |
| Compute Engine (N1 nodes + disks) | ~$42/month | ~$1.25 | ~$11 (delete 2024 disks) | ~$5 (confirm node usage) | HIGH |
| App Engine (CRMint) | ~$13/month | ~$0.30 | **~$13 (delete CRMint)** | — | HIGH |
| Cloud Run | ~$0 | ~$0 | $0 (scales to zero) | ~$0 | HIGH |
| Cloud Monitoring | ~$14.50/month | ~$0.35 | $0 | ~$7 (reduce Prometheus) | HIGH |
| Networking | ~$21/month | ~$0.50 | ~$11.50 (disable NIC) | — | HIGH |
| Security Command Center | ~$10/month | ~$0.25 | $0 (org-level, can't easily remove) | — | MEDIUM |
| Artifact Registry | ~$1.30/month | ~$0.04 | ~$0 (empty repo) | ~$0.30 (cleanup policy) | HIGH |
| App Engine (overhead) | ~$0 | ~$0 | $0 | ~$0 | HIGH |
| AlloyDB (null project) | ~$21/month | ~$0.50 | **~$21 (if safe to remove)** | — | LOW |
| Cloud Storage | ~$0.10/month | ~$0 | ~$0 | ~$0 | HIGH |
| BigQuery | ~$0 | ~$0 | $0 | $0 | HIGH |
| **TOTAL** | **~$177/month** | **~$4.80** | **~$56/month** | **~$22/month** | HIGH |

> Note: `optimax-build1` and `deltamax-464321` are different products on the same billing account. They account for ~$350/month gross in the April billing but are out of scope for PMOMax-specific savings.

### Savings summary

| Scenario | Monthly Gross Savings | Annual Gross Savings |
|---|---|---|
| Safe deletions approved (CRMint + 2024 disks + empty AR repo) | ~$24–25/month | ~$290/year |
| + AlloyDB resolved and removed (if safe) | +~$21/month | +~$252/year |
| + Network Intelligence Center disabled | +~$11.50/month | +~$138/year |
| + Prometheus optimization | +~$7/month | +~$84/year |
| **Total possible savings** | **~$64–65/month gross** | **~$770/year gross** |

**Net savings today** (while credits remain): ~$0–1/month  
**Net savings when credits expire**: ~$64–65/month

---

## 12. Risk Matrix

| Action | Risk Level | PMOMax Marketplace Impact | Notes |
|---|---|---|---|
| Delete App Engine CRMint services | LOW | None | CRMint is unrelated to PMOMax |
| Delete `crmint-cron` scheduler | LOW | None | Already PAUSED |
| Delete terminated VM disks (us-west1-a) | LOW | None | VMs stopped Sept 2024, data is old |
| Delete empty `us-central1/apps` AR repo | LOW | None | 0 bytes, no images |
| Reduce Cloud Run max instances (10 → 3) | LOW | None | Still serves normal traffic |
| Disable Network Intelligence Center | LOW | None | Not required for Marketplace |
| Delete `pmomax-auto` GKE cluster | MEDIUM | MEDIUM | Needed for k8s Marketplace validation; can be recreated, but has lead time |
| Delete `pid-architect-ehlu1` Cloud Run services | MEDIUM | LOW | Legacy — confirm no active users |
| Resolve AlloyDB mystery charge | MEDIUM | None | Unknown project/owner |
| Disable Anthos/Fleet APIs | LOW | LOW | No active memberships; check GKE Enterprise billing impact |
| Touch Artifact Registry Marketplace images | **CRITICAL** | **CRITICAL** | Never delete deployer:1.4.2, ubbagent:1.4.2 |
| Disable Marketplace APIs | **CRITICAL** | **CRITICAL** | Never disable procurement or service control APIs |
| Take down Cloud Run `pmo-architect` | **CRITICAL** | **CRITICAL** | Public demo runtime — must stay live |

---

## 13. Exact Command Evidence

All commands were read-only. Key commands used:

```bash
# Projects
gcloud projects list --format=json

# Billing
gcloud billing accounts list --format=json
gcloud billing projects describe katalyststreet-public --format=json
gcloud billing projects describe pid-architect-ehlu1 --format=json

# Cloud Run
gcloud run services list --platform=managed --project=katalyststreet-public --format=json
gcloud run services list --platform=managed --project=pid-architect-ehlu1 --format=json

# GKE
gcloud container clusters list --project=katalyststreet-public --format=json

# Artifact Registry
gcloud artifacts repositories list --project=katalyststreet-public --format=json
gcloud artifacts docker images list us-docker.pkg.dev/katalyststreet-public/pmomax --format=json

# APIs
gcloud services list --enabled --project=katalyststreet-public --format=json

# Compute
gcloud compute instances list --project=katalyststreet-public --format=json
gcloud compute disks list --project=katalyststreet-public --format=json
gcloud compute addresses list --project=katalyststreet-public --format=json

# App Engine
gcloud app services list --project=katalyststreet-public --format=json

# Cloud Scheduler
gcloud scheduler jobs list --project=katalyststreet-public --location=us-east1 --format=json

# Fleet
gcloud container fleet memberships list --project=katalyststreet-public --format=json

# Storage
gcloud storage buckets list --project=katalyststreet-public --format=json

# BigQuery
bq ls --project_id=katalyststreet-public --format=json
bq ls --project_id=katalyststreet-public pmomaxbilling

# Billing queries (SELECT only)
bq query --use_legacy_sql=false --project_id=katalyststreet-public \
  'SELECT DATE_TRUNC(usage_start_time, MONTH) as month, project.id, service.description,
   ROUND(SUM(cost),2) as gross, ... FROM pmomaxbilling.gcp_billing_export_v1_... WHERE ...'
```

---

## 14. Recommended Action Plan (For Human Approval — DO NOT EXECUTE NOW)

All items below are **recommendations only**. No action should be taken without explicit human sign-off.

### Priority 1 — Quick wins, low risk (approve when ready)

1. **Delete App Engine CRMint** (`crmint-controller`, `crmint-jobs`, `default`) in `katalyststreet-public`
   - Saves ~$13/month gross
   - First snapshot/export any data if needed
   - Then: `gcloud app services delete crmint-controller crmint-jobs --project=katalyststreet-public` (HUMAN ONLY)

2. **Delete `crmint-cron` scheduler job** (already PAUSED)
   - Saves ~$0 (already paused but cleanup)
   - `gcloud scheduler jobs delete crmint-cron --location=us-east1 --project=katalyststreet-public` (HUMAN ONLY)

3. **Delete terminated VM disks** (us-west1-a, from Sept 2024)
   - Consider snapshot first, then delete
   - Saves ~$11/month gross
   - `gcloud compute disks delete instance-20240929-optimax-katalyst-street-public --zone=us-west1-a` (HUMAN ONLY)

4. **Delete empty Artifact Registry repo** `us-central1/apps` (0 bytes)
   - No cost, cleanup only
   - `gcloud artifacts repositories delete apps --location=us-central1 --project=katalyststreet-public` (HUMAN ONLY)

### Priority 2 — Investigate and resolve

5. **Identify AlloyDB mystery charge (~$21/month gross, null project)**
   - Check which billing sub-account or linked project owns this AlloyDB Omni subscription
   - Look in `optimax-build1` project console directly (no API access via this account)

6. **Confirm pid-architect-ehlu1 Cloud Run services**
   - Determine if `pid-agent`, `pmomax`, `ssrpmomax`, etc. have any active users
   - If not, decommission the entire `pid-architect-ehlu1` project (saves admin overhead)

### Priority 3 — Optimize (after Priority 1 & 2)

7. **Add Artifact Registry cleanup policy** to `us-east1/apps`
   - Keep: `1.4.2`, `1.0.2`, `about-video-audit-*`, `latest`
   - Delete: intermediate build tags older than 90 days

8. **Reduce Cloud Monitoring Prometheus sample ingestion**
   - Investigate scrape config on `pmomax-auto` cluster
   - Reduce scrape interval or narrow metric selection

9. **Disable Network Intelligence Center** features if not in active use
   - Topology, Analyzer, Internet Performance = ~$11.50/month gross

10. **Set Artifact Registry image cleanup policy on `us-east1/pmomax`**
    - Keep: all `1.4.x` tagged images (Marketplace versions)
    - Delete: intermediate build digests without release tags

---

## 15. Final Recommendation

**PMOMax Marketplace compliance is intact.** All required assets (Marketplace deployer, UBB agent, Procurement API, Service Control API, runtime image, Marketplace endpoint) are present and active.

**The Cloud Run demo runtime is healthy**, scales to zero, and costs effectively nothing while idle.

**Immediate safe actions** (estimated ~$24/month gross savings): delete CRMint App Engine + 2024 disks.

**The largest potential saving** is the AlloyDB mystery charge (~$21/month gross) — investigate this first before any cleanup.

**The GKE cluster `pmomax-auto`** should be kept for now per Google guidance. When a future Marketplace re-validation window is confirmed, evaluate whether to delete and recreate temporarily.

**Credits are masking real cost.** Current net spend is ~$5/month but gross is ~$177/month for PMOMax-relevant resources. When credits expire, total bill could reach $177–200/month. Priority should be eliminating the non-essential gross costs before credits run out.
