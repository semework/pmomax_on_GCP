
#!/usr/bin/env bash
set -euo pipefail

# Source .env at the very top
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi
#   REGION=us-east1
#   CLUSTER=pmomax-auto
#   NAMESPACE=pmomax
#   APP=pmo-architect
#   AR_REPO=pmomax
#   IMAGE_NAME=pmo-architect
#   TAG=2026-02-02-01
#
# NOTE: This script uses GKE Autopilot. If you prefer Standard GKE, adapt create command.

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "ERROR: PROJECT_ID is not set and gcloud has no default project." >&2
  echo "Set it like: PROJECT_ID=your-project-id ./deploy_gke_ingress.sh" >&2
  exit 1
fi

REGION="${REGION:-us-east1}"
CLUSTER="${CLUSTER:-pmomax-auto}"
NAMESPACE="${NAMESPACE:-pmomax}"
APP="${APP:-pmo-architect}"

AR_REPO="${AR_REPO:-pmomax}"
IMAGE_NAME="${IMAGE_NAME:-pmo-architect}"
TAG="${TAG:-$(date -u +%Y%m%d-%H%M%S)}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${TAG}"

# Cluster control flags (see deploy-gke.sh for more detailed options)
AUTOPILOT="${AUTOPILOT:-false}"
AUTOPILOT_REQUIRED="${AUTOPILOT_REQUIRED:-0}"
STANDARD_PRIVATE_FALLBACK="${STANDARD_PRIVATE_FALLBACK:-0}"
CLUSTER_MODE="${CLUSTER_MODE:-standard-private}"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing required command: $1" >&2; exit 1; }
}
need gcloud
need kubectl

say() { echo "[$(date +%H:%M:%S)] $*"; }

say "Using project: ${PROJECT_ID}"
say "Region: ${REGION}"
say "Cluster: ${CLUSTER}"
say "Namespace: ${NAMESPACE}"
say "Image: ${IMAGE_URI}"

say "Enabling required APIs (ok if already enabled)…"
gcloud services enable \
  container.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  --project "${PROJECT_ID}" \
  --quiet

say "Ensuring Artifact Registry repo exists (${AR_REPO})…"
if ! gcloud artifacts repositories describe "${AR_REPO}" \
  --location "${REGION}" \
  --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location "${REGION}" \
    --project "${PROJECT_ID}" \
    --description="PMOMax Docker images" \
    --quiet
fi

say "Configuring Docker auth for Artifact Registry…"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

say "Building & pushing image with Cloud Build…"
# (Assumes Dockerfile in current directory.)
gcloud builds submit \
  --tag "${IMAGE_URI}" \
  --project "${PROJECT_ID}" \
  --quiet

# ------------------------------------------------------------
# Detect org policy: compute.vmExternalIpAccess
# If enforced, avoid Autopilot and create a Standard private-node cluster
# with Cloud NAT so nodes can pull container images without external IPs.
# ------------------------------------------------------------
say "Checking org policy: compute.vmExternalIpAccess"
POLICY_OUT=""
POLICY_ENFORCED="false"
POLICY_OUT=$(gcloud org-policies describe constraints/compute.vmExternalIpAccess --project "${PROJECT_ID}" --format=json 2>/dev/null || true)
if [[ -n "${POLICY_OUT}" && "${POLICY_OUT}" != "null" ]]; then
  if printf '%s' "${POLICY_OUT}" | grep -q '"rules"' >/dev/null 2>&1; then
    POLICY_ENFORCED="true"
    say "Detected org policy rules for constraints/compute.vmExternalIpAccess on project ${PROJECT_ID}."
  else
    say "Org policy present but no rules detected for compute.vmExternalIpAccess (treating as not enforced)."
  fi
else
  say "No org policy detected for compute.vmExternalIpAccess. Using configured cluster type."
fi

if [[ "${POLICY_ENFORCED}" == "true" ]]; then
  if [[ "${AUTOPILOT_REQUIRED}" == "1" ]]; then
    echo "ERROR: Autopilot/public clusters are blocked by org policy constraints/compute.vmExternalIpAccess for project ${PROJECT_ID}." >&2
    echo "Ask your org admin to allow external IPs for node VMs or unset AUTOPILOT_REQUIRED. Admin example to reset policy (do NOT run here):" >&2
    echo "  gcloud org-policies reset constraints/compute.vmExternalIpAccess --project ${PROJECT_ID}" >&2
    exit 1
  fi
  if [[ "${STANDARD_PRIVATE_FALLBACK}" == "1" ]]; then
    say "Org policy blocks node external IPs; falling back to Standard private-node cluster mode."
    CLUSTER_MODE="standard-private"
    AUTOPILOT="false"
  else
    say "Org policy blocks node external IPs and STANDARD_PRIVATE_FALLBACK is disabled. Exiting." >&2
    exit 1
  fi
fi

# Resolve project number for SA binding
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)' 2>/dev/null || true)"


say "Ensuring GKE cluster exists (mode=${CLUSTER_MODE})…"
if ! gcloud container clusters describe "${CLUSTER}" --region "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  if [[ "${CLUSTER_MODE}" == "standard-private" ]]; then
    say "Creating Standard PRIVATE cluster (mode=standard-private): ${CLUSTER}"
    ROUTER_NAME="${CLUSTER}-router"
    NAT_NAME="${CLUSTER}-nat"
    NETWORK="${NETWORK:-default}"

    if ! gcloud compute routers describe "${ROUTER_NAME}" --region "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
      say "Creating Cloud Router: ${ROUTER_NAME}"
      gcloud compute routers create "${ROUTER_NAME}" --region "${REGION}" --network "${NETWORK}" --project "${PROJECT_ID}" || true
    else
      say "Cloud Router ${ROUTER_NAME} already exists"
    fi

    if ! gcloud compute routers nats describe "${NAT_NAME}" --router "${ROUTER_NAME}" --router-region "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
      say "Creating Cloud NAT: ${NAT_NAME}"
      gcloud compute routers nats create "${NAT_NAME}" \
        --router "${ROUTER_NAME}" \
        --router-region "${REGION}" \
        --nat-all-subnet-ip-ranges \
        --auto-allocate-nat-external-ips \
        --enable-logging \
        --project "${PROJECT_ID}" || true
    else
      say "Cloud NAT ${NAT_NAME} already exists"
    fi

    if [[ -n "${PROJECT_NUMBER}" ]]; then
      NODE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
      say "Granting Artifact Registry reader to node SA: ${NODE_SA}"
      gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
        --member "serviceAccount:${NODE_SA}" \
        --role "roles/artifactregistry.reader" --quiet || true
    else
      say "Could not determine PROJECT_NUMBER; skipping node SA IAM binding"
    fi

    say "Creating cluster (private nodes, ip-alias)"
    gcloud container clusters create "${CLUSTER}" \
      --region "${REGION}" \
      --project "${PROJECT_ID}" \
      --release-channel "regular" \
      --enable-ip-alias \
      --enable-private-nodes \
      --master-ipv4-cidr "172.16.0.0/28" \
      --workload-pool="${PROJECT_ID}.svc.id.goog" \
      --num-nodes 1 \
      --enable-autoscaling --min-nodes 1 --max-nodes 3 \
      --machine-type "e2-standard-2" \
      --network "${NETWORK}" \
      --logging=SYSTEM,WORKLOAD \
      --monitoring=SYSTEM \
      --no-enable-basic-auth --quiet || true

  else
    say "Creating Autopilot cluster (this can take a few minutes)…"
    gcloud container clusters create-auto "${CLUSTER}" \
      --region "${REGION}" \
      --project "${PROJECT_ID}" \
      --quiet
  fi
fi

say "Waiting for cluster to be RUNNING…"
for i in {1..60}; do
  status="$(gcloud container clusters describe "${CLUSTER}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(status)' 2>/dev/null || true)"
  if [[ "${status}" == "RUNNING" ]]; then
    break
  fi
  say "Cluster status: ${status:-unknown} (waiting…)"
  sleep 10
  if [[ $i -eq 60 ]]; then
    echo "ERROR: Cluster did not reach RUNNING state in time." >&2
    exit 1
  fi
done

say "Fetching cluster credentials…"
gcloud container clusters get-credentials "${CLUSTER}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" >/dev/null

say "Ensuring namespace exists…"
if ! kubectl get ns "${NAMESPACE}" >/dev/null 2>&1; then
  kubectl create ns "${NAMESPACE}" >/dev/null
fi

say "Deploying Kubernetes resources…"
cat <<YAML | kubectl apply -n "${NAMESPACE}" -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP}
  labels:
    app: ${APP}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${APP}
  template:
    metadata:
      labels:
        app: ${APP}
    spec:
      containers:
        - name: ${APP}
          image: ${IMAGE_URI}
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          env:
            - name: PORT
              value: "8080"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: ${APP}-svc
  labels:
    app: ${APP}
spec:
  type: ClusterIP
  selector:
    app: ${APP}
  ports:
    - name: http
      port: 80
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${APP}-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.allow-http: "true"
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${APP}-svc
                port:
                  number: 80
YAML

say "Waiting for deployment rollout…"
kubectl rollout status deployment/${APP} -n "${NAMESPACE}" --timeout=180s

say "Waiting for external IP on Ingress…"
ING_IP=""
for i in {1..60}; do
  ING_IP="$(kubectl get ingress ${APP}-ingress -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
  if [[ -n "${ING_IP}" ]]; then
    break
  fi
  say "Ingress IP not assigned yet (waiting…)"
  sleep 10
  if [[ $i -eq 60 ]]; then
    echo "ERROR: Ingress did not receive an external IP in time." >&2
    kubectl describe ingress ${APP}-ingress -n "${NAMESPACE}" || true
    exit 1
  fi
done

say "Done. Public URL: http://${ING_IP}/"

say "Quick health check…"
if curl -fsS "http://${ING_IP}/health" >/dev/null 2>&1; then
  say "Health OK: http://${ING_IP}/health"
else
  say "WARNING: health check failed (LB may still be propagating). Try again in ~30–60s: http://${ING_IP}/health"
fi

cat <<MSG

Next useful checks:
  kubectl -n ${NAMESPACE} get all
  kubectl -n ${NAMESPACE} logs -l app=${APP} --tail=200
  kubectl -n ${NAMESPACE} describe ingress ${APP}-ingress

If you want HTTPS + a custom domain:
  1) Reserve a static IP (global) and add annotation kubernetes.io/ingress.global-static-ip-name
  2) Create a ManagedCertificate and set up a DNS A record to the static IP

MSG
