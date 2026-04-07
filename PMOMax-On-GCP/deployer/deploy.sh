#!/bin/bash
set -euo pipefail

echo "===================================================="
echo " PMOMax – Google Marketplace Deployer (v1.0)"
echo "===================================================="

check_pyopenssl_version() {
  python3 - <<'PY'
import sys
try:
    import OpenSSL
except Exception as exc:
    print(f"ERROR: unable to import pyOpenSSL: {exc}")
    sys.exit(1)

version = getattr(OpenSSL, "__version__", "")
parts = version.split(".")
try:
    major = int(parts[0])
except Exception:
    print(f"ERROR: cannot parse pyOpenSSL version: {version}")
    sys.exit(1)

if major < 26:
    print(f"ERROR: pyOpenSSL version {version} is vulnerable; require >= 26.0.0")
    sys.exit(1)

print(f"[security] pyOpenSSL version check passed: {version}")
PY
}

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
    "pmomaxAppRegistry",
    "pmomaxAppTag",
    "deployerImageRepo",
    "deployerImageRegistry",
    "deployerImageTag",
    "testerImageRegistry",
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
check_pyopenssl_version

compose_image_ref() {
  local registry="$1"
  local repo="$2"
  local tag="$3"

  # Repo may already include a registry host (legacy values); if so, use as-is.
  if [[ "${repo}" == *"."*"/"* || "${repo}" == *":"*"/"* ]]; then
    printf '%s:%s' "${repo}" "${tag}"
  else
    printf '%s/%s:%s' "${registry}" "${repo}" "${tag}"
  fi
}

# Marketplace Variable Mapping
export REPORTING_SECRET="${reportingSecret:-${REPORTING_SECRET:-reporting-secret}}"
export DEPLOYER_SERVICE_ACCOUNT="${deployerServiceAccount:-${DEPLOYER_SERVICE_ACCOUNT:-deployer-sa}}"

# Canonical runtime defaults (only if still unset after values/template loading)
export APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
export DOMAIN="${DOMAIN:-pmomax.example.com}"
if [[ -z "${PMOMAX_APP_IMAGE:-}" ]]; then
  PMOMAX_APP_IMAGE="$(
    compose_image_ref \
      "${pmomaxAppRegistry:-us-east1-docker.pkg.dev}" \
      "${pmomaxAppRepo:-katalyststreet-public/apps/pmo-architect}" \
      "${pmomaxAppTag:-1.0.1}"
  )"
fi
export PMOMAX_APP_PORT="${PMOMAX_APP_PORT:-8080}"
if [[ -z "${TESTER_IMAGE:-}" ]]; then
  TESTER_IMAGE="$(
    compose_image_ref \
      "${testerImageRegistry:-docker.io}" \
      "curlimages/curl" \
      "8.12.1"
  )"
fi
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
WORKDIR="$(mktemp -d /tmp/pmomax-deploy.XXXXXX)"
APP_RENDERED="${WORKDIR}/application.yaml"
MANIFESTS_RENDERED="${WORKDIR}/manifests.yaml"
MANIFESTS_FLAT="${WORKDIR}/manifests-flat.yaml"
OWNED_MANIFESTS="${WORKDIR}/manifests-owned.yaml"

cleanup_tmp() {
  rm -rf "${WORKDIR}"
}
trap cleanup_tmp EXIT

if [[ -f /data/manifest/application.yaml.template ]]; then
  envsubst "${SUBST_VARS}" < /data/manifest/application.yaml.template > "${APP_RENDERED}"
  kubectl apply -n "${NAMESPACE}" -f "${APP_RENDERED}"
fi

if [[ -f /data/manifest/manifests.yaml.template ]]; then
  envsubst "${SUBST_VARS}" < /data/manifest/manifests.yaml.template > "${MANIFESTS_RENDERED}"
else
  echo "ERROR: /data/manifest/manifests.yaml.template not found"
  exit 1
fi

APP_UID="$(kubectl get application.app.k8s.io "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.metadata.uid}')"
APP_API_VERSION="$(kubectl get application.app.k8s.io "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.apiVersion}')"
if [[ -z "${APP_UID}" || -z "${APP_API_VERSION}" ]]; then
  echo "ERROR: Unable to resolve Application UID/API version for ownership processing"
  exit 1
fi

python3 - "${MANIFESTS_RENDERED}" "${MANIFESTS_FLAT}" <<'PY'
import sys, yaml

src, dst = sys.argv[1], sys.argv[2]
docs = []
with open(src, "r", encoding="utf-8") as f:
    for doc in yaml.safe_load_all(f):
        if not doc:
            continue
        if isinstance(doc, dict) and doc.get("kind") == "List":
            docs.extend(doc.get("items", []) or [])
        else:
            docs.append(doc)

with open(dst, "w", encoding="utf-8") as f:
    yaml.safe_dump_all(docs, f, default_flow_style=False, sort_keys=False)
PY

/usr/bin/set_ownership.py \
  --manifests "${MANIFESTS_FLAT}" \
  --dest "${OWNED_MANIFESTS}" \
  --app_name "${APP_INSTANCE_NAME}" \
  --app_uid "${APP_UID}" \
  --app_api_version "${APP_API_VERSION}" \
  --namespace "${NAMESPACE}" \
  --noapp

kubectl apply -n "${NAMESPACE}" -f "${OWNED_MANIFESTS}"

echo "[INFO] Waiting for ${APP_INSTANCE_NAME} deployment to become available..."
kubectl wait --for=condition=available --timeout=300s deployment/"${APP_INSTANCE_NAME}" -n "${NAMESPACE}"

echo "✅ PMOMax deployment successful"
