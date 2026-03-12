#!/bin/bash
set -euo pipefail

echo "===================================================="
echo " PMOMax – Google Marketplace Deployer (v1.0)"
echo "===================================================="

load_values_yaml() {
  local values_file="/data/values.yaml"
  [[ -f "${values_file}" ]] || return 0

  python3 - <<'PY' > /tmp/pmomax_values.env
import os, shlex
try:
    import yaml
except Exception:
    raise SystemExit(0)

path = "/data/values.yaml"
with open(path, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f) or {}

keys = [
    "APP_INSTANCE_NAME",
    "NAMESPACE",
    "DOMAIN",
    "reportingSecret",
    "deployerServiceAccount",
    "PMOMAX_APP_IMAGE",
    "PMOMAX_APP_PORT",
    "TESTER_IMAGE",
    "PARTNER_ID",
    "PRODUCT_ID",
    "GCP_PROJECT_ID",
    "pmomaxAppRepo",
    "pmomaxAppTag",
    "deployerImageRepo",
    "deployerImageTag",
]
for k in keys:
    v = data.get(k)
    if v is not None:
        print(f'export {k}={shlex.quote(str(v))}')
PY

  if [[ -s /tmp/pmomax_values.env ]]; then
    # shellcheck disable=SC1091
    source /tmp/pmomax_values.env
  fi
}

load_params_template() {
  if [[ -f /data/params.env.template ]]; then
    set -a
    # shellcheck disable=SC1091
    source /data/params.env.template
    set +a
  fi
}

load_values_yaml
load_params_template

# Marketplace Variable Mapping
export REPORTING_SECRET="${reportingSecret:-${REPORTING_SECRET:-reporting-secret}}"
export DEPLOYER_SERVICE_ACCOUNT="${deployerServiceAccount:-${DEPLOYER_SERVICE_ACCOUNT:-deployer-sa}}"

# Canonical runtime defaults (only if still unset after values/template loading)
export APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
export DOMAIN="${DOMAIN:-pmomax.example.com}"
export PMOMAX_APP_IMAGE="${PMOMAX_APP_IMAGE:-${pmomaxAppRepo:-us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect}:${pmomaxAppTag:-1.0.1}}"
export PMOMAX_APP_PORT="${PMOMAX_APP_PORT:-8080}"
export TESTER_IMAGE="${TESTER_IMAGE:-curlimages/curl:8.12.1}"
export PARTNER_ID="${PARTNER_ID:-katalyststreet}"
export PRODUCT_ID="${PRODUCT_ID:-pmomax}"

if [[ -z "${NAMESPACE:-}" ]]; then
  echo "ERROR: NAMESPACE must be provided by the Marketplace runtime"
  exit 1
fi

echo "[INFO] Resolved values:"
echo "  APP_INSTANCE_NAME=${APP_INSTANCE_NAME}"
echo "  NAMESPACE=${NAMESPACE}"
echo "  PMOMAX_APP_IMAGE=${PMOMAX_APP_IMAGE}"
echo "  PMOMAX_APP_PORT=${PMOMAX_APP_PORT}"

echo "[INFO] Applying Application Resources to namespace: ${NAMESPACE}"

SUBST_VARS='${APP_INSTANCE_NAME} ${NAMESPACE} ${PARTNER_ID} ${PRODUCT_ID} ${PMOMAX_APP_IMAGE} ${PMOMAX_APP_PORT} ${DOMAIN} ${REPORTING_SECRET} ${DEPLOYER_SERVICE_ACCOUNT} ${TESTER_IMAGE}'

if [[ -f /data/manifest/application.yaml.template ]]; then
  envsubst "${SUBST_VARS}" < /data/manifest/application.yaml.template | kubectl apply -n "${NAMESPACE}" -f -
fi

if [[ -f /data/manifest/manifests.yaml.template ]]; then
  envsubst "${SUBST_VARS}" < /data/manifest/manifests.yaml.template | kubectl apply -n "${NAMESPACE}" -f -
else
  echo "ERROR: /data/manifest/manifests.yaml.template not found"
  exit 1
fi

echo "[INFO] Waiting for ${APP_INSTANCE_NAME} deployment to become available..."
kubectl wait --for=condition=available --timeout=300s deployment/"${APP_INSTANCE_NAME}" -n "${NAMESPACE}"

echo "✅ PMOMax deployment successful"
