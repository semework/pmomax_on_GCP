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
- Stable Marketplace approval build: `1.4.1`
- `publishedVersion`: `1.4.1`
- Default deployer tag: `1.3`
- Deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.3`
- UBB agent image: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.1`
- Security posture: `1.4.1` uses the custom rebuilt UBB agent from `ubbagent.Dockerfile`, built with patched Go `1.26.2` and pinned in Artifact Registry for final Marketplace approval.
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

## Publish Deployer Image

```bash
cd PMOMax-On-GCP
BASE_TAG=1.3 ./publish_marketplace_deployer.sh 1.4.1
```

Optional buildx path:

```bash
cd PMOMax-On-GCP
./publish_marketplace_deployer_buildx.sh 1.3 3
```

## Marketplace Validation (Local)

```bash
cd PMOMax-On-GCP
./verify_marketplace_local.sh us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.3
```

Requires `mpdev` in `PATH`.

## Security / Hygiene

- Build context ignores are provided:
  - `.dockerignore`
  - `.gcloudignore`
- Local sensitive artifacts are ignored by `.gitignore` (credentials, temp files).
- Do not commit runtime secrets or service-account keys.
