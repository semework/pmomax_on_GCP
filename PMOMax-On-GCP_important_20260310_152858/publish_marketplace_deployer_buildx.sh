#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
IMAGE_PATH="${IMAGE_PATH:-deployer}"
VERSION="${1:-1.0.0}"
MARKETPLACE_SERVICE_NAME="${MARKETPLACE_SERVICE_NAME:-services/pmo-max.endpoints.${PROJECT_ID}.cloud.goog}"
ANNOTATION_KEY="com.googleapis.cloudmarketplace.product.service.name"
IMAGE_BASE="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}"

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud auth configure-docker "${AR_HOST}" --quiet >/dev/null

if ! docker buildx inspect marketplace-builder >/dev/null 2>&1; then
  docker buildx create --name marketplace-builder --use >/dev/null
else
  docker buildx use marketplace-builder >/dev/null
fi

docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --annotation "manifest:${ANNOTATION_KEY}=${MARKETPLACE_SERVICE_NAME}" \
  -t "${IMAGE_BASE}:${VERSION}" \
  -f deployer/Dockerfile \
  . \
  --push

echo "Published: ${IMAGE_BASE}:${VERSION}"
