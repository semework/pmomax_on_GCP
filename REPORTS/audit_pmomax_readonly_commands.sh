#!/usr/bin/env bash
# =============================================================================
# PMOMax GCP Read-Only Audit Script
# Generated: 2026-05-21
# Account: mulugetas@katalyststreet.com
#
# SAFETY NOTICE:
#   THIS SCRIPT IS STRICTLY READ-ONLY.
#   It contains ONLY: list, describe, get, bq query (SELECT only) commands.
#   DO NOT add any delete, update, patch, disable, enable, scale, deploy,
#   apply, create, destroy, or state-changing commands to this script.
#   Running this script makes NO changes to any cloud resource.
# =============================================================================

set -euo pipefail

# Output directory for audit results
AUDIT_OUT="./audit_output"
mkdir -p "$AUDIT_OUT"

echo "=========================================="
echo " PMOMax GCP Read-Only Audit"
echo " $(date -u)"
echo "=========================================="
echo ""
echo "WARNING: READ-ONLY ONLY. This script makes no changes."
echo ""

# ---------------------------------------------------------------------------
# PHASE 1 — PROJECTS & BILLING (read-only)
# ---------------------------------------------------------------------------
echo "[Phase 1] Projects and billing..."

# DO NOT MODIFY: list only
gcloud projects list --format=json > "$AUDIT_OUT/projects_list.json" 2>&1
echo "  -> projects_list.json"

# DO NOT MODIFY: list only
gcloud billing accounts list --format=json > "$AUDIT_OUT/billing_accounts.json" 2>&1
echo "  -> billing_accounts.json"

# DO NOT MODIFY: describe only
gcloud billing projects describe katalyststreet-public --format=json \
  > "$AUDIT_OUT/billing_katalyststreet_public.json" 2>&1
echo "  -> billing_katalyststreet_public.json"

# DO NOT MODIFY: describe only
gcloud billing projects describe pid-architect-ehlu1 --format=json \
  > "$AUDIT_OUT/billing_pid_architect_ehlu1.json" 2>&1
echo "  -> billing_pid_architect_ehlu1.json"

# ---------------------------------------------------------------------------
# PHASE 2 — CLOUD RUN (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 2] Cloud Run services..."

# DO NOT MODIFY: list only
gcloud run services list \
  --platform=managed \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/cloudrun_katalyststreet_public.json" 2>&1
echo "  -> cloudrun_katalyststreet_public.json"

# DO NOT MODIFY: list only
gcloud run services list \
  --platform=managed \
  --project=pid-architect-ehlu1 \
  --format=json \
  > "$AUDIT_OUT/cloudrun_pid_architect_ehlu1.json" 2>&1
echo "  -> cloudrun_pid_architect_ehlu1.json"

# DO NOT MODIFY: describe only — specifically the PMOMax public demo
gcloud run services describe pmo-architect \
  --platform=managed \
  --project=katalyststreet-public \
  --region=us-east1 \
  --format=json \
  > "$AUDIT_OUT/cloudrun_pmo_architect_describe.json" 2>&1
echo "  -> cloudrun_pmo_architect_describe.json"

# ---------------------------------------------------------------------------
# PHASE 3 — GKE / KUBERNETES (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 3] GKE clusters..."

# DO NOT MODIFY: list only
gcloud container clusters list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/gke_clusters_katalyststreet_public.json" 2>&1
echo "  -> gke_clusters_katalyststreet_public.json"

# DO NOT MODIFY: list only
gcloud container clusters list \
  --project=pid-architect-ehlu1 \
  --format=json \
  > "$AUDIT_OUT/gke_clusters_pid_architect_ehlu1.json" 2>&1
echo "  -> gke_clusters_pid_architect_ehlu1.json"

# DO NOT MODIFY: list only — Fleet memberships
gcloud container fleet memberships list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/fleet_memberships_katalyststreet_public.json" 2>&1
echo "  -> fleet_memberships_katalyststreet_public.json"

# ---------------------------------------------------------------------------
# PHASE 4 — ARTIFACT REGISTRY (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 4] Artifact Registry..."

# DO NOT MODIFY: list only
gcloud artifacts repositories list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/artifact_registry_repos.json" 2>&1
echo "  -> artifact_registry_repos.json"

# DO NOT MODIFY: list only — Marketplace deployer images
gcloud artifacts docker images list \
  us-docker.pkg.dev/katalyststreet-public/pmomax \
  --format=json \
  --include-tags \
  > "$AUDIT_OUT/artifact_images_pmomax.json" 2>&1
echo "  -> artifact_images_pmomax.json"

# DO NOT MODIFY: list only — Cloud Run runtime images
gcloud artifacts docker images list \
  "us-east1-docker.pkg.dev/katalyststreet-public/apps" \
  --format=json \
  --include-tags \
  > "$AUDIT_OUT/artifact_images_apps_us_east1.json" 2>&1
echo "  -> artifact_images_apps_us_east1.json"

# ---------------------------------------------------------------------------
# PHASE 5 — ENABLED APIS (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 5] Enabled APIs..."

# DO NOT MODIFY: list only
gcloud services list \
  --enabled \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/enabled_apis_katalyststreet_public.json" 2>&1
echo "  -> enabled_apis_katalyststreet_public.json"

# DO NOT MODIFY: list only
gcloud services list \
  --enabled \
  --project=pid-architect-ehlu1 \
  --format=json \
  > "$AUDIT_OUT/enabled_apis_pid_architect_ehlu1.json" 2>&1
echo "  -> enabled_apis_pid_architect_ehlu1.json"

# ---------------------------------------------------------------------------
# PHASE 6 — COMPUTE ENGINE (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 6] Compute Engine..."

# DO NOT MODIFY: list only
gcloud compute instances list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/compute_instances.json" 2>&1
echo "  -> compute_instances.json"

# DO NOT MODIFY: list only
gcloud compute disks list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/compute_disks.json" 2>&1
echo "  -> compute_disks.json"

# DO NOT MODIFY: list only
gcloud compute addresses list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/compute_addresses.json" 2>&1
echo "  -> compute_addresses.json"

# DO NOT MODIFY: list only
gcloud compute forwarding-rules list \
  --project=katalyststreet-public \
  --global \
  --format=json \
  > "$AUDIT_OUT/compute_forwarding_rules.json" 2>&1
echo "  -> compute_forwarding_rules.json"

# DO NOT MODIFY: list only
gcloud compute backend-services list \
  --project=katalyststreet-public \
  --global \
  --format=json \
  > "$AUDIT_OUT/compute_backend_services.json" 2>&1
echo "  -> compute_backend_services.json"

# ---------------------------------------------------------------------------
# PHASE 7 — APP ENGINE (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 7] App Engine..."

# DO NOT MODIFY: list only
gcloud app services list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/appengine_services.json" 2>&1
echo "  -> appengine_services.json"

# DO NOT MODIFY: list only
gcloud app versions list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/appengine_versions.json" 2>&1
echo "  -> appengine_versions.json"

# ---------------------------------------------------------------------------
# PHASE 8 — CLOUD SCHEDULER (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 8] Cloud Scheduler..."

# DO NOT MODIFY: list only
gcloud scheduler jobs list \
  --project=katalyststreet-public \
  --location=us-east1 \
  --format=json \
  > "$AUDIT_OUT/scheduler_jobs_us_east1.json" 2>&1
echo "  -> scheduler_jobs_us_east1.json"

# DO NOT MODIFY: list only
gcloud scheduler jobs list \
  --project=katalyststreet-public \
  --location=us-central1 \
  --format=json \
  > "$AUDIT_OUT/scheduler_jobs_us_central1.json" 2>&1
echo "  -> scheduler_jobs_us_central1.json"

# ---------------------------------------------------------------------------
# PHASE 9 — CLOUD SQL (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 9] Cloud SQL..."

# DO NOT MODIFY: list only
gcloud sql instances list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/sql_instances.json" 2>&1
echo "  -> sql_instances.json"

# ---------------------------------------------------------------------------
# PHASE 10 — CLOUD STORAGE (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 10] Cloud Storage..."

# DO NOT MODIFY: list only
gcloud storage buckets list \
  --project=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/storage_buckets.json" 2>&1
echo "  -> storage_buckets.json"

# ---------------------------------------------------------------------------
# PHASE 11 — BIGQUERY (read-only)
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 11] BigQuery datasets..."

# DO NOT MODIFY: list only
bq ls \
  --project_id=katalyststreet-public \
  --format=json \
  > "$AUDIT_OUT/bigquery_datasets.json" 2>&1
echo "  -> bigquery_datasets.json"

bq ls \
  --project_id=katalyststreet-public \
  pmomaxbilling \
  > "$AUDIT_OUT/bigquery_tables_pmomaxbilling.txt" 2>&1
echo "  -> bigquery_tables_pmomaxbilling.txt"

# ---------------------------------------------------------------------------
# PHASE 12 — BILLING EXPORT QUERIES (SELECT read-only)
#
# SAFETY: These are SELECT-only SQL queries against the billing export.
#         They read data. They do NOT modify any resource or table.
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 12] Billing export queries (SELECT only)..."

# DO NOT MODIFY: SELECT only — monthly cost by project
bq query \
  --project_id=katalyststreet-public \
  --use_legacy_sql=false \
  --format=json \
  --nouse_legacy_sql \
  'SELECT
     DATE_TRUNC(usage_start_time, MONTH) as month,
     project.id as project_id,
     ROUND(SUM(cost),2) as gross_cost,
     ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) as credits,
     ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) as net_cost
   FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`
   WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
   GROUP BY 1,2
   ORDER BY 1 DESC, gross_cost DESC' \
  > "$AUDIT_OUT/billing_monthly_by_project.json" 2>&1
echo "  -> billing_monthly_by_project.json"

# DO NOT MODIFY: SELECT only — monthly cost by project and service
bq query \
  --project_id=katalyststreet-public \
  --use_legacy_sql=false \
  --format=json \
  'SELECT
     DATE_TRUNC(usage_start_time, MONTH) as month,
     project.id as project_id,
     service.description as service,
     ROUND(SUM(cost),2) as gross_cost,
     ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) as credits,
     ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) as net_cost
   FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`
   WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
   GROUP BY 1,2,3
   ORDER BY 1 DESC, gross_cost DESC
   LIMIT 200' \
  > "$AUDIT_OUT/billing_monthly_by_project_service.json" 2>&1
echo "  -> billing_monthly_by_project_service.json"

# DO NOT MODIFY: SELECT only — top SKUs by gross cost
bq query \
  --project_id=katalyststreet-public \
  --use_legacy_sql=false \
  --format=json \
  'SELECT
     service.description as service,
     sku.description as sku,
     project.id as project_id,
     ROUND(SUM(cost),2) as gross_cost,
     ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) as credits,
     ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) as net_cost
   FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`
   WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
   GROUP BY 1,2,3
   ORDER BY gross_cost DESC
   LIMIT 50' \
  > "$AUDIT_OUT/billing_top_skus_90days.json" 2>&1
echo "  -> billing_top_skus_90days.json"

# DO NOT MODIFY: SELECT only — last 30 days by service for katalyststreet-public
bq query \
  --project_id=katalyststreet-public \
  --use_legacy_sql=false \
  --format=json \
  'SELECT
     service.description as service,
     sku.description as sku,
     ROUND(SUM(cost),2) as gross_cost,
     ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) as credits,
     ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) as net_cost
   FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`
   WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
     AND project.id = "katalyststreet-public"
   GROUP BY 1,2
   ORDER BY gross_cost DESC' \
  > "$AUDIT_OUT/billing_30days_katalyststreet_public.json" 2>&1
echo "  -> billing_30days_katalyststreet_public.json"

# ---------------------------------------------------------------------------
# DONE
# ---------------------------------------------------------------------------
echo ""
echo "=========================================="
echo " Audit complete. All outputs in: $AUDIT_OUT/"
echo " NO cloud resources were modified."
echo "=========================================="
echo ""
ls -la "$AUDIT_OUT/"
