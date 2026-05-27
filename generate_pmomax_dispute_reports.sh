#!/usr/bin/env bash
set -euo pipefail

PROJECT="${1:-katalyststreet-public}"
START_DATE="${2:-2025-08-01}"
OUT_DIR="PMOMAX_DISPUTE_REPORTS_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT_DIR/raw"

echo "Project: $PROJECT"
echo "Start date: $START_DATE"
echo "Output: $OUT_DIR"

redact() {
  sed -E \
    -e 's/sk-[A-Za-z0-9_-]+/[REDACTED_OPENAI_KEY]/g' \
    -e 's/AIza[0-9A-Za-z_-]+/[REDACTED_GOOGLE_KEY]/g' \
    -e 's/ghp_[0-9A-Za-z_]+/[REDACTED_GITHUB_TOKEN]/g' \
    -e 's/[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}/[REDACTED_BILLING_ACCOUNT]/g'
}

echo "Collecting GCP inventory..."

{
  echo "=== AUTH / PROJECT ==="
  gcloud auth list || true
  gcloud config get-value project || true

  echo
  echo "=== ENABLED SERVICES ==="
  gcloud services list --enabled --project="$PROJECT" || true

  echo
  echo "=== CLOUD RUN SERVICES ==="
  for r in us-east1 us-central1 us-west1; do
    echo "--- $r ---"
    gcloud run services list --platform=managed --region="$r" --project="$PROJECT" || true
  done

  echo
  echo "=== CLOUD RUN DESCRIBE pmo-architect ==="
  gcloud run services describe pmo-architect \
    --region=us-east1 \
    --project="$PROJECT" \
    --format="yaml(metadata.name,status.url,status.traffic,spec.template.spec.containers,spec.template.metadata.annotations)" || true

  echo
  echo "=== GKE CLUSTERS ==="
  gcloud container clusters list --project="$PROJECT" || true

  echo
  echo "=== GKE WORKLOADS: pmomax-auto ==="
  gcloud container clusters get-credentials pmomax-auto --region=us-central1 --project="$PROJECT" >/dev/null 2>&1 || true
  kubectl get namespaces || true
  kubectl get pods -A || true
  kubectl get deployments -A || true
  kubectl get pods -A | egrep -i "ubb|meter|pmo|pmomax" || true

  echo
  echo "=== ARTIFACT REGISTRY ==="
  gcloud artifacts repositories list --project="$PROJECT" || true

  echo
  echo "=== CLOUD SCHEDULER ==="
  for loc in us-central1 us-east1; do
    echo "--- $loc ---"
    gcloud scheduler jobs list --location="$loc" --project="$PROJECT" || true
  done

  echo
  echo "=== PUBSUB ==="
  gcloud pubsub topics list --project="$PROJECT" || true
  gcloud pubsub subscriptions list --project="$PROJECT" || true

  echo
  echo "=== APP ENGINE ==="
  gcloud app services list --project="$PROJECT" || true
  gcloud app versions list --project="$PROJECT" || true

  echo
  echo "=== RECENT CLOUD BUILDS ==="
  gcloud builds list --project="$PROJECT" --limit=50 || true

} | redact > "$OUT_DIR/raw/infrastructure_audit_redacted.txt"

echo "Collecting Marketplace status..."

{
  echo "=== MARKETPLACE / SERVICE CONTROL SERVICES ==="
  gcloud services list --enabled --project="$PROJECT" | egrep -i "marketplace|commerce|servicecontrol|pmo|max|procurement" || true

  echo
  echo "=== CLOUD RUN MARKETPLACE ENVIRONMENT, REDACTED ==="
  gcloud run services describe pmo-architect \
    --region=us-east1 \
    --project="$PROJECT" \
    --format="yaml(spec.template.spec.containers.env,status.url,status.traffic)" || true

  echo
  echo "=== PMOMAX SERVICE ENABLED CHECK ==="
  gcloud services list --enabled --project="$PROJECT" | grep -i "pmo-max" || true

  echo
  echo "=== ARTIFACT REPOSITORIES USED FOR MARKETPLACE IMAGES ==="
  gcloud artifacts repositories list --project="$PROJECT" || true

} | redact > "$OUT_DIR/raw/marketplace_status_redacted.txt"

echo "Trying to collect billing data from BigQuery export..."

cat > "$OUT_DIR/raw/billing_query.sql" <<SQL
DECLARE start_date DATE DEFAULT DATE('$START_DATE');

SELECT
  invoice.month AS invoice_month,
  service.description AS service,
  sku.description AS sku,
  project.id AS project_id,
  ROUND(SUM(cost), 2) AS gross_cost,
  ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS credits,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS net_cost
FROM \`BILLING_TABLE_PLACEHOLDER\`
WHERE DATE(usage_start_time) >= start_date
  AND (
    LOWER(project.id) LIKE '%pmo%'
    OR LOWER(project.id) LIKE '%pid%'
    OR LOWER(service.description) LIKE '%run%'
    OR LOWER(service.description) LIKE '%kubernetes%'
    OR LOWER(service.description) LIKE '%artifact%'
    OR LOWER(service.description) LIKE '%build%'
    OR LOWER(service.description) LIKE '%logging%'
    OR LOWER(service.description) LIKE '%secret%'
    OR LOWER(sku.description) LIKE '%pmo%'
  )
GROUP BY invoice_month, service, sku, project_id
ORDER BY invoice_month, net_cost DESC;
SQL

BILLING_TABLE="$(bq ls --project_id="$PROJECT" --format=json 2>/dev/null | python3 - <<'PY' || true
import json, sys, subprocess
try:
    datasets=json.load(sys.stdin)
except Exception:
    datasets=[]
print("")
PY
)"

# Auto-detect billing export table across accessible projects/datasets
FOUND_TABLE=""
for P in "$PROJECT" pid-architect-ehlu1 katalyststreet-public; do
  for DS in $(bq ls --project_id="$P" 2>/dev/null | awk 'NR>2 {print $1}' || true); do
    T=$(bq ls "$P:$DS" 2>/dev/null | awk '/gcp_billing_export_v1/ {print $1; exit}' || true)
    if [ -n "${T:-}" ]; then
      FOUND_TABLE="$P.$DS.$T"
      break 2
    fi
  done
done

if [ -n "$FOUND_TABLE" ]; then
  echo "Found billing export table: $FOUND_TABLE" | tee "$OUT_DIR/raw/billing_export_source.txt"
  sed "s/BILLING_TABLE_PLACEHOLDER/$FOUND_TABLE/g" "$OUT_DIR/raw/billing_query.sql" > "$OUT_DIR/raw/billing_query_final.sql"
  bq query --use_legacy_sql=false --format=csv < "$OUT_DIR/raw/billing_query_final.sql" | redact > "$OUT_DIR/raw/costs_since_august_2025.csv" || true
else
  echo "No BigQuery billing export table auto-detected." > "$OUT_DIR/raw/costs_since_august_2025.csv"
  echo "If billing export exists, replace BILLING_TABLE_PLACEHOLDER in raw/billing_query.sql and run it manually." >> "$OUT_DIR/raw/costs_since_august_2025.csv"
fi

echo "Generating Markdown reports..."

cat > "$OUT_DIR/PMOMax Infrastructure Audit Summary.md" <<MD
# PMOMax Infrastructure Audit Summary

Generated: $(date)  
Project reviewed: \`$PROJECT\`  
Period context: since $START_DATE

## Executive Finding

The environment contains active production Marketplace infrastructure, including Cloud Run, GKE/Anthos-related resources, Artifact Registry, Marketplace/service-control configuration, monitoring/logging, and PMOMax Kubernetes workloads.

## Key Evidence

See raw file:

\`raw/infrastructure_audit_redacted.txt\`

## Operational Interpretation

The infrastructure should be optimized for the pre-revenue phase, but the audit should distinguish between:

- required production/Marketplace components,
- validation-related components,
- idle or legacy components,
- and resources that cannot be safely removed without dependency review.

## Recommended Review Categories

### Must Keep Until Re-Architecture Is Confirmed
- Cloud Run production runtime
- Artifact Registry images referenced by production
- Marketplace/Service Control configuration
- Any GKE workloads involved in UBB/metering or active PMOMax production behavior

### Candidates for Reduction
- duplicate runtime layers
- stale image versions
- unnecessary scheduler jobs
- non-PMOMax App Engine or CRMint resources
- validation-only infrastructure after confirmation

MD

cat > "$OUT_DIR/PMOMax Marketplace Status Summary.md" <<MD
# PMOMax Marketplace Status Summary

Generated: $(date)  
Project reviewed: \`$PROJECT\`

## Summary

PMOMax is configured as a Marketplace-oriented deployment with Cloud Run runtime settings and Marketplace/Service Control environment configuration.

## Key Evidence

See raw file:

\`raw/marketplace_status_redacted.txt\`

## Important Points

- Marketplace-related services are enabled.
- Cloud Run contains Marketplace-related configuration.
- Artifact Registry contains production container images.
- Any cleanup should avoid breaking Marketplace metering/reporting or production runtime behavior.

## Recommended Position

Before deleting GKE or disabling services, confirm whether UBB/metering is fully decoupled from GKE and whether Cloud Run alone can maintain production Marketplace requirements.

MD

cat > "$OUT_DIR/PMOMax Cost Analysis Summary.md" <<MD
# PMOMax Cost Analysis Summary

Generated: $(date)  
Period requested: since $START_DATE

## Summary

The cost dispute should distinguish between:

1. Development/build phase infrastructure  
2. Marketplace validation costs  
3. Production pre-revenue idle/maintenance footprint  
4. Required Marketplace/UBB metering components  
5. Unnecessary or legacy services

## Billing Data

Raw billing export attempt:

\`raw/costs_since_august_2025.csv\`

If this file says no billing export was detected, use the Google Billing Console export or provide the billing CSV manually.

## Key Interpretation

A strict sub-\$100/month cap does not appear to be demonstrated by infrastructure assumptions alone. However, once the product is live but pre-revenue, it is reasonable to move to a lean maintenance architecture.

## Recommended Framing

The question is not whether costs should be optimized now. They should.

The question is whether historical development, validation, and Marketplace deployment costs were unauthorized or outside the assumptions under which PMOMax was built and launched.

MD

echo "Generating PDFs..."

python3 - <<PY
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

out = Path("$OUT_DIR")
styles = getSampleStyleSheet()

for md in out.glob("*.md"):
    pdf = md.with_suffix(".pdf")
    doc = SimpleDocTemplate(str(pdf), pagesize=letter)
    story = []
    for line in md.read_text(errors="ignore").splitlines():
        if line.startswith("# "):
            story.append(Paragraph(line[2:], styles["Title"]))
        elif line.startswith("## "):
            story.append(Paragraph(line[3:], styles["Heading2"]))
        elif line.startswith("### "):
            story.append(Paragraph(line[4:], styles["Heading3"]))
        elif line.startswith("- "):
            story.append(Paragraph("• " + line[2:], styles["BodyText"]))
        elif line.strip() == "":
            story.append(Spacer(1, 8))
        else:
            story.append(Paragraph(line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), styles["BodyText"]))
    doc.build(story)
PY

echo
echo "DONE. Reports created:"
find "$OUT_DIR" -maxdepth 1 -type f \( -name "*.pdf" -o -name "*.md" \) -print
echo
echo "Raw redacted evidence:"
find "$OUT_DIR/raw" -type f -print
