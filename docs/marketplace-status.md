# PMOMax Marketplace Status

## Marketplace Package

- Schema version: `v2`
- Published version: `1.4.2`
- Deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.2`
- Deployer digest: `sha256:e88f97afce8003843bad66aabaf10f5f4590dd3e3dca1c3b3a70af8533de3120`
- UBB agent image: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.2`
- UBB agent digest: `sha256:ba544d5bdcadaa45ba43a68004935cde6b61e796a7897ae2804504ebf115978f`
- Marketplace metric name in manifest: `M1`

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

See `security_patch_report.md` for the 1.4.2 deployer rebuild that removed `CVE-2026-39892` from the completed Artifact Registry scan result for the new deployer digest.
