# PMOMax Marketplace Status

## Marketplace Package

- Schema version: `v2`
- Published version: `1.4.5`
- Deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.5`
- Deployer alias tag: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4`
- Deployer digest: `sha256:5e714c21b658f9b729e4142c9ce018e370957ec7bdcb51377e97afe7e98bb44a`
- UBB agent image: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.5`
- UBB agent alias tag: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4`
- UBB agent digest: `sha256:48cc221733d187227e483241d3ef33d58d2d1f40ed36a140c42ca030c8630d8c`
- Marketplace metric name in manifest: `M1`

## Online Validation Fix

The failed deployer digest `sha256:2433d22012fbda66239d25105e8b07f08fae13020400de0285f829406b0aa858` packaged `/data/schema.yaml` with invalid KubernetesAppSchemaV2 `title` fields. Google rejected it during `deployer-schema-extraction` with `Cannot find field: title in message cloud.commerce.common.display.v1.KubernetesAppSchemaV2`.

Use the fixed 1.4.5 deployer digest for the next Marketplace validation:

```text
us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:5e714c21b658f9b729e4142c9ce018e370957ec7bdcb51377e97afe7e98bb44a
```

The packaged `/data/schema.yaml` in that image has no `title:` entries, includes `partnerId: katalyststreet` and `solutionId: pmomax`, and the Artifact Analysis scan `projects/katalyststreet-public/locations/us/scans/4d57b6cb-a85e-4156-bfc9-736b19395651` returned no effective `HIGH` or `CRITICAL` findings. The source release note is: `Improved Create Agent, governance, AI audit logging, mitigated CVE-2026-34182 in the UBB agent rebuild, and refreshed deployer validation tooling (v1.4.5).`

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
