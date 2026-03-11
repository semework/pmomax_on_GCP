#!/usr/bin/env bash
# Reproduce deployer failure with exact bad digest df5f51a on real GKE
set -euo pipefail

KCTX="gke_katalyststreet-public_us-central1_pmomax-auto"
NS="apptest-repro"
JOB="apptest-v6-bad"
YAML="/Users/mulugetasemework/Library/Mobile Documents/com~apple~CloudDocs/projects/PMO/pmo26/PMOMax-On-GCP/apptest-v6-bad.yaml"

echo "================================================================"
echo " PRE-FLIGHT: cluster reachability + namespace"
echo "================================================================"
kubectl --context "${KCTX}" cluster-info 2>&1 | head -3

echo ""
kubectl --context "${KCTX}" get namespace "${NS}" 2>&1 || {
    echo "Namespace ${NS} missing — creating"
    kubectl --context "${KCTX}" create namespace "${NS}"
}

echo ""
echo "================================================================"
echo " Check deployer-values ConfigMap"
echo "================================================================"
kubectl --context "${KCTX}" -n "${NS}" get configmap deployer-values -o yaml 2>&1

echo ""
echo "================================================================"
echo " Clean stale job (if any)"
echo "================================================================"
kubectl --context "${KCTX}" -n "${NS}" delete job "${JOB}" --ignore-not-found=true 2>&1

echo ""
echo "================================================================"
echo " Apply Job with bad digest df5f51a"
echo "================================================================"
kubectl --context "${KCTX}" apply -f "${YAML}" 2>&1
echo "Job ${JOB} created"

echo ""
echo "================================================================"
echo " Wait for pod to start (up to 5 min)"
echo "================================================================"
for i in $(seq 1 30); do
    POD=$(kubectl --context "${KCTX}" -n "${NS}" get pods \
        -l "job-name=${JOB}" \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    PHASE=$(kubectl --context "${KCTX}" -n "${NS}" get pods \
        -l "job-name=${JOB}" \
        -o jsonpath='{.items[0].status.phase}' 2>/dev/null)
    if [[ -n "${POD}" && "${PHASE}" != "Pending" ]]; then
        echo "Pod=${POD} Phase=${PHASE} at t=${i}0s"
        break
    fi
    echo "  t=${i}0s: pod=${POD:-none} phase=${PHASE:-unknown}"
    sleep 10
done

echo ""
echo "================================================================"
echo " Wait for job finish (up to 10 min)"
echo "================================================================"
kubectl --context "${KCTX}" -n "${NS}" wait \
    --for=condition=complete \
    "job/${JOB}" \
    --timeout=600s 2>&1 \
    && JOB_RESULT="COMPLETE" \
    || JOB_RESULT="FAILED_OR_TIMEOUT"

echo "Job result: ${JOB_RESULT}"

echo ""
echo "================================================================"
echo " Job status"
echo "================================================================"
kubectl --context "${KCTX}" -n "${NS}" describe job "${JOB}" 2>&1

echo ""
echo "================================================================"
echo " Pod logs (current)"
echo "================================================================"
POD=$(kubectl --context "${KCTX}" -n "${NS}" get pods \
    -l "job-name=${JOB}" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [[ -n "${POD}" ]]; then
    echo "Pod: ${POD}"
    kubectl --context "${KCTX}" -n "${NS}" logs "${POD}" 2>&1 || true
    echo ""
    echo "--- previous logs ---"
    kubectl --context "${KCTX}" -n "${NS}" logs "${POD}" --previous 2>&1 || echo "(no previous)"
    echo ""
    echo "--- pod describe ---"
    kubectl --context "${KCTX}" -n "${NS}" describe pod "${POD}" 2>&1
else
    echo "No pod found"
fi

echo ""
echo "================================================================"
echo " Events (sorted)"
echo "================================================================"
kubectl --context "${KCTX}" -n "${NS}" get events \
    --sort-by=.lastTimestamp 2>&1 | tail -40

echo ""
echo "================================================================"
echo " DONE. Job result: ${JOB_RESULT}"
echo "================================================================"
