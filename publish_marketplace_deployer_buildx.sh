#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
IMAGE_PATH="${IMAGE_PATH:-deployer}"
VERSION="${1:-1.2}"
PATCH="${PATCH:-0}"

TAG_MM="${VERSION}"
TAG_MMP="${VERSION}.${PATCH}"

# Keep this script as a compatibility wrapper while using the canonical
# cloud build path (no local Docker Desktop dependency).
./publish_marketplace_deployer.sh "${TAG_MM}"
./publish_marketplace_deployer.sh "${TAG_MMP}"

echo "✅ Published: ${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}:${TAG_MM}, ${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}:${TAG_MMP}"
