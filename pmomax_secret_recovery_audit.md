# PMOMax Secret Recovery Audit

Generated: 2026-05-22

## Executive Summary

No changes were made. No secret values were printed, decoded, exported, rotated, modified, or deleted.

Cluster deletion is **not yet safe from a secret-recovery perspective** until two Kubernetes-only secret value sets are confirmed recoverable outside `pmomax-auto`:

- `pmomax/pmo-architect-reporting-secret`
- PMOMax license secrets:
  - `pmomax/pmomax-license-998217`
  - `default/pmomax-license-998217`

The public Cloud Run runtime does not currently reference Secret Manager or Kubernetes secrets in its service spec. Its environment variables are plain configuration names, not Secret Manager refs. Cloud Run runtime secret recovery therefore does not block GKE deletion.

Secret Manager in `katalyststreet-public` contains only `my-google-api-key`; it does not contain PMOMax reporting or license secrets. Secret Manager in `pid-architect-ehlu1` contains `GOOGLE_API_KEY`, `VERTEX_LOCATION`, and `VERTEX_MODEL`; it does not contain PMOMax reporting or license secrets.

## No Changes Made

Actions performed were read-only:

- Local filename/reference inspection
- Local environment variable name inspection
- Cloud Run service metadata inspection
- Kubernetes secret metadata inspection
- Kubernetes deployment/pod secret reference inspection
- Secret Manager metadata inspection

No plaintext secret values were printed or written into this report.

## Local Environment Findings

Local env files found:

- `.env`

Populated key names found in `.env`:

- `PROJECT_ID`
- `GOOGLE_API_KEY`
- `PRODUCT_ID`
- `VERSION`
- `DEPLOYER_NAME`
- `REGION`
- `REGION_PRIMARY`
- `IMAGE_NAME`
- `IMAGE_TAG`
- `SERVICE_NAME`
- `GLOBAL_HOSTNAME`
- `REGIONAL_HOSTNAME`
- `AR_LOCATION`
- `AR_HOST`
- `DEPLOY_IMAGE`
- `MEMORY`
- `CPU`
- `TIMEOUT`
- `MAX_INSTANCES`
- `MIN_INSTANCES`
- `CONCURRENCY`
- `ENABLE_MONITORING`
- `ALERT_EMAIL`
- `ERROR_THRESHOLD_PERCENT`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `DEBUG`
- `LOG_LEVEL`
- `APP_LABEL`
- `ENV_LABEL`
- `OWNER_LABEL`
- `ENABLE_VULN_SCAN`
- `FAIL_ON_HIGH_VULNS`
- `MARKETPLACE_PROJECT_ID`
- `MARKETPLACE_PRODUCT_ID`
- `MARKETPLACE_SERVICE_NAME`
- `MARKETPLACE_USAGE_ENABLED`
- `MARKETPLACE_USAGE_FLUSH_MS`
- `MARKETPLACE_ACCESS_TOKEN`
- `MARKETPLACE_CONSUMER_ID`

Current shell environment key names found:

- `OPENAI_API_KEY`

Local PMOMax-related secret/reference files found:

- `deploy/values/reportingSecret`
- `deploy/params.env`
- `deploy/schema.yaml`
- `manifest/manifests.yaml.template`
- `deployer/deploy.sh`
- `REPORTS/service-account-key.yaml`

Important local findings:

- Local `.env` has `GOOGLE_API_KEY` and `MARKETPLACE_ACCESS_TOKEN` populated.
- Local process environment has `OPENAI_API_KEY` populated.
- `deploy/values/reportingSecret` and `deploy/params.env` define/reference a reporting secret name, but this is a reference/name, not proof that the underlying Kubernetes secret value is backed up.
- `REPORTS/service-account-key.yaml` exists and appears sensitive by filename/size, but this audit did not print or validate its contents. It may be relevant to reporting recovery, but equivalence to `pmo-architect-reporting-secret` is **unconfirmed**.
- Source code references `GOOGLE_API_KEY`, `OPENAI_API_KEY`, Gemini/Vite key names, and Marketplace config names.

## Cloud Run Secret Findings

Cloud Run service inspected:

- Project: `katalyststreet-public`
- Region: `us-east1`
- Service: `pmo-architect`
- Service account: `839982691485-compute@developer.gserviceaccount.com`

Cloud Run environment variable names:

- `MARKETPLACE_ENABLED`
- `MARKETPLACE_TEST_MODE`
- `MARKETPLACE_SERVICE_NAME`
- `MARKETPLACE_REPORT_ENDPOINT`
- `MARKETPLACE_USAGE_DEFAULT_METRIC`
- `MARKETPLACE_CONSUMER_ID`
- `NAMESPACE`
- `OPENAI_MODEL`
- `OPENAI_ASSISTANT_MODEL`
- `OPENAI_PARSE_MODEL`
- `OPENAI_BUDGET_MODEL`
- `OPENAI_FALLBACK_MODEL`

Cloud Run Secret Manager references:

- None found in the inspected service spec.

Cloud Run mounted secrets:

- None found in the inspected service spec.

Assessment:

- Cloud Run runtime configuration is recoverable from Cloud Run service metadata and `.env` references.
- Cloud Run does not appear to depend on `pmomax-auto` Kubernetes secrets.
- `MARKETPLACE_TEST_MODE` remains a configuration risk, but not a secret-recovery blocker.

## Kubernetes Secret Findings

Namespace `pmomax` secret metadata:

- `pmo-architect-reporting-secret`, type `Opaque`, created `2026-03-27T19:29:03Z`
- `pmomax-license-998217`, type `Opaque`, created `2026-04-22T20:27:54Z`

Other PMOMax-related Kubernetes secret metadata:

- `default/pmomax-license-998217`, type `Opaque`, created `2026-04-22T20:24:48Z`

Kubernetes deployment secret references:

- Deployment `pmomax/pmo-architect`
  - Container `ubbagent`
  - Env `AGENT_ENCODED_KEY` from secret `pmo-architect-reporting-secret`, key `reporting-key`
  - Env `AGENT_CONSUMER_ID` from secret `pmo-architect-reporting-secret`, key `consumer-id`
  - Volume `reporting-secret` from secret `pmo-architect-reporting-secret`

Kubernetes ConfigMaps:

- `pmomax/pmo-architect-ubbagent-config`
- `pmomax/kube-root-ca.crt`

Assessment:

- `pmo-architect-reporting-secret` is critical for the GKE UBB/reporting sidecar and future validation cluster recreation.
- PMOMax license secrets are critical if validation or customer-style install recreation requires the same license values.
- No equivalent Secret Manager secret was found by name.
- No confirmed local backup of these secret values was found.

## Secret Manager Findings

Project `katalyststreet-public`:

- Secret: `my-google-api-key`
- Version metadata: version `1`, enabled, created `2026-01-23T05:59:50Z`

Project `pid-architect-ehlu1`:

- Secret: `GOOGLE_API_KEY`
- Secret: `VERTEX_LOCATION`
- Secret: `VERTEX_MODEL`

Not found in Secret Manager metadata:

- `pmo-architect-reporting-secret`
- `pmomax-license-998217`
- `reporting-secret`
- `MARKETPLACE_ACCESS_TOKEN`
- `OPENAI_API_KEY`

Assessment:

- Google/Gemini API key material appears recoverable from local `.env` and Secret Manager metadata.
- OpenAI API key exists in current shell environment only during this audit; no local `.env` or Secret Manager copy was confirmed.
- Marketplace access token exists in local `.env`; no Secret Manager copy was confirmed.
- Kubernetes reporting/license secret values are not centralized in Secret Manager.

## Secret Dependency Map

| Secret/Variable | Used By | Source | Recoverable? | Critical? | Marketplace-sensitive? | Safe after cluster deletion? |
|---|---|---|---|---|---|---|
| `pmo-architect-reporting-secret` | GKE `pmomax/pmo-architect` UBB sidecar | Kubernetes only confirmed | No, not yet | High | Yes | No, backup first |
| `reporting-key` | `AGENT_ENCODED_KEY` | Key inside `pmo-architect-reporting-secret` | No, not yet | High | Yes | No, backup first |
| `consumer-id` | `AGENT_CONSUMER_ID` | Key inside `pmo-architect-reporting-secret` | No, not yet | High | Yes | No, backup first |
| `pmomax-license-998217` | PMOMax validation/customer-style install | Kubernetes only confirmed | No, not yet | High | Yes | No, backup first |
| `GOOGLE_API_KEY` | Local app/Gemini paths | `.env`, Secret Manager metadata | Yes, likely | Medium | No | Yes |
| `my-google-api-key` | Secret Manager key copy | Secret Manager | Yes | Medium | No | Yes |
| `OPENAI_API_KEY` | Server/runtime AI paths | Current shell env only confirmed | Partially; not durable from audit evidence | Medium | No | Needs durable backup if required |
| `MARKETPLACE_ACCESS_TOKEN` | Local Marketplace/test config | `.env` only confirmed | Yes locally, not centralized | Medium/high | Yes | Yes for GKE deletion, but back up securely |
| `MARKETPLACE_CONSUMER_ID` | Cloud Run/local Marketplace config | Cloud Run env name and `.env` | Yes | High | Yes | Yes |
| `MARKETPLACE_SERVICE_NAME` | Cloud Run/GKE/deployer config | Cloud Run, `.env`, manifests | Yes | High | Yes | Yes |
| `MARKETPLACE_REPORT_ENDPOINT` | Cloud Run metering config | Cloud Run | Yes | High | Yes | Yes |
| `pmo-architect-ubbagent-config` | GKE UBB sidecar | Kubernetes ConfigMap/export | Yes, config exported | High for validation recreation | Yes | Yes, if report secret values are separately backed up |
| `REPORTS/service-account-key.yaml` | Possible reporting credential source | Local file | Unconfirmed equivalence | High if it matches reporting key | Yes | Verify manually before deletion |

## Recoverable Secrets

Likely recoverable:

- `GOOGLE_API_KEY`, because it exists in `.env` and Secret Manager metadata exists in PMOMax-related projects.
- Marketplace config names and non-secret configuration values, because they exist in Cloud Run metadata, local `.env`, and manifests.
- `pmo-architect-ubbagent-config`, because the ConfigMap was exported and contains reference structure, not secret values.

Partially recoverable:

- `OPENAI_API_KEY`, because it exists in the current shell environment, but this audit did not confirm a durable local file or Secret Manager copy.
- `MARKETPLACE_ACCESS_TOKEN`, because it exists in `.env`, but no Secret Manager copy was found.

Not proven recoverable:

- `pmo-architect-reporting-secret`
- `pmomax-license-998217`

## Missing Secrets

Missing from Secret Manager:

- `pmo-architect-reporting-secret`
- `pmomax-license-998217`
- `reporting-secret`
- `MARKETPLACE_ACCESS_TOKEN`
- `OPENAI_API_KEY`

Missing from confirmed local env:

- `pmo-architect-reporting-secret` values
- `pmomax-license-998217` values

## Kubernetes-Only Secrets

Confirmed Kubernetes-only from audit evidence:

- `pmomax/pmo-architect-reporting-secret`
- `pmomax/pmomax-license-998217`
- `default/pmomax-license-998217`

This means deleting `pmomax-auto` before confirming backups may permanently lose values required for recreating the current validation/runtime cluster exactly.

## Marketplace-Sensitive Secrets

Marketplace-sensitive:

- `pmo-architect-reporting-secret`
- `reporting-key`
- `consumer-id`
- `pmomax-license-998217`
- `MARKETPLACE_ACCESS_TOKEN`
- `MARKETPLACE_CONSUMER_ID`
- `MARKETPLACE_SERVICE_NAME`
- `MARKETPLACE_REPORT_ENDPOINT`
- `pmo-architect-ubbagent-config`

Do not delete the cluster until the reporting and license secret values are confirmed recoverable.

## Cluster Deletion Safety Assessment

1. Can `pmomax-auto` be deleted without losing unrecoverable secrets?

No, not yet. Secret metadata is known, but values for reporting and license secrets are not proven recoverable outside Kubernetes.

2. Which secrets must be backed up first?

- `pmomax/pmo-architect-reporting-secret`
- `pmomax/pmomax-license-998217`
- `default/pmomax-license-998217`

3. Which secrets only exist in Kubernetes?

The three listed above are Kubernetes-only based on current evidence.

4. Which secrets are already safely duplicated?

- `GOOGLE_API_KEY` appears duplicated between local `.env` and Secret Manager metadata.
- Marketplace non-secret configuration is duplicated across Cloud Run and local/deployment files.

5. Which secrets are unnecessary leftovers?

None can be safely classified as unnecessary from secret metadata alone.

6. Which secrets are Marketplace-sensitive?

Reporting, consumer ID, Marketplace access token, and PMOMax license material are Marketplace-sensitive.

7. Which secrets are needed for future temporary validation cluster recreation?

- `pmo-architect-reporting-secret`
- `pmomax-license-998217`
- `pmo-architect-ubbagent-config`
- Marketplace service/consumer configuration
- Artifact Registry/deployer/runtime image access through normal GCP IAM

## Required Backups Before Deletion

Before approving cluster deletion, confirm secure backup/recovery source for:

- `pmomax/pmo-architect-reporting-secret`
- `pmomax/pmomax-license-998217`
- `default/pmomax-license-998217`
- Any equivalent secure source for `REPORTS/service-account-key.yaml`, if it is intended to recreate `reporting-key`
- Durable secure storage for `OPENAI_API_KEY`, if required by future validation/runtime paths
- Durable secure storage for `MARKETPLACE_ACCESS_TOKEN`, if used for Marketplace test or validation workflows

## Final Recommendation

Do not delete `pmomax-auto` yet from a secret-recovery perspective.

Deletion becomes reasonable only after a human confirms that the Kubernetes reporting and license secret values are backed up in an approved secure system, or confirms they are obsolete and not needed for future validation cluster recreation.

