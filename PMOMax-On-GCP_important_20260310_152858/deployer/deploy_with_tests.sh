#!/bin/bash
set -euo pipefail

/bin/deploy.sh

read_yaml_value() {
  local key="$1"
  local file="$2"
  local line
  line=$(grep -E "^${key}:" "$file" | head -n1 | cut -d: -f2- || true)
  line="${line# }"
  line="${line%\"}"
  line="${line#\"}"
  printf "%s" "$line"
}

if [[ -f /data/values.yaml ]]; then
  NAMESPACE="$(read_yaml_value NAMESPACE /data/values.yaml)"
  APP_INSTANCE_NAME="$(read_yaml_value APP_INSTANCE_NAME /data/values.yaml)"
  PMOMAX_APP_IMAGE="$(read_yaml_value PMOMAX_APP_IMAGE /data/values.yaml)"
  TESTER_IMAGE="$(read_yaml_value TESTER_IMAGE /data/values.yaml)"
else
  NAMESPACE="${NAMESPACE:-pmomax}"
  APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
fi

NAMESPACE="${NAMESPACE:-pmomax}"
APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
PMOMAX_APP_IMAGE="${PMOMAX_APP_IMAGE:-us-docker.pkg.dev/katalyststreet-public/pmomax/pmomax:1.0.0}"
TESTER_IMAGE="${TESTER_IMAGE:-$PMOMAX_APP_IMAGE}"

export name="${APP_INSTANCE_NAME}"
export namespace="${NAMESPACE}"
export TESTER_IMAGE

kubectl get pods -n "${NAMESPACE}" || true
kubectl get svc -n "${NAMESPACE}" || true
kubectl get ingress -n "${NAMESPACE}" || true

POD_TEMPLATE="/data-test/tester/tester-pod.yaml.template"
JOB_TEMPLATE="/data-test/tester.yaml"

if [[ -f "${POD_TEMPLATE}" ]]; then
  echo "[test] Running tester pod from ${POD_TEMPLATE}"
  RENDERED="/tmp/tester-pod.yaml"
  envsubst < "${POD_TEMPLATE}" > "${RENDERED}"

  kubectl delete pod "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl apply -n "${NAMESPACE}" -f "${RENDERED}"

  if ! kubectl wait --for=jsonpath="{.status.phase}"=Succeeded --timeout=240s pod/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}"; then
    echo "[test] tester pod did not succeed"
    kubectl logs "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
    kubectl describe pod "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
    exit 1
  fi

  kubectl logs "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
  kubectl delete pod "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  echo "[test] tester pod passed"
elif [[ -f "${JOB_TEMPLATE}" ]]; then
  echo "[test] Running tester job from ${JOB_TEMPLATE}"
  RENDERED="/tmp/tester-job.yaml"
  envsubst < "${JOB_TEMPLATE}" > "${RENDERED}"

  kubectl delete job "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl apply -n "${NAMESPACE}" -f "${RENDERED}"

  if ! kubectl wait --for=condition=complete --timeout=240s job/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}"; then
    echo "[test] tester job did not complete"
    kubectl logs job/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
    kubectl describe job "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
    exit 1
  fi

  kubectl logs job/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
  kubectl delete job "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  echo "[test] tester job passed"
else
  echo "[test] No /data-test tester manifest found; skipping functional tester."
fi
