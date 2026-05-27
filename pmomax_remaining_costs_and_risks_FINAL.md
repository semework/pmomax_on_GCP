# PMOMax Remaining Costs and Risks Final Investigation

Date: 2026-05-21
Mode: read-only investigation and local reporting only

## Executive Summary

No cloud resources were changed. This investigation used read-only `list`, `describe`, `inspect`, and BigQuery `query` commands only.

The last-30-day billing-export gross cost still reads **$754.76**, credits **-$754.84**, net **-$0.08**. That number is partly stale for future exposure because several old charges are not recurring in the last 7 days. A better current run-rate estimate from the last 7 days is **about $456.98/month gross**, still near **$0 net while credits continue**.

The largest active remaining exposure is not the protected public Cloud Run demo. The biggest active cost drivers are:

- `optimax-build1` Cloud Run, visible in billing but not inspectable with current permissions.
- `pmomax-auto` GKE Autopilot and its load balancer/Prometheus stack in `katalyststreet-public`.
- Null-project `AlloyDB Omni Subscription`.
- `deltamax-464321` and `optimax-build1` persistent disk/storage remnants.
- Network Intelligence Center/resource-hour charges.

## No Changes Made

I did not delete, disable, update, scale, deploy, patch, configure, or modify anything. No cleanup commands were run. No API was enabled when `gcloud` prompted for disabled APIs.

## Current Actual Cost State

Billing export: `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`

| Window | Gross | Credits | Net | First usage | Last usage |
|---|---:|---:|---:|---|---|
| Last 30 days | $754.76 | -$754.84 | -$0.08 | 2026-04-21 | 2026-05-21 |
| Last 60 days | $1,168.80 | -$1,168.89 | -$0.09 | 2026-03-31 | 2026-05-21 |
| Last 90 days | $1,168.80 | -$1,168.89 | -$0.09 | 2026-03-31 | 2026-05-21 |

Last-7-day run-rate:

| Metric | Last 7 days | Projected 30-day run rate |
|---|---:|---:|
| Gross | $106.63 | $456.98 |
| Credits | -$106.71 | -$457.31 |
| Net | -$0.08 | -$0.33 |

## Gross vs Net Exposure

Current net is effectively zero because credits are absorbing spend. The future post-credit exposure to care about is gross run-rate, currently around **$457/month** based on the last 7 days.

The old 30-day gross **$754.76** includes charges that appear to have stopped or dropped materially:

- PMOMax token usage: $209.36 over 30 days, **$0.00 in last 7 days**.
- App Engine frontend instances: $20.85 over 30 days, **$0.00 in last 7 days**.
- Zonal Kubernetes Clusters for `cluster-1`: $33.09 over 30 days, **$0.00 in last 7 days**.
- Several old N1 core/RAM and external IP charges in `katalyststreet-public`: **$0.00 in last 7 days**.

## What Was Already Fixed

- CRMint scheduler is now **PAUSED**: `projects/katalyststreet-public/locations/us-east1/jobs/crmint-cron`.
- App Engine cost appears to have stopped in the last 7 days, even though CRMint services still exist and are marked `SERVING`.
- PMOMax Marketplace token usage in `pid-architect-ehlu1` shows no cost in the last 7 days.
- `cluster-1` GKE zonal charge appears to have stopped in the last 7 days.
- Some old `katalyststreet-public` Compute Engine runtime charges stopped; remaining public-project compute is mostly disk/image/storage style cost.
- Artifact Registry run-rate dropped from $3.64 last 30 days to about $1.44/month projected from last 7 days.

## What Findings Are Stale

- "PMOMax gross about $177/month" is stale as a current run-rate statement. The 30-day PMOMax SKU was $209.36, but current last-7-day run-rate is $0.
- "CRMint App Engine $13-$20/month still recurring" is stale as a current run-rate. Services still exist, but last 7 days show $0 App Engine spend.
- "`cluster-1` still costing" is stale. Billing labels show historic `cluster-1` cost, but last 7 days show $0.
- "`pmomax-auto` GKE about $139/month" is stale as a current run-rate; current Kubernetes Engine projected run-rate is about **$108.91/month**.
- "Old Optimax VM disks about $10.85/month" remains partially true for `katalyststreet-public`, but not complete. `optimax-build1` and `deltamax-464321` disk/storage charges are also active.

## Remaining Active Costs

Current run-rate from last 7 days:

- Cloud Run: **$117.70/month projected**, mostly `optimax-build1`, not the protected public demo.
- Kubernetes Engine: **$108.91/month projected**, `pmomax-auto` in `katalyststreet-public`.
- Compute Engine: **$76.36/month projected**, mainly disks/storage in `optimax-build1`, `deltamax-464321`, and some `katalyststreet-public`.
- Networking: **$58.69/month projected**, including load balancer forwarding rules, Private Service Connect, and Network Intelligence Center.
- AlloyDB: **$41.10/month projected**, null-project `AlloyDB Omni Subscription`.
- Cloud Monitoring: **$28.97/month projected**, Prometheus samples.
- Security Command Center: **$18.76/month projected**.

## Hidden Cost Drivers

- `optimax-build1` has active billing but the current account cannot list Cloud Run, Compute, disks, or GKE resources there. Billing shows meaningful Cloud Run, Compute Engine, Networking, Notebooks, and Security Command Center cost.
- `deltamax-464321` has no Cloud Run API enabled, but has active Compute Engine disk/core/RAM/snapshot charges.
- Null-project AlloyDB has no resource labels, no project ID, and no project number in billing export.
- GKE load balancer resources remain in `katalyststreet-public` for `pmomax/pmo-architect-ingress`, including a global forwarding rule and backend services.
- Network Intelligence Center tests still exist for old 2024 SSH troubleshooting against a terminated Optimax VM.

## Monitoring/Logging Analysis

- Cloud Monitoring Prometheus ingestion remains active: **$27.66 last 30 days**, **$28.97/month projected**.
- Billing labels show `goog-metric-domain=prometheus.googleapis.com`.
- `pmomax-auto` has Managed Service for Prometheus enabled.
- Cloud Logging itself is not a material billed line item in the export. Logging buckets are default only:
  - `_Default`, 30-day retention.
  - `_Required`, locked 400-day audit retention.
- No alerting policies and no uptime checks were listed in `katalyststreet-public`.
- No clear paid logging explosion was found; the observability cost problem is Prometheus metrics ingestion.

## Marketplace Risk Analysis

DO NOT TOUCH Marketplace release and billing plumbing:

- `pmo-architect` public Cloud Run demo.
- `pmo-max.endpoints.katalyststreet-public.cloud.goog`.
- `servicecontrol.googleapis.com`.
- `servicemanagement.googleapis.com`.
- `cloudcommerceprocurement.googleapis.com`.
- `cloudcommerceproducer.googleapis.com`.
- Artifact Registry release images:
  - `us/pmomax/deployer:1.4.2`
  - `us/pmomax/ubbagent:1.4.2`
  - `us-east1/apps/pmo-architect:1.4.2`
  - `us-east1/apps/pmo-architect:1.4.2-marketplace`
  - `us-east1/apps/pmo-architect:1.0.2`
- BigQuery `marketplace_report` linked dataset.
- BigQuery `pmomaxbilling` billing export dataset.

The `MARKETPLACE_TEST_MODE=true` setting remains present on the public Cloud Run runtime and is a compliance/configuration risk requiring human review.

## Cloud Run Runtime Analysis

Protected runtime:

- Project: `katalyststreet-public`
- Service: `pmo-architect`
- Region: `us-east1`
- URL: `https://pmo-architect-839982691485.us-east1.run.app/`
- Image: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`
- Traffic: 100% latest revision `pmo-architect-00032-nn7`
- CPU/memory: 1 CPU / 512Mi
- Max scale: template maxScale 10; service annotation maxScale 100
- `MARKETPLACE_TEST_MODE=true`: confirmed

`pid-architect-ehlu1` has multiple ready Cloud Run / Cloud Functions / Firebase services, including `chatagentfn`, `extractpid`, `pdfexport`, `ssrpidarchitectehlu1`, `ssrpmomax`, and `studio`. Their current billing impact is negligible: `pid-architect-ehlu1` Cloud Run is about $0.03 over 30 days.

`optimax-build1` Cloud Run is the major Cloud Run cost driver, but resource listing was denied. Billing shows **$100.72 gross last 30 days** and a **$117.70/month Cloud Run service run-rate** overall.

## GKE / Anthos / Fleet Analysis

`katalyststreet-public` has one visible GKE cluster:

- Name: `pmomax-auto`
- Region: `us-central1`
- Mode: Autopilot
- Status: RUNNING
- Current node count: 3
- Managed Prometheus: enabled
- Advanced datapath observability metrics: enabled
- Workload Identity: enabled
- Enterprise config: `STANDARD`
- Fleet memberships: none listed

Billing labels show:

- Cluster `pmomax-auto`: still active.
- Namespace `application-system`, workload `kube-app-manager-controller`: $21.70 gross last 30 days, $5.20 last 7 days.
- Namespace `pmomax`, workload `pmo-architect`: $12.32 gross last 30 days, $2.94 last 7 days.
- Cluster-level Autopilot charge: $72.47 gross last 30 days, $17.27 last 7 days.
- Historic `cluster-1`: $33.09 gross last 30 days, $0 last 7 days, likely cleaned up or no longer active.

No Fleet memberships were listed. No explicit GKE Enterprise/Anthos paid SKU appeared as a top current cost, but several Anthos/GKE APIs are enabled.

## Artifact Registry Analysis

Repositories in `katalyststreet-public` total several GB:

- `us/apps`: 788 MB
- `us/gcr.io`: 110 MB
- `us/pmomax`: 370 MB
- `us/us.gcr.io`: 630 MB
- `us-east1/apps`: 1.50 GB
- `us-east1/pmomax`: 1.27 GB

Billing:

- Last 30 days: $3.64 gross.
- Last-7-day projected run-rate: $1.44/month.

This is not a major remaining cost. Cleanup may be reasonable hygiene, but it is low value and Marketplace-sensitive. Preserve release/current images.

## BigQuery / Billing Export Analysis

- `pmomaxbilling` contains one billing export table with 515,827 rows, 50 partitions, and 422.8 MB logical size.
- BigQuery billing cost is only $0.04 last 30 days.
- `marketplace_report` is a linked dataset with three partitioned report tables.
- BigQuery is not a material cost driver and should not be touched except for retention review.

## AlloyDB Analysis

Billing export still shows:

- Project: null
- Service: AlloyDB
- SKU: AlloyDB Omni Subscription
- Last 30 days: $39.71 gross / $1.00 net
- Last-7-day projected run-rate: $41.10 gross/month
- Labels/system labels: none useful in billing export

`alloydb.googleapis.com` is disabled in `katalyststreet-public` and `pid-architect-ehlu1`, and no local AlloyDB clusters could be listed in those projects. This strongly suggests the charge is a billing/subscription-level Omni entitlement, not a normal project AlloyDB cluster.

## Zombie Infrastructure Analysis

Confirmed zombie or likely zombie items:

- `gpu-instance-20240929-optimax`: terminated VM in `katalyststreet-public`, attached 10 GB pd-balanced disk.
- `instance-20240929-optimax-katalyst-street-public`: terminated VM in `katalyststreet-public`, attached 100 GB pd-balanced disk.
- Two Network Intelligence Center SSH troubleshooting tests from 2024-09-29 pointing at the terminated GPU VM.
- CRMint App Engine services still `SERVING`, but scheduler paused and no App Engine instances currently listed.
- `pmomax-auto` GKE cluster still running even though PMOMax is a Marketplace Kubernetes App intended for customer GKE environments. This may be validation/demo infrastructure, not production serving.

## Duplicate Runtime Analysis

There are multiple PMOMax-like runtimes:

- Public protected Cloud Run demo in `katalyststreet-public`.
- GKE `pmomax-auto` workload `pmomax/pmo-architect`.
- `pid-architect-ehlu1` Cloud Run/Firebase services, including `ssrpmomax`.
- Artifact Registry has `pmo-architect` and `pmomax` images in multiple repositories/regions.

Only the public Cloud Run demo is explicitly protected. The GKE runtime and `pid-architect-ehlu1` services need human classification as validation, demo, abandoned, or required.

## Remaining Low-Risk Savings

- Network Intelligence Center old troubleshooting tests and related NIC charges after confirming no active diagnostics rely on them.
- Artifact Registry old untagged/intermediate non-release images, if a reviewed policy excludes release/current images. Savings are small.
- Old stopped VM/disks in `katalyststreet-public`, but only after backup/owner confirmation.

## Remaining Medium-Risk Savings

- Prometheus cardinality/scrape reduction for `pmomax-auto`.
- GKE load balancer / ingress review for `pmomax/pmo-architect-ingress`.
- `deltamax-464321` disk/snapshot cleanup after owner confirmation.
- CRMint App Engine service removal, even though current run-rate appears fixed, because services still exist.

## Remaining High-Risk Savings

- `pmomax-auto` GKE lifecycle or removal: high Marketplace validation risk.
- Null-project AlloyDB Omni subscription cancellation: billing/subscription ownership unknown.
- Any Marketplace artifact, endpoint, API, deployer, UBB, or billing plumbing changes.
- Any change to `MARKETPLACE_TEST_MODE` without compliance review.
- Any `optimax-build1` cleanup before obtaining resource-level access and owner confirmation.

## Not Worth Touching

- BigQuery billing export cost: $0.04 last 30 days.
- Cloud Storage in `katalyststreet-public`: $0.16 last 30 days.
- Secret Manager: $0.19 last 30 days.
- Artifact Registry cleanup as a pure cost measure: only $1.44/month projected, though hygiene may still be useful.
- Cloud Logging: no meaningful current billed line item found.

## DO NOT TOUCH Resources

- `pmo-architect` Cloud Run public runtime/demo.
- Current runtime image `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`.
- Marketplace deployer/ubbagent release images in `us/pmomax`.
- Marketplace endpoint `pmo-max.endpoints.katalyststreet-public.cloud.goog`.
- Partner/Commerce Procurement, Service Control, Service Management, Artifact Registry APIs.
- BigQuery `marketplace_report` and `pmomaxbilling`.
- Any Marketplace release image tags `1.4.2`, `1.4.2-marketplace`, `1.0.2`, deployer, ubbagent.

## Human Review Required

1. `MARKETPLACE_TEST_MODE=true` on protected public Cloud Run runtime.
2. `optimax-build1` ownership and resource-level access, because billing shows active major Cloud Run cost.
3. `AlloyDB Omni Subscription` null-project charge ownership and cancellation path.
4. `pmomax-auto` purpose: Marketplace validation, demo, customer support, or abandoned infrastructure.
5. Whether `pid-architect-ehlu1` services are required demos or abandoned Firebase/Cloud Functions leftovers.
6. Whether `deltamax-464321` compute storage is unrelated to PMOMax and should be separately audited.

## Future Post-Credit Exposure

If credits expire and current run-rate persists, expected monthly exposure is about **$457/month gross**.

The gross exposure to care about is concentrated in:

- `optimax-build1` Cloud Run/Compute/Networking.
- `katalyststreet-public` GKE/Prometheus/Networking.
- Null-project AlloyDB Omni.
- `deltamax-464321` disk/storage.

## Final Recommendations

1. Get owner/resource access for `optimax-build1`; it is the largest active hidden cost and cannot be safely classified from billing alone.
2. Treat `pmomax-auto` as Marketplace-sensitive. Decide whether it is required for validation/revalidation before any action.
3. Investigate null-project AlloyDB through Billing Console/support; normal project APIs do not show an owned cluster.
4. Reduce Prometheus ingestion only after checking required dashboards/alerts for `pmomax-auto`.
5. Leave the Cloud Run public demo and Marketplace artifacts untouched.
