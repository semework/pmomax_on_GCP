#!/usr/bin/env bash
set -euo pipefail

echo "===================================================="
echo " PMOMax - Google Marketplace Deployer"
echo "===================================================="

is_schema_extract_mode() {
  if [[ "${EXTRACT_SCHEMA:-}" == "true" ]]; then
    return 0
  fi
  if [[ ! -f "${KUBECONFIG:-/root/.kube/config}" && ! -f "/var/run/secrets/kubernetes.io/serviceaccount/token" ]]; then
    return 0
  fi
  command -v kubectl >/dev/null 2>&1 || return 0
  return 1
}

load_params_from_marketplace() {
  local params_env="/tmp/params.env"

  echo "[INFO] Values presence: values.yaml=$([ -f /data/values.yaml ] && echo YES || echo NO) values_dir=$([ -d /data/values ] && echo YES || echo NO)"

  if [[ -f /data/values.yaml || -d /data/values ]]; then
    echo "[INFO] Loading Marketplace config directly from values.yaml"
    # NOTE: print_config.py was removed because it unconditionally opens
    # /data/schema.yaml, which is absent when Marketplace mounts the values
    # ConfigMap as a full /data/ directory (shadowing the baked-in schema.yaml).
    # Direct YAML parsing eliminates the schema.yaml runtime dependency entirely.
    python3 - > "${params_env}" <<'PY'
import yaml, sys, os, glob

data = {}
if os.path.isfile('/data/values.yaml'):
    with open('/data/values.yaml', 'r') as fh:
        data = yaml.safe_load(fh) or {}
elif os.path.isdir('/data/values/'):
    for fp in sorted(glob.glob('/data/values/*.yaml')):
        with open(fp, 'r') as fh:
            data.update(yaml.safe_load(fh) or {})

print(f'# Loaded {len(data)} keys from /data/values', file=sys.stderr)
for k, v in data.items():
    if not isinstance(v, (dict, list)):
        sv = str(v).replace("'", "'\\''")
        print(f"{k}='{sv}'")
PY

    echo "[INFO] params.env:"
    cat "${params_env}"
    set -a
    source "${params_env}"
    set +a
    echo "[INFO] Loaded params. APP_INSTANCE_NAME=${APP_INSTANCE_NAME:-NOT_SET} NAMESPACE=${NAMESPACE:-NOT_SET}"
  elif [[ -f /var/run/konlet/params ]]; then
    echo "[INFO] Loading legacy params from /var/run/konlet/params"
    set -a
    source /var/run/konlet/params
    set +a
  else
    echo "[WARN] No Marketplace values found at /data/values.yaml or /data/values; relying on environment defaults"
  fi
}

require_var() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "ERROR: ${key} must be provided by Marketplace"
    exit 1
  fi
}

load_params_from_marketplace

# Fallback defaults only when values are omitted.
export APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-}"
export NAMESPACE="${NAMESPACE:-}"
export DOMAIN="${DOMAIN:-pmomax.example.com}"
export REPORTING_SECRET="${REPORTING_SECRET:-reporting-secret}"
export PMOMAX_APP_IMAGE="${PMOMAX_APP_IMAGE:-us-docker.pkg.dev/katalyststreet-public/pmomax/pmomax:1.0.1}"
export PMOMAX_APP_PORT="${PMOMAX_APP_PORT:-8080}"
export TESTER_IMAGE="${TESTER_IMAGE:-us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.0.1}"
export PARTNER_ID="${PARTNER_ID:-katalyststreet}"
export PRODUCT_ID="${PRODUCT_ID:-pmo-max}"
export AGENT_ENCODED_KEY="${AGENT_ENCODED_KEY:-}"
export AGENT_REPORT_DIR="${AGENT_REPORT_DIR:-/var/lib/ubbagent/reports}"
export AGENT_CONSUMER_ID="${AGENT_CONSUMER_ID:-project:katalyststreet-public}"
export LISTING_ID="${LISTING_ID:-pmo-max.endpoints.katalyststreet-public.cloud.goog}"

echo " Instance : ${APP_INSTANCE_NAME:-NOT_SET}"
echo " Namespace: ${NAMESPACE:-NOT_SET}"
echo " Domain   : ${DOMAIN:-NOT_SET}"

if is_schema_extract_mode; then
  echo "[INFO] Schema/config mode detected. Skipping cluster apply."
  exit 0
fi

require_var APP_INSTANCE_NAME
require_var NAMESPACE

echo "Namespace: ${NAMESPACE}"
echo "Instance: ${APP_INSTANCE_NAME}"

echo "Applying Application resource..."
envsubst < /data/manifest/application.yaml.template | kubectl apply -n "${NAMESPACE}" -f -

echo "Applying application manifests..."
envsubst < /data/manifest/manifests.yaml.template | kubectl apply -n "${NAMESPACE}" -f -

if kubectl get deployment "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  kubectl wait --for=condition=available --timeout=300s deployment/"${APP_INSTANCE_NAME}" -n "${NAMESPACE}" || true
fi

wait_for_ownerref() {
  local kind="$1"
  local name="$2"

  echo "Waiting for ownerRef on ${kind}/${name}"
  for _ in {1..60}; do
    local owner_kind owner_name
    owner_kind=$(kubectl get "$kind" "$name" -n "${NAMESPACE}" -o jsonpath='{.metadata.ownerReferences[0].kind}' 2>/dev/null || true)
    owner_name=$(kubectl get "$kind" "$name" -n "${NAMESPACE}" -o jsonpath='{.metadata.ownerReferences[0].name}' 2>/dev/null || true)

    if [[ "$owner_kind" == "Application" && "$owner_name" == "${APP_INSTANCE_NAME}" ]]; then
      echo "OwnerRef attached to ${kind}/${name}"
      return 0
    fi
    sleep 2
  done

  echo "ERROR: ownerRef not attached to ${kind}/${name}"
  exit 1
}

wait_for_ownerref deployment "${APP_INSTANCE_NAME}"
wait_for_ownerref service "${APP_INSTANCE_NAME}-svc"
wait_for_ownerref configmap "${APP_INSTANCE_NAME}-ubbagent-config"

echo "Owner references verified"
echo "Deployment completed successfully"
