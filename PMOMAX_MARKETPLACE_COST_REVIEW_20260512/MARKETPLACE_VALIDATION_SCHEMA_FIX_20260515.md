# PMOMax Marketplace Validation Schema Fix - 2026-05-15

## Failure

Google Cloud Marketplace online validation failed during deployer schema extraction:

```text
TEST_K8S_APP_FUNCTIONALITY
Unable to start verification.
Failed to parse schema from deployer us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:2433d22012fbda66239d25105e8b07f08fae13020400de0285f829406b0aa858.
Cannot find field: title in message cloud.commerce.common.display.v1.KubernetesAppSchemaV2
```

## Root Cause

The failing deployer digest packaged `/data/schema.yaml` with invalid KubernetesAppSchemaV2 fields:

- top-level `title: PMOMax PID Architect`
- top-level `description: Improved Create Agent...`
- nested `properties.deployerServiceAccount.title`

The repo schema and the deployer image schema must be treated separately. The failing digest was exported and inspected directly before making the fix.

## Fix

The fixed `1.4.2` / `1.4` deployer tags remove the invalid `title` fields from both active schema files and package the corrected schema into the deployer image. The source schema also adds explicit v2 metadata:

```yaml
x-google-marketplace:
  schemaVersion: v2
  applicationApiVersion: v1beta1
  partnerId: katalyststreet
  solutionId: pmomax
  publishedVersion: "1.4.2"
```

The deployer service account role definition is now under `x-google-marketplace.deployerServiceAccount`, matching Marketplace v2 schema examples.

## Published Images

Use this deployer digest for the next Producer Portal validation:

```text
us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:12a649ff0f38b69b6410cf0ebc74d706016359d86b7ec20f7d43a7356484a4a7
```

Companion UBB agent:

```text
us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent@sha256:affb58eaa7a1e21c67b48aa97a73cac1ea53e33e0d57243a981ccf5fb47d2715
```

## Verification Completed

- Exported the new deployer image and inspected packaged `/data/schema.yaml`.
- Confirmed packaged schema has no `title:` entries.
- Confirmed packaged schema has `publishedVersion: "1.4.2"` and release note `Improved Create Agent, governance, AI audit logging, and mitigated CVE-2026-39892 (v1.4.2), YouTube link added.`
- Validated packaged schema with local Marketplace `config_helper.Schema.validate()`.
- Confirmed deployer tags `1.4.2` and `1.4` resolve to `sha256:12a649ff0f38b69b6410cf0ebc74d706016359d86b7ec20f7d43a7356484a4a7`.
- Confirmed deployer and UBB images carry `com.googleapis.cloudmarketplace.product.service.name=services/pmo-max.endpoints.katalyststreet-public.cloud.goog`.
