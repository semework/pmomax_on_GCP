#!/usr/bin/env bash
# Reproduce from a FRESH namespace — exactly matching Marketplace conditions
# Deletes pre-existing app resources, then runs deployer from clean state
set -euo pipefail

KCTX="gke_katalyststreet-public_us-central1_pmomax-auto"
NS="apptest-fresh"
JOB="apptest-v7-fresh"
DIGEST="sha256:df5f51a030c8ea17bcf7d8608a9a022938e7b4db0d92e1018f788679957f7f78"
IMG="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@${DIGEST}"

echo "================================================================"
echo " SETUP: fresh namespace (no pre-existing app resources)"
echo "================================================================"
# Create or reset namespace
kubectl --context "${KCTX}" get namespace "${NS}" 2>/dev/null \
    && kubectl --context "${KCTX}" delete namespace "${NS}" --wait=true 2>&1 \
    || true
sleep 5
kubectl --context "${KCTX}" create namespace "${NS}" 2>&1

echo ""
echo "--- Creating deployer-sa ServiceAccount ---"
kubectl --context "${KCTX}" -n "${NS}" create serviceaccount deployer-sa 2>&1

echo ""
echo "--- RBAC: ClusterRoleBinding for deployer-sa ---"
kubectl --context "${KCTX}" create clusterrolebinding deployer-sa-admin-${NS} \
    --clusterrole=cluster-admin \
    --serviceaccount=${NS}:deployer-sa \
    2>&1 || true

echo ""
echo "--- Creating deployer-values ConfigMap ---"
kubectl --context "${KCTX}" -n "${NS}" create configmap deployer-values \
    --from-literal='values.yaml=APP_INSTANCE_NAME: fresh-app
NAMESPACE: apptest-fresh
DOMAIN: example.com
reportingSecret: reporting-secret
deployerServiceAccount: deployer-sa
PMOMAX_APP_IMAGE: us-docker.pkg.dev/katalyststreet-public/pmomax/pmomax:1.0.1
PMOMAX_APP_PORT: 8080
TESTER_IMAGE: us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.0
' 2>&1

echo ""
echo "================================================================"
echo " Apply Job with bad digest ${DIGEST}"
echo "================================================================"
kubectl --context "${KCTX}" apply -f - <<JOBEOF 2>&1
apiVersion: batch/v1
kind: Job
metadata:
  name: ${JOB}
  namespace: ${NS}
spec:
  backoffLimit: 0
  template:
    spec:
      serviceAccountName: deployer-sa
      restartPolicy: Never
      volumes:
      - name: values
        configMap:
          name: deployer-values
          items:
          - key: values.yaml
            path: values.yaml
      containers:
      - name: deployer
        image: ${IMG}
        imagePullPolicy: Always
        volumeMounts:
        - name: values
          mountPath: /data/values.yaml
          subPath: values.yaml
        env:
        - name: NAMESPACE
          value: apptest-fresh
JOBEOF
echo "Job created"

echo ""
echo "================================================================"
echo " Wait for pod (up to 6 min for image pull + node provision)"
echo "================================================================"
for i in $(seq 1 36); do
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
echo " Follow pod logs in real-time"
echo "================================================================"
POD=$(kubectl --context "${KCTX}" -n "${NS}" get pods \
    -l "job-name=${JOB}" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [[ -n "${POD}" ]]; then
    kubectl --context "${KCTX}" -n "${NS}" logs -f "${POD}" 2>&1 &
    LOG_PID=$!
fi

echo ""
echo "--- Waiting for job result (up to 12 min) ---"
kubectl --context "${KCTX}" -n "${NS}" wait \
    --for=condition=complete \
    "job/${JOB}" \
    --timeout=720s 2>&1 \
    && JOB_RESULT="COMPLETE" \
    || JOB_RESULT="FAILED_OR_TIMEOUT"

# Stop log follow
kill "${LOG_PID}" 2>/dev/null || true

echo ""
echo "Job result: ${JOB_RESULT}"

echo ""
echo "================================================================"
echo " Job describe"
echo "================================================================"
kubectl --context "${KCTX}" -n "${NS}" describe job "${JOB}" 2>&1

if [[ -n "${POD:-}" ]]; then
    echo ""
    echo "================================================================"
    echo " Pod describe"
    echo "================================================================"
    kubectl --context "${KCTX}" -n "${NS}" describe pod "${POD}" 2>&1

    echo ""
    echo "================================================================"
    echo " Pod logs (full, after job finish)"
    echo "================================================================"
    kubectl --context "${KCTX}" -n "${NS}" logs "${POD}" 2>&1 || true
fi

echo ""
echo "================================================================"
echo " All resources in namespace at end of run"
echo "================================================================"
kubectl --context "${KCTX}" -n "${NS}" get all 2>&1

echo ""
echo "================================================================"
echo " Events (sorted)"
echo "================================================================"
kubectl --context "${KCTX}" -n "${NS}" get events \
    --sort-by=.lastTimestamp 2>&1 | tail -50

echo ""
echo "================================================================"
echo " DONE. Job result: ${JOB_RESULT}"
echo "================================================================"
