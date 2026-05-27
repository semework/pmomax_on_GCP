# Resource Inventory

## Executive Summary

Read-only inventory found one active PMOMax GKE Autopilot cluster in `katalyststreet-public`: `pmomax-auto` in `us-central1`. The live Marketplace Kubernetes runtime is namespace `pmomax`, deployment `pmo-architect`, two replicas, with an `app` container and `ubbagent` sidecar. The `pid-architect-ehlu1` project has no GKE clusters, but has multiple Cloud Run / Cloud Functions / Firebase services used for PID Architect demo/runtime. No cloud resource was deleted or modified.

## Scope And Commands

Primary projects checked:

| Project | Purpose observed |
|---|---|
| `katalyststreet-public` | PMOMax Marketplace producer/runtime project, GKE, Artifact Registry, Cloud Run demo/test, billing export |
| `pid-architect-ehlu1` | PID Architect demo/runtime project, Cloud Run / Cloud Functions / Firebase services |

Key read-only commands used:

```bash
gcloud projects list
gcloud container clusters list --project=katalyststreet-public
gcloud container clusters list --project=pid-architect-ehlu1
gcloud run services list --project=katalyststreet-public --platform=managed
gcloud run services list --project=pid-architect-ehlu1 --platform=managed
kubectl get namespaces
kubectl get all -A -o wide
kubectl -n pmomax get deploy pmo-architect -o yaml
kubectl -n pmomax describe pod -l app=pmo-architect
gcloud artifacts repositories list --project=katalyststreet-public --location=all
gcloud storage buckets list --project=katalyststreet-public
gcloud secrets list --project=katalyststreet-public
gcloud logging sinks list --project=katalyststreet-public
bq ls --project_id=katalyststreet-public
```

## GKE

| Project | Cluster | Location | Mode | Status | Finding |
|---|---|---:|---|---|---|
| `katalyststreet-public` | `pmomax-auto` | `us-central1` | Autopilot | Running | Active PMOMax Marketplace cluster |
| `pid-architect-ehlu1` | none found | n/a | n/a | n/a | No GKE cluster listed |

Observed Kubernetes namespaces in `pmomax-auto`:

| Namespace | Purpose |
|---|---|
| `pmomax` | Active PMOMax Marketplace runtime |
| `application-system` | Marketplace app manager; pod observed in `ImagePullBackOff` |
| `forensic-1773343635` | Old forensic/test namespace; failed deployer job, age about 60d |
| `forensic-1773343876-ca` | Old forensic/test namespace; completed deployer job, age about 60d |
| `gke-gmp-system`, `gmp-public` | Google managed Prometheus/monitoring |
| `gke-managed-*`, `kube-system`, `kube-public`, `kube-node-lease`, `default` | GKE system namespaces |

Active PMOMax workload:

| Namespace | Resource | Replicas | Containers | Images | Purpose |
|---|---|---:|---|---|---|
| `pmomax` | `deployment/pmo-architect` | 2 ready | `app`, `ubbagent` | `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:billingfix-auth-20260402`; `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.1` | Active Marketplace runtime plus UBB/metering sidecar |

Other PMOMax Kubernetes resources:

| Resource | Finding |
|---|---|
| `application.app.k8s.io/pmo-architect` | Ready `3/3`; annotated `marketplace.cloud.google.com/deploy-info` with partner `katalyststreet`, product `pmomax`; version observed `1.4.1` |
| `service/pmo-architect`, `service/pmo-architect-svc` | Ready service components for app |
| `ingress/pmo-architect-ingress` | External address `34.36.66.154`, port 80 |
| `secret/pmo-architect-reporting-secret` | Required for UBB reporting; do not remove |
| `configmap/pmo-architect-ubbagent-config` | Required by UBB sidecar |
| Old `deployer-*` ReplicaSets | Zero replicas; historical deployment artifacts |
| Forensic deployer jobs | Old failed/completed jobs in forensic namespaces; likely testing-only, verify before cleanup |

## Cloud Run

`katalyststreet-public`:

| Service | Region | Image | Notes |
|---|---|---|---|
| `pmo-architect` | `us-east1` | `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2` | Ready; `MARKETPLACE_ENABLED=true`; `MARKETPLACE_TEST_MODE=true`; Service Control endpoint configured |

`pid-architect-ehlu1` Cloud Run services observed:

| Service | Region | Management evidence | Classification |
|---|---|---|---|
| `chatagentfn` | `us-central1` | Cloud Functions v2 / Firebase-managed | PID Architect demo/runtime |
| `extractpid` | `us-central1` | Cloud Functions v2 / Firebase-managed | PID Architect demo/runtime |
| `pdfexport` | `us-central1` | Cloud Functions v2 / Firebase-managed | PID Architect demo/runtime |
| `pid-agent` | `us-central1` | Cloud Run listed | PID Architect demo/runtime; verify current traffic before disabling |
| `pmomax` | `us-central1` | Cloud Run listed | Uncertain; verify if legacy PMOMax demo |
| `projectexport` | `us-central1` | Cloud Run listed | PID Architect demo/runtime |
| `ssrkickplanr` | `us-central1` | Cloud Run listed | Uncertain / likely legacy demo |
| `ssrpidarchitectehlu1` | `us-central1` | Firebase/App Hosting; many historical tagged revisions | PID Architect hosted demo |
| `ssrpmomax` | `us-central1` | Cloud Functions/Firebase-managed | PMOMax demo/runtime; verify before disabling |
| `studio` | `us-central1` | Firebase App Hosting | Demo/dev surface |

## Artifact Registry

`katalyststreet-public` repositories:

| Repository | Location | Size observed | Notes |
|---|---:|---:|---|
| `apps` | `us` | 751.499 MB | Multi-region app images |
| `pmomax` | `us` | 1867.255 MB | Marketplace deployer and UBB images; includes patched `1.4.2` |
| `apps` | `us-east1` | 26672.122 MB | Large historical PMOMax app image repository; likely cleanup opportunity after retaining active/release digests |
| `pmomax` | `us-east1` | 1206.914 MB | Older PMOMax Docker images |
| `gcr.io`, `us.gcr.io` | multi | 706.503 MB combined | Legacy registry-backed repos |

Important images:

| Image | Digest / tag evidence | Status |
|---|---|---|
| `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.2` | tag exists; security report records digest `sha256:e88f97af...` | Patched deployer ready |
| `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.2` | tag exists; security report records digest `sha256:ba544d...` | Patched UBB agent ready |
| `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2` | tag exists; security report records digest `sha256:c81ce8...` | Runtime image for release package |
| Live GKE app image | `billingfix-auth-20260402`, digest `sha256:c47769...` | Current cluster runtime, not same as release defaults |
| Live Cloud Run app image | `1.4.2` | Hosted runtime/test surface |

## Storage, Secrets, Logging, Billing

Cloud Storage buckets in `katalyststreet-public` include Cloud Build, App Engine/Firebase, AI Platform, and video/media buckets:

| Bucket | Classification |
|---|---|
| `katalyststreet-public_cloudbuild` | Required while building/deploying; can lifecycle old sources |
| `katalyststreet-public.appspot.com`, `staging.katalyststreet-public.appspot.com` | App Engine/Firebase/legacy; verify before disabling |
| `pmmaxvideo`, `pmomax-public-video-assets`, `pmomax-video-assets-bucket` | Media/demo assets; not required for Marketplace runtime unless listing/media depends on them |
| `cloud-ai-platform-*` | AI Platform generated buckets; likely AI/media/test related; verify contents |
| `bigqueryscv`, `katalystststreet-public`, `deltamax_v1`, `839982691485-us-central1-blueprint-config` | Uncertain; inspect ownership before cleanup |

Secret Manager:

| Project | Secret | Finding |
|---|---|---|
| `katalyststreet-public` | `my-google-api-key` | Only Secret Manager secret listed; purpose uncertain from name alone |

Logging:

| Sink | Finding |
|---|---|
| `_Required` | Default required audit sink |
| `_Default` | Default operational log sink |

Billing exports:

| Dataset/table | Finding |
|---|---|
| `pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C` | Detailed billing export available; data observed primarily March/April 2026 |
| `marketplace_report.*` | Marketplace report tables present: `detailed_disbursement`, `incremental_insights`, `incremental_monthly_insights` |

## Marketplace / UBB Evidence

The repo and runtime show UBB/metering is configured:

| Evidence | Finding |
|---|---|
| `final_ubb_logs.json` | Cloud Run report request returned HTTP 200, `flushed.ok=true`, `flushed.sent=1` |
| `sustained_ubb_6hr_logs.json` | Multiple `ServiceControlEndpoint:Send()` entries for `pmo-max.endpoints.katalyststreet-public.cloud.goog/M1` |
| Live GKE deployment | `ubbagent` sidecar runs with `AGENT_SERVICE_NAME=services/pmo-max.endpoints.katalyststreet-public.cloud.goog` |

## Uncertain Items Requiring Follow-Up

| Item | Why uncertain | Needed evidence |
|---|---|---|
| App Engine services `crmint-controller`, `crmint-jobs`, `default` | App Engine costs appear in Jan-Apr workbook, but names do not identify PMOMax | App Engine versions, traffic, source labels, owners |
| Terminated Compute Engine instances in `katalyststreet-public` | Instances exist but are terminated; Jan-Apr Compute costs may include historical use, disks, images, or GKE-related resources | Disk/image list, labels, exact resource-level billing |
| PID Architect Cloud Run services | Active and ready, but current business need varies by service | Traffic metrics and owner decision |
| Media buckets / Veo costs | Likely PMOMax marketing/demo generation, not production runtime | Asset lineage and invoice tie-out |

