#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}"

DEPL_IMAGE="${1:-us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.0.0}"

if command -v mpdev >/dev/null 2>&1; then
  MPDEV_BIN="$(command -v mpdev)"
elif [[ -x "$HOME/bin/mpdev" ]]; then
  MPDEV_BIN="$HOME/bin/mpdev"
else
  echo "mpdev not found. Install marketplace-k8s-app-tools or place mpdev in \$HOME/bin." >&2
  exit 2
fi

echo "Running mpdev verify for ${DEPL_IMAGE}"
LOG_ROOT="${HOME}/.mpdev_logs"
BEFORE_LATEST=""
if [[ -d "${LOG_ROOT}" ]]; then
  BEFORE_LATEST="$(ls -1dt "${LOG_ROOT}"/* 2>/dev/null | head -n 1)"
fi

set +e
"${MPDEV_BIN}" verify --deployer="${DEPL_IMAGE}"
STATUS=$?
set -e

AFTER_LATEST=""
if [[ -d "${LOG_ROOT}" ]]; then
  AFTER_LATEST="$(ls -1dt "${LOG_ROOT}"/* 2>/dev/null | head -n 1)"
fi

if [[ -n "${AFTER_LATEST}" && "${AFTER_LATEST}" != "${BEFORE_LATEST}" ]]; then
  DEST_DIR="${SCRIPT_DIR}/mpdev_logs/$(basename "${AFTER_LATEST}")"
  mkdir -p "${SCRIPT_DIR}/mpdev_logs"
  rm -rf "${DEST_DIR}"
  cp -R "${AFTER_LATEST}" "${DEST_DIR}"
  echo "Copied mpdev logs to ${DEST_DIR}"
fi

exit ${STATUS}
