# READ-ONLY PMOMAX AUDIT COMMANDS ONLY.
# THIS SCRIPT IS FOR REVIEW/REPLAY OF INVESTIGATION COMMANDS.
# DO NOT ADD MODIFYING COMMANDS.

gcloud config get-value account
gcloud config get-value project
gcloud projects list --format=json
gcloud billing accounts list --format=json

bq ls --project_id=katalyststreet-public --format=json pmomaxbilling
bq ls --project_id=katalyststreet-public --format=json marketplace_report
bq show --format=json katalyststreet-public:pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C

bq query --use_legacy_sql=false --format=json 'WITH base AS (SELECT DATE(usage_start_time) usage_date, IFNULL(project.id, "__NULL__") project_id, IFNULL(project.number, "") project_number, service.description service, sku.description sku, location.location location, cost, IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0) credits FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C` WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)) SELECT window_days, ROUND(SUM(cost),2) gross_cost, ROUND(SUM(credits),2) credits, ROUND(SUM(cost + credits),2) net_cost, MIN(usage_date) first_usage_date, MAX(usage_date) last_usage_date FROM base, UNNEST([30,60,90]) window_days WHERE usage_date >= DATE_SUB(CURRENT_DATE(), INTERVAL window_days DAY) GROUP BY window_days ORDER BY window_days'
bq query --use_legacy_sql=false --format=json 'SELECT IFNULL(project.id,"__NULL__") project_id, IFNULL(project.number,"") project_number, ROUND(SUM(cost),2) gross_30d, ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) credits_30d, ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) net_30d FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C` WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) GROUP BY project_id, project_number ORDER BY gross_30d DESC LIMIT 40'
bq query --use_legacy_sql=false --format=json 'SELECT service.description service, ROUND(SUM(cost),2) gross_30d, ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) credits_30d, ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) net_30d FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C` WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) GROUP BY service ORDER BY gross_30d DESC LIMIT 30'
bq query --use_legacy_sql=false --format=json 'SELECT ROUND(SUM(cost),2) gross_last_7d, ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) credits_last_7d, ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0)),2) net_last_7d, ROUND(SUM(cost)/7*30,2) projected_gross_30d, ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0))/7*30,2) projected_credits_30d, ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c),0))/7*30,2) projected_net_30d FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C` WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)'
bq query --use_legacy_sql=false --format=json 'WITH base AS (SELECT DATE(usage_start_time) d, cost, (SELECT value FROM UNNEST(labels) WHERE key="goog-k8s-cluster-name") cluster_name, (SELECT value FROM UNNEST(labels) WHERE key="goog-k8s-namespace") namespace, (SELECT value FROM UNNEST(labels) WHERE key="k8s-workload-name") workload, service.description service, sku.description sku FROM `katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C` WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND service.description = "Kubernetes Engine") SELECT IFNULL(cluster_name,"__NO_CLUSTER_LABEL__") cluster_name, IFNULL(namespace,"__NO_NAMESPACE_LABEL__") namespace, IFNULL(workload,"__NO_WORKLOAD_LABEL__") workload, ROUND(SUM(cost),2) gross_30d, ROUND(SUM(IF(d >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), cost, 0)),2) gross_last_7d FROM base GROUP BY cluster_name, namespace, workload ORDER BY gross_30d DESC LIMIT 50'

gcloud container clusters list --project=katalyststreet-public --format=json
gcloud container clusters list --project=pid-architect-ehlu1 --format=json
gcloud container clusters list --project=optimax-build1 --format=json
gcloud container fleet memberships list --project=katalyststreet-public --format=json

gcloud run services list --platform=managed --project=katalyststreet-public --format=json
gcloud run services list --platform=managed --project=pid-architect-ehlu1 --format=json
gcloud run services list --platform=managed --project=optimax-build1 --format=json
gcloud run services list --platform=managed --project=deltamax-464321 --format=json

gcloud compute instances list --project=katalyststreet-public --format=json
gcloud compute disks list --project=katalyststreet-public --format=json
gcloud compute instances list --project=optimax-build1 --format=json
gcloud compute disks list --project=optimax-build1 --format=json
gcloud compute addresses list --project=katalyststreet-public --format=json
gcloud compute forwarding-rules list --project=katalyststreet-public --format=json
gcloud compute backend-services list --project=katalyststreet-public --format=json
gcloud compute routers list --project=katalyststreet-public --format=json

gcloud app services list --project=katalyststreet-public --format=json
gcloud app versions list --project=katalyststreet-public --format=json
gcloud app instances list --project=katalyststreet-public --format=json
gcloud scheduler jobs list --project=katalyststreet-public --format=json

gcloud alloydb clusters list --project=katalyststreet-public --region=us-central1 --format=json
gcloud alloydb clusters list --project=pid-architect-ehlu1 --region=us-central1 --format=json
gcloud sql instances list --project=katalyststreet-public --format=json
gcloud sql instances list --project=pid-architect-ehlu1 --format=json

gcloud artifacts repositories list --project=katalyststreet-public --format=json
gcloud artifacts docker images list us-docker.pkg.dev/katalyststreet-public/pmomax --include-tags --format=json
gcloud artifacts docker images list us-east1-docker.pkg.dev/katalyststreet-public/apps --include-tags --format=json
gcloud artifacts docker images list us-east1-docker.pkg.dev/katalyststreet-public/pmomax --include-tags --format=json

gcloud storage buckets list --project=katalyststreet-public --format=json
gcloud logging buckets list --project=katalyststreet-public --location=global --format=json
gcloud logging sinks list --project=katalyststreet-public --format=json
gcloud monitoring policies list --project=katalyststreet-public --format=json
gcloud monitoring uptime list-configs --project=katalyststreet-public --format=json
gcloud network-management connectivity-tests list --project=katalyststreet-public --format=json
