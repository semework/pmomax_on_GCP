#!/usr/bin/env bash
# GKE verification run of new final digest 7afb90cb in a fresh namespace
set -euo pipefail

KCTX="gke_katalyststreet-public_us-central1_pmomax-auto"
NS="apptest-final"
JOB="apptest-v8-final"
DIGEST="sha256:7afb90cb0c76cd2430aa41dd542af3dda6f57f5fd63a531d0af497652b07770f"
IMG="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@${DIGEST}"

echo "================================================================"
echo " New final digest: ${DIGEST}"
echo " Image: ${IMG}"
echo "================================================================"

# Create fresh namespace
kubectl --context "${KCTX}" get namespace "${NS}" 2>/dev/null \
    && kubectl --context "${KCTX}" delete namespace "${NS}" --wait=true 2>&1 \
    || true
sleep 3
kubectl --context "${KCTX}" create namespace "${NS}" 2>&1

kubectl --context "${KCTX}" -n "${NS}" create serviceaccount deployer-sa 2>&1
kubectl --context "${KCTX}" create clusterrolebinding deployer-sa-admin-${NS} \
    --clusterrole=cluster-admin \
    --serviceaccount=${NS}:deployer-sa 2>&1 || true

kubectl --context "${KCTX}" -n "${NS}" create configmap deployer-values \
    --from-literal='values.yaml=APP_INSTANCE_NAME: final-app
NAMESPACE: apptest-final
DOMAIN: example.com
reportingSecret: reporting-secret
deployerServiceAccount: deployer-sa
PMOMAX_APP_IMAGE: us-docker.pkg.dev/katalyststreet-public/pmomax/pmomax:1.0.1
PMOMAX_APP_PORT: 8080
TESTER_IMAGE: us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.0
' 2>&1

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
          value: apptest-final
JOBEOF
echo "Job ${JOB} created"

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

kubectl --context "${KCTX}" -n "${NS}" wait \
    --for=condition=complete "job/${JOB}" \
    --timeout=720s 2>&1 \
    && RESULT="COMPLETE" || RESULT="FAILED_OR_TIMEOUT"

echo ""
echo "Job result: ${RESULT}"

POD=$(kubectl --context "${KCTX}" -n "${NS}" get pods \
    -l "job-name=${JOB}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
echo ""
echo "--- pod logs (${POD}) ---"
kubectl --context "${KCTX}" -n "${NS}" logs "${POD}" 2>&1 || true

echo ""
kubectl --context "${KCTX}" -n "${NS}" describe job "${JOB}" 2>&1 | grep -A5 "Pods Statuses:\|Duration:\|Completed At:"

echo ""
kubectl --context "${KCTX}" -n "${NS}" describe pod "${POD}" 2>&1 | grep "Exit Code:\|State:\|Reason:"

echo ""
echo "================================================================"
echo " FINAL RESULT: ${RESULT}"
echo " DIGEST: ${DIGEST}"
echo "================================================================"
