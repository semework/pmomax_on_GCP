#!/bin/bash
set -euo pipefail

echo "===================================================="
echo " PMOMax – Google Marketplace Deployer"
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

if [[ -f /data/values.yaml ]]; then
  /bin/print_config.py --values_mode raw --output_file /data/params.env || true
  [[ -f /data/params.env ]] && source /data/params.env || true
elif [[ -f /var/run/konlet/params ]]; then
  source /var/run/konlet/params
fi

export APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
export NAMESPACE="${NAMESPACE:-pmomax}"
export DOMAIN="${DOMAIN:-pmomax.example.com}"
export REPORTING_SECRET="${REPORTING_SECRET:-reporting-secret}"
export PMOMAX_APP_IMAGE="${PMOMAX_APP_IMAGE:-us-docker.pkg.dev/katalyststreet-public/pmomax/pmo-architect:20260303-233534}"
export PMOMAX_APP_PORT="${PMOMAX_APP_PORT:-8080}"

if is_schema_extract_mode; then
  echo "[INFO] Schema/config mode detected. Skipping cluster apply."
  exit 0
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

if [[ -f /data/manifest/manifests.yaml.template ]]; then
  echo "Applying manifests.yaml.template"
  envsubst < /data/manifest/manifests.yaml.template | kubectl apply -n "${NAMESPACE}" -f -
else
  echo "ERROR: /data/manifest/manifests.yaml.template not found"
  exit 1
fi

if [[ -f /data/manifest/application.yaml.template ]]; then
  echo "Applying application.yaml.template"
  envsubst < /data/manifest/application.yaml.template | kubectl apply -n "${NAMESPACE}" -f -
fi

if kubectl get deployment "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  kubectl wait --for=condition=available --timeout=300s deployment/"${APP_INSTANCE_NAME}" -n "${NAMESPACE}" || true
fi

echo "✅ PMOMax deployer completed"
