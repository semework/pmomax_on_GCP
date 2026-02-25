
#!/usr/bin/env bash
set -euo pipefail

if [ -z "${BASH_VERSION:-}" ]; then
  echo "This script must be run with bash. Re-launching with bash..."
  exec /usr/bin/env bash "$0" "$@"
fi

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

# Copy ONLY what's needed for Docker build (strict allowlist)
rsync -a --delete \
  --filter="include /Dockerfile" \
  --filter="include /package.json" \
  --filter="include /package-lock.json" \
  --filter="include /index.html" \
  --filter="include /vite.config.*" \
  --filter="include /tsconfig*.json" \
  --filter="include /main.tsx" \
  --filter="include /main.js" \
  --filter="include /App.tsx" \
  --filter="include /ErrorBoundary.tsx" \
  --filter="include /globals.d.ts" \
  --filter="include /types.ts" \
  --filter="include /types/***" \
  --filter="include /server.mjs" \
  --filter="include /server/***" \
  --filter="include /lib/***" \
  --filter="include /data/***" \
  --filter="include /src/***" \
  --filter="include /public/***" \
  --filter="exclude /public/**/pmomax-video-assets/***" \
  --filter="exclude /public/**/generated_*" \
  --filter="exclude /public/**/videos/***" \
  --filter="exclude /public/**/screenshots/***" \
  --filter="exclude /public/**/for_intro/***" \
  --filter="exclude /public/**/App_screenshots/***" \
  --filter="exclude *.mp4" \
  --filter="exclude *.mov" \
  --filter="exclude *.webm" \
  --filter="exclude *.mkv" \
  --filter="exclude *.avi" \
  --filter="exclude *.zip" \
  --filter="exclude *.tar*" \
  --filter="exclude *.pptx" \
  --filter="exclude *.docx" \
  --filter="exclude *.pdf" \
  --filter="exclude *.drawio.xml" \
  --filter="exclude *.psd" \
  --filter="exclude *.ai" \
  --filter="exclude *.sketch" \
  --filter="exclude *.log" \
  --filter="exclude /node_modules/***" \
  --filter="exclude /dist/***" \
  --filter="exclude /dist 2/***" \
  --filter="exclude /build/***" \
  --filter="exclude /.vite/***" \
  --filter="exclude /.venv/***" \
  --filter="exclude /coverage/***" \
  --filter="exclude /logs/***" \
  --filter="exclude /docs/***" \
  --filter="exclude /test-results/***" \
  --filter="exclude /test-fixtures/***" \
  --filter="exclude /playwright-report/***" \
  --filter="exclude /_patch_steps/***" \
  --filter="exclude /archived_js_duplicates/***" \
  --filter="exclude /PMOMAXX*/***" \
  --filter="exclude /PMOMax_corrected/***" \
  --filter="exclude /__quarantine_duplicates__/***" \
  --filter="exclude /duplicates_review*/***" \
  --filter="exclude /generated_videos/***" \
  --filter="exclude /generated_promo_videos/***" \
  --filter="exclude /pmomax-video-assets/***" \
  --filter="exclude /pmomax_vid_out/***" \
  --filter="exclude /pmomax_video_builder*/***" \
  --filter="exclude /archive/***" \
  --filter="exclude /archives/***" \
  --filter="exclude /prompts/***" \
  --filter="exclude /google-cloud-sdk*/***" \
  --filter="exclude /ibm/***" \
  --filter="exclude /test/***" \
  --filter="exclude /tests/***" \
  --filter="exclude /e2e/***" \
  --filter="exclude /test-results/***" \
  --filter="exclude /tmp/***" \
  --filter="exclude /Archive.zip" \
  --filter="exclude /pmo*.zip" \
  --filter="exclude /pmomax-video-assets/***" \
  --filter="exclude /.git/***" \
  --filter="exclude *" \
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
