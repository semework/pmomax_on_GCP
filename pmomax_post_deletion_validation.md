# PMOMax Post-Deletion Validation Plan

## Goal

Validate that deleting `pmomax-auto` did not affect Marketplace deployability, release artifacts, billing/metering plumbing, datasets, or the public Cloud Run runtime.

No deletion has been performed yet.

## 1. Cloud Run Runtime

Expected: Cloud Run public runtime remains active and healthy.

Commands:

```sh
curl -I https://pmo-architect-839982691485.us-east1.run.app/health
gcloud run services describe pmo-architect --region=us-east1 --project=katalyststreet-public
```

Pass criteria:

- `/health` returns HTTP 200.
- Service status is Ready.
- Image remains `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2`.
- Traffic remains 100% to a ready revision.
- No unintended env var changes.

## 2. Marketplace APIs

Expected: required Marketplace and metering APIs remain enabled.

Commands:

```sh
gcloud services list --project=katalyststreet-public
```

Pass criteria:

- `artifactregistry.googleapis.com` enabled
- `cloudcommerceconsumerprocurement.googleapis.com` enabled
- `cloudcommerceprocurement.googleapis.com` enabled
- `cloudcommerceproducer.googleapis.com` enabled
- `servicecontrol.googleapis.com` enabled
- `servicemanagement.googleapis.com` enabled
- `pmo-max.endpoints.katalyststreet-public.cloud.goog` enabled

## 3. Artifact Registry Release Artifacts

Expected: release artifacts remain accessible.

Commands:

```sh
gcloud artifacts docker images list us-docker.pkg.dev/katalyststreet-public/pmomax --project=katalyststreet-public --include-tags
gcloud artifacts docker images list us-east1-docker.pkg.dev/katalyststreet-public/apps --project=katalyststreet-public --include-tags
```

Pass criteria:

- `deployer:1.4.2` present
- `ubbagent:1.4.2` present
- `pmo-architect:1.4.2` present
- `pmo-architect:1.4.2-marketplace` present
- `pmo-architect:1.0.2` present
- Current Cloud Run image digest remains accessible

## 4. Marketplace Endpoint

Expected: Marketplace endpoint remains described and available.

Command:

```sh
gcloud endpoints services describe pmo-max.endpoints.katalyststreet-public.cloud.goog --project=katalyststreet-public
```

Pass criteria:

- Endpoint describes successfully.
- No dependency on `pmomax-auto` is introduced.

## 5. Billing / Marketplace Datasets

Expected: datasets remain intact.

Command:

```sh
bq ls --project_id=katalyststreet-public
```

Pass criteria:

- `marketplace_report` exists.
- `pmomaxbilling` exists.

## 6. GKE Deletion Verification

Expected: `pmomax-auto` is gone after approved deletion.

Command:

```sh
gcloud container clusters list --project=katalyststreet-public
```

Pass criteria:

- `pmomax-auto` is no longer listed.
- No other PMOMax-required clusters were modified.

## 7. Load Balancer Cleanup Verification

Expected: PMOMax GKE ingress resources disappear after cluster deletion.

Commands:

```sh
gcloud compute forwarding-rules list --project=katalyststreet-public
gcloud compute backend-services list --project=katalyststreet-public
gcloud compute health-checks list --project=katalyststreet-public
gcloud compute url-maps list --project=katalyststreet-public
```

Pass criteria:

- No remaining resources named for `pmomax/pmo-architect-ingress`.
- If orphaned resources remain, pause and review before manual deletion.

## 8. Customer Installability Reasoning

Expected: customer installability is theoretically preserved because the preserved assets are:

- Marketplace listing and procurement APIs
- Service Control / Service Management endpoint
- Artifact Registry release artifacts
- PMOMax deployer image
- UBB agent image
- Runtime images and release tags

Pass criteria:

- Google/Marketplace support agrees no persistent publisher-owned cluster is required.
- Deployer and runtime images remain accessible.
- No required API was disabled.

## 9. Billing Follow-Up

Expected: cost reduction is not instant in all reports, but run-rate should drop.

Check after 24-72 hours and again after 7 days:

- GKE Autopilot cost should stop accruing.
- Managed Prometheus cost should stop accruing.
- PMOMax GKE ingress/LB cost should stop accruing after LB cleanup completes.
- Artifact Registry should remain around `$1.50/month` unless storage changes.
- Cloud Run should remain near zero unless traffic changes.

## Escalation Conditions

Escalate and stop further cleanup if:

- Cloud Run `/health` fails.
- Required Artifact Registry release tags disappear.
- Marketplace APIs or endpoint disappear.
- BigQuery datasets disappear.
- Orphan load balancer resources remain and ownership is unclear.
- Google/Marketplace support contradicts the assumption that persistent publisher GKE is unnecessary.

