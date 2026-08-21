# Google Cloud Marketplace form fields — PMOMax 1.4.15

## Product identity

- Product name: `PMOMax`
- Solution ID / service name: `pmo-max.endpoints.katalyststreet-public.cloud.goog`
- Partner ID: `katalyststreet-public`
- Product type: `Kubernetes app`
- Release version: `1.4.15`
- Remediation deadline: `2026-09-17`

## Description

### Short description

PMOMax is an enterprise project-management and project-initiation platform that converts project inputs into governed, auditable plans, schedules, risks, budgets, compliance findings, and executive-ready deliverables on Google Cloud.

### Detailed description

PMOMax deploys as a Kubernetes application on Google Kubernetes Engine. It provides structured project initiation, planning, governance, risk, schedule, cost, compliance, search, and export workflows. The package includes the PMOMax application, a Google Cloud Marketplace deployment container, usage-based billing integration, health checks, configurable resource settings, and an optional enterprise MCP service. Runtime data and logs remain in the customer's Google Cloud environment. The deployment uses two application replicas by default and exposes readiness and liveness checks at `/health`.

### Release/remediation description

PMOMax 1.4.15 remediates CVE-2026-39821. Every kubectl executable in the deployer was replaced with Kubernetes v1.36.3 built using Go 1.26.6, `golang.org/x/net v0.58.0`, and `golang.org/x/text v0.41.0`. The UBB agent was rebuilt from pinned source using Go 1.26.6 and `golang.org/x/net v0.58.0`. Exact-digest Google Artifact Analysis, Trivy, and Grype scans do not detect CVE-2026-39821 and report zero Critical and zero High findings for both replacement Marketplace images. `mpdev doctor` and `mpdev verify` passed.

## Source and documentation

- Public Git repository: `https://github.com/semework/pmomax_on_GCP`
- Remediation branch: `https://github.com/semework/pmomax_on_GCP/tree/agent/patch-pmomax-marketplace-images`
- User guide / deployment documentation: `https://github.com/semework/pmomax_on_GCP/blob/agent/patch-pmomax-marketplace-images/README.md`
- License file: `https://github.com/semework/pmomax_on_GCP/blob/agent/patch-pmomax-marketplace-images/LICENSE`
- Remediation report: `https://github.com/semework/pmomax_on_GCP/blob/agent/patch-pmomax-marketplace-images/GOOGLE_MARKETPLACE_CVE_2026_39821_REMEDIATION.md`
- Support URL: `https://github.com/semework/pmomax_on_GCP/issues`

## Deployment images

- Deployer tag: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.15`
- Deployer immutable image: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b`
- UBB agent tag: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.15`
- UBB immutable image: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent@sha256:0cb489e85b6f20af554837cb9a8a5fb4350bcdf910064ca5a80105b07bd9cb40`
- Application image: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.0.2`
- Default application port: `8080`
- Health endpoint: `/health`

## Security remediation

- CVE: `CVE-2026-39821`
- Status: `Remediated`
- Root cause: `Six kubectl executables in the affected deployer were built with Go 1.26.5 and golang.org/x/net v0.49.0. The legacy UBB image identified in the notice was also replaced.`
- Fixed component: `Kubernetes kubectl v1.36.3 and rebuilt UBB agent using Go 1.26.6 with golang.org/x/net v0.58.0.`
- Old deployer digest: `sha256:091e081c36264630cee2f62b0242804a954dc5e42e26603e459272a629708386`
- New deployer digest: `sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b`
- Old UBB digest: `sha256:b8f8cb61ee602e2b26356e86b7b40bed12024b8ade3860aa7cc31fb01eed354d`
- New UBB digest: `sha256:0cb489e85b6f20af554837cb9a8a5fb4350bcdf910064ca5a80105b07bd9cb40`
- Google Artifact Analysis: `PASS — exact-digest scans completed with 0 Critical, 0 High, and CVE-2026-39821 not detected for both replacement images.`
- Marketplace validation: `PASS — mpdev doctor and mpdev verify completed successfully against the final immutable deployer digest.`

## Validation summary

- Python/MCP tests: `11/11 passed`
- Vitest: `16/16 passed`
- Playwright: `6/6 passed across Chromium, Firefox, and WebKit`
- MCP tools: `13/13`
- MCP resources: `7/7`
- TypeScript: `PASS`
- ESLint: `PASS with zero warnings`
- Ruff: `PASS`
- mypy: `PASS`
- Frontend production build: `PASS, 441 modules`
- npm audit: `0 vulnerabilities`
- Python locked-dependency audit: `0 vulnerabilities`

## Submission notes

The Marketplace manifest and schema resolve to release 1.4.15 and no longer reference either affected digest. Both replacement images include the required Cloud Marketplace service-name annotation. Usage-based billing startup, configuration, deployment, and Marketplace integration were validated; no live billable customer transaction was generated during testing.
