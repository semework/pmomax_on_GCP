#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
IMAGE_PATH="${IMAGE_PATH:-deployer}"
VERSION="${1:-1.3}"
BASE_TAG="${BASE_TAG:-1.3}"
# Pinned billing agent — 0.2.4 is go1.25.4 (last clean build; 0.2.5+ introduced go1.26.1 / CVE-2026-27143).
# 0.1.5 does NOT exist in gcr.io/cloud-marketplace-tools/metering/ubbagent.
UBBAGENT_IMAGE="gcr.io/cloud-marketplace-tools/metering/ubbagent:0.2.4"
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
# crane mutate rewrites the manifest, producing a NEW digest — capture it via crane.
crane mutate --annotation "${ANNOTATION_KEY}=${MARKETPLACE_SERVICE_NAME}" "${IMAGE_URI}"

DIGEST="$(crane digest "${IMAGE_URI}")"

if [[ -z "${DIGEST}" ]]; then
  echo "ERROR: Unable to resolve digest for ${IMAGE_URI}"
  exit 1
fi

# Release-hardening rule: always ensure both VERSION and BASE_TAG point to the same digest.
gcloud artifacts docker tags add "${IMAGE_REPO_URI}@${DIGEST}" "${IMAGE_REPO_URI}:${VERSION}" --project "${PROJECT_ID}" || true
gcloud artifacts docker tags add "${IMAGE_REPO_URI}@${DIGEST}" "${IMAGE_REPO_URI}:${BASE_TAG}" --project "${PROJECT_ID}" || true

# Verify tags using crane digest — reliable after manifest mutation.
VERIFY_VERSION_DIGEST="$(crane digest "${IMAGE_REPO_URI}:${VERSION}")" || VERIFY_VERSION_DIGEST=""
VERIFY_BASE_DIGEST="$(crane digest "${IMAGE_REPO_URI}:${BASE_TAG}")" || VERIFY_BASE_DIGEST=""

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
echo "✅ Tag ${BASE_TAG} -> ${VERIFY_BASE_DIGEST}"
echo "✅ Marketplace label verified: ${ANNOTATION_KEY}=${VERIFY_LABEL}"
