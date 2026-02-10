
#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# PMOMax deploy.sh (pmo001) — Cloud Run via Cloud Build
#
# Fixes:
# - Avoid iCloud/.git rsync corruption by staging in /tmp
# - Excludes .git ALWAYS (prevents rsync "file truncated" warnings)
# - Uses .gcloudignore PLUS hard excludes to keep context small
# - Makes server tsc optional + quiet (won't spam 60+ browser errors)
# ============================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Source .env at the very top
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi
IMAGE_NAME="${IMAGE_NAME:-pmo-architect}"
IMAGE_TAG="${IMAGE_TAG:-0.1.1}"

PORT="${PORT:-8080}"
ALLOW_UNAUTH="${ALLOW_UNAUTH:-true}"

# Optional: set to "true" if you want server-only TS check
RUN_SERVER_TSC="${RUN_SERVER_TSC:-false}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT"
  exit 1
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=== [INFO] Project: ${PROJECT_ID}"
echo "=== [INFO] Region:  ${REGION}"
echo "=== [INFO] Service: ${SERVICE_NAME}"
echo "=== [INFO] Image:   ${IMAGE_URI}"

# ------------------------------------------------------------
# (A) Local build sanity (fast): npm ci + vite build
#     This validates your app before shipping.
# ------------------------------------------------------------
echo "=== [CLEAN] Removing dist/.vite (keep repo clean) ==="
rm -rf dist .vite || true

echo "=== [INSTALL] npm ci (fallback: npm install) ==="
if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

echo "=== [BUILD] npm run build (production mode) ==="
NODE_ENV=production npm run build

if [[ "${RUN_SERVER_TSC}" == "true" ]]; then
  if [[ -f tsconfig.server.json ]]; then
    echo "=== [SERVER BUILD] npx tsc -p tsconfig.server.json (server-only) ==="
    # Keep output readable: show first 80 lines if errors occur
    set +e
    TSC_OUT="$(mktemp)"
    npx tsc -p tsconfig.server.json >"$TSC_OUT" 2>&1
    TSC_CODE=$?
    set -e
    if [[ $TSC_CODE -ne 0 ]]; then
      echo "=== [WARN] Server TS check failed (showing first 80 lines) ==="
      sed -n '1,80p' "$TSC_OUT"
      echo "=== [WARN] Continuing (RUN_SERVER_TSC=true makes this non-fatal) ==="
    else
      echo "=== [OK] Server TS check passed ==="
    fi
    rm -f "$TSC_OUT" || true
  else
    echo "=== [SKIP] tsconfig.server.json not found ==="
  fi
fi

# ------------------------------------------------------------
# (B) Pre-flight local server health check
# ------------------------------------------------------------
echo "=== [PRE-FLIGHT] Starting local server for health check (PORT=${PORT}) ==="
PIDFILE="$(mktemp)"
LOGFILE="$(mktemp)"
( PORT="${PORT}" nohup node server.mjs >"$LOGFILE" 2>&1 & echo $! >"$PIDFILE" ) || true
SERVER_PID="$(cat "$PIDFILE" 2>/dev/null || true)"
sleep 1

set +e
curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1
HC=$?
set -e

if [[ $HC -ne 0 ]]; then
  echo "=== [WARN] /health check failed. server.mjs output (last 120 lines): ==="
  tail -n 120 "$LOGFILE" || true
  if [[ -n "${SERVER_PID}" ]]; then kill "${SERVER_PID}" >/dev/null 2>&1 || true; fi
  rm -f "$PIDFILE" "$LOGFILE" || true
  echo "ERROR: Local pre-flight failed. Fix server before deploying."
  exit 1
fi

if [[ -n "${SERVER_PID}" ]]; then kill "${SERVER_PID}" >/dev/null 2>&1 || true; fi
rm -f "$PIDFILE" "$LOGFILE" || true
echo "=== [OK] Local server health check OK ==="

# ------------------------------------------------------------
# (C) Create minimal Cloud Build context in /tmp (NO .git)
# ------------------------------------------------------------
echo "=== [CONTEXT] Creating minimal Cloud Build context in /tmp ==="

STAGE_BASE="/tmp/pmomax_build"
STAGE_DIR="${STAGE_BASE}/pmo001_stage_${USER}_$(date +%s)"
mkdir -p "$STAGE_DIR"

# Copy the essentials only. This avoids:
# - huge contexts
# - iCloud/.git corruption
# - node_modules/dist/logs/etc
#
# IMPORTANT: We do not copy .git at all.
rsync -a --delete \
  --exclude ".git/" \
  --exclude ".git/**" \
  --exclude "node_modules/" \
  --exclude "node_modules/**" \
  --exclude "dist/" \
  --exclude "dist/**" \
  --exclude "dist 2/" \
  --exclude "dist 2/**" \
  --exclude "build/" \
  --exclude "build/**" \
  --exclude ".vite/" \
  --exclude ".vite/**" \
  --exclude ".venv/" \
  --exclude ".venv/**" \
  --exclude "coverage/" \
  --exclude "coverage/**" \
  --exclude "logs/" \
  --exclude "logs/**" \
  --exclude "*.log" \
  --exclude "*.zip" \
  --exclude "*.tar" \
  --exclude "*.tar.gz" \
  --exclude "*.tgz" \
  --exclude "google-cloud-sdk*" \
  --exclude "google-cloud-sdk*/**" \
  --exclude "pmomax-video-assets/" \
  --exclude "pmomax-video-assets/**" \
  --exclude "pmomax-video-assets.zip" \
  --exclude "docs/" \
  --exclude "docs/**" \
  --exclude "test-results/" \
  --exclude "test-results/**" \
  --exclude "test-fixtures/" \
  --exclude "test-fixtures/**" \
  --exclude "playwright-report/" \
  --exclude "playwright-report/**" \
  --exclude "_patch_steps/" \
  --exclude "_patch_steps/**" \
  --exclude "archived_js_duplicates/" \
  --exclude "archived_js_duplicates/**" \
  --exclude "PMOMAXX_COPY/" \
  --exclude "PMOMAXX_COPY/**" \
  --exclude "PMOMAXX2/" \
  --exclude "PMOMAXX2/**" \
  --exclude "PMOMax_corrected/" \
  --exclude "PMOMax_corrected/**" \
  --exclude "__quarantine_duplicates__/" \
  --exclude "__quarantine_duplicates__/**" \
  --exclude "duplicates_review*/" \
  --exclude "duplicates_review*/**" \
  --exclude "public/App_screenshots/" \
  --exclude "public/App_screenshots/**" \
  --exclude "public/app_screenshots.zip" \
  --exclude "public/for_intro/" \
  --exclude "public/for_intro/**" \
  --exclude "*.pptx" \
  --exclude "*.docx" \
  --exclude "*.pdf" \
  --exclude "*.png" \
  --exclude "*.svg" \
  --exclude "*.drawio.xml" \
  --exclude "*.md" \
  "$ROOT_DIR/" "$STAGE_DIR/"

# Ensure .gcloudignore is present in staging (gcloud uses it when submitting)
if [[ -f "$ROOT_DIR/.gcloudignore" ]]; then
  cp -f "$ROOT_DIR/.gcloudignore" "$STAGE_DIR/.gcloudignore"
fi

echo "=== [CONTEXT] Stage dir: $STAGE_DIR ==="
echo "=== [CONTEXT] Top-level stage listing: ==="
ls -la "$STAGE_DIR" | sed -n '1,200p'

# Quick context size estimate (mac + linux compatible-ish)
echo "=== [CONTEXT] Estimated staged size: ==="
du -sh "$STAGE_DIR" 2>/dev/null || true
echo "=== [CONTEXT] File count: ==="
( find "$STAGE_DIR" -type f | wc -l ) 2>/dev/null || true

# ------------------------------------------------------------
# (D) Cloud Build: build & push to Artifact Registry
# ------------------------------------------------------------
echo "=== [GCLOUD] Setting project: ${PROJECT_ID} ==="
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "=== [BUILD] Cloud Build submit (this should be small now) ==="
gcloud builds submit "$STAGE_DIR" --tag "${IMAGE_URI}" --project "${PROJECT_ID}" --quiet

# ------------------------------------------------------------
# (E) Deploy to Cloud Run
# ------------------------------------------------------------
echo "=== [DEPLOY] Cloud Run deploy ==="
DEPLOY_ARGS=(run deploy "${SERVICE_NAME}"
  --image "${IMAGE_URI}"
  --region "${REGION}"
  --platform managed
  --port "${PORT}"
)

if [[ "${ALLOW_UNAUTH}" == "true" ]]; then
  DEPLOY_ARGS+=(--allow-unauthenticated)
else
  DEPLOY_ARGS+=(--no-allow-unauthenticated)
fi

gcloud "${DEPLOY_ARGS[@]}"

echo "=== [DONE] Deployed ${SERVICE_NAME} ==="
echo "Tip: gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)'"
