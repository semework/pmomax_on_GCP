# Google Cloud Marketplace – PMOMax Compliance Checklist

This document tracks PMOMax readiness for Google Cloud Marketplace listing, with a focus on security, privacy, support, and operational compliance.

## Summary Status

- Overall readiness: **In progress**
- Product: **PMOMax PID Architect (Cloud Run)**

## Compliance Checklist

Legend: Status = `✓` (done), `⧖` (in progress), `□` (not started)

| Area                          | Requirement / Control                                             | Status | Evidence / Link                                                   | Owner          | Target Date |
|-------------------------------|-------------------------------------------------------------------|:------:|-------------------------------------------------------------------|----------------|------------:|
| Product Overview              | Marketplace product description, use cases, and value props      |   ⧖   | README and intro content in [README.md](../README.md)            | Product Owner  |   2026-01-15 |
| Terms of Service              | Public ToS aligned to Google Marketplace terms                   |   ✓    | [TERMS.md](../TERMS.md)                                          | Legal / PMO    |      N/A |
| Privacy Policy                | Public privacy notice, data categories, retention, processors    |   ✓    | [PRIVACY.md](../PRIVACY.md)                                      | Legal / DPO    |      N/A |
| Support Policy                | Support channels, response targets, escalation paths             |   ✓    | [SUPPORT.md](../SUPPORT.md)                                      | Support Lead   |      N/A |
| SLA                           | Documented availability & response SLAs                          |   ✓    | [SLA.md](../SLA.md)                                              | SRE / PMO      |      N/A |
| Security & Vulnerabilities    | Coordinated disclosure, handling of vulns, patch timelines       |   ✓    | [VULNERABILITY_POLICY.md](../VULNERABILITY_POLICY.md)            | Security Lead  |      N/A |
| SBOM                          | SBOM generated for released images                               |   ✓    | SBOM JSONs in repo (e.g. [sbom-pmo-architect-1.0.16.json](../sbom-pmo-architect-1.0.16.json)) | Security Lead  |      N/A |
| Vulnerability Scans           | Regular container image scanning with gates on High/Critical     |   ✓    | Vuln reports in repo (e.g. [vuln-report-pmo-architect-1.0.16.json](../vuln-report-pmo-architect-1.0.16.json)) | Security Lead  |      N/A |
| Data Handling & Compliance    | Internal PMO/security compliance narrative for customer review   |   ⧖   | [compliance_report.md](../compliance_report.md) & [compliance_actions_progress.md](../compliance_actions_progress.md) | Compliance Lead |   2026-01-20 |
| Accessibility                 | Accessibility statement and known limitations                     |   ⧖   | [ACCESSIBILITY.md](../ACCESSIBILITY.md)                          | UX / Eng       |   2026-01-31 |
| Documentation Bundle          | Single customer-facing docs bundle (PID, support, SLAs, etc.)    |   ⧖   | Exportable docs under root and [docs/](.)                        | Product Owner  |   2026-02-01 |
| Operational Runbook           | On‑call, incident response, rollback, and change procedures      |   □    | To be captured in an internal SRE / PMO runbook                  | SRE / PMO      |   2026-02-15 |
| Logging & Monitoring          | Description of logs, metrics, alerting for the Cloud Run service |   □    | To be documented (Cloud Logging dashboards, alerts)              | SRE            |   2026-02-15 |
| Data Residency & Backups      | Statement on data location, backups, and restore objectives      |   □    | To be added to PRIVACY.md / SLA.md supplement                    | DPO / SRE      |   2026-02-29 |
| Marketplace Onboarding Forms  | All Google Marketplace questionnaires and forms completed         |   □    | To be tracked via Google Marketplace onboarding console          | Product Owner  |   2026-03-15 |

## Notes

- This checklist is scoped to the Google Cloud Marketplace technical and policy expectations for a SaaS app on Cloud Run.
- When a row moves from `⧖` to `✓`, update the Evidence/Link column with the canonical document or URL.
- For internal-only artifacts (runbooks, dashboards), reference the internal location or ticket ID.
