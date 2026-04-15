-- Replace YOUR_PROJECT.YOUR_DATASET.gcp_billing_export_v1_XXXX with the
-- billing export table provided by Google for manual billing verification.
-- Consumer project ID extracted from pmomax/pmo-architect-reporting-secret:
-- prmanualbilling20260327

SELECT
  service.description AS service_description,
  sku.description AS sku_description,
  usage_start_time,
  export_time,
  cost,
  usage.amount AS usage_amount,
  usage.unit AS usage_unit,
  usage.pricing_unit AS usage_pricing_unit
FROM `YOUR_PROJECT.YOUR_DATASET.gcp_billing_export_v1_XXXX`
WHERE project.id = 'prmanualbilling20260327'
ORDER BY usage_start_time ASC;
