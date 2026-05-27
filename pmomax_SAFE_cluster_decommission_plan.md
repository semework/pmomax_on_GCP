# PMOMax Safe Cluster Decommission Plan

Generated: 2026-05-22

## Safety Status

No destructive changes have been made. No cluster, Fleet, Anthos, Cloud Run, Artifact Registry, Marketplace API, endpoint, dataset, ingress, load balancer, or monitoring resource was modified.

This plan is approval-only. It preserves:

- Google Cloud Marketplace Kubernetes App (Legacy) deployability
- Artifact Registry release artifacts
- Marketplace APIs and billing/metering plumbing
- Marketplace deployer and UBB images
- Public Cloud Run runtime/demo: `https://pmo-architect-839982691485.us-east1.run.app/`

## Executive Decision

Google guidance appears technically consistent with the observed architecture: PMOMax customer installs should not require the publisher-owned `pmomax-auto` cluster because the must-keep install assets are Artifact Registry, Marketplace APIs, Service Control/Service Management, and release metadata/artifacts.

The `pmomax-auto` cluster is still active, but it appears to be an internal validation/runtime cluster:

- Cluster: `katalyststreet-public/us-central1/pmomax-auto`
- Mode: GKE Autopilot
- Current node count observed in export: `2`
- Enterprise config: `STANDARD`
- Fleet memberships: none returned
- Managed Prometheus: enabled
- Public GKE ingress IP: `34.36.66.154`
- PMOMax namespace: `pmomax`
- Active PMOMax pods: two `pmo-architect` pods
- App image in GKE: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:billingfix-auth-20260402`
- UBB agent image in GKE: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.1`

The public Cloud Run runtime is separate:

- Cloud Run service: `pmo-architect`
- Region: `us-east1`
- Image: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`
- Status: Ready
- `/health`: HTTP 200
- Cost: effectively `$0/month`

## Exported Rollback Evidence

Local export directory:

`pmomax_decommission_exports/`

Created exports:

- `gke_cluster_pmomax-auto.json`
- `gke_node_pools_pmomax-auto.json`  
  Note: empty because GKE returned `Autopilot node pools cannot be accessed or modified`; node pool metadata is present in the cluster describe export.
- `fleet_memberships.json`
- `compute_forwarding_rules.json`
- `compute_backend_services.json`
- `compute_health_checks.json`
- `compute_url_maps.json`
- `k8s_namespaces.yaml`
- `k8s_workloads.yaml`
- `k8s_services_ingress_endpoints.yaml`
- `k8s_configmaps.yaml`
- `k8s_secrets_metadata_only.txt`
- `k8s_rbac_serviceaccounts.yaml`
- `k8s_storage_pv_pvc.yaml`
- `k8s_api_resources.txt`
- `k8s_pods_wide.txt`
- `k8s_hpa.yaml`
- `k8s_endpoint_slices.yaml`
- `k8s_events_sorted.txt`
- `project_iam_policy_katalyststreet-public.json`
- `marketplace_endpoint_pmo-max.json`
- `bigquery_datasets_katalyststreet-public.json`
- `enabled_services_katalyststreet-public.json`
- `artifact_repositories_katalyststreet-public.json`
- `cloud_run_pmo-architect.json`

Secret values were not exported. Only secret metadata was exported, as requested.

Critical secret metadata found:

- `default/pmomax-license-998217`
- `pmomax/pmomax-license-998217`
- `pmomax/pmo-architect-reporting-secret`
- GKE Managed Prometheus secrets in `gke-gmp-system`

Before deleting the cluster, confirm `pmomax/pmo-architect-reporting-secret` and license values are recoverable from a secure source, or explicitly approve a separate secret-value export into a protected location.

## Must-Stay Resources

Do not delete or modify:

- Cloud Run service `katalyststreet-public/us-east1/pmo-architect`
- Cloud Run image `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`
- Public runtime URL `https://pmo-architect-839982691485.us-east1.run.app/`
- Artifact Registry repositories containing PMOMax releases
- `deployer:1.4.2`
- `ubbagent:1.4.2`
- `pmo-architect:1.4.2`
- `pmo-architect:1.4.2-marketplace`
- `pmo-architect:1.0.2`
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

## Dependency Findings

### Marketplace Installs

Observed must-keep dependencies are Artifact Registry images, Marketplace APIs, Service Control/Service Management, and the PMOMax endpoint. No evidence in Cloud Run, Artifact Registry, or API exports shows customer installs require `pmomax-auto` to remain online.

Risk: Marketplace support should still confirm there is no publisher-side live validation dependency before deletion.

### Cloud Run Runtime

Cloud Run does not depend on `pmomax-auto` in the exported service spec. It uses its own Cloud Run service account and image `pmo-architect:1.4.2`.

Risk: `MARKETPLACE_TEST_MODE=true` remains set, but this is unrelated to GKE deletion and should not be changed during this decommission.

### GKE Runtime

The GKE cluster runs a separate PMOMax workload:

- Namespace `pmomax`
- Deployment `pmo-architect`, replicas `2`
- Ingress `pmo-architect-ingress`
- Service `pmo-architect-svc`
- External IP `34.36.66.154`
- ConfigMap `pmo-architect-ubbagent-config`
- Secret metadata `pmo-architect-reporting-secret`

Deleting the cluster will remove this internal GKE runtime and its ingress endpoint. It should not affect the Cloud Run demo URL.

### Fleet / Anthos

Fleet memberships export is empty. Cluster enterprise config is `STANDARD`. No unregister step is currently required because no membership exists.

Anthos-related APIs are enabled, but current billing did not prove a PMOMax-specific Anthos/Fleet Enterprise charge. Disablement is optional and should be reviewed after GKE deletion; do not disable Marketplace APIs.

### Monitoring

Managed Prometheus is enabled and current cost is about `$29/month`. If the cluster is deleted, this cost should disappear with the cluster. If the cluster is retained temporarily, disabling Managed Prometheus is a separate approval action.

## Safe Decommission Order

Recommended order:

1. Confirm human approval scope in writing: delete `pmomax-auto` only, preserve Cloud Run, Artifact Registry, Marketplace APIs, endpoint, datasets.
2. Confirm with Google/Marketplace support that a persistent publisher-owned GKE cluster is not required for the Legacy Kubernetes App listing.
3. Confirm no external DNS, customer, partner, demo, or validation workflow depends on GKE ingress IP `34.36.66.154`.
4. Confirm secret values are recoverable from a secure source:
   - `pmomax/pmo-architect-reporting-secret`
   - `pmomax/pmomax-license-998217`
   - `default/pmomax-license-998217`
5. Preserve local exports in `pmomax_decommission_exports/`.
6. Run pre-delete validations:
   - Cloud Run `/health` returns HTTP 200.
   - Marketplace APIs still enabled.
   - Release images still present.
   - BigQuery datasets still present.
   - Fleet memberships still empty.
7. Delete `pmomax-auto` in one controlled action.
8. Do not manually delete GKE load balancer pieces unless they remain orphaned after cluster deletion.
9. Verify Cloud Run still works.
10. Verify Artifact Registry release images still exist.
11. Verify Marketplace APIs and endpoint still exist.
12. Verify GKE cluster no longer exists.
13. Verify GKE ingress/load balancer charges fall away in billing over the next billing windows.
14. Review Anthos/Fleet APIs after deletion. Disable only if Google confirms they are unnecessary and there are no non-PMOMax dependencies.

## Why Cluster Deletion Is Safer Than Piecemeal Ingress Deletion

The PMOMax ingress and load balancer are controlled by Kubernetes/GKE:

- Ingress `pmomax/pmo-architect-ingress`
- Forwarding rule `k8s2-fr-l7pwee7v-pmomax-pmo-architect-ingress-9g7kws0u`
- Backend service `k8s1-9e2459bd-pmomax-pmo-architect-svc-80-23160eb3`
- Health check `k8s1-9e2459bd-pmomax-pmo-architect-svc-80-23160eb3`
- URL map `k8s2-um-l7pwee7v-pmomax-pmo-architect-ingress-9g7kws0u`

Manually deleting these first can create inconsistent state while the cluster controller still exists. If deletion is approved, deleting the owning cluster is the cleaner primary action. Manual load balancer deletion should be reserved only for orphan cleanup after verification.

## Expected Savings

Current PMOMax-specific run-rate:

- `pmomax-auto` GKE Autopilot: about `$102/month`
- Managed Prometheus / Monitoring: about `$29/month`
- GKE ingress/load balancer: about `$17/month`
- Artifact Registry: about `$1.50/month`
- Cloud Run public runtime: effectively `$0/month`

Expected after approved GKE deletion:

- Remaining PMOMax gross: about `$1.50/month`, mostly Artifact Registry storage
- Remaining PMOMax net while credits apply: near `$0/month`
- Future post-credit exposure: about `$1.50/month`, subject to Artifact Registry growth and Cloud Run traffic

## Validation Checks After Each Step

Before deletion:

- Cloud Run health: `curl -I https://pmo-architect-839982691485.us-east1.run.app/health`
- Cloud Run service describe: `gcloud run services describe pmo-architect --region=us-east1 --project=katalyststreet-public`
- Release image list checks for deployer, UBB agent, and runtime images
- Marketplace API list check
- BigQuery dataset list check
- Fleet memberships list check

After deletion:

- Cloud Run health still returns HTTP 200.
- Artifact Registry images still list expected release tags.
- Marketplace APIs still list expected enabled services.
- Endpoint `pmo-max.endpoints.katalyststreet-public.cloud.goog` still describes successfully.
- BigQuery datasets still exist.
- `pmomax-auto` cluster no longer lists.
- GKE ingress forwarding rule should no longer list after cleanup completes.

## Rollback Plan

If the cluster deletion breaks an internal validation workflow:

1. Recreate a temporary validation cluster in `katalyststreet-public/us-central1`.
2. Reapply required namespaces, service accounts, RBAC, ConfigMaps, deployments, services, and ingress from `pmomax_decommission_exports/`.
3. Recreate secrets from secure source, not from the current metadata-only export.
4. Confirm release images are still available.
5. Recreate PMOMax deployment and UBB agent sidecar.
6. Recreate ingress only if the GKE validation endpoint is required.
7. Validate Service Control reporting only in approved test mode.

Recovery difficulty: medium-high, because GKE can be recreated but secret values and exact Marketplace validation flow must be available.

Estimated downtime risk:

- Cloud Run demo: low, because it is independent.
- Customer Marketplace installability: low if Google guidance is correct and Artifact Registry/APIs remain.
- Internal GKE validation endpoint: high; it will intentionally stop existing after cluster deletion.
- Marketplace future validation: medium; recreate a temporary cluster when needed.

## Final Recommendation

Proceed only after explicit human approval and confirmation that:

- No active workflow uses GKE ingress IP `34.36.66.154`.
- Required secret values are recoverable.
- Google/Marketplace support confirms no persistent publisher-owned cluster is required.

Then delete `pmomax-auto` as the primary decommission action. Keep Artifact Registry, Marketplace APIs, endpoint, BigQuery datasets, and Cloud Run unchanged.

