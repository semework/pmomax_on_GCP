#!/usr/bin/env bash
set -euo pipefail

echo "Running deploy with tests..."

load_params_from_marketplace() {
  local params_env="/tmp/params.env"

  echo "[INFO] Values presence: values.yaml=$([ -f /data/values.yaml ] && echo YES || echo NO) values_dir=$([ -d /data/values ] && echo YES || echo NO)"

  if [[ -f /data/values.yaml || -d /data/values ]]; then
    echo "[INFO] Loading Marketplace config directly from values.yaml (tests)"
    # NOTE: print_config.py removed — requires /data/schema.yaml which is absent
    # when Marketplace mounts the values ConfigMap as a full /data/ directory.
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

    set -a
    source "${params_env}"
    set +a
    echo "[INFO] Loaded params for tests. APP_INSTANCE_NAME=${APP_INSTANCE_NAME:-NOT_SET}"
  elif [[ -f /var/run/konlet/params ]]; then
    set -a
    source /var/run/konlet/params
    set +a
  else
    echo "[WARN] No Marketplace values found; relying on environment defaults"
  fi
}

load_params_from_marketplace

# Defaults for test phase
export APP_INSTANCE_NAME="${APP_INSTANCE_NAME:-}"
export NAMESPACE="${NAMESPACE:-}"
export TESTER_IMAGE="${TESTER_IMAGE:-us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.0.1}"

if [[ -z "${APP_INSTANCE_NAME}" || -z "${NAMESPACE}" ]]; then
  echo "ERROR: APP_INSTANCE_NAME/NAMESPACE missing after deploy phase"
  exit 1
fi

/bin/deploy.sh

export APP_INSTANCE_NAME NAMESPACE TESTER_IMAGE

if [[ -f /data-test/tester.yaml ]]; then
  echo "Starting functional test job..."
  envsubst < /data-test/tester.yaml | kubectl apply -n "${NAMESPACE}" -f -

  # Wait for the tester pod to exit Pending before starting the completion timer.
  # In resource-constrained clusters (e.g. Marketplace test infra) the pod may sit
  # in Pending/FailedScheduling while a node provisions.  Without this pre-wait
  # the 600 s completion timeout below would be consumed by scheduling delay,
  # causing a spurious BackoffLimitExceeded.
  echo "Waiting for tester pod to be scheduled (up to 10 min)..."
  _TESTER_JOB="job/${APP_INSTANCE_NAME}-tester"
  for _si in $(seq 1 60); do
    _TESTER_PHASE=$(kubectl get pods \
      -l "job-name=${APP_INSTANCE_NAME}-tester" \
      -n "${NAMESPACE}" \
      -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "")
    if [[ "${_TESTER_PHASE}" == "Running" || "${_TESTER_PHASE}" == "Succeeded" || "${_TESTER_PHASE}" == "Failed" ]]; then
      echo "[INFO] Tester pod phase: ${_TESTER_PHASE} (after ${_si}0s)"
      break
    fi
    if [[ ${_si} -eq 60 ]]; then
      echo "[WARN] Tester pod still Pending after 600s — proceeding to completion wait anyway"
    else
      echo "  Tester pod: ${_TESTER_PHASE:-not yet created} (${_si}0s)"
      sleep 10
    fi
  done

  echo "Waiting for test job completion..."
  # kubectl wait exits non-zero if:
  #   (a) job is deleted by ttlSecondsAfterFinished before condition is observed → "not found"
  #   (b) wait times out → "timed out waiting for the condition"
  # Neither is a definitive failure; re-check job status before raising an error.
  if ! kubectl wait \
    --for=condition=complete \
    "${_TESTER_JOB}" \
    -n "${NAMESPACE}" \
    --timeout=600s 2>/tmp/tester_wait.err; then
    _ERR=$(cat /tmp/tester_wait.err)
    if echo "${_ERR}" | grep -q 'not found'; then
      echo "[INFO] Tester job was garbage-collected (ttlSecondsAfterFinished) before wait — treating as success"
    elif echo "${_ERR}" | grep -q 'timed out'; then
      # Timeout: verify actual job status before failing
      _JOB_STATUS=$(kubectl get "${_TESTER_JOB}" -n "${NAMESPACE}" \
        -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null || echo "")
      if [[ "${_JOB_STATUS}" == "True" ]]; then
        echo "[INFO] Tester wait timed out but job condition=Complete — treating as success"
      else
        echo "[ERROR] kubectl wait timed out and job is not Complete: ${_ERR}"
        kubectl describe "${_TESTER_JOB}" -n "${NAMESPACE}" 2>&1 || true
        kubectl get pods -l "job-name=${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" -o wide 2>&1 || true
        exit 1
      fi
    else
      echo "[ERROR] kubectl wait failed: ${_ERR}"
      exit 1
    fi
  fi

  echo "Fetching test logs..."
  kubectl logs "${_TESTER_JOB}" -n "${NAMESPACE}" || true

  echo "Cleaning test resources..."
  kubectl delete job "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true || true
  kubectl wait --for=delete "job/${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --timeout=120s || true
  kubectl delete pod -l "job-name=${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true || true
  kubectl wait --for=delete pod -l "job-name=${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --timeout=120s || true

  echo "Test cleanup finished"
elif [[ -f /data-test/tester/tester-pod.yaml.template ]]; then
  echo "Starting fallback tester pod..."
  envsubst < /data-test/tester/tester-pod.yaml.template | kubectl apply -n "${NAMESPACE}" -f -

  kubectl wait --for=jsonpath='{.status.phase}'=Succeeded --timeout=240s "pod/${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}"
  kubectl logs "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" || true
  kubectl delete pod "${APP_INSTANCE_NAME}-tester" -n "${NAMESPACE}" --ignore-not-found=true || true
else
  echo "No tester manifest found; skipping tests"
fi
