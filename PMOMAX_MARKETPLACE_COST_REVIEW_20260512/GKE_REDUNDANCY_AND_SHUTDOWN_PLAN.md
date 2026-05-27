# GKE Redundancy And Shutdown Plan

## Executive Summary

No multiple active GKE clusters were found for PMOMax. The active Marketplace cluster is `pmomax-auto` in `katalyststreet-public/us-central1`. Redundancy risk is inside the cluster and supporting registries: old forensic namespaces/jobs, zero-replica historical ReplicaSets, old Artifact Registry images, and possibly an unhealthy Marketplace app manager pod. Do not delete the cluster or namespace `pmomax`; they contain the active Marketplace runtime and UBB/metering sidecar.

## Cluster Analysis

| Cluster | Project | Purpose | Workloads running | Marketplace depends on it? | PMOMax runtime depends on it? | Delete/stop? | Risk | Rollback |
|---|---|---|---|---|---|---|---|---|
| `pmomax-auto` | `katalyststreet-public` | Active PMOMax Marketplace Kubernetes runtime | `pmomax/pmo-architect` deployment; GKE system; managed Prometheus; Marketplace Application CR; old forensic jobs | Yes | Yes | Do not delete | High | Recreate from Marketplace deployer only after export of manifests, secrets, and validation; rollback by keeping cluster intact |
| none found | `pid-architect-ehlu1` | n/a | n/a | No GKE cluster | No GKE dependency observed | n/a | n/a | n/a |

## Active Runtime Dependency

The `pmomax` namespace currently contains:

| Resource | Dependency |
|---|---|
| `deployment/pmo-architect` | Active runtime; two ready replicas |
| `container/app` | PMOMax app image `billingfix-auth-20260402` |
| `container/ubbagent` | UBB sidecar; required for Marketplace metering |
| `secret/pmo-architect-reporting-secret` | Required by `ubbagent` |
| `configmap/pmo-architect-ubbagent-config` | Required by `ubbagent` |
| `application.app.k8s.io/pmo-architect` | Marketplace Application CR; ready `3/3` |
| `service/pmo-architect`, `service/pmo-architect-svc`, `ingress/pmo-architect-ingress` | Service exposure |

Do not disable these without a planned Marketplace redeploy and UBB verification.

## Safe Shutdown List

### Safe To Disable / Remove After Final Verification

These appear testing-only or stale. They should still be snapshotted/listed before deletion.

| Resource | Evidence | Safe condition |
|---|---|---|
| Namespace `forensic-1773343635` | Contains failed `job/pmo-forensic-deployer`, age about 60d | No active pods, no needed logs, no references from Marketplace app |
| Namespace `forensic-1773343876-ca` | Contains completed `job/pmo-forensic-deployer`, age about 60d | No active pods, no needed logs, no references from Marketplace app |
| Zero-replica `deployer-*` ReplicaSets in `pmomax` | Historical tags/digests, desired/current/ready `0` | Current deployment remains healthy; keep one manifest export first |
| Old untagged Artifact Registry image digests | Many historical images in `us-east1/apps/pmo-architect` and `us/pmomax` | Retain live digest, release tag `1.4.2`, app `1.0.2`, deployer/UBB `1.4.2`, and any rollback digests |

### Verify First

| Resource | Why verify | Verification |
|---|---|---|
| Cloud Run `pmo-architect` in `katalyststreet-public` | It is ready and has Marketplace test mode; may be demo/test or backup hosted runtime | Check traffic, listing/demo links, UBB test dependency |
| App Engine services `crmint-controller`, `crmint-jobs`, `default` | Costs exist and names are not PMOMax | Check versions, traffic, source, owners |
| Compute Engine disks/images/snapshots | Instances are terminated but costs include disks/images/N1 | List disks/images/snapshots and labels; map to GKE vs legacy VM |
| Cloud Storage media buckets | May support listing videos/assets | Check object names, public URLs, listing references |
| `application-system/kube-app-manager-controller` | Pod is `ImagePullBackOff`; may be Marketplace app manager | Check whether Marketplace operations require it before removal |
| Managed Prometheus/GMP | Monitoring cost significant | Confirm minimum Marketplace/ops monitoring needs before reducing |

### Do Not Disable

| Resource | Reason |
|---|---|
| `pmomax-auto` cluster | Active Marketplace runtime |
| Namespace `pmomax` | Active app, UBB sidecar, Marketplace Application CR |
| `pmo-architect-reporting-secret` | UBB metering secret |
| `pmo-architect-ubbagent-config` | UBB sidecar config |
| Artifact Registry release images `deployer:1.4.2`, `ubbagent:1.4.2`, app `1.0.2`, live app digest | Marketplace release and rollback |
| Service Control / PMOMax endpoint service | Marketplace metering |
| Billing export datasets/tables | Evidence and support review |

## Rollback Plan For Cleanup Candidates

1. Export current manifests before cleanup:

```bash
kubectl get ns forensic-1773343635 forensic-1773343876-ca -o yaml
kubectl get all,configmap,secret,serviceaccount,role,rolebinding -n forensic-1773343635 -o yaml
kubectl get all,configmap,secret,serviceaccount,role,rolebinding -n forensic-1773343876-ca -o yaml
kubectl -n pmomax get deploy,rs,svc,ingress,app,configmap,secret -o yaml
```

1. Keep release image digests pinned in a retention list.
2. Delete only one class of stale resource at a time.
3. Re-run:

```bash
kubectl -n pmomax get deploy,pods,svc,ingress,app
kubectl -n pmomax describe pod -l app=pmo-architect
```

1. Verify UBB by sending a controlled test usage report and confirming Service Control success.

## Anthos / GKE Enterprise Finding

Evidence found:

| Check | Result |
|---|---|
| Repo search for `anthos`, `gkehub`, `fleet`, `service mesh`, `config management`, `policy controller`, `connect gateway` | No Marketplace manifest dependency found in active schema/manifest paths |
| `gcloud container fleet memberships list --project=katalyststreet-public` | No memberships returned |
| Enabled APIs | `anthosconfigmanagement.googleapis.com`, `anthospolicycontroller.googleapis.com`, `gkeconnect.googleapis.com`, `gkehub.googleapis.com` are enabled |
| Kubernetes namespaces | No obvious ASM/Istio, Config Management, or Policy Controller namespaces observed |

Conclusion: PMOMax does not appear to require Anthos/GKE Enterprise features for the Marketplace runtime. The APIs being enabled is not the same as active usage. Disabling Anthos/GKE Enterprise related services is likely safe only after confirming there are no fleet memberships/features and after a Marketplace deploy/UBB smoke test.

