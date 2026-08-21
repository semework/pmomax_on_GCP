# PMOMax Marketplace Status

## Marketplace Package

- Schema version: `v2`
- Candidate version: `1.4.15`
- Deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.15`
- Deployer digest: `sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b`
- UBB agent image: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.15`
- UBB agent digest: `sha256:0cb489e85b6f20af554837cb9a8a5fb4350bcdf910064ca5a80105b07bd9cb40`
- Marketplace metric name in manifest: `M1`

## CVE-2026-39821 Remediation

Use the fixed 1.4.15 deployer digest for Marketplace validation:

```text
us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b
```

Google On-Demand Artifact Analysis completed on 2026-08-20 with no effective `HIGH` or `CRITICAL` findings and no CVE-2026-39821 for either replacement image. Every deployer kubectl copy and the UBB agent use Go 1.26.6 and `golang.org/x/net v0.58.0`.

## Runtime Image

Marketplace schema defaults currently point to:

```text
us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2
```

The hosted Cloud Run service can use newer timestamp or release tags built by `deploy-fast.sh`.

Current hosted Cloud Run runtime after the About Video / audit-doc redeploy:

```text
us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:about-video-audit-20260429-1720
sha256:b1bba17af4d969f6ca1073d745bb74d4b2fb559bdb63c689048caea765477ae4
```

## Correct Scripts

- `publish_marketplace_deployer.sh`: builds and publishes the Marketplace deployer image and UBB agent image.
- `deployer/deploy_with_tests.sh`: Marketplace container entrypoint for install/test/delete behavior.
- `deployer/deploy.sh`: in-cluster Kubernetes install implementation used by `deploy_with_tests.sh`.
- `deploy-fast.sh`: hosted Cloud Run runtime build and deployment helper.

## Cloud Run Service

Hosted service name: `pmo-architect`
Region: `us-east1`
Public URL: `https://pmo-architect-839982691485.us-east1.run.app/`

`deploy-fast.sh` preserves the existing Cloud Run service identity and configuration unless explicit deployment flags or environment variables are changed.

## Security Patch Reference

See `security_patch_report.md` for the 1.4.2 deployer rebuild that removed `CVE-2026-39892` from the completed Artifact Registry scan result. The current 1.4.2 tags carry the fixed schema-extraction image digest.
