# Google Marketplace CVE-2026-39821 Remediation

## Notice and scope

- Deadline: 2026-09-17
- Solution: `pmo-max.endpoints.katalyststreet-public.cloud.goog`
- Affected deployer: `gcr.io/cloud-marketplace/katalyststreet-public/pmomax/deployer@sha256:091e081c36264630cee2f62b0242804a954dc5e42e26603e459272a629708386`
- Affected UBB agent: `gcr.io/cloud-marketplace/katalyststreet-public/pmomax/ubbagent@sha256:b8f8cb61ee602e2b26356e86b7b40bed12024b8ade3860aa7cc31fb01eed354d`

The canonical tested package was preserved. Remediation was performed in the separate `pmo26_mcp_enterprise_cve_fixed` copy. `BEFORE_CHANGE_SHA256_MANIFEST.txt` records the before-change file checksums.

## Authoritative advisory references

- Go vulnerability database: https://pkg.go.dev/vuln/GO-2026-5026
- NVD: https://nvd.nist.gov/vuln/detail/CVE-2026-39821
- Google Artifact Analysis on-demand scanning: https://cloud.google.com/container-analysis/docs/on-demand-scanning
- Google Cloud Marketplace Kubernetes environment and Artifact Analysis requirements: https://docs.cloud.google.com/marketplace/docs/partners/kubernetes/set-up-environment

The Go advisory fixes `golang.org/x/net/idna` in `golang.org/x/net v0.55.0`. PMOMax uses `v0.58.0`, above the required fixed floor.

## Root cause and binary provenance

The affected deployer contained six kubectl executables. The old SBOM showed Go `1.26.5` and `golang.org/x/net v0.49.0`. Five copies were initially apparent under `/usr/local/bin/kubectl` and `/opt/kubectl/{1.30,1.31,1.35,1.36}/kubectl`; exhaustive final-filesystem enumeration also found `/opt/kubectl/v1.36/kubectl`. Google attributed CVE-2026-39821 to that Go 1.26.5 component until every path was replaced and the deployer was flattened to remove superseded base-image layers.

The affected UBB digest was a pinned legacy artifact. Its old SBOM showed Go `1.26.5` and `golang.org/x/net v0.56.0`; although that `x/net` version is above the Go advisory's fixed floor, Google identified the old image digest as affected. It was not reused. UBB was rebuilt from pinned upstream commit `fd35696cd9ed2858aa7f23da65c48c575347c268` with Go `1.26.6`, `golang.org/x/net v0.58.0`, `golang.org/x/text v0.41.0`, `golang.org/x/crypto v0.55.0`, and `google.golang.org/grpc v1.83.1`, on a pinned distroless Debian 12 runtime.

## Remediation

- Deployer kubectl: Kubernetes `v1.36.3`, built from source with Go `1.26.6`, `golang.org/x/net v0.58.0`, and `golang.org/x/text v0.41.0`.
- Every kubectl location, including `/opt/kubectl/v1.36/kubectl`, is replaced.
- Deployer final filesystem is flattened before the final Marketplace annotation/tag is published.
- UBB agent is rebuilt from pinned source with patched modules and a scan-compatible pinned distroless runtime.
- Final Marketplace release version: `1.4.15`.
- The deployer, schema, packaged `params.env.template`, manifest, test values, documentation, and Cloud Build pipeline all resolve to `1.4.15`.
- No vulnerability suppression, ignore rule, or whitelist was added.

## Files modified or added

- `Dockerfile`
- `ubbagent.Dockerfile`
- `ubbagent-entrypoint.go`
- `schema.yaml`
- `deploy/schema.yaml`
- `deploy/params.env`
- `deploy/test-values.yaml`
- `manifest/application.yaml.template`
- `cloudbuild.marketplace-cve.yaml`
- `cloudbuild.validation.yaml`
- `README.md`
- `requirements-mcp-dev.lock`
- `docs/marketplace-status.md`
- `docs/future-agent-context.md`
- `deployer-sbom.json`
- `ubbagent-sbom.json`
- `remediation-evidence/`

## Final images

| Image | Tag | Immutable digest |
|---|---|---|
| Deployer | `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.15` | `sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b` |
| UBB agent | `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.15` | `sha256:0cb489e85b6f20af554837cb9a8a5fb4350bcdf910064ca5a80105b07bd9cb40` |

Build provenance: Cloud Build `93345bef-50dc-436d-a1d5-e8370e7f2185`; clean builds use `--pull` and `--no-cache`. The final pipeline pushes intermediate images, flattens the deployer, and adds `com.googleapis.cloudmarketplace.product.service.name=services/pmo-max.endpoints.katalyststreet-public.cloud.goog` as a manifest annotation.

## SBOM and binary evidence

CycloneDX SBOMs are `deployer-sbom.json` and `ubbagent-sbom.json`. Final expected dependency evidence, verified again against the 1.4.15 digests before packaging:

| Image | Go | `golang.org/x/net` | `golang.org/x/text` | gRPC |
|---|---:|---:|---:|---:|
| Deployer | 1.26.6 | v0.58.0 | v0.41.0 | n/a |
| UBB agent | 1.26.6 | v0.58.0 | v0.41.0 | v1.83.1 |

## Vulnerability results

Final exact-digest results are recorded under `remediation-evidence/final/`. No finding is ignored or suppressed.

The complete local suite, clean/no-cache container builds, SBOM generation, and Trivy/Grype validation were repeated from the canonical `pmo26` worktree on 2026-08-21. See `CANONICAL_REVALIDATION_2026-08-21.md`.

| Image | Digest | Critical | High | CVE-2026-39821 | Scanner | Timestamp |
|---|---|---:|---:|---|---|---|
| Deployer | `sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b` | 0 | 0 | NOT DETECTED | Google On-Demand Artifact Analysis | 2026-08-20 America/New_York |
| UBB agent | `sha256:0cb489e85b6f20af554837cb9a8a5fb4350bcdf910064ca5a80105b07bd9cb40` | 0 | 0 | NOT DETECTED | Google On-Demand Artifact Analysis | 2026-08-20 America/New_York |
| Deployer | `sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b` | 0 | 0 | NOT DETECTED | Trivy and Grype | 2026-08-20 America/New_York |
| UBB agent | `sha256:0cb489e85b6f20af554837cb9a8a5fb4350bcdf910064ca5a80105b07bd9cb40` | 0 | 0 | NOT DETECTED | Trivy and Grype | 2026-08-20 America/New_York |
| Marketplace application 1.0.2 | `sha256:c81ce8d1c4f8bef48fa431727d464632e197734ead2f186d6ef8090978c6de8b` | 8 | 51 | NOT DETECTED | Google On-Demand Artifact Analysis | 2026-08-20 America/New_York |
| MCP validation image | `sha256:96c6d4a78762e80e41c553804462998bd2ba5d4d370e8cb63904425644eb24bc` | 4 | 6 | NOT DETECTED | Google On-Demand Artifact Analysis | 2026-08-20 America/New_York |

The existing Marketplace application and the separate MCP validation image were scanned for regression visibility but are not the two images identified in Google's action-required notice. Their unrelated Google findings are preserved in the evidence JSON and were not suppressed.

## PMOMax regression results

Actual current package counts:

- Python/MCP pytest: 11/11
- Vitest: 16/16 in 3 files
- Playwright: 6/6 across Chromium, Firefox, and WebKit
- MCP tool discovery/invocation: 13/13 tools
- MCP resource discovery: 7/7 resource templates
- TypeScript: pass
- ESLint: pass with zero warnings
- Ruff, scoped to `pmomax_mcp mcp_tests`: pass
- mypy, product source: pass (6 files)
- frontend production build: pass (441 modules; non-failing size warning)
- npm audit: 0 vulnerabilities
- locked Python requirements audit: 0 vulnerabilities
- application and MCP clean/no-cache Cloud Build: pass, build `5aee700e-4a1c-4854-b249-6edd5808d1a7`
- deployer and UBB clean/no-cache Cloud Build: pass, build `93345bef-50dc-436d-a1d5-e8370e7f2185`
- YAML parsing and Marketplace default consistency: pass

A diagnostic repository-wide Ruff run also reported 519 pre-existing findings in unrelated report/media-generation utilities, and mypy including test files reported 17 test-typing findings. The configured product quality gates above pass; these broader diagnostics are retained rather than concealed.

## Marketplace and UBB validation

- Official `mpdev doctor`: PASS (`Everything looks good to go!!`) on an ephemeral GKE Autopilot validation cluster.
- Official `mpdev verify` against the final immutable deployer digest: PASS. The deployer completed, both application pods reached 2/2 Running, the tester returned `{"ok":true}`, and cleanup completed. Transient Autopilot scheduling warnings resolved automatically and did not affect the PASS verdict.
- UBB local non-root startup/config expansion: PASS; the agent listened on port 6080 using a disk-only test endpoint.
- Live billing submission: NOT TESTED; no real reporting credential or billable customer entitlement was used.
- Producer Portal final submission/processing: external Google-side step after this package is uploaded.

## Remaining external items

Producer Portal resubmission and Google-side processing remain. A live billable customer transaction was not performed because no real reporting credential or customer entitlement was used; UBB startup, configuration, deployment, and Marketplace integration passed locally and in `mpdev verify`.
