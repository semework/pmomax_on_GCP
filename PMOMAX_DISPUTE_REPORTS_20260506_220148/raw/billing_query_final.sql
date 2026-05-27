DECLARE start_date DATE DEFAULT DATE('2025-08-01');

SELECT
  invoice.month AS invoice_month,
  service.description AS service,
  sku.description AS sku,
  project.id AS project_id,
  ROUND(SUM(cost), 2) AS gross_cost,
  ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS credits,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS net_cost
FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`
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
