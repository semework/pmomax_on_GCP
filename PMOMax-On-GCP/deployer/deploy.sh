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
  # In Marketplace, values are mapped to environment variables
  echo "[INFO] Sourcing environment variables from Marketplace."
elif [[ -f /var/run/konlet/params ]]; then
  # For GKE Marketplace, parameters are in /var/run/konlet/params
  source /var/run/konlet/params
fi

if is_schema_extract_mode; then
  echo "[INFO] Schema/config mode detected. Skipping cluster apply."
  exit 0
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

if [[ -f /data/manifest/application.yaml.template ]]; then
  echo "Applying application.yaml.template"
  envsubst < /data/manifest/application.yaml.template | kubectl apply -n "${NAMESPACE}" -f -
fi

if [[ -f /data/manifest/manifests.yaml.template ]]; then
  echo "Applying manifests.yaml.template"
  envsubst < /data/manifest/manifests.yaml.template | kubectl apply -n "${NAMESPACE}" -f -
else
  echo "ERROR: /data/manifest/manifests.yaml.template not found"
  exit 1
fi

if kubectl get deployment "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1; then
  kubectl wait --for=condition=available --timeout=300s deployment/"${APP_INSTANCE_NAME}" -n "${NAMESPACE}" || true
fi

echo "✅ PMOMax deployer completed"
