#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
IMAGE_PATH="${IMAGE_PATH:-deployer}"
VERSION="${1:-1.0}"
BASE_TAG="${BASE_TAG:-1.0}"
MARKETPLACE_SERVICE_NAME="${MARKETPLACE_SERVICE_NAME:-services/pmo-max.endpoints.${PROJECT_ID}.cloud.goog}"
ANNOTATION_KEY="com.googleapis.cloudmarketplace.product.service.name"

IMAGE_URI="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}:${VERSION}"
IMAGE_REPO_URI="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}"

echo "Publishing deployer image: ${IMAGE_URI}"
gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud auth configure-docker "${AR_HOST}" --quiet >/dev/null

# Canonical build path: root Dockerfile + root schema.yaml + root manifest templates
if [[ ! -f Dockerfile ]]; then
  echo "ERROR: canonical Dockerfile not found at ./Dockerfile"
  exit 1
fi

gcloud builds submit --tag "${IMAGE_URI}" --project "${PROJECT_ID}" --quiet

# Add OCI annotation required by Marketplace when crane is available.
if command -v crane >/dev/null 2>&1; then
  crane mutate --annotation "${ANNOTATION_KEY}=${MARKETPLACE_SERVICE_NAME}" "${IMAGE_URI}" >/dev/null
fi

DIGEST="$(
  gcloud artifacts docker images describe "${IMAGE_URI}" \
    --project "${PROJECT_ID}" \
    --format='value(image_summary.digest)'
)"

if [[ -z "${DIGEST}" ]]; then
  echo "ERROR: Unable to resolve digest for ${IMAGE_URI}"
  exit 1
fi

# Release-hardening rule: always ensure both VERSION and BASE_TAG point to the same digest.
gcloud artifacts docker tags add "${IMAGE_REPO_URI}@${DIGEST}" "${IMAGE_REPO_URI}:${VERSION}" --project "${PROJECT_ID}" || true
gcloud artifacts docker tags add "${IMAGE_REPO_URI}@${DIGEST}" "${IMAGE_REPO_URI}:${BASE_TAG}" --project "${PROJECT_ID}" || true

VERIFY_VERSION_DIGEST="$(
  gcloud artifacts docker images describe "${IMAGE_REPO_URI}:${VERSION}" \
    --project "${PROJECT_ID}" \
    --format='value(image_summary.digest)'
)"
VERIFY_BASE_DIGEST="$(
  gcloud artifacts docker images describe "${IMAGE_REPO_URI}:${BASE_TAG}" \
    --project "${PROJECT_ID}" \
    --format='value(image_summary.digest)'
)"

if [[ -z "${VERIFY_VERSION_DIGEST}" || -z "${VERIFY_BASE_DIGEST}" ]]; then
  echo "ERROR: Failed to verify tags ${VERSION} and/or ${BASE_TAG}"
  exit 1
fi

if [[ "${VERIFY_VERSION_DIGEST}" != "${DIGEST}" || "${VERIFY_BASE_DIGEST}" != "${DIGEST}" ]]; then
  echo "ERROR: Tag verification mismatch."
  echo "  expected digest: ${DIGEST}"
  echo "  ${VERSION}: ${VERIFY_VERSION_DIGEST}"
  echo "  ${BASE_TAG}: ${VERIFY_BASE_DIGEST}"
  exit 1
fi

echo "✅ Published: ${IMAGE_URI}"
echo "✅ Final digest: ${DIGEST}"
echo "✅ Tag ${VERSION} -> ${VERIFY_VERSION_DIGEST}"
echo "✅ Tag ${BASE_TAG} -> ${VERIFY_BASE_DIGEST}"
