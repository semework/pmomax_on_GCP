#!/bin/bash
set -euo pipefail
set -E

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

export APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
export PMOMAX_APP_PORT="${PMOMAX_APP_PORT:-8080}"
export TESTER_IMAGE="${TESTER_IMAGE:-curlimages/curl:8.12.1}"

if [[ -z "${NAMESPACE:-}" ]]; then
  echo "ERROR: NAMESPACE must be provided by the Marketplace runtime"
  exit 1
fi

/bin/deploy.sh

export name="${APP_INSTANCE_NAME}"
export namespace="${NAMESPACE}"

cleanup_tester_resources() {
  kubectl delete job "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete pod -l "job-name=${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl wait --for=delete job/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --timeout=60s >/dev/null 2>&1 || true
  kubectl wait --for=delete pod -l "job-name=${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --timeout=60s >/dev/null 2>&1 || true
}

post_cleanup_diagnostics() {
  kubectl get jobs,pods,deployments,services,configmaps,ingress -n "${NAMESPACE}" || true
}

cleanup_tester() {
  cleanup_tester_resources
  post_cleanup_diagnostics
}
trap cleanup_tester EXIT

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
