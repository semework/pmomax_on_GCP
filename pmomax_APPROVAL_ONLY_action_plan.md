# PMOMax Approval-Only Action Plan

DO NOT RUN UNTIL HUMAN APPROVES.

This file is a future action plan only. No cloud changes were made while creating it.

## 1. Delete Internal PMOMax GKE Cluster Later

- Approval checkbox: `[ ]`
- Action: delete the internal `pmomax-auto` GKE Autopilot cluster if confirmed to be only a publisher-owned validation/runtime/test cluster.
- Exact resource: `katalyststreet-public/us-central1/pmomax-auto`
- Estimated savings: about `$102.84/month` GKE gross, plus related Managed Prometheus and load balancer savings below.
- Why safe: Google guidance says customer installs run in customer GKE environments for a Legacy Kubernetes App; publisher-owned GKE is not required if it is only internal validation.
- Why it may not be safe: could be used for internal validation, future Marketplace re-validation, or an internal demo path not visible from Cloud Run.
- Marketplace risk: medium-high until Google/Marketplace support confirms no idle publisher cluster requirement.
- Rollback/recreate plan: preserve manifests, Helm values, Marketplace deployer version, image tags, namespace resources, ingress config, and validation notes before deletion; recreate as a temporary validation cluster for future Marketplace updates.
- Exact proposed command:

```sh
# gcloud container clusters delete pmomax-auto --region=us-central1 --project=katalyststreet-public
```

## 2. Remove PMOMax GKE Ingress/Load Balancer With Cluster Cleanup

- Approval checkbox: `[ ]`
- Action: remove the PMOMax GKE ingress and load balancer by deleting the owning cluster/workloads, not by manually deleting cloud load balancer pieces first.
- Exact resources:
  - forwarding rule `k8s2-fr-l7pwee7v-pmomax-pmo-architect-ingress-9g7kws0u`
  - backend service `k8s1-9e2459bd-pmomax-pmo-architect-svc-80-23160eb3`
  - backend service `k8s1-9e2459bd-kube-system-default-http-backend-80-297ea027`
- Estimated savings: about `$17.57/month` gross.
- Why safe: resources are named/described as Kubernetes resources for `pmomax/pmo-architect-ingress`.
- Why it may not be worth touching separately: manual load balancer deletion risks orphaning or fighting Kubernetes controllers; cluster deletion should clean these resources.
- Marketplace risk: medium-high until traffic/IP dependency is checked.
- Rollback/recreate plan: preserve ingress manifest, service manifest, DNS/IP references, and recreate via temporary GKE validation cluster.
- Exact proposed command:

```sh
# Prefer cluster/workload cleanup. Do not manually run this unless Kubernetes ownership is confirmed:
# gcloud compute forwarding-rules delete k8s2-fr-l7pwee7v-pmomax-pmo-architect-ingress-9g7kws0u --global --project=katalyststreet-public
```

## 3. Disable Managed Prometheus Only If Cluster Is Retained

- Approval checkbox: `[ ]`
- Action: disable or reduce Managed Prometheus/observability ingestion on `pmomax-auto` if the cluster must stay temporarily.
- Exact resource: `pmomax-auto` monitoring configuration.
- Estimated savings: about `$29.26/month` gross.
- Why safe: only if PMOMax validation does not currently depend on Prometheus metrics.
- Why it may not be worth touching: if the cluster will be deleted, this is unnecessary intermediate work.
- Marketplace risk: medium if validation dashboards or alerts depend on these metrics.
- Rollback/recreate plan: document current monitoring config and restore if validation needs metrics.
- Exact proposed command:

```sh
# gcloud container clusters update pmomax-auto --region=us-central1 --project=katalyststreet-public --disable-managed-prometheus
```

## 4. Review Anthos/Fleet/GKE Enterprise APIs After Cluster Decision

- Approval checkbox: `[ ]`
- Action: after `pmomax-auto` is retired or confirmed unnecessary, review whether Anthos/Fleet/GKE Enterprise APIs can remain idle or be disabled.
- Exact resources:
  - `gkehub.googleapis.com`
  - `gkeconnect.googleapis.com`
  - `anthosconfigmanagement.googleapis.com`
  - `anthospolicycontroller.googleapis.com`
  - `multiclustermetering.googleapis.com`
- Estimated savings: no direct PMOMax savings confirmed in current billing export; APIs generally cost `$0` idle, but prevent accidental reactivation paths.
- Why safe: no Fleet memberships were returned.
- Why it may not be worth touching: API disablement can break future validation or support workflows and may save nothing.
- Marketplace risk: medium until Google confirms no publisher-side dependency.
- Rollback/recreate plan: re-enable APIs before any future validation cluster if needed.
- Exact proposed commands:

```sh
# gcloud services disable gkehub.googleapis.com --project=katalyststreet-public
# gcloud services disable gkeconnect.googleapis.com --project=katalyststreet-public
# gcloud services disable anthosconfigmanagement.googleapis.com --project=katalyststreet-public
# gcloud services disable anthospolicycontroller.googleapis.com --project=katalyststreet-public
# gcloud services disable multiclustermetering.googleapis.com --project=katalyststreet-public
```

## 5. Review MARKETPLACE_TEST_MODE On Cloud Run

- Approval checkbox: `[ ]`
- Action: review whether public Cloud Run runtime should have `MARKETPLACE_TEST_MODE=true`.
- Exact resource: Cloud Run service `pmo-architect` in `katalyststreet-public/us-east1`.
- Estimated savings: `$0/month`; this is a correctness/compliance risk, not a cost action.
- Why safe: review only. Do not change without understanding metering/procurement behavior.
- Why it may not be worth touching immediately: current Cloud Run demo is live and costs effectively zero; changing env vars can alter Marketplace usage reporting behavior.
- Marketplace risk: high if changed incorrectly.
- Rollback/recreate plan: record current env vars and revision; rollback to previous Cloud Run revision if approved change fails.
- Exact proposed command:

```sh
# gcloud run services update pmo-architect --region=us-east1 --project=katalyststreet-public --update-env-vars=MARKETPLACE_TEST_MODE=false
```

## 6. Artifact Registry Cleanup Review Only

- Approval checkbox: `[ ]`
- Action: review untagged or obsolete non-release PMOMax images only after confirming they are not referenced by Cloud Run, Marketplace deployer, Helm/chart/release metadata, or customer install docs.
- Exact resources: untagged `pmomax` images and obsolete non-release tags in PMOMax repositories.
- Estimated savings: probably less than `$1.50/month`; not material.
- Why safe: only if strict release exclusions are applied.
- Why it may not be worth touching: very small savings and high Marketplace breakage risk if a release artifact is removed.
- Marketplace risk: high.
- Rollback/recreate plan: only delete if digests can be rebuilt and release metadata is preserved.
- Exact proposed command:

```sh
# gcloud artifacts docker images delete IMAGE_DIGEST --project=katalyststreet-public --quiet
```

