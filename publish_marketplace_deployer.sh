#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
IMAGE_PATH="${IMAGE_PATH:-deployer}"
if [[ $# -lt 1 || -z "${1:-}" ]]; then
  echo "Usage: $0 <immutable-version-tag>"
  echo "Example: $0 1.3.2"
  exit 2
fi

VERSION="$1"
BASE_TAG="${BASE_TAG:-}"
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

if ! command -v crane >/dev/null 2>&1; then
  echo "ERROR: crane is required to enforce Marketplace OCI metadata."
  exit 1
fi

# Enforce OCI annotation required by Marketplace on every published image.
crane mutate --annotation "${ANNOTATION_KEY}=${MARKETPLACE_SERVICE_NAME}" "${IMAGE_URI}" >/dev/null

DIGEST="$(
  gcloud artifacts docker images describe "${IMAGE_URI}" \
    --project "${PROJECT_ID}" \
    --format='value(image_summary.digest)'
)"

if [[ -z "${DIGEST}" ]]; then
  echo "ERROR: Unable to resolve digest for ${IMAGE_URI}"
  exit 1
fi

# Release-hardening rule: publish the immutable VERSION tag. Optionally also
# move BASE_TAG when explicitly requested by the caller.
gcloud artifacts docker tags add "${IMAGE_REPO_URI}@${DIGEST}" "${IMAGE_REPO_URI}:${VERSION}" --project "${PROJECT_ID}" || true
if [[ -n "${BASE_TAG}" ]]; then
  gcloud artifacts docker tags add "${IMAGE_REPO_URI}@${DIGEST}" "${IMAGE_REPO_URI}:${BASE_TAG}" --project "${PROJECT_ID}" || true
fi

VERIFY_VERSION_DIGEST="$(
  gcloud artifacts docker images describe "${IMAGE_REPO_URI}:${VERSION}" \
    --project "${PROJECT_ID}" \
    --format='value(image_summary.digest)'
)"
if [[ -z "${VERIFY_VERSION_DIGEST}" ]]; then
  echo "ERROR: Failed to verify tag ${VERSION}"
  exit 1
fi

if [[ "${VERIFY_VERSION_DIGEST}" != "${DIGEST}" ]]; then
  echo "ERROR: Tag verification mismatch."
  echo "  expected digest: ${DIGEST}"
  echo "  ${VERSION}: ${VERIFY_VERSION_DIGEST}"
  exit 1
fi

if [[ -n "${BASE_TAG}" ]]; then
  VERIFY_BASE_DIGEST="$(
    gcloud artifacts docker images describe "${IMAGE_REPO_URI}:${BASE_TAG}" \
      --project "${PROJECT_ID}" \
      --format='value(image_summary.digest)'
  )"
  if [[ "${VERIFY_BASE_DIGEST}" != "${DIGEST}" ]]; then
    echo "ERROR: Base tag verification mismatch."
    echo "  expected digest: ${DIGEST}"
    echo "  ${BASE_TAG}: ${VERIFY_BASE_DIGEST:-<empty>}"
    exit 1
  fi
fi

VERIFY_LABEL="$(
  crane config "${IMAGE_URI}" \
    | jq -r --arg key "${ANNOTATION_KEY}" '.config.Labels[$key] // empty'
)"

if [[ "${VERIFY_LABEL}" != "${MARKETPLACE_SERVICE_NAME}" ]]; then
  echo "ERROR: Marketplace OCI label missing or incorrect."
  echo "  expected: ${MARKETPLACE_SERVICE_NAME}"
  echo "  actual:   ${VERIFY_LABEL:-<empty>}"
  exit 1
fi

echo "✅ Published: ${IMAGE_URI}"
echo "✅ Final digest: ${DIGEST}"
echo "✅ Tag ${VERSION} -> ${VERIFY_VERSION_DIGEST}"
if [[ -n "${BASE_TAG}" ]]; then
  echo "✅ Tag ${BASE_TAG} -> ${VERIFY_BASE_DIGEST}"
fi
echo "✅ Marketplace label verified: ${ANNOTATION_KEY}=${VERIFY_LABEL}"
