#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
IMAGE_PATH="${IMAGE_PATH:-deployer}"
VERSION="${1:-1.0}"
PATCH="${PATCH:-0}"
MARKETPLACE_SERVICE_NAME="${MARKETPLACE_SERVICE_NAME:-services/pmomax.endpoints.${PROJECT_ID}.cloud.goog}"
ANNOTATION_KEY="com.googleapis.cloudmarketplace.product.service.name"

TAG_MM="${VERSION}"
TAG_MMP="${VERSION}.${PATCH}"
IMAGE_BASE="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}"

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud auth configure-docker "${AR_HOST}" --quiet >/dev/null

if ! docker buildx inspect marketplace-builder >/dev/null 2>&1; then
  docker buildx create --name marketplace-builder --use >/dev/null
else
  docker buildx use marketplace-builder >/dev/null
fi

docker buildx build \
  --provenance=false \
  --annotation "${ANNOTATION_KEY}=${MARKETPLACE_SERVICE_NAME}" \
  -t "${IMAGE_BASE}:${TAG_MM}" \
  -t "${IMAGE_BASE}:${TAG_MMP}" \
  -f deployer/Dockerfile \
  . \
  --push

echo "✅ Published: ${IMAGE_BASE}:${TAG_MM}, ${IMAGE_BASE}:${TAG_MMP}"
