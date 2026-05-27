# Codex Approval-Only Cleanup Plan

DO NOT RUN UNTIL HUMAN APPROVES.

No actions in this plan have been executed.

## Approval Items

### 1. Remove unused CRMint App Engine services

- Approval: [ ]
- Resource: `crmint-controller`, `crmint-jobs` in `katalyststreet-public`
- Expected gross savings: estimated $13-$20.85/month; billing export shows total App Engine gross $20.85/month but does not split by service.
- Risk: Medium
- Rollback/backup note: App Engine service deletion is not a simple rollback. Confirm source/deployment artifacts and owner approval first.
- Exact proposed commands:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud app services delete crmint-controller --project=katalyststreet-public
# gcloud app services delete crmint-jobs --project=katalyststreet-public
```

### 2. Remove old stopped Optimax VMs and attached boot disks

- Approval: [ ]
- Resource: `gpu-instance-20240929-optimax`, `instance-20240929-optimax-katalyst-street-public`
- Expected gross savings: about $10.85/month from us-west1 balanced persistent disks, plus any ancillary static/network resources if present.
- Risk: Medium
- Rollback/backup note: Create snapshots or confirm the disks are disposable before deletion. No snapshots were listed during verification.
- Exact proposed commands:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud compute disks snapshot instance-20240929-133724 --zone=us-west1-a --project=katalyststreet-public --snapshot-names=backup-instance-20240929-133724-before-cleanup
# gcloud compute disks snapshot instance-20240929-optimax-katalyst-street-public --zone=us-west1-a --project=katalyststreet-public --snapshot-names=backup-instance-20240929-optimax-katalyst-street-public-before-cleanup
# gcloud compute instances delete gpu-instance-20240929-optimax --zone=us-west1-a --project=katalyststreet-public
# gcloud compute instances delete instance-20240929-optimax-katalyst-street-public --zone=us-west1-a --project=katalyststreet-public
```

### 3. Resolve AlloyDB Omni null-project subscription charge

- Approval: [ ]
- Resource: Billing export rows with `project.id IS NULL`, service `AlloyDB`, SKU `AlloyDB Omni Subscription`
- Expected gross savings: $39.71/month if the subscription is unused and cancellable.
- Risk: High
- Rollback/backup note: This appears billing/subscription-owned, not a normal project resource. Resolve ownership in Billing Console/support before any cancellation.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# No CLI cleanup command proposed. Use GCP Billing Console/support to identify subscription owner before action.
```

### 4. Disable or reduce Network Intelligence Center usage

- Approval: [ ]
- Resource: Network Intelligence Center SKUs in `katalyststreet-public`
- Expected gross savings: $9.49/month in `katalyststreet-public`; about $13.05/month across visible projects.
- Risk: Low to Medium
- Rollback/backup note: Export or document existing connectivity tests first. Current listed tests are old SSH troubleshooting tests from 2024-09-29.
- Exact proposed commands:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud network-management connectivity-tests delete ssh-troubleshoot-qltng --project=katalyststreet-public
# gcloud network-management connectivity-tests delete ssh-troubleshoot-3z5wu --project=katalyststreet-public
```

### 5. Reduce Prometheus ingestion from GKE

- Approval: [ ]
- Resource: Managed Prometheus ingestion for `pmomax-auto`
- Expected gross savings: up to $27.66/month if fully eliminated; safer target is partial reduction after dashboard/alert review.
- Risk: Medium
- Rollback/backup note: Export current scrape configs, dashboards, and alerting policies before changing scrape intervals or metric selection.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# No generic CLI command proposed. Apply an reviewed observability config change only after identifying scrape targets and required metrics.
```

### 6. Add Artifact Registry cleanup policy for non-release images

- Approval: [ ]
- Resource: old/untagged non-release images in `katalyststreet-public` Artifact Registry repositories.
- Expected gross savings: low; Artifact Registry gross is $3.64/month across visible projects.
- Risk: Low if release/current images are excluded.
- Rollback/backup note: Preserve release tags `1.4.2`, `1.0.2`, deployer, ubbagent, current Cloud Run image, and any Marketplace-referenced images.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud artifacts repositories update apps --location=us-east1 --project=katalyststreet-public --cleanup-policy=dry-run-or-reviewed-policy.json
# gcloud artifacts repositories update pmomax --location=us-east1 --project=katalyststreet-public --cleanup-policy=dry-run-or-reviewed-policy.json
# gcloud artifacts repositories update apps --location=us --project=katalyststreet-public --cleanup-policy=dry-run-or-reviewed-policy.json
```

### 7. Coordinate `pmomax-auto` GKE cluster lifecycle

- Approval: [ ]
- Resource: `pmomax-auto` in `katalyststreet-public`, `us-central1`
- Expected gross savings: $139.62/month Kubernetes Engine plus possibly $27.66/month Prometheus.
- Risk: High
- Rollback/backup note: Coordinate with Google/Marketplace and confirm no customers or validation workflows depend on this cluster. Export manifests and state before any destructive action.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud container clusters delete pmomax-auto --region=us-central1 --project=katalyststreet-public
```
