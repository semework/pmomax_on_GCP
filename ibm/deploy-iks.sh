
#!/usr/bin/env bash
set -euo pipefail

# Source .env.ibm at the very top
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/ibm/.env.ibm"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_plugin() {
  local name="$1"
  if ! ibmcloud plugin list | grep -i "${name}" >/dev/null 2>&1; then
    echo "Missing ibmcloud plugin: ${name}. Install with: ibmcloud plugin install ${name}" >&2
    exit 1
  fi
}

require_cmd ibmcloud
require_cmd kubectl
require_cmd docker

require_plugin container-registry
require_plugin kubernetes-service

if [[ -z "${IBM_CLOUD_REGION:-}" || -z "${IBM_RESOURCE_GROUP:-}" ]]; then
  echo "Set IBM_CLOUD_REGION and IBM_RESOURCE_GROUP in ibm/.env.ibm" >&2
  exit 1
fi
if [[ -z "${ICR_NAMESPACE:-}" ]]; then
  echo "Set ICR_NAMESPACE in ibm/.env.ibm" >&2
  exit 1
fi
if [[ -z "${IKS_CLUSTER_NAME:-}" ]]; then
  echo "Set IKS_CLUSTER_NAME in ibm/.env.ibm" >&2
  exit 1
fi

IMAGE_NAME="${IMAGE_NAME:-pmomax}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE="icr.io/${ICR_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

LOGIN_ARGS=("-r" "${IBM_CLOUD_REGION}" "-g" "${IBM_RESOURCE_GROUP}")
if [[ -n "${IBM_CLOUD_API_KEY:-}" ]]; then
  LOGIN_ARGS+=("--apikey" "${IBM_CLOUD_API_KEY}")
fi

ibmcloud login "${LOGIN_ARGS[@]}"
ibmcloud cr region-set "${IBM_CLOUD_REGION}"
ibmcloud cr login

docker build -t "${IMAGE}" "${ROOT_DIR}"
docker push "${IMAGE}"

ibmcloud ks cluster config --cluster "${IKS_CLUSTER_NAME}"

kubectl get ns >/dev/null

NAMESPACE="pmomax-ibm"
if [[ -n "${IBM_CLOUD_API_KEY:-}" ]]; then
  kubectl -n "${NAMESPACE}" get secret icr-secret >/dev/null 2>&1 || \
    kubectl -n "${NAMESPACE}" create secret docker-registry icr-secret \
      --docker-server=icr.io \
      --docker-username=iamapikey \
      --docker-password="${IBM_CLOUD_API_KEY}" \
      --docker-email=notused@example.com
else
  echo "IBM_CLOUD_API_KEY not set; ensure imagePullSecret icr-secret exists in ${NAMESPACE}." >&2
fi

kubectl apply -k "${ROOT_DIR}/ibm/k8s/overlays/iks"

kubectl -n "${NAMESPACE}" rollout status deployment/pmomax

HOST=$(kubectl -n "${NAMESPACE}" get ingress pmomax -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || true)
if [[ -n "${HOST}" ]]; then
  echo "PMOMax is available at: http://${HOST}"
else
  echo "Ingress host not found. Check Service/Ingress or provision a LoadBalancer." >&2
fi
