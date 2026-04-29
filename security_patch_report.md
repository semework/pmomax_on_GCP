# PMOMax Marketplace Deployer Security Patch Report

Date: 2026-04-29

## Objective

Rebuild the PMOMax Marketplace deployer image to patch CVE-2026-39892 and prepare the package for the 6-hour UBB validation run.

## Target

- Previous deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.1`
- Previous digest prefix: `sha256:6c5356ad21f27...`
- New deployer image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.2`
- New deployer digest: `sha256:e88f97afce8003843bad66aabaf10f5f4590dd3e3dca1c3b3a70af8533de3120`
- New UBB agent image: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.2`
- New UBB agent digest: `sha256:ba544d5bdcadaa45ba43a68004935cde6b61e796a7897ae2804504ebf115978f`
- Runtime app image for the test: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2`
- Runtime app digest: `sha256:c81ce8d1c4f8bef48fa431727d464632e197734ead2f186d6ef8090978c6de8b`

## Vulnerability Mitigation

The deployer Dockerfile was updated from:

```Dockerfile
FROM gcr.io/cloud-marketplace-tools/k8s/deployer_envsubst/onbuild:0.12.14
```

to:

```Dockerfile
FROM gcr.io/cloud-marketplace-tools/k8s/deployer_envsubst/onbuild:0.12.17
```

The build also forces operating-system package refresh during image creation:

```Dockerfile
RUN set -eux; \
    apt-get update; \
    apt-get -y upgrade; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*; \
    ...
```

The new Marketplace base image tag `0.12.17` was selected from the current Cloud Marketplace deployer image tags. The `0.12.14` base was no longer current.

## Build Evidence

Published with:

```bash
./publish_marketplace_deployer.sh 1.4.2
```

Cloud Build results:

- Deployer build ID: `748bf614-900e-45a4-b2bd-3800064fdc15`
- UBB agent build ID: `d4974851-4f86-46a2-98a5-2117f130051d`

Digest verification commands:

```bash
crane digest us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.2
crane digest us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.2
crane digest us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2
```

Observed digests:

```text
sha256:e88f97afce8003843bad66aabaf10f5f4590dd3e3dca1c3b3a70af8533de3120
sha256:ba544d5bdcadaa45ba43a68004935cde6b61e796a7897ae2804504ebf115978f
sha256:c81ce8d1c4f8bef48fa431727d464632e197734ead2f186d6ef8090978c6de8b
```

## Scan Evidence

Artifact Registry On-Demand Scanning command:

```bash
gcloud artifacts docker images scan \
  us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:e88f97afce8003843bad66aabaf10f5f4590dd3e3dca1c3b3a70af8533de3120 \
  --project katalyststreet-public \
  --remote \
  --format=json
```

Scan result:

```text
projects/katalyststreet-public/locations/us/scans/99bc782d-1532-4573-9b26-d946dea8d64c
```

CVE-specific verification command:

```bash
gcloud artifacts docker images list-vulnerabilities \
  projects/katalyststreet-public/locations/us/scans/99bc782d-1532-4573-9b26-d946dea8d64c \
  --project katalyststreet-public \
  --format='value(vulnerability.shortDescription)' | grep CVE-2026-39892
```

Result: no output, exit code `1`, which means `CVE-2026-39892` was not present in the completed scan results for the new deployer digest.

Docker Scout was available but not usable because Docker authentication was not active:

```text
Log in with your Docker ID or email address to use docker scout.
```

## Marketplace Configuration Updated

The deployment package now points to the patched deployer and compatible images:

- `publishedVersion`: `1.4.2`
- `deployer.image`: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.2`
- `deployerImageTag`: `1.4.2`
- `ubbagentImageTag`: `1.4.2`
- `PMOMAX_APP_IMAGE`: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2`
- `pmomaxAppTag`: `1.0.2`

This preserves compatibility between the patched deployer image and the application image used for billing during the 6-hour UBB test.

## Remaining Risk

Artifact Registry still reports other vulnerabilities inherited from the Ubuntu 22.04 Marketplace deployer base image and installed packages. This report only confirms that the targeted Marketplace deployer patch was rebuilt, published, retagged to `1.4.2`, and that `CVE-2026-39892` is not present in the completed Google On-Demand Scanning result for the new digest.
