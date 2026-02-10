
#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# PMOMax FAST deploy — Skip local build, let Cloud Build do it
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

REGION="${REGION:-us-east1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
SERVICE_NAME="${SERVICE_NAME:-pmo-architect}"
AR_REPO="${AR_REPO:-apps}"
IMAGE_NAME="${IMAGE_NAME:-pmo-architect}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%s)}"  # Use timestamp for unique tag

PORT="${PORT:-8080}"
ALLOW_UNAUTH="${ALLOW_UNAUTH:-true}"

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
# Create minimal Cloud Build context (NO local build)
# ------------------------------------------------------------
echo "=== [CONTEXT] Creating minimal Cloud Build context ==="

STAGE_BASE="/tmp/pmomax_build"
STAGE_DIR="${STAGE_BASE}/pmo_fast_${USER}_$(date +%s)"
mkdir -p "$STAGE_DIR"

# Copy ONLY what's needed for Docker build (exclude everything else)
rsync -a --delete \
  --include "public/logos/" \
  --include "public/logos/**" \
  --exclude "public/logos/icon.png" \
  --exclude ".git/" \
  --exclude "node_modules/" \
  --exclude "dist/" \
  --exclude "dist 2/" \
  --exclude "build/" \
  --exclude ".vite/" \
  --exclude ".venv/" \
  --exclude "coverage/" \
  --exclude "logs/" \
  --exclude "*.log" \
  --exclude "*.zip" \
  --exclude "*.tar*" \
  --exclude "google-cloud-sdk*" \
  --exclude "ibm/" \
  --exclude "pmomax-video-assets*" \
  --exclude "docs/" \
  --exclude "test-results/" \
  --exclude "test-fixtures/" \
  --exclude "playwright-report/" \
  --exclude "_patch_steps/" \
  --exclude "archived_js_duplicates/" \
  --exclude "PMOMAXX*/" \
  --exclude "PMOMax_corrected/" \
  --exclude "__quarantine_duplicates__/" \
  --exclude "duplicates_review*/" \
  --exclude "public/App_screenshots/" \
  --exclude "public/for_intro/" \
  --exclude "*.pptx" \
  --exclude "*.docx" \
  --exclude "*.pdf" \
  --exclude "*.png" \
  --exclude "*.svg" \
  --exclude "*.drawio.xml" \
  "$ROOT_DIR/" "$STAGE_DIR/"

# Copy ignore files
cp -f "$ROOT_DIR/.dockerignore" "$STAGE_DIR/.dockerignore" 2>/dev/null || true
cp -f "$ROOT_DIR/.gcloudignore" "$STAGE_DIR/.gcloudignore" 2>/dev/null || true

echo "=== [CONTEXT] Staged size: ==="
du -sh "$STAGE_DIR" 2>/dev/null || true

# ------------------------------------------------------------
# Cloud Build: build & push to Artifact Registry
# ------------------------------------------------------------
echo "=== [GCLOUD] Setting project: ${PROJECT_ID} ==="
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "=== [BUILD] Cloud Build submit (building in cloud) ==="
gcloud builds submit "$STAGE_DIR" \
  --tag "${IMAGE_URI}" \
  --project "${PROJECT_ID}" \
  --timeout=10m \
  --machine-type=e2-highcpu-8 \
  --quiet

# ------------------------------------------------------------
# Deploy to Cloud Run
# ------------------------------------------------------------
echo "=== [DEPLOY] Cloud Run deploy ==="
DEPLOY_ARGS=(run deploy "${SERVICE_NAME}"
  --image "${IMAGE_URI}"
  --region "${REGION}"
  --platform managed
  --port "${PORT}"
  --memory 512Mi
  --cpu 1
  --max-instances 10
  --timeout 300
)

if [[ "${ALLOW_UNAUTH}" == "true" ]]; then
  DEPLOY_ARGS+=(--allow-unauthenticated)
fi

gcloud "${DEPLOY_ARGS[@]}"

echo "=== [DONE] Deployed ${SERVICE_NAME} ==="
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format='value(status.url)' 2>/dev/null || echo "")
if [[ -n "$SERVICE_URL" ]]; then
  echo "Service URL: $SERVICE_URL"
fi
