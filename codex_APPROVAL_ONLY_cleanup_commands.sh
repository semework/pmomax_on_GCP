# DO NOT RUN THIS SCRIPT WITHOUT HUMAN APPROVAL.
# ALL COMMANDS ARE COMMENTED OUT.
# THIS FILE IS FOR REVIEW ONLY.

# CRMint App Engine cleanup candidates.
# gcloud app services delete crmint-controller --project=katalyststreet-public
# gcloud app services delete crmint-jobs --project=katalyststreet-public

# Old stopped Optimax VM backup candidates, before deletion.
# gcloud compute disks snapshot instance-20240929-133724 --zone=us-west1-a --project=katalyststreet-public --snapshot-names=backup-instance-20240929-133724-before-cleanup
# gcloud compute disks snapshot instance-20240929-optimax-katalyst-street-public --zone=us-west1-a --project=katalyststreet-public --snapshot-names=backup-instance-20240929-optimax-katalyst-street-public-before-cleanup

# Old stopped Optimax VM cleanup candidates.
# gcloud compute instances delete gpu-instance-20240929-optimax --zone=us-west1-a --project=katalyststreet-public
# gcloud compute instances delete instance-20240929-optimax-katalyst-street-public --zone=us-west1-a --project=katalyststreet-public

# Network Intelligence Center old troubleshooting tests.
# gcloud network-management connectivity-tests delete ssh-troubleshoot-qltng --project=katalyststreet-public
# gcloud network-management connectivity-tests delete ssh-troubleshoot-3z5wu --project=katalyststreet-public

# Artifact Registry cleanup policy candidates. Replace policy file with a reviewed policy that preserves release/current images.
# gcloud artifacts repositories update apps --location=us-east1 --project=katalyststreet-public --cleanup-policy=dry-run-or-reviewed-policy.json
# gcloud artifacts repositories update pmomax --location=us-east1 --project=katalyststreet-public --cleanup-policy=dry-run-or-reviewed-policy.json
# gcloud artifacts repositories update apps --location=us --project=katalyststreet-public --cleanup-policy=dry-run-or-reviewed-policy.json

# High-risk GKE lifecycle action. Requires Marketplace/Google/customer coordination first.
# gcloud container clusters delete pmomax-auto --region=us-central1 --project=katalyststreet-public
