# PMOMax-Only Scale-Down Plan

Generated: 2026-05-22

## Executive Summary

No cloud resources were changed. This is a read-only PMOMax-only investigation and cleanup planning report.

Current evidence supports a narrow PMOMax conclusion: the remaining material PMOMax-specific spend is the internal `pmomax-auto` GKE validation/runtime stack in `katalyststreet-public`, plus Managed Prometheus/Cloud Monitoring ingestion and the GKE ingress load balancer tied to that cluster.

The public Cloud Run runtime/demo is active, healthy, and effectively zero-cost in the billing export. It should remain active:

`https://pmo-architect-839982691485.us-east1.run.app/`

Approximate PMOMax-only current run-rate from the last 7 days:

- Clear PMOMax gross: about `$151.17/month`
- Clear PMOMax net after current credits: about `$1.97/month`
- Future post-credit exposure: about `$151.17/month`
- If the Cloud Run demo remains active and `pmomax-auto` GKE, Managed Prometheus, and the GKE ingress load balancer are removed later after approval: about `$1.50/month` gross remains for Artifact Registry plus near-zero BigQuery/Service Control/Cloud Run cost.

## Google Guidance Applied

PMOMax is treated as a Google Cloud Marketplace Kubernetes App (Legacy). Under the guidance provided:

- Customer installs run in customer-owned GKE environments.
- Our own long-running GKE cluster is not required for existing customer installs if it is only an internal validation/runtime/test cluster.
- Artifact Registry must remain active because it stores deployer, UBB agent, app images, and release artifacts.
- Partner Procurement, Service Control, Service Management, Artifact Registry, and Marketplace/Commerce-related APIs must remain enabled.
- Anthos/Fleet/GKE Enterprise are not required for a Legacy Kubernetes App unless explicitly used elsewhere.
- Future Marketplace updates may require a temporary validation cluster.

## PMOMax Scope Boundary

Included as PMOMax:

- `katalyststreet-public`
- Project number `839982691485`
- Cloud Run service `pmo-architect`
- GKE cluster `pmomax-auto`
- GKE ingress resources named for namespace/service `pmomax/pmo-architect`
- Artifact Registry repositories with PMOMax descriptions or packages
- BigQuery datasets `marketplace_report` and `pmomaxbilling`
- Service endpoint `pmo-max.endpoints.katalyststreet-public.cloud.goog`
- PMOMax deployer, UBB agent, and runtime images

Excluded from this PMOMax-only action plan:

- Optimax resources unless explicitly tied to PMOMax
- CRMint unless proven to be PMOMax runtime or Marketplace plumbing
- Null-project AlloyDB/AlloyDB Omni charges unless a PMOMax linkage is proven
- Broad all-project cost cleanup

## What Must Stay Active

Do not touch:

- Cloud Run service `pmo-architect` in `katalyststreet-public/us-east1`
- Cloud Run image `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`
- Public demo URLs:
  - `https://pmo-architect-839982691485.us-east1.run.app`
  - `https://pmo-architect-zxofcfyioq-ue.a.run.app`
- Artifact Registry repositories that hold PMOMax releases:
  - `us/pmomax`
  - `us-east1/apps`
  - `us/apps`
  - `us-east1/pmomax`
- Release and Marketplace images:
  - `deployer:1.4`, `deployer:1.4.2`
  - `ubbagent:1.4`, `ubbagent:1.4.2`
  - `pmo-architect:1.4.2`
  - `pmo-architect:1.4.2-marketplace`
  - `pmo-architect:1.0.2`
- Marketplace and platform APIs:
  - `artifactregistry.googleapis.com`
  - `cloudcommerceconsumerprocurement.googleapis.com`
  - `cloudcommerceprocurement.googleapis.com`
  - `cloudcommerceproducer.googleapis.com`
  - `servicecontrol.googleapis.com`
  - `servicemanagement.googleapis.com`
  - `pmo-max.endpoints.katalyststreet-public.cloud.goog`
- BigQuery datasets:
  - `katalyststreet-public:marketplace_report`
  - `katalyststreet-public:pmomaxbilling`

## What Can Be Deleted Later

After human approval and Google/Marketplace confirmation:

- GKE cluster `pmomax-auto` in `katalyststreet-public/us-central1`, if confirmed to be only an internal validation/runtime/test cluster.
- PMOMax GKE ingress/load balancer resources created by `pmomax/pmo-architect-ingress`, preferably by deleting the owning cluster/workloads rather than manually deleting individual load balancer pieces.

Estimated future gross savings if approved: about `$149.67/month` from GKE, Managed Prometheus, and the GKE ingress load balancer.

## What Can Be Disabled Later

After human approval:

- Managed Prometheus on `pmomax-auto`, only if the cluster is temporarily retained and PMOMax validation observability is not needed.
- Advanced datapath observability metrics on `pmomax-auto`, only if the cluster is retained.
- Anthos/Fleet/GKE Enterprise-related APIs only after Google/Marketplace support confirms no PMOMax dependency. Current evidence shows no Fleet memberships and cluster tier `STANDARD`, so there is no immediate Fleet unregister action.

Do not disable Marketplace APIs.

## What Can Be Scaled Down Later

There is no recommended Cloud Run scale-down because the public demo has no min instances shown, has 100% traffic to one ready revision, and the billing export shows effectively `$0/month` Cloud Run cost for PMOMax.

If `pmomax-auto` must stay temporarily, the lower-risk path is to reduce Kubernetes workload resource requests/replicas and observability ingestion after reviewing in-cluster manifests. No in-cluster modifying command should be run without a separate approval.

## PMOMax Public Cloud Run Runtime Findings

- Project: `katalyststreet-public`
- Project number/namespace: `839982691485`
- Service: `pmo-architect`
- Region: `us-east1`
- Status: Ready
- Latest ready revision: `pmo-architect-00032-nn7`
- Traffic: 100% to latest revision
- Image: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`
- CPU/memory: `1 CPU`, `512Mi`
- Concurrency: `80`
- Timeout: `300s`
- Ingress: all
- Max scale: template annotation `10`, service annotation `100`
- Min instances: not shown in service spec
- Billing export: `$0.00` gross in the PMOMax current 30-day and 7-day windows

Important risk:

- `MARKETPLACE_TEST_MODE=true` is set on the public runtime. This should be reviewed by a human before any change. Do not change it automatically.

## PMOMax Marketplace Artifact Findings

Confirmed repositories in `katalyststreet-public`:

- `us/apps`, Docker, 788,003,364 bytes, PMOMax application images
- `us/pmomax`, Docker, 369,663,279 bytes
- `us-east1/apps`, Docker, 1,495,809,440 bytes, PMOMax application images
- `us-east1/pmomax`, Docker, 1,265,540,951 bytes, PMOMax Docker images
- Legacy/container migration repositories also exist: `us/gcr.io`, `us/us.gcr.io`

Confirmed release artifacts include:

- `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4`, `1.4.2`
- `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4`, `1.4.2`
- `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`
- `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2-marketplace`, `latest`
- `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2`

Recommendation: keep Artifact Registry and release images. Optional cleanup of untagged or non-release images is low-dollar and Marketplace-sensitive; do it only after a manifest/image reference review.

## PMOMax GKE / Anthos / Fleet Findings

Confirmed GKE cluster:

- Name: `pmomax-auto`
- Project: `katalyststreet-public`
- Region: `us-central1`
- Mode: Autopilot
- Status: RUNNING
- Current nodes: 3
- Current version: `1.35.3-gke.1389000`
- Enterprise config: `STANDARD`
- Fleet memberships: none returned
- Managed Prometheus: enabled
- Advanced datapath observability metrics: enabled
- Logging: `SYSTEM_COMPONENTS`, `WORKLOADS`
- Monitoring components include pod, deployment, storage, HPA, cAdvisor, kubelet, and DCGM metrics
- Resource label: `goog-k8s-display-name=pmomax`

This cluster appears to be an internal PMOMax validation/runtime cluster, not a requirement for current customer installs under the provided Legacy Kubernetes App guidance. Deletion remains a human-approved, Google/Marketplace-confirmed action because it may affect future validation workflows and any live internal test endpoints hosted inside the cluster.

## PMOMax Billing Findings

Billing export table queried:

`katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`

Current PMOMax-relevant billing rows:

| Category | Gross 30d | Credits 30d | Net 30d | Projected gross from 7d | Projected net from 7d |
|---|---:|---:|---:|---:|---:|
| PMOMax Marketplace SKU, non-infra/current run-rate may be zero | 159.38 | -159.38 | 0.00 | 0.00 | 0.00 |
| pmomax-auto GKE | 105.11 | -103.98 | 1.14 | 102.84 | 0.83 |
| stale cluster-1 GKE billing | 30.69 | -30.40 | 0.29 | 0.00 | 0.00 |
| Managed Prometheus / Monitoring | 27.64 | -26.97 | 0.67 | 29.26 | 0.67 |
| PMOMax GKE ingress load balancer | 17.90 | -17.45 | 0.45 | 17.57 | 0.44 |
| PMOMax Artifact Registry | 3.44 | -3.36 | 0.08 | 1.50 | 0.03 |
| Marketplace Service Control | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| PMOMax Cloud Run demo | 0.00 | -0.00 | 0.00 | 0.00 | 0.00 |
| PMOMax billing/marketplace datasets | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

Clear current PMOMax run-rate:

- Gross: `$151.17/month`
- Net after current credits: `$1.97/month`
- Future post-credit exposure: `$151.17/month`

Thirty-day gross including stale/non-current rows is higher, but those rows should not be treated as current run-rate:

- PMOMax Marketplace SKU has `$0.00` projected gross from the last 7 days.
- `cluster-1` GKE billing has `$0.00` projected gross from the last 7 days.

## PMOMax-Specific Savings Estimate

Primary PMOMax-specific opportunity:

- Remove `pmomax-auto` later after approval and confirmation.
- Savings from current run-rate:
  - GKE: about `$102.84/month`
  - Managed Prometheus/Monitoring: about `$29.26/month`
  - GKE ingress load balancer: about `$17.57/month`
  - Total: about `$149.67/month`

Expected residual PMOMax gross after removing the internal GKE stack while keeping Cloud Run and Marketplace assets:

- Artifact Registry: about `$1.50/month`
- BigQuery/Service Control/Cloud Run demo: near `$0/month`
- Total residual: about `$1.50/month`, subject to storage growth and traffic changes.

## Marketplace Compliance Risk Matrix

| Area | Risk | Recommendation |
|---|---|---|
| Artifact Registry release images | High | Keep. Do not delete release, deployer, UBB, chart, or current runtime artifacts. |
| Marketplace APIs and Service Control | High | Keep enabled. They are required for procurement/metering plumbing and cost zero while idle. |
| Public Cloud Run demo | High operational/product risk | Keep live. Optional changes only after review. |
| `MARKETPLACE_TEST_MODE=true` | Medium/high config risk | Human review. Do not change automatically. |
| `pmomax-auto` GKE cluster | Medium/high until confirmed | Candidate for deletion only after Google/Marketplace confirmation and export of needed validation manifests. |
| Fleet/Anthos | Medium | No Fleet memberships found. Do not unregister anything because nothing is registered. Review enabled APIs after cluster plan is approved. |
| Artifact cleanup | Medium/high | Possible but low savings. Exclude all release/current/Marketplace referenced images. |

## Human Approval Required

Human approval and preferably Google/Marketplace confirmation are required before:

- Deleting `pmomax-auto`
- Removing the GKE ingress/load balancer by deleting its owning resources
- Disabling Managed Prometheus or observability on the cluster
- Disabling Anthos/Fleet/GKE Enterprise-related APIs
- Changing `MARKETPLACE_TEST_MODE`
- Deleting any Artifact Registry images, even untagged images

## Final Recommended Order of Operations

1. Confirm with Google/Marketplace support that a Legacy Kubernetes App does not require publisher-owned `pmomax-auto` while idle.
2. Export and preserve current cluster manifests/configuration for future short-lived validation cluster recreation.
3. Confirm no active demo, validation, customer, or partner workflow depends on the GKE ingress IP `34.36.66.154`.
4. Approve deletion of `pmomax-auto` only if the above checks pass.
5. Verify GKE ingress load balancer and Managed Prometheus charges disappear after cluster removal.
6. Keep Cloud Run public demo, Marketplace APIs, BigQuery datasets, and Artifact Registry release artifacts active.
7. Review `MARKETPLACE_TEST_MODE=true` separately as a configuration risk, not as a cost cleanup action.

## Read-Only Commands Used

The audit used read-only commands only, including:

- `gcloud run services describe pmo-architect --region=us-east1 --project=katalyststreet-public --format=json`
- `gcloud container clusters describe pmomax-auto --region=us-central1 --project=katalyststreet-public --format=json`
- `gcloud container clusters list --project=katalyststreet-public --format=json`
- `gcloud container fleet memberships list --project=katalyststreet-public --format=json`
- `gcloud services list --project=katalyststreet-public --format='value(config.name)'`
- `gcloud artifacts repositories list --project=katalyststreet-public --format=json`
- `gcloud artifacts docker images list us-docker.pkg.dev/katalyststreet-public/pmomax --project=katalyststreet-public --include-tags --format=json`
- `gcloud artifacts docker images list us-east1-docker.pkg.dev/katalyststreet-public/apps --project=katalyststreet-public --include-tags --format=json`
- `gcloud compute forwarding-rules list --project=katalyststreet-public --format=json`
- `gcloud compute backend-services list --project=katalyststreet-public --format=json`
- `bq ls --project_id=katalyststreet-public --format=json`
- `bq query --use_legacy_sql=false --format=csv ...`

