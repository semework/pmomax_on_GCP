# DO NOT RUN WITHOUT HUMAN APPROVAL.
# ALL COMMANDS ARE COMMENTED OUT.
# PMOMAX-ONLY.
# REVIEW WITH GOOGLE/MARKETPLACE SUPPORT BEFORE RUNNING GKE OR ANTHOS CHANGES.

# This script is intentionally non-executable by default.
# It was generated for review only. No commands in this file were executed.

###############################################################################
# 1. Delete internal PMOMax validation/runtime GKE cluster after confirmation.
###############################################################################

# gcloud container clusters delete pmomax-auto --region=us-central1 --project=katalyststreet-public

###############################################################################
# 2. PMOMax GKE ingress/load balancer cleanup.
# Prefer deleting the owning GKE cluster/workloads. Manual LB deletion is listed
# only for review and should not be used unless Kubernetes ownership is gone.
###############################################################################

# gcloud compute forwarding-rules delete k8s2-fr-l7pwee7v-pmomax-pmo-architect-ingress-9g7kws0u --global --project=katalyststreet-public
# gcloud compute backend-services delete k8s1-9e2459bd-pmomax-pmo-architect-svc-80-23160eb3 --global --project=katalyststreet-public
# gcloud compute backend-services delete k8s1-9e2459bd-kube-system-default-http-backend-80-297ea027 --global --project=katalyststreet-public

###############################################################################
# 3. Disable Managed Prometheus only if pmomax-auto is retained temporarily.
###############################################################################

# gcloud container clusters update pmomax-auto --region=us-central1 --project=katalyststreet-public --disable-managed-prometheus

###############################################################################
# 4. Disable Anthos/Fleet-related APIs only after Google/Marketplace confirmation.
# Current read-only evidence found no Fleet memberships.
###############################################################################

# gcloud services disable gkehub.googleapis.com --project=katalyststreet-public
# gcloud services disable gkeconnect.googleapis.com --project=katalyststreet-public
# gcloud services disable anthosconfigmanagement.googleapis.com --project=katalyststreet-public
# gcloud services disable anthospolicycontroller.googleapis.com --project=katalyststreet-public
# gcloud services disable multiclustermetering.googleapis.com --project=katalyststreet-public

###############################################################################
# 5. Review Cloud Run MARKETPLACE_TEST_MODE only after metering validation.
# This is not a cost-saving action.
###############################################################################

# gcloud run services update pmo-architect --region=us-east1 --project=katalyststreet-public --update-env-vars=MARKETPLACE_TEST_MODE=false

###############################################################################
# 6. Artifact Registry cleanup placeholders.
# Do not delete release images, deployer images, UBB images, current Cloud Run
# images, Marketplace images, Helm/chart/release artifacts, or anything used by
# customer install flows.
###############################################################################

# gcloud artifacts docker images delete IMAGE_DIGEST --project=katalyststreet-public --quiet
