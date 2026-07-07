# PMOMax-On-GCP

Google Cloud Marketplace packaging assets for PMOMax Kubernetes deployment.

## Scope

This package deploys the PMOMax runtime service (`pmo-architect`) through the Marketplace deployer flow.

## Key Files

- `schema.yaml`: Marketplace schema (v2 flattened format)
- `deploy/schema.yaml`: mirrored deploy schema
- `manifest/manifests.yaml.template`: Deployment + Service template
- `manifest/application.yaml.template`: Kubernetes Application CR
- `deployer/deploy.sh`: primary deploy script
- `deployer/deploy_with_tests.sh`: deploy + tester-job validation
- `publish_marketplace_deployer.sh`: build/publish deployer image
- `verify_marketplace_local.sh`: run local `mpdev verify`

## Current Baseline

- Schema version: `v2`
- Stable Marketplace approval build: `1.4.5`
- `publishedVersion`: `1.4.5`
- Default deployer tag: `1.4.5`
- Major/minor alias tag: `1.4`
- Deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.5`
- Deployer digest: `sha256:5e714c21b658f9b729e4142c9ce018e370957ec7bdcb51377e97afe7e98bb44a`
- Runtime app image: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2`
- UBB agent image: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.5`
- UBB agent digest: `sha256:48cc221733d187227e483241d3ef33d58d2d1f40ed36a140c42ca030c8630d8c`
- Security posture: `1.4.5` keeps the patched Marketplace deployer base `deployer_envsubst/onbuild:13.0.2`, refreshes the deployer kubectl default path, upgrades/removes stale Python package metadata flagged by scanners, rebuilds the UBB agent from `ubbagent.Dockerfile` with Go `1.26.3` and refreshed Alpine packages to mitigate CVE-2026-34182, and points runtime traffic at app image `1.0.2`.
- Required install fields:
  - `APP_INSTANCE_NAME`
  - `NAMESPACE`
  - `reportingSecret`

## Deployment Contract (Schema Fields)

Primary image/runtime fields:

- `deployerImageRegistry`
- `deployerImageRepo`
- `deployerImageTag`
- `PMOMAX_APP_IMAGE`
- `pmomaxAppRegistry`
- `pmomaxAppRepo`
- `pmomaxAppTag`
- `PMOMAX_APP_PORT`
- `TESTER_IMAGE`
- `testerImageRegistry`

Other deployment metadata:

- `DOMAIN`
- `deployerServiceAccount`
- `PARTNER_ID`
- `PRODUCT_ID`
- `GCP_PROJECT_ID`

## Runtime Profile

From `manifest/manifests.yaml.template`:

- Replicas: `2`
- Readiness probe: `/health`
- Liveness probe: `/health`
- Requests: `100m CPU`, `256Mi memory`
- Limits: `500m CPU`, `1Gi memory`


## Runtime Cloud Run Deployment

`deploy-fast.sh` is the production Cloud Run runtime deployment helper for the hosted PMOMax demo/service. It creates a minimal allowlisted Cloud Build context, stages `Dockerfile.cloudrun` as the runtime `Dockerfile`, builds `us-east1-docker.pkg.dev/<project>/apps/pmo-architect:<tag>`, and deploys the image to Cloud Run service `pmo-architect`.

The root `Dockerfile` is not the runtime app Dockerfile; it builds the Google Marketplace deployer image. Use `publish_marketplace_deployer.sh` only for Marketplace deployer/UBB image publication.

Recommended hosted runtime deploy command:

```bash
PROJECT_ID=katalyststreet-public \
REGION=us-east1 \
SERVICE_NAME=pmo-architect \
IMAGE_TAG=<release-tag> \
./deploy-fast.sh
```

## AI Audit / Traceability

PMOMax supports configurable AI decision traceability for AI-assisted project outputs. The default path is structured Winston JSON emitted to stdout, captured by GKE or Cloud Run, and queryable in customer-owned Cloud Logging. The structured log event uses `message="ai_decision_trace"`.

Traceability fields are attached to AI endpoint responses as `_auditMeta` and `_auditTrace`. `_auditMeta` includes `requestId`, `endpoint`, `modelId`, `source`, `inputLengthChars`, `fieldsPopulated`, `warningCount`, `durationMs`, and `generatedAt`. `_auditTrace` includes `requestId`, `endpoint`, `source`, `durationMs`, `timestamp`, `traceLevel`, `stepCount`, `stepLabels`, and `steps`.

Controls:

- `AUDIT_TRACE_LEVEL=meta|summary|full` controls whether steps include shapes only, redacted/truncated summaries, or full redacted content.
- `AUDIT_MAX_FIELD_CHARS=8000` controls summary truncation.
- `AUDIT_REDACT_KEYS=apiKey,password,token,authorization,secret,cookie,bearer` controls key-name redaction.
- Optional backends are enabled only when `AUDIT_GCS_BUCKET`, `AUDIT_BIGQUERY_TABLE`, or `AUDIT_FIRESTORE_COLLECTION` is set. They use dynamic imports and do not create a required persistence layer.

See `docs/ai-audit-traceability.md`, `docs/future-agent-context.md`, and `docs/marketplace-status.md` for retrieval and operating guidance.

## Publish Deployer Image

```bash
cd PMOMax-On-GCP
./publish_marketplace_deployer.sh 1.4.5
```

Optional buildx path:

```bash
cd PMOMax-On-GCP
./publish_marketplace_deployer_buildx.sh 1.3 3
```

## Marketplace Validation (Local)

```bash
cd PMOMax-On-GCP
./verify_marketplace_local.sh us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.5
```

Requires `mpdev` in `PATH`.

## Corrected External Materials

Use `docs/corrected-materials/` as the source of truth for current PMOMax promo copy, whitepaper language, user-guide language, technical summaries, and claim corrections. Older copied decks, reports, and draft collateral may contain unsupported claims and should not be reused without checking against that folder.

## Security / Hygiene

- Build context ignores are provided:
  - `.dockerignore`
  - `.gcloudignore`
- Local sensitive artifacts are ignored by `.gitignore` (credentials, temp files).
- Do not commit runtime secrets or service-account keys.
