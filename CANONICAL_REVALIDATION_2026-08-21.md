# PMOMax canonical remediation revalidation — 2026-08-21

Worktree: `pmo26`

## Functional and quality gates

- Python/MCP pytest: 11/11 passed.
- Vitest: 16/16 passed in 3 files.
- Playwright: 6/6 passed across Chromium, Firefox, and WebKit using the local production server.
- MCP catalog: 13 tools and 7 resource templates verified by the MCP tests.
- TypeScript: passed.
- ESLint: passed with zero warnings.
- Ruff: passed for `pmomax_mcp` and `mcp_tests`.
- mypy: passed for 6 product source files.
- Frontend production build: passed; 441 modules transformed.
- npm audit: 0 vulnerabilities.
- pip-audit against both locked MCP requirement files: no known vulnerabilities.
- YAML parsing: passed for Marketplace schema, deployment schema, test values, app manifest, Marketplace manifest template, runtime deployment, and MCP deployment.

## Clean container builds

- PMOMax application: passed with `--pull --no-cache`; local image ID `sha256:e7e683cb99902710358f768112481108e5f778af0bf876fd5e2dd0bf01156a37`.
- MCP server: passed with `--pull --no-cache`; local image ID `sha256:20fbdc735396c289048eb37c93bf9ab27d7e589609559fa02b9903eabd60e137`.
- Marketplace deployer: passed with `--pull --no-cache`; local image ID `sha256:a0d46e5262da502862cb885c3aa441a45c48ccbe6ba34975ec11695ba92569f6`.
- UBB agent: passed with `--pull --no-cache`; local image ID `sha256:4436277cba6646f65edd3c1acb915a7d6f8de9cde3023a9a3e56238333aa31c9`.
- UBB startup: passed as UID/GID 65532:65532; agent listened on port 6080 with the disk-only validation endpoint.

## CVE validation

Fresh Syft SBOMs for the published immutable images resolve Go 1.26.6, `golang.org/x/net v0.58.0`, and `golang.org/x/text v0.41.0`.

| Image | Scan target | Critical | High | CVE-2026-39821 |
|---|---|---:|---:|---|
| Published deployer | `sha256:c423df13747dbb680ad7413c7b6aeafc2230d90fae715d8bd850af7596aa682b` | 0 | 0 | NOT DETECTED |
| Published UBB agent | `sha256:0cb489e85b6f20af554837cb9a8a5fb4350bcdf910064ca5a80105b07bd9cb40` | 0 | 0 | NOT DETECTED |
| Canonical clean deployer rebuild | `sha256:a0d46e5262da502862cb885c3aa441a45c48ccbe6ba34975ec11695ba92569f6` | 0 | 0 | NOT DETECTED |
| Canonical clean UBB rebuild | `sha256:4436277cba6646f65edd3c1acb915a7d6f8de9cde3023a9a3e56238333aa31c9` | 0 | 0 | NOT DETECTED |

Published-image results were independently regenerated with Trivy and Grype. Canonical clean-rebuild results were generated with Trivy. Google On-Demand Artifact Analysis evidence for the exact immutable published digests remains under `remediation-evidence/final/`; both Google scans report zero Critical, zero High, and CVE-2026-39821 not detected.

## Marketplace validation

- `mpdev doctor`: PASS.
- `mpdev verify`: PASS against the final immutable deployer digest.
- Required Marketplace service-name annotation: present on deployer and UBB images.
- Affected digests: absent from active deployment configuration.

The Google online results and `mpdev` evidence are from 2026-08-20 against immutable release 1.4.15 digests. The complete local suite, clean builds, SBOM generation, and local vulnerability scans were rerun from the canonical `pmo26` source on 2026-08-21.
