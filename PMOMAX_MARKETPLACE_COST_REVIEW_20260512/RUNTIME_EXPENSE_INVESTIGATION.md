# Runtime Expense Investigation

Executive summary: The specific URL `https://pmo-architect-839982691485.us-east1.run.app/` is a Cloud Run service named `pmo-architect` in project `katalyststreet-public`, region `us-east1`. Its measured GCP Cloud Run runtime cost in the billing export is negligible: April 2026 gross was about `$0.0067` before credits and May 1-12 gross was about `$0.0012`; net after credits was effectively `$0.00`. PMOMax's material runtime cost is instead the GKE Autopilot Marketplace deployment in `katalyststreet-public/us-central1`, plus runtime-adjacent Cloud Monitoring and Artifact Registry. PID Architect's material runtime-related line is not Cloud Run CPU/memory; it is the April 2026 `PMOMax / PMO-Max Pricing By Tokens Tokens Usage` charge of `$209.3615`, fully offset by credits in the billing export.

No resources were deleted, disabled, scaled, or mutated during this runtime-expense investigation.

## Scope

Investigated runtime expenses related to:

- PMOMax Marketplace runtime in `katalyststreet-public`.
- PID Architect / `pid-architect-ehlu1` runtime and demo services.
- Cloud Run URL `https://pmo-architect-839982691485.us-east1.run.app/`.

Billing source:

- BigQuery export table: `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`
- Date range queried: `2026-01-01` through `2026-05-12`

## Specific URL: Cloud Run Runtime

The URL `https://pmo-architect-839982691485.us-east1.run.app/` maps to:

| Field | Value |
|---|---|
| Project | `katalyststreet-public` |
| Project number / Cloud Run namespace | `839982691485` |
| Region | `us-east1` |
| Cloud Run service | `pmo-architect` |
| Created | `2026-02-14T22:51:34.951288Z` |
| Current image | `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2` |
| Current revision | `pmo-architect-00032-nn7` |
| Traffic | 100% to latest revision |
| CPU / memory limit | `1` CPU, `512Mi` memory |
| Max scale | template annotation `10`; service annotation `100` |
| Status URL | `https://pmo-architect-zxofcfyioq-ue.a.run.app` |
| Additional URL | `https://pmo-architect-839982691485.us-east1.run.app` |

Runtime health/log evidence:

- `GET /health` returned `200` with body `{"ok":true}` on `2026-05-12`.
- `HEAD /` returned `404`; this appears to be route behavior and not a service outage.
- Static assets under the same URL returned `200` or `304`.
- Logs showed instance startup around manual access on `2026-05-12`, which is normal Cloud Run autoscaling behavior.

Cost rows directly tied to the Cloud Run service region/project:

| Month | Project | Service | SKU | Region | Gross | Credits | Net | Classification |
|---|---|---|---|---|---:|---:|---:|---|
| 2026-04 | `katalyststreet-public` | Cloud Run | Services CPU (Request-based billing) | `us-east1` | `$0.0060` | `-$0.0059` | `$0.0001` | Specific URL / Cloud Run runtime |
| 2026-04 | `katalyststreet-public` | Cloud Run | Services Memory (Request-based billing) | `us-east1` | `$0.0002` | `-$0.0002` | `$0.0000` | Specific URL / Cloud Run runtime |
| 2026-04 | `katalyststreet-public` | Cloud Run | Network Internet Data Transfer Out Intercontinental | `us-east1` | `$0.0005` | `-$0.0005` | `$0.0000` | Specific URL / Cloud Run runtime |
| 2026-05 | `katalyststreet-public` | Cloud Run | Services CPU (Request-based billing) | `us-east1` | `$0.0012` | `-$0.0012` | `$0.0000` | Specific URL / Cloud Run runtime |

Conclusion for the specific URL: This Cloud Run service is active and reachable, but it is not a meaningful cost driver in the billing export. It should not be the focus of cost reduction unless the goal is to reduce resource inventory or remove testing/demo endpoints.

## PMOMax Runtime Costs

Active PMOMax Marketplace runtime is primarily GKE Autopilot, not the Cloud Run URL.

Current GKE runtime evidence:

| Resource | Evidence |
|---|---|
| Namespace | `pmomax` |
| Runtime deployment | `deployment.apps/pmo-architect`, `2/2` ready |
| Containers | `app`, `ubbagent` |
| App image | `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:billingfix-auth-20260402` |
| UBB image | `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.1` |
| Services | `pmo-architect`, `pmo-architect-svc`, `deployer-svc` |
| Ingress | `pmo-architect-ingress`, address `34.36.66.154` |
| Deployer | `deployment.apps/deployer`, scaled to `0/0` |

PMOMax runtime and runtime-adjacent billing rows:

| Month | Project | Service | SKU | Region | Gross | Credits | Net | Classification |
|---|---|---|---|---|---:|---:|---:|---|
| 2026-04 | `katalyststreet-public` | Kubernetes Engine | Autopilot Kubernetes Clusters | `us-central1` | `$67.8997` | `-$67.5549` | `$0.3448` | PMOMax GKE runtime |
| 2026-04 | `katalyststreet-public` | Kubernetes Engine | Zonal Kubernetes Clusters | `us-central1` | `$55.9479` | `-$55.6031` | `$0.3448` | PMOMax GKE runtime/control plane |
| 2026-04 | `katalyststreet-public` | Kubernetes Engine | Autopilot Pod mCPU Requests | `us-central1` | `$23.8911` | `-$23.4243` | `$0.4668` | PMOMax workload runtime |
| 2026-04 | `katalyststreet-public` | Kubernetes Engine | Autopilot Pod Memory Requests | `us-central1` | `$3.4495` | `-$3.3832` | `$0.0663` | PMOMax workload runtime |
| 2026-04 | `katalyststreet-public` | Kubernetes Engine | Autopilot SSD Pod Ephemeral Storage Requests | `us-central1` | `$0.4011` | `-$0.3937` | `$0.0073` | PMOMax workload runtime |
| 2026-04 | `katalyststreet-public` | Cloud Monitoring | Prometheus Samples Ingested | `us-central1` | `$25.7566` | `-$25.2456` | `$0.5110` | PMOMax runtime observability |
| 2026-04 | `katalyststreet-public` | Artifact Registry | Storage / egress SKUs | mixed | `$4.3160` | `-$4.2309` | `$0.0851` | Runtime image storage/pulls/build artifacts |
| 2026-05 | `katalyststreet-public` | Kubernetes Engine | Autopilot Kubernetes Clusters | `us-central1` | `$27.4521` | `-$27.4430` | `$0.0091` | PMOMax GKE runtime |
| 2026-05 | `katalyststreet-public` | Kubernetes Engine | Zonal Kubernetes Clusters | `us-central1` | `$9.0884` | `-$9.0793` | `$0.0091` | PMOMax GKE runtime/control plane |
| 2026-05 | `katalyststreet-public` | Kubernetes Engine | Autopilot Pod mCPU Requests | `us-central1` | `$11.0041` | `-$10.6539` | `$0.3502` | PMOMax workload runtime |
| 2026-05 | `katalyststreet-public` | Kubernetes Engine | Autopilot Pod Memory Requests | `us-central1` | `$1.6580` | `-$1.6052` | `$0.0528` | PMOMax workload runtime |
| 2026-05 | `katalyststreet-public` | Cloud Monitoring | Prometheus Samples Ingested | `us-central1` | `$10.0339` | `-$9.7184` | `$0.3155` | PMOMax runtime observability |
| 2026-05 | `katalyststreet-public` | Artifact Registry | Storage / egress SKUs | mixed | `$1.6513` | `-$1.5993` | `$0.0520` | Runtime image storage/pulls/build artifacts |

Conclusion for PMOMax: The largest runtime-related gross costs are GKE Autopilot and Cloud Monitoring. Net costs are small after credits in the export, but the GKE deployment is the actual Marketplace runtime surface and should be treated as required unless a deliberate shutdown or replacement plan is approved.

## PID Architect Runtime Costs

PID Architect has Cloud Run services, but Cloud Run CPU/memory costs are minimal. The material PID Architect line is Marketplace/token usage.

Current PID Architect Cloud Run services:

| Service | URL | Latest revision / notes |
|---|---|---|
| `chatagentfn` | `https://chatagentfn-qsd27bfl6q-uc.a.run.app` | `chatagentfn-00001-qan` |
| `extractpid` | `https://extractpid-qsd27bfl6q-uc.a.run.app` | `extractpid-00002-zoq` |
| `pdfexport` | `https://pdfexport-qsd27bfl6q-uc.a.run.app` | `pdfexport-00001-doz` |
| `pid-agent` | `https://pid-agent-qsd27bfl6q-uc.a.run.app` | `pid-agent-00001-5pq` |
| `pmomax` | `https://pmomax-qsd27bfl6q-uc.a.run.app` | `pmomax-00001-xnv` |
| `projectexport` | `https://projectexport-qsd27bfl6q-uc.a.run.app` | `projectexport-00001-xid` |
| `ssrkickplanr` | `https://ssrkickplanr-qsd27bfl6q-uc.a.run.app` | `ssrkickplanr-00002-baz` |
| `ssrpidarchitectehlu1` | `https://ssrpidarchitectehlu1-qsd27bfl6q-uc.a.run.app` | `ssrpidarchitectehlu1-00068-biw`; traffic percent was blank in list output |
| `ssrpmomax` | `https://ssrpmomax-qsd27bfl6q-uc.a.run.app` | `ssrpmomax-00002-bep` |
| `studio` | `https://studio-qsd27bfl6q-uc.a.run.app` | `studio-a-gihn5du8jhfm` |

PID Architect billing rows:

| Month | Project | Service | SKU | Region | Gross | Credits | Net | Classification |
|---|---|---|---|---|---:|---:|---:|---|
| 2026-04 | `pid-architect-ehlu1` | PMOMax | PMO-Max Pricing By Tokens Tokens Usage | | `$209.3615` | `-$209.3616` | `-$0.0001` | PID Architect demo/test token usage |
| 2026-04 | `pid-architect-ehlu1` | Cloud Run | Services CPU (Request-based billing) | `us-central1` | `$0.0275` | `-$0.0269` | `$0.0006` | PID Architect Cloud Run runtime |
| 2026-04 | `pid-architect-ehlu1` | Cloud Run | Services Memory (Request-based billing) | `us-central1` | `$0.0007` | `-$0.0007` | `$0.0000` | PID Architect Cloud Run runtime |
| 2026-04 | `pid-architect-ehlu1` | Artifact Registry | Artifact Registry Storage | `us-central1` | `$0.0377` | `-$0.0372` | `$0.0005` | PID Architect image storage |
| 2026-04 | `pid-architect-ehlu1` | Secret Manager | Secret version replica storage | `us-central1` | `$0.0421` | `-$0.0416` | `$0.0006` | Runtime configuration |
| 2026-04 | `pid-architect-ehlu1` | Cloud Storage | Standard Storage US Multi-region | | `$0.0031` | `-$0.0030` | `$0.0001` | Runtime/demo storage |
| 2026-04 | `pid-architect-ehlu1` | Security Command Center | Org-level SCC Premium for Cloud Run CPU Time | `us-central1` | `$0.0013` | `-$0.0013` | `$0.0000` | Shared/security overhead |
| 2026-05 | `pid-architect-ehlu1` | Cloud Run | Services CPU (Request-based billing) | `us-central1` | `$0.0089` | `-$0.0086` | `$0.0003` | PID Architect Cloud Run runtime |
| 2026-05 | `pid-architect-ehlu1` | Cloud Run | Services Memory (Request-based billing) | `us-central1` | `$0.0002` | `-$0.0002` | `$0.0000` | PID Architect Cloud Run runtime |
| 2026-05 | `pid-architect-ehlu1` | Artifact Registry | Artifact Registry Storage | `us-central1` | `$0.0111` | `-$0.0108` | `$0.0004` | PID Architect image storage |
| 2026-05 | `pid-architect-ehlu1` | Secret Manager | Secret version replica storage | `us-central1` | `$0.0017` | `-$0.0017` | `$0.0000` | Runtime configuration |

Conclusion for PID Architect: Running Cloud Run services are present, but they are not the cost problem. The notable runtime-related expense is PMOMax token usage charged to `pid-architect-ehlu1` in April 2026. The export shows it was fully credited, but it should still be documented as Marketplace/demo/testing usage rather than normal PMOMax production runtime.

## Cost Drivers By Priority

| Priority | Cost driver | Evidence | Action recommendation |
|---:|---|---|---|
| 1 | PMOMax GKE Autopilot runtime | April gross GKE rows total over `$151`; May-to-date gross over `$49` | Keep if Marketplace runtime is needed. Review replicas and unused services only with Marketplace rollback plan. |
| 2 | Cloud Monitoring / Prometheus | April gross `$25.7566`; May-to-date gross `$10.0339` | Review whether managed Prometheus collection is required for Marketplace runtime. This is likely the best observability cost-optimization candidate. |
| 3 | PID Architect PMOMax token usage | April gross `$209.3615`, credited to net about `$0` | Document as demo/testing/Marketplace token usage. Ask Google to confirm credit behavior and whether future testing charges can be avoided/replaced. |
| 4 | Artifact Registry | PMOMax April gross `$4.3160`; May-to-date gross `$1.6513` | Clean old images only after confirming rollback/release needs. Not urgent for cost. |
| 5 | Specific Cloud Run URL | April gross about `$0.0067`; May-to-date gross `$0.0012` | Not a material savings target. Keep or remove based on product/demo need, not cost. |
| 6 | PID Architect Cloud Run services | April gross CPU/memory about `$0.0282`; May-to-date about `$0.0091` | Not material for cost. Review only for inventory/security cleanliness. |

## Answers To The Runtime Question

1. Is `https://pmo-architect-839982691485.us-east1.run.app/` causing the bill?

   No. Billing export rows for Cloud Run in `katalyststreet-public/us-east1` are fractions of a cent net after credits.

2. What is the main PMOMax runtime expense?

   GKE Autopilot in `katalyststreet-public/us-central1`, specifically cluster/control-plane and pod CPU/memory request SKUs. Cloud Monitoring Prometheus ingestion is the largest runtime-adjacent line after GKE.

3. What is the main PID Architect runtime-related expense?

   The April `PMOMax / PMO-Max Pricing By Tokens Tokens Usage` line of `$209.3615` gross, credited to net about `$0.00`. PID Architect Cloud Run itself is not material.

4. What can be considered for cost cleanup?

   - Review Cloud Monitoring / Prometheus ingestion for PMOMax.
   - Review whether the GKE deployment needs two replicas for the current Marketplace state.
   - Review old Artifact Registry images after preserving rollback image digests.
   - Review whether PID Architect demo Cloud Run services are still needed, but savings will be minimal.

5. What should not be treated as the cost issue?

   The specific `pmo-architect-839982691485.us-east1.run.app` Cloud Run URL should not be treated as the main bill driver based on the billing export.

## Commands Used

```bash
bq query --project_id=katalyststreet-public --use_legacy_sql=false --format=csv '... runtime service aggregation ...'
gcloud run services describe pmo-architect --project=katalyststreet-public --region=us-east1 --format=json
gcloud run services list --project=pid-architect-ehlu1 --format=table(...)
gcloud run services list --project=katalyststreet-public --format=table(...)
kubectl -n pmomax get deploy,svc,ingress,pods -o wide
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="pmo-architect" AND resource.labels.project_id="katalyststreet-public"' --project=katalyststreet-public --freshness=14d --limit=20 --format=table(...)
```

## Evidence Gaps

- GKE billing export rows do not attribute cost down to Kubernetes namespace/workload in the current query output. The attribution to PMOMax is based on active cluster/workload inventory and the project/region match.
- `kubectl top pods` did not return metrics in this environment, so current per-pod CPU/memory usage could not be used to estimate right-sizing.
- The billing export rows available here show detailed March-May data; earlier Jan-Feb spreadsheet totals exist in the workbook but are not fully represented in the detailed query output used for this focused report.
