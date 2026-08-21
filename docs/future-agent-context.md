# Future Agent Context

This repository is the PMOMax Marketplace/GCP deployment repository: `https://github.com/semework/pmomax_on_GCP.git`. Keep changes scoped to Marketplace packaging, deployment scripts, runtime deployment configuration, documentation, and explicitly requested UI/runtime files.

## Current Baseline

- Project: `katalyststreet-public`
- Marketplace deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.15`
- Marketplace deployer alias: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4`
- Deployer digest: `sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b`
- UBB agent digest: `sha256:0cb489e85b6f20af554837cb9a8a5fb4350bcdf910064ca5a80105b07bd9cb40`
- Last Marketplace validation fix: version `1.4.15` replaces all six kubectl copies and rebuilds UBB with Go 1.26.6 and `golang.org/x/net v0.58.0`; exact-digest Google scans report no CVE-2026-39821 and no effective High or Critical findings, and `mpdev verify` passes.
- Marketplace app runtime baseline digest before the About Video redeploy: `sha256:c81ce8d1c4f8bef48fa431727d464632e197734ead2f186d6ef8090978c6de8b`
- Hosted Cloud Run runtime after the About Video redeploy: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:about-video-audit-20260429-1720`
- Hosted Cloud Run runtime digest after the About Video redeploy: `sha256:b1bba17af4d969f6ca1073d745bb74d4b2fb559bdb63c689048caea765477ae4`
- Latest known deployment-repo baseline commit before this update: `6b06eaff9685a58ef9b748670bdcdff2c7afd0e0`

## Deployment Flow

- Marketplace deployer image: `./publish_marketplace_deployer.sh <version>`
- Marketplace in-cluster install path: `/bin/deploy_with_tests.sh`, which delegates to `/bin/deploy.sh` for install and then runs the tester job.
- Hosted Cloud Run runtime path: `./deploy-fast.sh`
- Runtime Dockerfile: `Dockerfile.cloudrun`
- Marketplace deployer Dockerfile: root `Dockerfile`

Do not use the root `Dockerfile` for the Cloud Run runtime app.

## AI Audit Traceability Answers

PMOMax supports configurable AI decision traceability for AI-assisted project outputs inside the customer tenant. The default audit trail is Winston JSON to stdout, captured by GKE or Cloud Run and stored in customer-owned Cloud Logging. The structured log event is `message="ai_decision_trace"`.

Important server symbols and routes live in `server.mjs`:

- `_auditMeta` and `_auditTrace` are attached by the `/api/ai` middleware.
- Trace levels are `meta`, `summary`, and `full`.
- Redaction defaults are controlled by `AUDIT_REDACT_KEYS`.
- Optional backends use `AUDIT_GCS_BUCKET`, `AUDIT_BIGQUERY_TABLE`, and `AUDIT_FIRESTORE_COLLECTION`.
- Retrieval route: `GET /api/audit/:requestId`.

Supported AI/audit endpoints include `/api/ai/parse`, `/api/ai/budget`, `/api/ai/assistant`, `/api/ai/risk`, and `/api/ai/compliance`.

## Documentation Rule

When changing deployment behavior, update `README.md` and `docs/marketplace-status.md`. When changing audit behavior, update `docs/ai-audit-traceability.md`.
