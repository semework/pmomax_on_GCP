# Codex Verification of Claude PMOMax Cost Audit

Date: 2026-05-21
Account: mulugetas@katalyststreet.com
Active project: katalyststreet-public

## Executive Summary

No cloud resources were changed. This audit used read-only `gcloud` list/describe/get calls and BigQuery billing export queries only.

The billing export exists at `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`. For the last 30 days, all-project gross cost is **$754.76**, credits are **-$754.84**, and net cost is **-$0.08**. Claude's "net about $0" finding is confirmed, but Claude's all-project gross estimate of about $530/month is corrected upward.

Claude's safe-savings estimate of $64-$65/month is **partially confirmed but not safe to execute automatically**. Confirmed approval candidates are App Engine CRMint services, Network Intelligence Center, Prometheus ingestion reduction, Artifact Registry cleanup policy, and the old stopped VM estate. The GKE cluster and AlloyDB null-project charge require human coordination before any action.

## Claude Findings Checked

- PMOMax-relevant gross about $177/month, net about $5/month: **unverified/corrected**. The export shows `pid-architect-ehlu1` PMOMax service gross **$209.50**, net **$0.00**, and `katalyststreet-public` gross **$300.31**, net **$4.22**.
- All projects gross about $530/month, net about $0/month: **net confirmed, gross corrected** to **$754.76 gross / -$0.08 net** for the last 30 days.
- Safe gross savings about $64-$65/month: **partially confirmed**, but several items need approval and one item is materially larger than Claude reported.
- CRMint App Engine services: **confirmed present and serving**.
- Terminated VM disks from September 2024: **corrected**. The disks are attached to terminated VMs, not unattached orphan disks, and no snapshots were listed.
- AlloyDB null-project charge: **confirmed**, but amount is **$39.71 gross / $1.00 net** over the last 30 days, not about $21.
- Network Intelligence Center: **confirmed**, about **$9.49 gross** in `katalyststreet-public`; **$13.05 gross** across visible projects.
- Prometheus / Cloud Monitoring: **confirmed**, **$27.66 gross / $0.66 net** for Prometheus samples ingested.
- Legacy Cloud Run services in `pid-architect-ehlu1`: **confirmed**, but cost is negligible in billing export.
- Artifact Registry cleanup: **confirmed as an optimization**, not material immediate savings; current Artifact Registry gross is **$3.64** across all visible projects.

## Corrected Cost Estimates

Last 30 days:

| Scope | Gross | Credits | Net |
|---|---:|---:|---:|
| All visible billing export projects | $754.76 | -$754.84 | -$0.08 |
| `katalyststreet-public` | $300.31 | -$296.09 | $4.22 |
| `pid-architect-ehlu1` | $209.50 | -$209.50 | $0.00 |
| `optimax-build1` | $177.34 | -$183.33 | -$5.99 |
| Null project | $39.71 | -$38.71 | $1.00 |

Last 60 days:

| Scope | Gross | Credits | Net |
|---|---:|---:|---:|
| All visible billing export projects | $1,168.80 | -$1,168.89 | -$0.09 |

Last 90 days:

| Scope | Gross | Credits | Net |
|---|---:|---:|---:|
| All visible billing export projects | $1,168.80 | -$1,168.89 | -$0.09 |

The billing table has 50 partitions, so the 60-day and 90-day totals are identical because older rows are not present in this export.

## Top Services by Last 30 Day Gross

1. PMOMax: $209.36 gross / $0.00 net
2. Kubernetes Engine: $139.62 gross / $1.38 net
3. Compute Engine: $125.09 gross / -$7.41 net
4. Cloud Run: $100.75 gross / $2.29 net
5. Networking: $61.14 gross / $0.92 net
6. AlloyDB: $39.71 gross / $1.00 net
7. Cloud Monitoring: $27.66 gross / $0.66 net
8. App Engine: $20.85 gross / $0.43 net

## Top SKUs by Last 30 Day Gross

1. PMO-Max Pricing By Tokens Tokens Usage: $209.36 gross
2. Cloud Run Services CPU: $86.40 gross
3. GKE Autopilot Kubernetes Clusters: $72.47 gross
4. Compute Engine Balanced PD Capacity: $63.35 gross
5. AlloyDB Omni Subscription: $39.71 gross
6. Cloud Load Balancer Forwarding Rule Minimum Global: $36.29 gross
7. Zonal Kubernetes Clusters: $33.09 gross
8. GKE Autopilot Pod mCPU Requests: $29.08 gross
9. Prometheus Samples Ingested: $27.66 gross
10. App Engine Frontend Instances: $20.85 gross

## DO NOT TOUCH Resources

- Cloud Run public demo: `pmo-architect` in `katalyststreet-public`, region `us-east1`.
  - URL includes `https://pmo-architect-839982691485.us-east1.run.app/`.
  - Current image: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`.
  - CPU/memory: 1 CPU, 512Mi.
  - Max scale: service annotation 100, template annotation 10.
  - Traffic: 100% to `pmo-architect-00032-nn7`.
  - `MARKETPLACE_TEST_MODE=true` is present and requires human review.
- Artifact Registry Marketplace release images:
  - `us/pmomax/deployer:1.4`, `1.4.2`.
  - `us/pmomax/ubbagent:1.4`, `1.4.2`.
  - `us-east1/apps/pmo-architect:1.4.2`, `1.4.2-marketplace`, `latest`.
  - `us-east1/apps/pmo-architect:1.0.2`.
- Required APIs confirmed enabled in `katalyststreet-public`:
  - `cloudcommerceprocurement.googleapis.com`
  - `cloudcommerceproducer.googleapis.com`
  - `servicecontrol.googleapis.com`
  - `servicemanagement.googleapis.com`
  - `artifactregistry.googleapis.com`
  - `pmo-max.endpoints.katalyststreet-public.cloud.goog`
- BigQuery datasets:
  - `katalyststreet-public:marketplace_report` linked dataset.
  - `katalyststreet-public:pmomaxbilling`.

## Safe Candidates After Human Approval

1. CRMint App Engine services in `katalyststreet-public`.
   - Services: `crmint-controller`, `crmint-jobs`.
   - Both have `v1`, runtime `python39`, instance class `F2`, serving status `SERVING`.
   - Last deployed 2024-09-29.
   - Total App Engine cost is $20.85 gross last 30 days. Billing export did not break cost down by App Engine service, so Claude's $13 estimate is plausible but not fully proven.
   - Risk: medium. Verify no CRMint business dependency before approval.

2. Stopped Optimax VMs and attached boot disks in `katalyststreet-public`.
   - `gpu-instance-20240929-optimax`, terminated since 2024-09-29, attached 10 GB pd-balanced boot disk.
   - `instance-20240929-optimax-katalyst-street-public`, terminated since 2024-09-29, attached 100 GB pd-balanced boot disk.
   - Snapshots list returned empty.
   - `katalyststreet-public` us-west1 Balanced PD Capacity cost is $10.85 gross last 30 days.
   - Risk: medium. Snapshot or confirm disposable before deleting the stopped VMs/disks.

3. Network Intelligence Center in `katalyststreet-public`.
   - Last 30 days in `katalyststreet-public`: $9.49 gross.
   - Visible all-project NIC cost: about $13.05 gross.
   - Connectivity tests exist and target old Optimax VM SSH troubleshooting tests, created 2024-09-29.
   - Risk: low to medium after confirming no active networking diagnostics depend on NIC.

## Optimization Candidates After Human Approval

- Prometheus ingestion reduction:
  - `Prometheus Samples Ingested`: $27.66 gross last 30 days.
  - Labels point to `goog-metric-domain=prometheus.googleapis.com` in `katalyststreet-public`.
  - Likely tied to `pmomax-auto` GKE managed Prometheus.
  - Do not remove observability blindly. Safer action is to reduce scrape volume/cardinality after checking dashboards and alerting.

- Artifact Registry cleanup policy:
  - Artifact Registry gross is $3.64 last 30 days.
  - Release images must be preserved.
  - Candidate cleanup only for untagged/old non-release images in `us/apps`, `us-east1/pmomax`, and other repos after reference checks.

- GKE cluster cost review:
  - `pmomax-auto` is running in `katalyststreet-public`, `us-central1`, Autopilot enabled.
  - Kubernetes Engine cost is $139.62 gross last 30 days.
  - Managed Prometheus adds $27.66 gross last 30 days.
  - This is not a safe automatic cleanup. Coordinate with Google/Marketplace/customer status before deletion or migration.

## Human Review Required

- AlloyDB null-project charge:
  - Confirmed service/SKU: `AlloyDB` / `AlloyDB Omni Subscription`.
  - Project ID and project number are null in billing export.
  - Last 30 days: $39.71 gross / $1.00 net.
  - No labels or system labels in export.
  - Manual Console check required: Billing > Reports filtered to AlloyDB Omni Subscription, invoice details, support/billing account resource mapping, and any vendor/subscription records tied to billing account `018FC6-CC1985-24653C`.

- `MARKETPLACE_TEST_MODE=true` on the production Cloud Run demo.
  - Confirm whether this is intentional for public demo billing behavior.
  - Do not change without Marketplace compliance review.

- `pmomax-auto` GKE cluster timing.
  - Confirm whether cluster is still required for Marketplace validation, customer deployments, or Google review.
  - Deletion timing requires human coordination.

## Marketplace Compliance Risk Notes

- Do not disable Partner Procurement, Service Control, Service Management, Artifact Registry, or the PMOMax managed service endpoint.
- Do not delete `1.4.2`, `1.0.2`, Marketplace deployer, ubbagent, current Cloud Run runtime image, or any image referenced by Marketplace deployment artifacts.
- Do not delete `marketplace_report` or `pmomaxbilling`; only review retention if needed.
- Treat `MARKETPLACE_TEST_MODE=true` as a compliance question, not a cost cleanup.

## Cloud Run Demo Runtime Findings

- Project: `katalyststreet-public`
- Service: `pmo-architect`
- Region: `us-east1`
- URLs: `https://pmo-architect-839982691485.us-east1.run.app`, `https://pmo-architect-zxofcfyioq-ue.a.run.app`
- Image: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`
- CPU/memory: 1 CPU, 512Mi
- Container concurrency: 80
- Timeout: 300 seconds
- Ingress: all
- Traffic: 100% latest ready revision `pmo-architect-00032-nn7`
- Env vars include `MARKETPLACE_ENABLED=true`, `MARKETPLACE_TEST_MODE=true`, Marketplace Service Control endpoint and metric.
- Current billing export shows `katalyststreet-public` Cloud Run cost is near zero; major Cloud Run cost is in `optimax-build1`, not this demo.

## Billing Evidence

- Billing export table: `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`
- Last 30 days all visible projects: $754.76 gross, -$754.84 credits, -$0.08 net.
- Last 60 and 90 days: $1,168.80 gross, -$1,168.89 credits, -$0.09 net.
- Null-project AlloyDB: $39.71 gross.
- App Engine: $20.85 gross.
- Network Intelligence Center SKUs in `katalyststreet-public`: $3.48 + $3.48 + $2.53 = $9.49 gross.
- Prometheus samples ingested: $27.66 gross.
- GKE/Kubernetes Engine: $139.62 gross.
- Artifact Registry: $3.64 gross.

## Exact Read-Only Commands Run

```bash
gcloud config get-value account
gcloud config get-value project
gcloud projects list --format=json
gcloud billing accounts list --format=json
bq ls --project_id=katalyststreet-public --format=json
bq ls --project_id=katalyststreet-finops --format=json
bq ls --project_id=pid-architect-ehlu1 --format=json
bq ls --project_id=pmomax-public-1762553342 --format=json
bq ls --project_id=katalyststreet-public --format=json marketplace_report
bq ls --project_id=katalyststreet-public --format=json pmomaxbilling
bq show --format=json katalyststreet-public:pmomaxbilling
bq show --format=json katalyststreet-public:marketplace_report
bq show --format=json katalyststreet-public:pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C
bq query --use_legacy_sql=false --format=json '<billing window totals query>'
bq query --use_legacy_sql=false --format=json '<project breakdown query>'
bq query --use_legacy_sql=false --format=json '<top services query>'
bq query --use_legacy_sql=false --format=json '<top SKUs query>'
bq query --use_legacy_sql=false --format=json '<PMOMax-relevant filter query>'
bq query --use_legacy_sql=false --format=json '<project/service breakdown query>'
gcloud run services describe pmo-architect --region=us-east1 --project=katalyststreet-public --format=json
gcloud run services list --platform=managed --project=pid-architect-ehlu1 --format=json
gcloud app services list --project=katalyststreet-public --format=json
gcloud app versions list --project=katalyststreet-public --format=json
gcloud compute disks list --project=katalyststreet-public --format=json
gcloud compute snapshots list --project=katalyststreet-public --format=json
gcloud container clusters list --project=katalyststreet-public --format=json
gcloud compute instances list --project=katalyststreet-public --format=json
gcloud container fleet memberships list --project=katalyststreet-public --format=json
gcloud services list --enabled --project=katalyststreet-public --format=json
gcloud services list --enabled --project=katalyststreet-public --format='value(config.name)'
gcloud artifacts repositories list --project=katalyststreet-public --format=json
gcloud artifacts docker images list us-docker.pkg.dev/katalyststreet-public/pmomax --include-tags --format=json
gcloud artifacts docker images list us-east1-docker.pkg.dev/katalyststreet-public/apps --include-tags --format=json
gcloud artifacts docker images list us-docker.pkg.dev/katalyststreet-public/apps --include-tags --format=json
gcloud artifacts docker images list us-east1-docker.pkg.dev/katalyststreet-public/pmomax --include-tags --format=json
gcloud network-management connectivity-tests list --project=katalyststreet-public --format=json
gcloud network-management operations list --project=katalyststreet-public --format=json
```

The `network-management operations list` command did not return useful output. The connectivity tests list succeeded after sandbox credential access was approved.

## Final Recommendation

Do not run cleanup automatically. Approve only staged, reversible changes after a human verifies business ownership:

1. Confirm and remove CRMint App Engine services if unused.
2. Confirm old Optimax stopped VMs are disposable; snapshot or otherwise preserve evidence before deleting VMs/disks.
3. Resolve the AlloyDB null-project subscription with Billing/Console support.
4. Reduce Prometheus ingestion only after observability review.
5. Coordinate GKE `pmomax-auto` timing with Google/Marketplace before any deletion or migration.
