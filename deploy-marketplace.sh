
#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Enhanced Deployment Script for Cloud Run (Marketplace-Ready Foundations)
# - Adds: Artifact Registry, vulnerability scan gate, service account, secret pinning,
#   SBOM generation hook, health gate, semantic version validation, optional multi-region deploy.
# =============================================================================

# Source .env at the very top
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

# =============================================================================
# LOCAL PREFLIGHT: clean install, build, and check local server health
# Mirrors:
#   rm -rf node_modules
#   npm install --omit=dev
#   npm run build
#   NODE_ENV=production PORT=8080 node server.mjs
# but runs the server only long enough to hit /healthz then exits.
# =============================================================================
clear || true

echo "=== [PRE-FLIGHT] Cleaning node_modules ==="
rm -rf node_modules/* dist .vite package-lock.json yarn.lock pnpm-lock.yaml && rm -rf node_modules

echo "=== [PRE-FLIGHT] Installing dependencies (dev + prod) for local build ==="
if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

echo "=== [PRE-FLIGHT] Building frontend (production mode) ==="
NODE_ENV=production npm run build

echo "=== [PRE-FLIGHT] Starting local server for health check (PORT=8080) ==="
NODE_ENV=production PORT=8080 node server.mjs &
PRE_SERVER_PID=$!

# Give the server a few seconds to start
sleep 8

PRE_HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8080/_healthz" || echo "000")
if [ "${PRE_HEALTH_CODE}" != "200" ]; then
  echo "✖ [PRE-FLIGHT] Local server health check FAILED (got ${PRE_HEALTH_CODE}, expected 200)."
  kill "${PRE_SERVER_PID}" 2>/dev/null || true
  exit 1
fi

echo "✓ [PRE-FLIGHT] Local server health check OK."
kill "${PRE_SERVER_PID}" 2>/dev/null || true

echo "=== [PRE-FLIGHT] Cleaning node_modules after local test ==="
rm -rf node_modules

echo "=== [MARKETPLACE] Delegating deployment to deploy.sh (Cloud Run) ==="
./deploy.sh "$@"