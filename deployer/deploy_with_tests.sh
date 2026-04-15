#!/bin/bash
set -euo pipefail
set -E

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
import shlex
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
    "ubbagentImageRegistry",
    "ubbagentImageRepo",
    "ubbagentImageTag",
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

  if [[ "${repo}" == *"."*"/"* || "${repo}" == *":"*"/"* ]]; then
    printf '%s:%s' "${repo}" "${tag}"
  else
    printf '%s/%s:%s' "${registry}" "${repo}" "${tag}"
  fi
}

export APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
export PMOMAX_APP_PORT="${PMOMAX_APP_PORT:-8080}"
if [[ -z "${PMOMAX_APP_IMAGE:-}" ]]; then
  PMOMAX_APP_IMAGE="$(
    compose_image_ref \
      "${pmomaxAppRegistry:-us-east1-docker.pkg.dev}" \
      "${pmomaxAppRepo:-katalyststreet-public/apps/pmo-architect}" \
      "${pmomaxAppTag:-1.0.1}"
  )"
fi
if [[ -z "${TESTER_IMAGE:-}" ]]; then
  TESTER_IMAGE="$(
    compose_image_ref \
      "${testerImageRegistry:-docker.io}" \
      "curlimages/curl" \
      "8.12.1"
  )"
fi

if [[ -z "${NAMESPACE:-}" ]]; then
  echo "ERROR: NAMESPACE must be provided by the Marketplace runtime"
  exit 1
fi

wait_delete_named() {
  local resource="$1"
  kubectl wait --for=delete "${resource}" -n "${NAMESPACE}" --timeout=180s >/dev/null 2>&1 || true
}

wait_delete_labeled() {
  local kind="$1"
  local selector="$2"
  kubectl wait --for=delete "${kind}" -l "${selector}" -n "${NAMESPACE}" --timeout=180s >/dev/null 2>&1 || true
}

cleanup_tester_resources() {
  kubectl delete job "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete pod "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete pod -l "job-name=${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true

  wait_delete_named "job/${APP_INSTANCE_NAME}-tester"
  wait_delete_named "pod/${APP_INSTANCE_NAME}-tester"
  wait_delete_labeled "pod" "job-name=${APP_INSTANCE_NAME}-tester"
}

post_cleanup_diagnostics() {
  echo "[cleanup] Remaining resources in namespace ${NAMESPACE}:"
  kubectl get applications.app.k8s.io,deployments,replicasets,services,endpoints,endpointslices.discovery.k8s.io,pods,jobs,configmaps,ingress -n "${NAMESPACE}" || true
}

cleanup_app_resources() {
  # Delete tester-related resources first
  cleanup_tester_resources

  # Delete primary app objects
  kubectl delete application.app.k8s.io "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete deployment "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete service "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete endpoints "${APP_INSTANCE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true

  # Delete secondary resources that often remain briefly after service/deployment deletion
  kubectl delete replicasets -l "app=${APP_INSTANCE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete pod -l "app=${APP_INSTANCE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete endpointslices.discovery.k8s.io -l "kubernetes.io/service-name=${APP_INSTANCE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true

  # Wait for deletion of all relevant resource types
  wait_delete_named "application.app.k8s.io/${APP_INSTANCE_NAME}"
  wait_delete_named "deployment/${APP_INSTANCE_NAME}"
  wait_delete_named "service/${APP_INSTANCE_NAME}"
  wait_delete_named "endpoints/${APP_INSTANCE_NAME}"

  wait_delete_labeled "replicaset" "app=${APP_INSTANCE_NAME}"
  wait_delete_labeled "pod" "app=${APP_INSTANCE_NAME}"
  wait_delete_labeled "endpointslice.discovery.k8s.io" "kubernetes.io/service-name=${APP_INSTANCE_NAME}"

  post_cleanup_diagnostics
}

ACTION_MODE="$(printf '%s' "${MARKETPLACE_OPERATION:-${ACTION:-${1:-install}}}" | tr '[:upper:]' '[:lower:]')"

if [[ "${ACTION_MODE}" == "delete" || "${ACTION_MODE}" == "uninstall" || "${ACTION_MODE}" == "undeploy" || "${ACTION_MODE}" == "destroy" ]]; then
  echo "[cleanup] Running delete action for ${APP_INSTANCE_NAME} in ${NAMESPACE}"
  cleanup_app_resources
  exit 0
fi

/bin/deploy.sh

export name="${APP_INSTANCE_NAME}"
export namespace="${NAMESPACE}"

cleanup_tester_only() {
  cleanup_tester_resources
  post_cleanup_diagnostics
}
trap cleanup_tester_only EXIT

kubectl get pods -n "${NAMESPACE}" || true
kubectl get svc -n "${NAMESPACE}" || true
kubectl get ingress -n "${NAMESPACE}" || true

JOB_TEMPLATE="/data-test/tester.yaml"
SUBST_VARS='${APP_INSTANCE_NAME} ${NAMESPACE} ${TESTER_IMAGE} ${PMOMAX_APP_PORT} ${name} ${namespace}'

if [[ -f "${JOB_TEMPLATE}" ]]; then
  echo "[test] Running tester job from ${JOB_TEMPLATE}"
  RENDERED="/tmp/tester-job.yaml"
  envsubst "${SUBST_VARS}" < "${JOB_TEMPLATE}" > "${RENDERED}"

  cleanup_tester_resources
  kubectl apply -f "${RENDERED}"

  if ! kubectl wait --for=condition=complete --timeout=180s job/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}"; then
    echo "[test] tester job did not complete"
    kubectl logs job/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
    kubectl describe job "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
    cleanup_tester_resources
    post_cleanup_diagnostics
    exit 1
  fi

  kubectl logs job/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
  cleanup_tester_resources
  post_cleanup_diagnostics
  echo "[test] tester job passed"
else
  echo "[test] No /data-test tester manifest found; skipping functional tester."
  post_cleanup_diagnostics
fi
