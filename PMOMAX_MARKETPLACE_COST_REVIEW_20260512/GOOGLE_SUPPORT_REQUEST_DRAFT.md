# Google Support Request Draft

## Executive Summary

PMOMax has a vulnerability remediation release ready (`1.4.2`) with patched deployer and UBB images and a release note mentioning `CVE-2026-39892`. The current blocker is not engineering readiness; it is that the Google Cloud Marketplace / Partner Portal is not allowing edit/update of the listing image and release information. The support request should also ask Google to review unexpected Marketplace validation/testing/remediation expenses, while clearly separating normal runtime costs from testing, security scanning, UBB validation, and media/demo generation.

## Primary Request: Marketplace Listing Edit/Resubmission Blocked

Subject:

```text
PMOMax Marketplace update blocked: patched deployer image and release note ready, Partner Portal edit/resubmission unavailable
```

Message:

```text
Hello Google Cloud Marketplace Support,

We are requesting help with the PMOMax / PID Architect Marketplace listing for partner Katalyst Street.

The vulnerability remediation release is ready:

- Product/service: PMOMax
- Marketplace service: pmo-max.endpoints.katalyststreet-public.cloud.goog
- Project: katalyststreet-public
- Target version: 1.4.2
- Patched deployer image: us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.2
- Patched deployer digest: sha256:e88f97afce8003843bad66aabaf10f5f4590dd3e3dca1c3b3a70af8533de3120
- Patched UBB agent image: us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.2
- UBB agent digest: sha256:ba544d5bdcadaa45ba43a68004935cde6b61e796a7897ae2804504ebf115978f
- Runtime app image for release package: us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2
- Runtime app digest: sha256:c81ce8d1c4f8bef48fa431727d464632e197734ead2f186d6ef8090978c6de8b
- Release note: Improved Create Agent, governance, AI audit logging, and mitigated CVE-2026-39892.

We have the patched deployer image and release note ready, but the Partner Portal is not allowing us to edit or resubmit the listing image/release information. Please enable edit access or advise the correct resubmission path.

The package has been updated locally to publishedVersion 1.4.2 and points to the patched deployer/UBB/runtime images. The CVE-specific scan check for CVE-2026-39892 on the patched deployer digest did not return the targeted CVE in the completed scan results.

Please advise how to proceed so the Marketplace listing can be updated with the patched image and release information.
```

## Secondary Request: Credit / Reimbursement Review

Subject:

```text
Request review of PMOMax Marketplace validation/testing/remediation charges
```

Message:

```text
Hello Google Cloud Billing / Marketplace Support,

We are requesting a factual review of Google Cloud charges incurred while preparing and validating the PMOMax / PID Architect Google Cloud Marketplace listing.

We are not asking Google to treat all PMOMax costs as unexpected. PMOMax has normal runtime costs for GKE, Artifact Registry, Cloud Logging/Monitoring, Secret Manager, Service Control/UBB metering, Cloud Build during releases, and related Marketplace infrastructure.

However, some costs appear to have been incurred specifically during Marketplace validation, UBB testing, vulnerability remediation, image rebuilds, security scanning, and demo/media generation rather than normal production operation.

Observed examples:

- Marketplace UBB/metering validation usage:
  - Service: PMOMax
  - SKU: PMO-Max Pricing By Tokens Tokens Usage
  - Project: pid-architect-ehlu1
  - April 2026 gross amount: $209.36
  - Billing export shows this was credited to $0.00 net in April, but we would like confirmation this is expected Marketplace validation/producer behavior.

- Security remediation and scanning:
  - On-Demand Scanning and Security Command Center charges appeared during vulnerability remediation and image validation.
  - Patched deployer image 1.4.2 was built for CVE-2026-39892 mitigation.

- Marketplace/deployment experimentation:
  - Multiple Artifact Registry images and Cloud Build runs were created for Marketplace packaging, deployer, UBB agent, app image testing, and validation.
  - Artifact Registry contains many historical PMOMax app image digests from testing and release attempts.

- GKE validation/runtime:
  - The PMOMax Marketplace runtime runs on GKE Autopilot cluster pmomax-auto in project katalyststreet-public.
  - There are old forensic/test namespaces and deployer jobs that appear related to validation/testing rather than ongoing production runtime.

- Media/demo generation:
  - Vertex AI Veo 3 audio/video generation charges totaling approximately $513.60 gross in February appear related to PMOMax marketing/demo materials, not normal Marketplace runtime.

Please review whether any unexpected Marketplace validation, UBB testing, vulnerability remediation, or submission-blocker-related expenses can be credited, replaced, or otherwise adjusted. We understand normal PMOMax runtime costs remain our responsibility; this request is limited to charges caused by validation/remediation/submission workflows and any charges that Google considers abnormal for Marketplace publisher testing.

We can provide the workbook, billing export rows, security patch report, UBB logs, and resource inventory on request.
```

## Evidence Summary To Attach

| Evidence | Notes |
|---|---|
| `security_patch_report.md` | Shows patched deployer/UBB/app images, digests, scan result, release readiness |
| `deploy/schema.yaml` | Shows `publishedVersion: 1.4.2` and CVE release note |
| `README.md` | Shows current release baseline and Marketplace image contract |
| `final_ubb_logs.json` | Shows successful Service Control report flush |
| `sustained_ubb_6hr_logs.json` | Shows 6-hour UBB send events |
| `RESOURCE_INVENTORY.md` | Active resources and cleanup candidates |
| `COST_CLASSIFICATION.md` | Separates runtime, testing, validation, media, and uncertain costs |
| Billing workbook | Gross Jan-Apr 2026 service/SKU costs |
| BigQuery export rows | April gross/net/credit confirmation |

## What Not To Claim

Do not claim the full `$1,865.66` workbook total is unexpected PMOMax runtime cost. The defensible framing is:

- `$210.08` is directly labeled PID Architect / PMOMax in the workbook.
- A broader set of GKE, networking, logging/monitoring, Artifact Registry, Cloud Build, Cloud Run, storage, and Secret Manager costs are PMOMax Marketplace infrastructure or validation-related.
- Veo/video generation and some App Engine/Compute costs should be separated as media/demo, legacy, or uncertain.
- April BigQuery export shows major credits, so support should review net invoice impact rather than only gross usage.

