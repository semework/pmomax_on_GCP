# DO NOT RUN WITHOUT EXPLICIT HUMAN APPROVAL.
# THIS IS A PMOMAX-ONLY CONTROLLED DECOMMISSION SCRIPT.
# DESTRUCTIVE OR MODIFYING COMMANDS ARE COMMENTED OUT.
# REVIEW WITH GOOGLE/MARKETPLACE SUPPORT BEFORE RUNNING GKE OR ANTHOS CHANGES.
# PRESERVE CLOUD RUN, ARTIFACT REGISTRY, MARKETPLACE APIS, SERVICE CONTROL, BILLING DATASETS, AND RELEASE ARTIFACTS.

###############################################################################
# Phase 1: Read-only prechecks.
###############################################################################

# gcloud run services describe pmo-architect --region=us-east1 --project=katalyststreet-public
# curl -I https://pmo-architect-839982691485.us-east1.run.app/health
# gcloud artifacts docker images list us-docker.pkg.dev/katalyststreet-public/pmomax --project=katalyststreet-public --include-tags
# gcloud artifacts docker images list us-east1-docker.pkg.dev/katalyststreet-public/apps --project=katalyststreet-public --include-tags
# gcloud services list --project=katalyststreet-public
# gcloud endpoints services describe pmo-max.endpoints.katalyststreet-public.cloud.goog --project=katalyststreet-public
# bq ls --project_id=katalyststreet-public
# gcloud container clusters describe pmomax-auto --region=us-central1 --project=katalyststreet-public
# gcloud container fleet memberships list --project=katalyststreet-public
# kubectl get pods -A -o wide
# kubectl get ingress,services -n pmomax

###############################################################################
# Phase 2: Backup/export refresh.
# These are read-only exports. Run again immediately before approved deletion.
###############################################################################

# mkdir -p pmomax_decommission_exports
# gcloud container clusters describe pmomax-auto --region=us-central1 --project=katalyststreet-public --format=json > pmomax_decommission_exports/gke_cluster_pmomax-auto.json
# gcloud container fleet memberships list --project=katalyststreet-public --format=json > pmomax_decommission_exports/fleet_memberships.json
# gcloud compute forwarding-rules list --project=katalyststreet-public --format=json > pmomax_decommission_exports/compute_forwarding_rules.json
# gcloud compute backend-services list --project=katalyststreet-public --format=json > pmomax_decommission_exports/compute_backend_services.json
# gcloud compute health-checks list --project=katalyststreet-public --format=json > pmomax_decommission_exports/compute_health_checks.json
# gcloud compute url-maps list --project=katalyststreet-public --format=json > pmomax_decommission_exports/compute_url_maps.json
# kubectl get namespaces -o yaml > pmomax_decommission_exports/k8s_namespaces.yaml
# kubectl get deployments,daemonsets,statefulsets,replicasets,jobs,cronjobs -A -o yaml > pmomax_decommission_exports/k8s_workloads.yaml
# kubectl get services,ingress,endpoints -A -o yaml > pmomax_decommission_exports/k8s_services_ingress_endpoints.yaml
# kubectl get configmaps -A -o yaml > pmomax_decommission_exports/k8s_configmaps.yaml
# kubectl get secrets -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.type,CREATED:.metadata.creationTimestamp > pmomax_decommission_exports/k8s_secrets_metadata_only.txt
# kubectl get serviceaccounts,roles,rolebindings,clusterroles,clusterrolebindings -A -o yaml > pmomax_decommission_exports/k8s_rbac_serviceaccounts.yaml
# kubectl get persistentvolumes,persistentvolumeclaims -A -o yaml > pmomax_decommission_exports/k8s_storage_pv_pvc.yaml
# kubectl get pods -A -o wide > pmomax_decommission_exports/k8s_pods_wide.txt
# gcloud projects get-iam-policy katalyststreet-public --format=json > pmomax_decommission_exports/project_iam_policy_katalyststreet-public.json

###############################################################################
# Phase 3: Human gates before destructive work.
###############################################################################

# Required approval checklist:
# [ ] Google/Marketplace confirms persistent publisher-owned GKE is not required.
# [ ] No DNS, customer, partner, demo, or validation workflow uses 34.36.66.154.
# [ ] Secret values are recoverable from secure source:
#     - pmomax/pmo-architect-reporting-secret
#     - pmomax/pmomax-license-998217
#     - default/pmomax-license-998217
# [ ] Cloud Run /health returns HTTP 200.
# [ ] Artifact Registry release images are present.
# [ ] Marketplace APIs and endpoint are present.
# [ ] BigQuery datasets are present.

###############################################################################
# Phase 4: Optional monitoring-only change if cluster is retained.
# Skip this if deleting the cluster. This modifies cluster config.
###############################################################################

# gcloud container clusters update pmomax-auto --region=us-central1 --project=katalyststreet-public --disable-managed-prometheus

###############################################################################
# Phase 5: Primary approved decommission action.
# This is destructive. Do not run without explicit approval.
###############################################################################

# gcloud container clusters delete pmomax-auto --region=us-central1 --project=katalyststreet-public

###############################################################################
# Phase 6: Post-delete validation.
###############################################################################

# curl -I https://pmo-architect-839982691485.us-east1.run.app/health
# gcloud run services describe pmo-architect --region=us-east1 --project=katalyststreet-public
# gcloud artifacts docker images list us-docker.pkg.dev/katalyststreet-public/pmomax --project=katalyststreet-public --include-tags
# gcloud artifacts docker images list us-east1-docker.pkg.dev/katalyststreet-public/apps --project=katalyststreet-public --include-tags
# gcloud services list --project=katalyststreet-public
# gcloud endpoints services describe pmo-max.endpoints.katalyststreet-public.cloud.goog --project=katalyststreet-public
# bq ls --project_id=katalyststreet-public
# gcloud container clusters list --project=katalyststreet-public
# gcloud compute forwarding-rules list --project=katalyststreet-public

###############################################################################
# Phase 7: Orphan cleanup only if GKE deletion leaves resources behind.
# Prefer not to run these unless support confirms they are orphaned.
###############################################################################

# gcloud compute forwarding-rules delete k8s2-fr-l7pwee7v-pmomax-pmo-architect-ingress-9g7kws0u --global --project=katalyststreet-public
# gcloud compute backend-services delete k8s1-9e2459bd-pmomax-pmo-architect-svc-80-23160eb3 --global --project=katalyststreet-public
# gcloud compute backend-services delete k8s1-9e2459bd-kube-system-default-http-backend-80-297ea027 --global --project=katalyststreet-public

###############################################################################
# Phase 8: Fleet/Anthos review.
# Current export found no Fleet memberships. Do not disable Marketplace APIs.
###############################################################################

# gcloud container fleet memberships list --project=katalyststreet-public
# gcloud services disable gkehub.googleapis.com --project=katalyststreet-public
# gcloud services disable gkeconnect.googleapis.com --project=katalyststreet-public
# gcloud services disable anthosconfigmanagement.googleapis.com --project=katalyststreet-public
# gcloud services disable anthospolicycontroller.googleapis.com --project=katalyststreet-public
# gcloud services disable multiclustermetering.googleapis.com --project=katalyststreet-public

###############################################################################
# Rollback hints.
###############################################################################

# Recreate a temporary validation cluster only if needed.
# Reapply exported Kubernetes specs selectively from pmomax_decommission_exports/.
# Recreate secret values from a secure source; they are not included in the metadata-only export.
# Verify Cloud Run and Marketplace assets before and after any rollback.

