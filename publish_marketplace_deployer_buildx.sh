#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
IMAGE_PATH="${IMAGE_PATH:-deployer}"
if [[ $# -lt 2 || -z "${1:-}" || -z "${2:-}" ]]; then
  echo "Usage: $0 <major.minor-version> [patch]"
  echo "Example: $0 1.3 2"
  exit 2
fi

VERSION="$1"
PATCH="$2"

TAG_MM="${VERSION}"
TAG_MMP="${VERSION}.${PATCH}"

# Keep this script as a compatibility wrapper while using the canonical cloud
# build path. Build the immutable patch tag once and optionally move the
# major.minor track tag to the same digest.
BASE_TAG="${TAG_MM}" ./publish_marketplace_deployer.sh "${TAG_MMP}"

echo "✅ Published: ${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}:${TAG_MM}, ${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${IMAGE_PATH}:${TAG_MMP}"
