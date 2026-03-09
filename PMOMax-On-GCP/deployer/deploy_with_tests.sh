#!/bin/bash
set -euo pipefail

/bin/deploy.sh

NAMESPACE="${NAMESPACE:-pmomax}"
APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-pmo-architect}"
export name="${APP_INSTANCE_NAME}"
export namespace="${NAMESPACE}"

kubectl get pods -n "${NAMESPACE}" || true
kubectl get svc -n "${NAMESPACE}" || true
kubectl get ingress -n "${NAMESPACE}" || true

# Marketplace-style functional test: support either tester pod template or tester job template.
POD_TEMPLATE="/data-test/tester/tester-pod.yaml.template"
JOB_TEMPLATE="/data-test/tester.yaml"

if [[ -f "${POD_TEMPLATE}" ]]; then
  echo "[test] Running tester pod from ${POD_TEMPLATE}"
  RENDERED="/tmp/tester-pod.yaml"
  envsubst < "${POD_TEMPLATE}" > "${RENDERED}"

  kubectl delete pod "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl apply -f "${RENDERED}"

  if ! kubectl wait --for=jsonpath='{.status.phase}'=Succeeded --timeout=180s pod/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}"; then
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
  kubectl apply -f "${RENDERED}"

  if ! kubectl wait --for=condition=complete --timeout=180s job/"${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}"; then
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
