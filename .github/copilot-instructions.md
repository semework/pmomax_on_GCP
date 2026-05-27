# PMOMax Marketplace Deployment Rules (v1.0)
## 1. Schema Formatting (V2 Compliance)
- NO `apiVersion` or `kind` at the root of `schema.yaml`.
- Properties and `x-google-marketplace` must be at the ROOT level (Flattened).
- Always include `deployerImageRegistry`, `pmomaxAppRegistry`, and `testerImageRegistry` in the `properties` block.
## 2. Shell Script Hardening
- In `deploy_with_tests.sh`, use SELECTIVE `envsubst` (e.g., envsubst '${VAR}').
- NEVER use global envsubst on scripts; it destroys shell variables like `$ATTEMPTS`.
## 3. Infrastructure Limits
- Memory: 256Mi (Request) / 512Mi (Limit)
- CPU: 100m (Request) / 500m (Limit)
## 4. Release Protocol
- Internal build tag: 1.0.10
- Portal-facing tag: 1.2
- `publishedVersion` in schema files must use patch SemVer (`x.y.z`), current standard: `1.2.0`.
- Mandatory OCI Label: "com.googleapis.cloudmarketplace.product.service.name"="services/pmo-max.endpoints.katalyststreet-public.cloud.goog"
