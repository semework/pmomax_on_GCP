# Google TLS ECDSA Transition 2026: PMOMax Compatibility Audit

Date: 2026-05-27

## Summary of Google Notice

Google is transitioning many Google endpoints, including `googleapis.com`, from RSA certificate chains and leaf certificates to Google Trust Services WE1 intermediates and ECDSA-based TLS certificates during late Q2 2026. Google advises customers to avoid pinning intermediate or leaf certificates and to ensure custom trust stores include Google Trust Services root CAs.

## PMOMax Risk Assessment

Current PMOMax risk appears low.

The deployed PMOMax Cloud Run runtime uses ordinary platform and container trust behavior. No custom CA bundle or certificate pinning was found in the current Cloud Run environment. Source and deployment searches did not find unsafe TLS overrides such as `rejectUnauthorized: false`, `NODE_EXTRA_CA_CERTS`, `REQUESTS_CA_BUNDLE`, `SSL_CERT_FILE`, certificate fingerprint pinning, or hardcoded WE1/RSA/ECDSA certificate handling in PMOMax runtime paths.

## Findings

| Area | Finding | Risk |
|---|---|---|
| Cloud Run runtime | `pmo-architect` runs image `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:1.4.2` and is healthy. | Low |
| Cloud Run env | No custom TLS or CA bundle env vars observed. | Low |
| Node runtime | `Dockerfile.cloudrun` uses `node:20-bookworm-slim`, which relies on standard OS/Node CA trust. | Low |
| Marketplace deployer | Root `Dockerfile` uses Google Marketplace deployer base image `0.12.17` and refreshes packages. | Low |
| UBB agent | `ubbagent.Dockerfile` installs `ca-certificates` in Alpine runtime image. | Low |
| Certificate pinning | No PMOMax source/deploy evidence of leaf/intermediate pinning. | Low |
| Custom trust stores | No PMOMax runtime evidence of custom trust store configuration. | Low |
| Unsafe TLS handling | No PMOMax runtime evidence of disabled TLS verification. | Low |
| Live connectivity | `curl -I https://servicecontrol.googleapis.com` completed TLS negotiation and returned HTTP `404`, expected for the bare endpoint. | Low |

## Action Required

No immediate PMOMax code change is required based on the current deployed runtime and repository configuration.

## Recommendations

- Rebuild containers periodically with updated base images.
- Keep `ca-certificates` current in deployer and UBB images.
- Do not disable TLS verification.
- Do not set `rejectUnauthorized: false`.
- Do not pin Google intermediate or leaf certificates.
- Do not hardcode WE1, RSA, ECDSA, or certificate fingerprints.
- Add `scripts/verify_google_tls_compatibility.sh` to CI as a read-only compatibility check.
- If a future customer deployment uses a custom trust store, require that it trusts all Google Trust Services roots.

## CI/CD Suggestion

Add a non-blocking scheduled workflow first, then make it blocking once stable:

```bash
bash scripts/verify_google_tls_compatibility.sh
```

The script checks:

- OpenSSL version
- TLS handshake to `googleapis.com`
- TLS handshake to `pki.goog`
- TLS handshake to `servicecontrol.googleapis.com`
- Certificate verification return code
- Curl fallback connection metadata

## Current vs Roadmap Classification

- **Implemented today:** Default trust store usage, no observed pinning, current Cloud Run health, TLS verification script.
- **Partial:** CI integration of TLS verification script is recommended but not yet configured.
- **Roadmap:** Formal release-gate policy requiring TLS compatibility verification for every deployer/runtime image rebuild.
