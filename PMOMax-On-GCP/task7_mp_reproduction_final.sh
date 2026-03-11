#!/usr/bin/env bash
# TASK 2 — Marketplace-accurate GKE reproduction of 7afb90cb failure
# Simulates what Marketplace injects: SA, RBAC, reportingSecret, values.yaml
# with ALL schema properties properly filled.
set -euo pipefail

KCTX="gke_katalyststreet-public_us-central1_pmomax-auto"
NS="apptest-mp-sim"
APP="apptest-mp-app"
BAD_DIGEST="sha256:7afb90cb0c76cd2430aa41dd542af3dda6f57f5fd63a531d0af497652b07770f"
REPO="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer"
PMOMAX_REPO="us-docker.pkg.dev/katalyststreet-public/pmomax/pmomax"
SA_NAME="deployer-sa"
REPW_SECRET_NAME="reporting-secret"
JOB_NAME="deployer-job-mp-sim"

echo "================================================================"
echo " Marketplace-accurate GKE Reproduction"
echo " Digest: ${BAD_DIGEST}"
echo " Namespace: ${NS}"
echo " AppName: ${APP}"
echo "================================================================"

echo ""
echo "=== Phase 0: Setup namespace, SA, RBAC, and secrets ==="

# Delete existing namespace from previous runs
kubectl --context="${KCTX}" delete namespace "${NS}" --ignore-not-found=true --wait=true 2>&1 || true
echo "Old namespace removed"

# Create namespace
kubectl --context="${KCTX}" create namespace "${NS}"
echo "Namespace ${NS} created"

# Create deployerServiceAccount (Marketplace creates this from schema service_account type)
kubectl --context="${KCTX}" create serviceaccount "${SA_NAME}" -n "${NS}"
echo "ServiceAccount ${SA_NAME} created"

# Create cluster role + binding (Marketplace creates from schema roles)
kubectl --context="${KCTX}" apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ${NS}-deployer-role
rules:
- apiGroups: [""]
  resources: ["pods","services","serviceaccounts","configmaps","secrets","persistentvolumeclaims","events"]
  verbs: ["get","list","create","update","patch","delete","watch"]
- apiGroups: ["apps"]
  resources: ["deployments","statefulsets","replicasets","daemonsets"]
  verbs: ["get","list","create","update","patch","delete","watch"]
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles","rolebindings"]
  verbs: ["get","list","create","update","patch","delete","watch"]
- apiGroups: ["app.k8s.io"]
  resources: ["applications"]
  verbs: ["get","list","create","update","patch","delete","watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses","networkpolicies"]
  verbs: ["get","list","create","update","patch","delete"]
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get","list","create","update","patch","delete","watch"]
EOF

kubectl --context="${KCTX}" create clusterrolebinding "${NS}-deployer-binding" \
  --clusterrole="${NS}-deployer-role" \
  --serviceaccount="${NS}:${SA_NAME}" 2>&1 || true
echo "RBAC configured"

# Create reportingSecret (Marketplace auto-creates this)
kubectl --context="${KCTX}" create secret generic "${REPW_SECRET_NAME}" \
  -n "${NS}" \
  --from-literal=reportingToken="fake-reporting-token-for-test" 2>&1
echo "ReportingSecret created"

echo ""
echo "=== Phase 1: Create values.yaml ConfigMap (Marketplace injection) ==="
# This is what Marketplace injects into /data/values.yaml
# Includes all schema properties as Marketplace would resolve them
kubectl --context="${KCTX}" apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: deployer-values
  namespace: ${NS}
data:
  values.yaml: |
    APP_INSTANCE_NAME: "${APP}"
    NAMESPACE: "${NS}"
    DOMAIN: "pmomax.test.example.com"
    reportingSecret: "${REPW_SECRET_NAME}"
    deployerImageRepo: "${REPO}"
    deployerImageTag: "1.0"
    deployerImage: "${REPO}@${BAD_DIGEST}"
    pmomaxAppRepo: "${PMOMAX_REPO}"
    pmomaxAppTag: "1.0.1"
    PMOMAX_APP_IMAGE: "${PMOMAX_REPO}:1.0.1"
    TESTER_IMAGE: "${REPO}@${BAD_DIGEST}"
    PMOMAX_APP_PORT: "8080"
    deployerServiceAccount: "${SA_NAME}"
    PARTNER_ID: "katalyststreet"
    PRODUCT_ID: "pmo-max"
    LISTING_ID: "pmo-max.endpoints.katalyststreet-public.cloud.goog"
    AGENT_CONSUMER_ID: "project:katalyststreet-public"
    AGENT_ENCODED_KEY: ""
    AGENT_REPORT_DIR: "/var/lib/ubbagent/reports"
    REPORTING_SECRET: "${REPW_SECRET_NAME}"
EOF
echo "Values ConfigMap created"

echo ""
echo "=== Phase 2: Launch deployer Job (USE EXACT DIGEST) ==="
kubectl --context="${KCTX}" apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: ${JOB_NAME}
  namespace: ${NS}
  labels:
    app: ${APP}
    component: deployer
spec:
  backoffLimit: 0
  template:
    metadata:
      labels:
        app: ${APP}
        component: deployer
    spec:
      serviceAccountName: ${SA_NAME}
      restartPolicy: Never
      volumes:
      - name: deployer-values
        configMap:
          name: deployer-values
          items:
          - key: values.yaml
            path: values.yaml
      containers:
      - name: deployer
        image: ${REPO}@${BAD_DIGEST}
        volumeMounts:
        - name: deployer-values
          mountPath: /data/values.yaml
          subPath: values.yaml
          readOnly: false
        env:
        - name: APP_INSTANCE_NAME
          value: "${APP}"
        - name: NAMESPACE
          value: "${NS}"
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
EOF
echo "Deployer Job ${JOB_NAME} created"

echo ""
echo "=== Phase 3: Monitor deployer pod (capture ALL output) ==="
START_TS=$(date +%s)

# Wait for pod to appear
echo "Waiting for deployer pod to appear..."
for i in $(seq 1 30); do
  POD=$(kubectl --context="${KCTX}" -n "${NS}" get pods \
    -l "job-name=${JOB_NAME}" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  if [[ -n "${POD}" ]]; then
    echo "Deployer pod: ${POD}"
    break
  fi
  echo "  t=${i}0s: waiting for pod..."
  sleep 10
done

if [[ -z "${POD}" ]]; then
  echo "ERROR: deployer pod never appeared"
  exit 1
fi

# Wait for pod to exit Pending
echo ""
echo "Waiting for deployer pod to start running..."
for i in $(seq 1 30); do
  PHASE=$(kubectl --context="${KCTX}" -n "${NS}" get pod "${POD}" \
    -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
  echo "  t=${i}0s: phase=${PHASE}"
  if [[ "${PHASE}" != "Pending" && "${PHASE}" != "" ]]; then
    echo "Pod phase: ${PHASE}"
    break
  fi
  sleep 10
done

# Now tail logs in real time (background)
echo ""
echo "=== STREAMING DEPLOYER POD LOGS (live) ==="
kubectl --context="${KCTX}" -n "${NS}" logs -f "${POD}" 2>&1 &
LOGS_PID=$!

# Wait for job to finish (up to 15 minutes)
echo ""
echo "Waiting for job to complete/fail (up to 15m)..."
for i in $(seq 1 90); do
  JOB_STATUS=$(kubectl --context="${KCTX}" -n "${NS}" get job "${JOB_NAME}" \
    -o jsonpath='{.status.conditions[*].type}' 2>/dev/null || echo "")
  ACTIVE=$(kubectl --context="${KCTX}" -n "${NS}" get job "${JOB_NAME}" \
    -o jsonpath='{.status.active}' 2>/dev/null || echo "0")
  echo "  t=${i}0s: conditions=[${JOB_STATUS}] active=${ACTIVE}"
  if echo "${JOB_STATUS}" | grep -qE "Complete|Failed"; then
    break
  fi
  sleep 10
done

# Stop log streaming
kill $LOGS_PID 2>/dev/null || true
sleep 2

END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))

echo ""
echo "================================================================"
echo " DEPLOYER JOB RESULT"
echo "================================================================"
kubectl --context="${KCTX}" -n "${NS}" get job "${JOB_NAME}" -o wide 2>&1
echo ""
echo "Job conditions:"
kubectl --context="${KCTX}" -n "${NS}" get job "${JOB_NAME}" \
  -o jsonpath='{.status.conditions}' 2>&1 | python3 -c "
import json,sys
conds=json.loads(sys.stdin.read() or '[]')
for c in conds:
    print(f'  type={c.get(\"type\")} status={c.get(\"status\")} reason={c.get(\"reason\",\"\")} message={c.get(\"message\",\"\")[:200]}')
" 2>&1 || true

echo ""
echo "=== DEPLOYER POD STATUS ==="
kubectl --context="${KCTX}" -n "${NS}" describe pod "${POD}" 2>&1

echo ""
echo "=== FULL DEPLOYER LOGS (post-run) ==="
kubectl --context="${KCTX}" -n "${NS}" logs "${POD}" 2>&1 || \
kubectl --context="${KCTX}" -n "${NS}" logs "${POD}" --previous 2>&1 || true

echo ""
echo "=== DEPLOYER POD EXIT CODE ==="
EXIT_CODE=$(kubectl --context="${KCTX}" -n "${NS}" get pod "${POD}" \
  -o jsonpath='{.status.containerStatuses[0].state.terminated.exitCode}' 2>/dev/null || echo "?")
REASON=$(kubectl --context="${KCTX}" -n "${NS}" get pod "${POD}" \
  -o jsonpath='{.status.containerStatuses[0].state.terminated.reason}' 2>/dev/null || echo "?")
echo "Exit Code: ${EXIT_CODE}"
echo "Reason   : ${REASON}"

echo ""
echo "=== NAMESPACE EVENTS (last 50) ==="
kubectl --context="${KCTX}" get events -n "${NS}" --sort-by=.lastTimestamp 2>&1 | tail -50

echo ""
echo "=== ALL POD STATUS IN NAMESPACE ==="
kubectl --context="${KCTX}" -n "${NS}" get pods -o wide 2>&1

echo ""
echo "Duration: ${DURATION}s"
echo "REPRODUCTION COMPLETE"
