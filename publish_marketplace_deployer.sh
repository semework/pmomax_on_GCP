#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
MARKETPLACE_SERVICE_NAME="${MARKETPLACE_SERVICE_NAME:-services/pmo-max.endpoints.${PROJECT_ID}.cloud.goog}"
ANNOTATION_KEY="com.googleapis.cloudmarketplace.product.service.name"

if [[ $# -ne 1 || -z "${1:-}" ]]; then
  echo "Usage: $0 <immutable-version-tag>"
  echo "Example: $0 1.4.16"
  exit 2
fi

VERSION="$1"
BASE_TAG="${BASE_TAG:-${VERSION%.*}}"
DEPLOYER_REPO="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/deployer"
UBBAGENT_REPO="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/ubbagent"

for command in gcloud crane jq; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "ERROR: ${command} is required."
    exit 1
  fi
done

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud auth configure-docker "${AR_HOST}" --quiet >/dev/null

resolve_digest() {
  gcloud artifacts docker images describe "$1" \
    --project "${PROJECT_ID}" \
    --format='value(image_summary.digest)'
}

verify_annotation() {
  local image="$1"
  local actual
  actual="$(crane manifest "${image}" | jq -r --arg key "${ANNOTATION_KEY}" '.annotations[$key] // empty')"
  if [[ "${actual}" != "${MARKETPLACE_SERVICE_NAME}" ]]; then
    echo "ERROR: Marketplace annotation missing or incorrect on ${image}."
    echo "  expected: ${MARKETPLACE_SERVICE_NAME}"
    echo "  actual:   ${actual:-<empty>}"
    exit 1
  fi
}

DEPLOYER_DIGEST="$(resolve_digest "${DEPLOYER_REPO}:${VERSION}")"
UBBAGENT_DIGEST="$(resolve_digest "${UBBAGENT_REPO}:${VERSION}")"

if [[ -z "${DEPLOYER_DIGEST}" || -z "${UBBAGENT_DIGEST}" ]]; then
  echo "ERROR: Both immutable version images must exist before release tagging."
  exit 1
fi

verify_annotation "${DEPLOYER_REPO}@${DEPLOYER_DIGEST}"
verify_annotation "${UBBAGENT_REPO}@${UBBAGENT_DIGEST}"

gcloud artifacts docker tags add \
  "${DEPLOYER_REPO}@${DEPLOYER_DIGEST}" \
  "${DEPLOYER_REPO}:${BASE_TAG}" \
  --project "${PROJECT_ID}" --quiet
gcloud artifacts docker tags add \
  "${UBBAGENT_REPO}@${UBBAGENT_DIGEST}" \
  "${UBBAGENT_REPO}:${BASE_TAG}" \
  --project "${PROJECT_ID}" --quiet

VERIFY_DEPLOYER="$(resolve_digest "${DEPLOYER_REPO}:${BASE_TAG}")"
VERIFY_UBBAGENT="$(resolve_digest "${UBBAGENT_REPO}:${BASE_TAG}")"

if [[ "${VERIFY_DEPLOYER}" != "${DEPLOYER_DIGEST}" || "${VERIFY_UBBAGENT}" != "${UBBAGENT_DIGEST}" ]]; then
  echo "ERROR: Release-track tag verification failed."
  exit 1
fi

echo "Published release track ${BASE_TAG} for version ${VERSION}:"
echo "  deployer: ${DEPLOYER_DIGEST}"
echo "  ubbagent: ${UBBAGENT_DIGEST}"
echo "  annotation: ${MARKETPLACE_SERVICE_NAME}"
