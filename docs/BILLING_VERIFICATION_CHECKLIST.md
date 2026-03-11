Manual Billing Verification Checklist (PMOMax K8s)

Prerequisites (must be true before starting)
- Cloud Commerce Procurement service identity is enabled for project katalyststreet-public.
- Marketplace deployer image validation succeeds.
- Marketplace test deployment can start.

Step 1: Billing export setup (BigQuery)
- Billing account: [FILL_ME]
- Export project: [FILL_ME] (can be katalyststreet-public or another project)
- Dataset: [FILL_ME] (example: billing)

Setup steps
1. Open Billing account → Billing export → Enable export.
2. In BigQuery, create dataset [FILL_ME] in project [FILL_ME].
3. Back in Billing export settings, select the dataset and save.

Step 2: Deploy via Marketplace
- Release tag (deployer): 1.0 (or 1.0.1 if available)
- App name used during deployment: [FILL_ME]
- Namespace: pmomax

Step 3: Get consumer project ID
Run:
export APP_NAME="<app name used during deployment>"
kubectl get secret "$APP_NAME-reporting-secret" --output json | jq -r '.["data"]["consumer-id"]' | base64 -d | cut -d: -f2

Expected output:
prXXXXXXXXXXXXXXX (store as CONSUMER_PROJECT_ID)

Step 4: Generate usage
- If billing is time-based: let the app run for a known duration.
- If billing is request-based: generate N requests and record N.
- If billing is data-based: process a known data volume and record volume.

Step 5: Query BigQuery export
Wait ~6 hours after usage for export to appear.

Use this SQL (fill placeholders):
SELECT
  service.id AS service_id,
  service.description AS service_description,
  sku.id AS sku_id,
  sku.description AS sku_description,
  usage_start_time,
  usage_end_time,
  project.id AS project_id,
  project.name AS project_name,
  export_time,
  cost,
  currency,
  usage.amount AS usage_amount,
  usage.unit AS usage_unit,
  usage.amount_in_pricing_units AS usage_amount_in_pricing_units,
  usage.pricing_unit AS usage_pricing_unit,
  invoice.month AS invoice_month
FROM
  `<EXPORT_PROJECT>.<DATASET>.<TABLE>`
WHERE
  project.id = '<CONSUMER_PROJECT_ID>'
ORDER BY
  usage_start_time ASC;

Step 6: Validate results
- Sum usage_amount over the test window.
- Confirm the sum aligns with:
  - runtime duration (time-based), or
  - generated event count (request-based), or
  - processed data volume (data-based).
- Validate expected SKU(s) and service_id.

Notes for PMOMax
- Expected deployer image: us-docker.pkg.dev/katalyststreet-public/pmomax/deployer
- Expected app image: us-docker.pkg.dev/katalyststreet-public/pmomax/pmo-architect:1.0
- Reporting secret name: <APP_NAME>-reporting-secret
