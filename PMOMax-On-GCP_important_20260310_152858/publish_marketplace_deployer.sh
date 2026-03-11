#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
IMAGE_PATH="${IMAGE_PATH:-deployer}"
VERSION="${1:-1.0.0}"

IMAGE_URI="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}:${VERSION}"

echo "Publishing deployer image: ${IMAGE_URI}"
gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud auth configure-docker "${AR_HOST}" --quiet >/dev/null
gcloud builds submit --tag "${IMAGE_URI}" --project "${PROJECT_ID}" --quiet

echo "Published: ${IMAGE_URI}"
