#!/usr/bin/env bash
set -euo pipefail

DEPL_IMAGE="${1:-}"
if [[ -z "${DEPL_IMAGE}" ]]; then
  echo "Usage: $0 <deployer-image>"
  echo "Example: $0 us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:20260303"
  exit 2
fi

if ! command -v mpdev >/dev/null 2>&1; then
  echo "mpdev not found. Install marketplace-k8s-app-tools and ensure mpdev is in PATH."
  exit 2
fi

echo "Running mpdev verify for ${DEPL_IMAGE}"
mpdev verify --deployer="${DEPL_IMAGE}"
