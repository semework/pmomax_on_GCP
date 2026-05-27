# PMOMax Technical Architecture Summary

## Runtime Model

PMOMax is a stateless AI-assisted PID and governance application. It is designed for customer-controlled Google Cloud operation, with Marketplace-oriented Kubernetes/GKE packaging and a hosted Cloud Run deployment path for the runtime service.

## Marketplace Package

Key Marketplace files include:

- `schema.yaml`
- `deploy/schema.yaml`
- `manifest/manifests.yaml.template`
- `manifest/application.yaml.template`
- `deployer/deploy.sh`
- `deployer/deploy_with_tests.sh`
- `publish_marketplace_deployer.sh`

The root `Dockerfile` is for the Marketplace deployer image. `Dockerfile.cloudrun` is used by `deploy-fast.sh` for the hosted Cloud Run runtime app image.

## Runtime Image Flow

The hosted runtime flow uses `deploy-fast.sh` to create a minimal Cloud Build context, stage `Dockerfile.cloudrun` as the runtime Dockerfile, build the app image, push it to Artifact Registry, and deploy the Cloud Run service.

## AI Audit Path

PMOMax AI endpoints use request-scoped audit context. Responses receive `_auditMeta` and `_auditTrace`. Winston emits structured JSON to stdout with `message="ai_decision_trace"`. GKE or Cloud Run captures stdout into Cloud Logging.

## Optional Audit Backends

Optional audit persistence is disabled by default. It is enabled only by customer configuration:

- `AUDIT_GCS_BUCKET`
- `AUDIT_BIGQUERY_TABLE`
- `AUDIT_FIRESTORE_COLLECTION`

These backends are customer-managed and do not create a PMOMax-owned persistence requirement.

## Tenant Safety

PMOMax is designed so customer project data and audit evidence remain in customer-controlled infrastructure by default. No central PMOMax audit collection is required for traceability.
