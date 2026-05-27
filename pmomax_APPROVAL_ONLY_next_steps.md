# PMOMax Approval-Only Next Steps

DO NOT RUN ANY COMMAND WITHOUT HUMAN APPROVAL.
All commands below are commented out and were not executed.

## 1. Get access and owner decision for `optimax-build1`

- Approval: [ ]
- Issue: `optimax-build1` is the largest active hidden cost, especially Cloud Run.
- Estimated savings: unknown until resources are visible; billing shows about $177.34 gross last 30 days and active Cloud Run run-rate over $100/month.
- Risk: High because resource purpose and ownership are unknown.
- Why it matters: This is the clearest active cost driver outside protected PMOMax resources.
- Why it may NOT be worth touching: It may be an active non-PMOMax environment.
- Rollback concerns: No cleanup should be proposed until services/images/configs are listed and owners confirm.
- Exact proposed command:

```bash
# READ-ONLY ACCESS REQUEST / INVESTIGATION ONLY; DO NOT CHANGE RESOURCES.
# gcloud run services list --platform=managed --project=optimax-build1 --format=json
# gcloud compute instances list --project=optimax-build1 --format=json
# gcloud compute disks list --project=optimax-build1 --format=json
```

## 2. Investigate AlloyDB Omni null-project subscription

- Approval: [ ]
- Issue: Null-project `AlloyDB Omni Subscription` remains active.
- Estimated savings: about $41/month gross future exposure.
- Risk: High because no project owner/resource labels are visible.
- Why it matters: It is a recurring subscription-like charge that normal project APIs do not explain.
- Why it may NOT be worth touching: It may be a legitimate billing account subscription.
- Rollback concerns: Subscription cancellation may not be reversible.
- Exact proposed command:

```bash
# NO CLI CLEANUP COMMAND PROPOSED.
# Use Billing Console/support to identify the AlloyDB Omni subscription owner under billing account 018FC6-CC1985-24653C.
```

## 3. Review `pmomax-auto` GKE purpose

- Approval: [ ]
- Issue: `pmomax-auto` is still running and Marketplace-sensitive.
- Estimated savings: about $109/month GKE plus $29/month Prometheus plus related networking, if retired.
- Risk: High.
- Why it matters: It is the main active PMOMax infrastructure run-rate.
- Why it may NOT be worth touching: It may be needed for Marketplace validation/revalidation or demos.
- Rollback concerns: Cluster deletion would be destructive and hard to reverse without manifests/state.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud container clusters delete pmomax-auto --region=us-central1 --project=katalyststreet-public
```

## 4. Reduce Prometheus ingestion only after observability review

- Approval: [ ]
- Issue: Prometheus samples are about $29/month projected.
- Estimated savings: partial to full $29/month gross depending on retained metrics.
- Risk: Medium.
- Why it matters: This is recurring observability spend.
- Why it may NOT be worth touching: It may support Marketplace validation, debugging, or demo reliability.
- Rollback concerns: Lost metrics history and broken dashboards/alerts.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# No generic command proposed. First inspect dashboards, scrape targets, and alert dependencies, then apply a reviewed Kubernetes/Monitoring config change.
```

## 5. Remove old Network Intelligence Center tests after confirmation

- Approval: [ ]
- Issue: Old SSH troubleshoot tests still exist and NIC resource-hour billing remains.
- Estimated savings: about $9/month in `katalyststreet-public`, about $13/month visible all-project NIC cost.
- Risk: Low to Medium.
- Why it matters: The tests point at old terminated Optimax infrastructure.
- Why it may NOT be worth touching: Savings are small.
- Rollback concerns: Historical diagnostic paths disappear, but they are reproducible.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud network-management connectivity-tests delete ssh-troubleshoot-qltng --project=katalyststreet-public
# gcloud network-management connectivity-tests delete ssh-troubleshoot-3z5wu --project=katalyststreet-public
```

## 6. Review stopped Optimax VMs and attached disks

- Approval: [ ]
- Issue: Two terminated 2024 VMs remain with attached boot disks.
- Estimated savings: about $11/month gross in `katalyststreet-public`.
- Risk: Medium.
- Why it matters: Persistent disks continue billing while VMs are terminated.
- Why it may NOT be worth touching: They may be retained as forensic/history artifacts.
- Rollback concerns: Snapshot/export before deleting; deletion is destructive.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud compute disks snapshot instance-20240929-133724 --zone=us-west1-a --project=katalyststreet-public --snapshot-names=backup-instance-20240929-133724-before-cleanup
# gcloud compute disks snapshot instance-20240929-optimax-katalyst-street-public --zone=us-west1-a --project=katalyststreet-public --snapshot-names=backup-instance-20240929-optimax-katalyst-street-public-before-cleanup
# gcloud compute instances delete gpu-instance-20240929-optimax --zone=us-west1-a --project=katalyststreet-public
# gcloud compute instances delete instance-20240929-optimax-katalyst-street-public --zone=us-west1-a --project=katalyststreet-public
```

## 7. Classify CRMint App Engine services

- Approval: [ ]
- Issue: CRMint services still exist and serve traffic split 100%, but scheduler is paused and recent billing is zero.
- Estimated savings: currently $0 projected from last 7 days; old 30-day cost was $20.85.
- Risk: Medium.
- Why it matters: Zombie service risk even if cost is already fixed.
- Why it may NOT be worth touching: Current cost is zero, so urgency is low.
- Rollback concerns: App Engine service deletion is not a simple rollback.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud app services delete crmint-controller --project=katalyststreet-public
# gcloud app services delete crmint-jobs --project=katalyststreet-public
```

## 8. Review `MARKETPLACE_TEST_MODE=true`

- Approval: [ ]
- Issue: Public Cloud Run runtime has production-looking Marketplace env vars with test mode enabled.
- Estimated savings: none.
- Risk: High Marketplace compliance risk.
- Why it matters: May affect UBB/reporting/compliance behavior.
- Why it may NOT be worth touching: It may be intentional for a public demo.
- Rollback concerns: Changing env vars changes runtime behavior and deployment state.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# No command proposed. Review Marketplace compliance intent before any Cloud Run config change.
```

## 9. Artifact Registry cleanup policy

- Approval: [ ]
- Issue: Several old/untagged/intermediate images exist.
- Estimated savings: about $1.44/month current run-rate.
- Risk: High if release/current images are affected.
- Why it matters: Hygiene, not material savings.
- Why it may NOT be worth touching: Savings are too small for Marketplace risk.
- Rollback concerns: Deleted images may break old installs or validation.
- Exact proposed command:

```bash
# DO NOT RUN UNTIL HUMAN APPROVES.
# gcloud artifacts repositories update apps --location=us-east1 --project=katalyststreet-public --cleanup-policy=reviewed-policy-preserving-release-images.json
# gcloud artifacts repositories update pmomax --location=us-east1 --project=katalyststreet-public --cleanup-policy=reviewed-policy-preserving-release-images.json
```
