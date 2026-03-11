#!/bin/bash
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

load_yaml_value() {
  local key="$1"
  local file="$2"
  local line
  line=$(grep -E "^${key}:" "$file" | head -n1 | cut -d: -f2- || true)
  line="${line# }"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf "%s" "$line"
}

if [[ -f /data/values.yaml ]]; then
  export APP_INSTANCE_NAME="$(load_yaml_value APP_INSTANCE_NAME /data/values.yaml)"
  export NAMESPACE="$(load_yaml_value NAMESPACE /data/values.yaml)"
  export DOMAIN="$(load_yaml_value DOMAIN /data/values.yaml)"
  export REPORTING_SECRET="$(load_yaml_value reportingSecret /data/values.yaml)"
  export PMOMAX_APP_IMAGE="$(load_yaml_value PMOMAX_APP_IMAGE /data/values.yaml)"
  export PMOMAX_APP_PORT="$(load_yaml_value PMOMAX_APP_PORT /data/values.yaml)"
  export TESTER_IMAGE="$(load_yaml_value TESTER_IMAGE /data/values.yaml)"
  export PARTNER_ID="$(load_yaml_value PARTNER_ID /data/values.yaml)"
  export PRODUCT_ID="$(load_yaml_value PRODUCT_ID /data/values.yaml)"
elif [[ -f /var/run/konlet/params ]]; then
  source /var/run/konlet/params
fi

export APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
export NAMESPACE="${NAMESPACE:-pmomax}"
export DOMAIN="${DOMAIN:-pmomax.example.com}"
export REPORTING_SECRET="${REPORTING_SECRET:-reporting-secret}"
export PMOMAX_APP_IMAGE="${PMOMAX_APP_IMAGE:-us-docker.pkg.dev/katalyststreet-public/pmomax/pmomax:1.0.0}"
export PMOMAX_APP_PORT="${PMOMAX_APP_PORT:-8080}"
export TESTER_IMAGE="${TESTER_IMAGE:-us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.0.0}"
export PARTNER_ID="${PARTNER_ID:-katalyststreet}"
export PRODUCT_ID="${PRODUCT_ID:-pmo-max}"
export AGENT_ENCODED_KEY="${AGENT_ENCODED_KEY:-}"
export AGENT_REPORT_DIR="${AGENT_REPORT_DIR:-/var/lib/ubbagent/reports}"
export AGENT_CONSUMER_ID="${AGENT_CONSUMER_ID:-project:katalyststreet-public}"
export LISTING_ID="${LISTING_ID:-pmo-max.endpoints.katalyststreet-public.cloud.goog}"

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

echo "PMOMax deployer completed"
