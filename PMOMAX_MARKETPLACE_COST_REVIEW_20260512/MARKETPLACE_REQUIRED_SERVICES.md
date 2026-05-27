# Marketplace Required Services

## Executive Summary

PMOMax Marketplace operation requires GKE, Artifact Registry, Service Control / Service Management for UBB metering, Cloud Logging, Cloud Billing export/reporting, and the runtime secrets/config used by UBB. Cloud Run is active for hosted/demo/testing and UBB evidence, but the Kubernetes Marketplace listing itself runs in GKE. Anthos/GKE Enterprise APIs are enabled, but no active fleet membership or manifest dependency was found.

## Required To Keep

| Service/API/resource | Required? | Evidence |
|---|---|---|
| Kubernetes Engine / `container.googleapis.com` | Yes | Active cluster `pmomax-auto`; active `pmomax/pmo-architect` deployment |
| Artifact Registry / `artifactregistry.googleapis.com` | Yes | Deployer, UBB agent, and app images stored in Artifact Registry |
| Service Control / `servicecontrol.googleapis.com` | Yes | UBB reporting endpoint used by app and UBB agent |
| Service Management / PMOMax endpoint service | Yes | Enabled service `pmo-max.endpoints.katalyststreet-public.cloud.goog` |
| Cloud Commerce Producer/Procurement APIs | Yes for Marketplace publisher/listing workflows | Enabled APIs include `cloudcommerceproducer`, `cloudcommerceprocurement`, `cloudcommerceconsumerprocurement` |
| Cloud Logging / `logging.googleapis.com` | Yes | Runtime logs, UBB evidence, Marketplace validation/debug |
| Cloud Monitoring / `monitoring.googleapis.com` | Recommended/operational | GKE managed Prometheus active; can optimize but should not remove blindly |
| Secret Manager / Kubernetes secrets | Yes if used by runtime | Kubernetes `pmo-architect-reporting-secret` required by UBB; GCP Secret Manager has `my-google-api-key` uncertain |
| BigQuery billing export | Yes for evidence/FinOps | `pmomaxbilling` and `marketplace_report` datasets exist |
| Cloud Build | Required for builds, not steady runtime | Used for vulnerability patched image builds; can be idle between releases |
| On-Demand Scanning / Container Analysis | Required for vulnerability remediation evidence | Used for CVE scan and Marketplace security workflow |

## Runtime / Release Image Contract

From `deploy/schema.yaml` and `README.md`:

| Item | Expected release value |
|---|---|
| `publishedVersion` | `1.4.2` |
| `publishedVersionMetadata.releaseNote` | `Improved Create Agent, governance, AI audit logging, and mitigated CVE-2026-39892 (v1.4.2), YouTube link added.` |
| `deployer.image` | `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.2` |
| `deployer alias` | `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4` |
| `ubbagentImageTag` | `1.4.2` |
| `PMOMAX_APP_IMAGE` | `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2` |

Security patch report evidence:

| Image | Digest recorded |
|---|---|
| Deployer `1.4.2` / `1.4` | `sha256:12a649ff0f38b69b6410cf0ebc74d706016359d86b7ec20f7d43a7356484a4a7` |
| UBB agent `1.4.2` / `1.4` | `sha256:affb58eaa7a1e21c67b48aa97a73cac1ea53e33e0d57243a981ccf5fb47d2715` |
| Runtime app `1.0.2` | `sha256:c81ce8d1c4f8bef48fa431727d464632e197734ead2f186d6ef8090978c6de8b` |

Current live GKE is not yet on those exact release defaults:

| Live GKE component | Observed value |
|---|---|
| App image | `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:billingfix-auth-20260402` |
| App digest | `sha256:c4776926c192d9dfba013e6eaa7768a99ff1377ab642731d0560ec4d5a0e89cf` |
| UBB agent | `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.1` |
| Application CR version | `1.4.1` |

## UBB / Metering Verification

Observed UBB evidence:

| Evidence file/source | Result |
|---|---|
| `final_ubb_logs.json` | POST to `/api/marketplace/usage/report` returned `200`; response had `flushed.ok=true`, `sent=1` |
| `sustained_ubb_6hr_logs.json` | Repeated `ServiceControlEndpoint:Send()` entries for `pmo-max.endpoints.katalyststreet-public.cloud.goog/M1` |
| Live GKE pod env | `AGENT_SERVICE_NAME=services/pmo-max.endpoints.katalyststreet-public.cloud.goog` |
| Live GKE app env | `MARKETPLACE_ENABLED=true`, `MARKETPLACE_SERVICE_NAME=pmomax.endpoints.katalyststreet-public.cloud.goog` |

Recommended verification before any shutdown/change:

```bash
kubectl -n pmomax get deploy,pods,svc,ingress,app
kubectl -n pmomax describe pod -l app=pmo-architect
gcloud run services describe pmo-architect --project=katalyststreet-public --region=us-east1
```

Then perform one controlled usage report and confirm Service Control success in Cloud Logging.

## Marketplace Package Compatibility

| Area | Finding |
|---|---|
| `schema.yaml` / `deploy/schema.yaml` | v2 schema, required `APP_INSTANCE_NAME`, `NAMESPACE`, `reportingSecret`; deployer and UBB image fields present |
| `manifest/app.yaml` and `deploy/manifest/app.yaml` | Deployment and Service templates with two app replicas |
| `manifest/application.yaml.template` | Application CR version `1.4.2`, Marketplace deploy info, owner reference behavior |
| Owner references | Live deployment has `ownerReferences` to `Application/pmo-architect`; `Application` spec uses `addOwnerRef: true` |
| `mpdev` verifier | `verify_marketplace_local.sh` runs `mpdev verify --deployer=<image>`; requires `mpdev` installed |
| Cleanup behavior | Deployer service account has permissions for pods, services, configmaps, secrets, deployments, RBAC, Applications, ingresses, networkpolicies, jobs |

## Services Likely Not Required For Marketplace Runtime

| Service/API/resource | Why likely not required | Caveat |
|---|---|---|
| Anthos Config Management | API enabled but no manifest/fleet dependency found | Confirm no fleet feature before disabling |
| Anthos Policy Controller | API enabled but no policy controller workload found | Confirm org/project policy needs |
| GKE Hub / Connect | API enabled; no fleet memberships returned | Confirm Marketplace tooling does not require it |
| Service Mesh / ASM | No obvious mesh namespace or manifest dependency | Confirm with full fleet features list |
| Vertex AI Veo / Text-to-Speech | Media/demo generation, not runtime | Listing videos/assets may have been produced by these services |
| App Engine CRMint services | Not PMOMax-named; likely legacy | Confirm no hidden PMOMax dependency |
