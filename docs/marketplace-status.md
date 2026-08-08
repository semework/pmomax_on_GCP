# PMOMax Marketplace Status

## Marketplace Package

- Schema version: `v2`
- Candidate version: `1.4.8`
- Deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.8`
- Deployer digest: `sha256:091e081c36264630cee2f62b0242804a954dc5e42e26603e459272a629708386`
- UBB agent image: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.8`
- UBB agent digest: `sha256:b8f8cb61ee602e2b26356e86b7b40bed12024b8ade3860aa7cc31fb01eed354d`
- The moving `1.4` aliases now resolve to these same `1.4.8` digests for Producer Portal validation.
- Marketplace metric name in manifest: `M1`

## Online Validation Fix

The failed deployer digest `sha256:2433d22012fbda66239d25105e8b07f08fae13020400de0285f829406b0aa858` packaged `/data/schema.yaml` with invalid KubernetesAppSchemaV2 `title` fields. Google rejected it during `deployer-schema-extraction` with `Cannot find field: title in message cloud.commerce.common.display.v1.KubernetesAppSchemaV2`.

Use the fixed 1.4.8 deployer digest for the next Marketplace validation:

```text
us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:091e081c36264630cee2f62b0242804a954dc5e42e26603e459272a629708386
```

The packaged `/data/schema.yaml` in that image has no `title:` entries and includes `partnerId: katalyststreet` and `solutionId: pmomax`. Google Artifact Analysis completed on 2026-08-08 with no effective `HIGH` or `CRITICAL` findings for either candidate image. The UBB agent scan returned no vulnerability occurrences at any severity; the deployer scan returned only `MEDIUM`, `LOW`, and `MINIMAL` findings. The source release note is: `Rebuilt the UBB agent with patched OpenSSL and Go 1.26.5, pinned upstream source provenance, and upgraded the Marketplace deployer base to 13.0.9 (v1.4.8).`

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
