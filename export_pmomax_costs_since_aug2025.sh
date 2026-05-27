#!/usr/bin/env bash
set -euo pipefail

PROJECT="${1:-katalyststreet-public}"
START_DATE="${2:-2025-08-01}"
OUT_DIR="PMOMAX_COST_EXPORT_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT_DIR"

echo "Project: $PROJECT"
echo "Start date: $START_DATE"
echo "Output: $OUT_DIR"
echo

echo "Finding billing export table..."

FOUND_TABLE=""

for P in "$PROJECT" "katalyststreet-public" "pid-architect-ehlu1"; do
  echo "Checking project: $P"
  DATASETS=$(bq ls --project_id="$P" 2>/dev/null | awk 'NR>2 {print $1}' || true)

  for DS in $DATASETS; do
    TABLE=$(bq ls "$P:$DS" 2>/dev/null | awk '/gcp_billing_export_v1/ {print $1; exit}' || true)
    if [ -n "${TABLE:-}" ]; then
      FOUND_TABLE="$P.$DS.$TABLE"
      break 2
    fi
  done
done

if [ -z "$FOUND_TABLE" ]; then
  echo "ERROR: No gcp_billing_export_v1 table found."
  echo "Run: bq ls --project_id=$PROJECT"
  exit 1
fi

echo "Found billing table: $FOUND_TABLE"
echo "$FOUND_TABLE" > "$OUT_DIR/billing_export_table.txt"

echo
echo "Exporting monthly totals..."

bq query --use_legacy_sql=false --format=csv "
SELECT
  FORMAT_DATE('%Y-%m', DATE(usage_start_time)) AS month,
  ROUND(SUM(cost),2) AS gross_cost,
  ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) AS credits,
  ROUND(
    SUM(cost) +
    SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0))
  ,2) AS net_cost
FROM \`$FOUND_TABLE\`
WHERE DATE(usage_start_time) >= DATE('$START_DATE')
GROUP BY month
ORDER BY month ASC
" > "$OUT_DIR/monthly_totals_since_aug_2025.csv"

echo "Exporting monthly service breakdown..."

bq query --use_legacy_sql=false --format=csv "
SELECT
  FORMAT_DATE('%Y-%m', DATE(usage_start_time)) AS month,
  project.id AS project_id,
  service.description AS service,
  ROUND(SUM(cost),2) AS gross_cost,
  ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) AS credits,
  ROUND(
    SUM(cost) +
    SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0))
  ,2) AS net_cost
FROM \`$FOUND_TABLE\`
WHERE DATE(usage_start_time) >= DATE('$START_DATE')
GROUP BY month, project_id, service
ORDER BY month ASC, net_cost DESC
" > "$OUT_DIR/monthly_service_breakdown_since_aug_2025.csv"

echo "Exporting PMOMax/PID filtered service breakdown..."

bq query --use_legacy_sql=false --format=csv "
SELECT
  FORMAT_DATE('%Y-%m', DATE(usage_start_time)) AS month,
  project.id AS project_id,
  service.description AS service,
  sku.description AS sku,
  ROUND(SUM(cost),2) AS gross_cost,
  ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) AS credits,
  ROUND(
    SUM(cost) +
    SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0))
  ,2) AS net_cost
FROM \`$FOUND_TABLE\`
WHERE DATE(usage_start_time) >= DATE('$START_DATE')
  AND (
    LOWER(project.id) LIKE '%pmo%'
    OR LOWER(project.id) LIKE '%pid%'
    OR LOWER(service.description) LIKE '%run%'
    OR LOWER(service.description) LIKE '%kubernetes%'
    OR LOWER(service.description) LIKE '%artifact%'
    OR LOWER(service.description) LIKE '%build%'
    OR LOWER(service.description) LIKE '%logging%'
    OR LOWER(service.description) LIKE '%secret%'
    OR LOWER(service.description) LIKE '%marketplace%'
    OR LOWER(service.description) LIKE '%service control%'
    OR LOWER(sku.description) LIKE '%pmo%'
    OR LOWER(sku.description) LIKE '%marketplace%'
    OR LOWER(sku.description) LIKE '%kubernetes%'
    OR LOWER(sku.description) LIKE '%cloud run%'
  )
GROUP BY month, project_id, service, sku
ORDER BY month ASC, net_cost DESC
" > "$OUT_DIR/pmomax_filtered_costs_since_aug_2025.csv"

echo
echo "DONE."
echo "Files created:"
ls -lh "$OUT_DIR"

echo
echo "Zip created:"
zip -r "${OUT_DIR}.zip" "$OUT_DIR" >/dev/null
ls -lh "${OUT_DIR}.zip"
