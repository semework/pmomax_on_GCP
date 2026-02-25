
#!/usr/bin/env bash
set -euo pipefail

# --------------------------------------------
# PMOMax — GKE Deployment (Autopilot or Standard)
# Fix: Org Policy blocks VM external IPs -> use private nodes
# --------------------------------------------

# Source .env at the very top
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

# Add Google Cloud SDK to PATH if it exists
if [ -d "$HOME/google-cloud-sdk/bin" ]; then
  export PATH="$PATH:$HOME/google-cloud-sdk/bin"
fi
PROJECT="${PROJECT:-katalyststreet-public}"
REGION="${REGION:-us-east1}"
CLUSTER="${CLUSTER:-pmomax-auto}"
NAMESPACE="${NAMESPACE:-pmomax}"

# Use IMAGE_NAME and IMAGE_TAG from .env if present, else fallback
IMAGE_NAME="${IMAGE_NAME:-pmo-architect}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
AR_REPO="${AR_REPO:-pmomax}"
# Marketplace deployer image path
DEPLOYER_IMAGE="${HOSTNAME}/${PROJECT}/${PRODUCT_ID}/deployer:${IMAGE_TAG}"
IMAGE="${DEPLOYER_IMAGE}"
APP_NAME="${APP_NAME:-pmomax-pid-architect}"

# Network controls
NETWORK="${NETWORK:-default}"
AUTOPILOT="${AUTOPILOT:-true}"

# NEW: Private nodes + subnet/NAT controls
ENABLE_PRIVATE_NODES="${ENABLE_PRIVATE_NODES:-true}"
SUBNETWORK="${SUBNETWORK:-}"  # optional existing subnet name; leave empty to auto-create
ENABLE_CLOUD_NAT="${ENABLE_CLOUD_NAT:-true}"  # recommended when private nodes have no external IPs
MASTER_AUTH_NETS="${MASTER_AUTH_NETS:-}"  # optional, comma-separated CIDRs for master authorized networks

# K8s manifests directory (adjust if your repo uses something else)
MANIFEST_DIR="${MANIFEST_DIR:-k8s}"

# --- Preconditions ---
command -v gcloud >/dev/null 2>&1 || { echo "gcloud not found"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found"; exit 1; }

echo "Using PROJECT=${PROJECT} REGION=${REGION} CLUSTER=${CLUSTER} AUTOPILOT=${AUTOPILOT}"
gcloud config set project "${PROJECT}" >/dev/null

# --------------------------------------------
# Ensure cluster exists
# --------------------------------------------
echo "Ensuring GKE cluster exists…"
CLUSTER_EXISTS="false"
if gcloud container clusters describe "${CLUSTER}" --region "${REGION}" >/dev/null 2>&1; then
  CLUSTER_EXISTS="true"
fi

if [[ "${CLUSTER_EXISTS}" == "false" ]]; then
  echo "Cluster not found. Creating…"

  if [[ "${AUTOPILOT}" == "true" ]]; then
    echo "Creating Autopilot cluster (this can take a few minutes)..."

    # Private nodes prevent VM external IP allocation (required when org policy blocks vmExternalIpAccess).
    PRIVATE_NODE_ARGS=()
    if [[ "$ENABLE_PRIVATE_NODES" == "true" ]]; then
      PRIVATE_NODE_ARGS+=(--enable-private-nodes)
      # Note: --enable-private-endpoint requires --enable-master-authorized-networks
      # For simplicity, only enable private nodes without private endpoint
    fi

    # Subnet handling: use an existing subnet if provided; otherwise let GKE create one (recommended).
    CREATE_SUBNET_ARG=()
    if [[ -n "$SUBNETWORK" ]]; then
      CREATE_SUBNET_ARG+=(--subnetwork "$SUBNETWORK")
    else
      CREATE_SUBNET_NAME="${CLUSTER}-subnet"
      CREATE_SUBNET_ARG+=(--create-subnetwork "name=${CREATE_SUBNET_NAME}")
    fi

    # Optional control-plane access hardening.
    MASTER_AUTH_ARGS=()
    if [[ -n "$MASTER_AUTH_NETS" ]]; then
      MASTER_AUTH_ARGS+=(--enable-master-authorized-networks --master-authorized-networks "$MASTER_AUTH_NETS")
    fi

    if [[ ${#MASTER_AUTH_ARGS[@]} -gt 0 ]]; then
      gcloud container clusters create-auto "${CLUSTER}" \
        --region "${REGION}" \
        "${PRIVATE_NODE_ARGS[@]}" \
        "${CREATE_SUBNET_ARG[@]}" \
        "${MASTER_AUTH_ARGS[@]}" \
        --release-channel "regular"
    else
      gcloud container clusters create-auto "${CLUSTER}" \
        --region "${REGION}" \
        "${PRIVATE_NODE_ARGS[@]}" \
        "${CREATE_SUBNET_ARG[@]}" \
        --release-channel "regular"
    fi
  else
    echo "Creating Standard cluster..."

    PRIVATE_NODE_ARGS=()
    if [[ "$ENABLE_PRIVATE_NODES" == "true" ]]; then
      PRIVATE_NODE_ARGS+=(--enable-private-nodes)
      # Note: --enable-private-endpoint requires --enable-master-authorized-networks
      # For simplicity, only enable private nodes without private endpoint
    fi

    CREATE_SUBNET_ARG=()
    if [[ -n "$SUBNETWORK" ]]; then
      CREATE_SUBNET_ARG+=(--subnetwork "$SUBNETWORK")
    else
      CREATE_SUBNET_NAME="${CLUSTER}-subnet"
      CREATE_SUBNET_ARG+=(--create-subnetwork "name=${CREATE_SUBNET_NAME}")
    fi

    MASTER_AUTH_ARGS=()
    if [[ -n "$MASTER_AUTH_NETS" ]]; then
      MASTER_AUTH_ARGS+=(--enable-master-authorized-networks --master-authorized-networks "$MASTER_AUTH_NETS")
    fi

    if [[ ${#MASTER_AUTH_ARGS[@]} -gt 0 ]]; then
      gcloud container clusters create "${CLUSTER}" \
        --region "${REGION}" \
        --release-channel "regular" \
        --num-nodes=1 \
        --machine-type="e2-standard-2" \
        --enable-ip-alias \
        "${PRIVATE_NODE_ARGS[@]}" \
        "${CREATE_SUBNET_ARG[@]}" \
        "${MASTER_AUTH_ARGS[@]}"
    else
      gcloud container clusters create "${CLUSTER}" \
        --region "${REGION}" \
        --release-channel "regular" \
        --num-nodes=1 \
        --machine-type="e2-standard-2" \
        --enable-ip-alias \
        "${PRIVATE_NODE_ARGS[@]}" \
        "${CREATE_SUBNET_ARG[@]}"
    fi
  fi
else
  echo "Cluster exists."
fi

# --------------------------------------------
# Get credentials
# --------------------------------------------
echo "Fetching cluster credentials…"
gcloud container clusters get-credentials "${CLUSTER}" --region "${REGION}"

# If nodes have no external IPs, ensure outbound egress via Cloud NAT (for non-Google destinations).
if [[ "$ENABLE_PRIVATE_NODES" == "true" && "$ENABLE_CLOUD_NAT" == "true" ]]; then
  ROUTER_NAME="${CLUSTER}-router"
  NAT_NAME="${CLUSTER}-nat"

  echo "Ensuring Cloud Router (${ROUTER_NAME}) exists…"
  if ! gcloud compute routers describe "$ROUTER_NAME" --region "$REGION" >/dev/null 2>&1; then
    gcloud compute routers create "$ROUTER_NAME" --region "$REGION" --network "$NETWORK"
  fi

  echo "Ensuring Cloud NAT (${NAT_NAME}) exists…"
  if ! gcloud compute routers nats describe "$NAT_NAME" --router "$ROUTER_NAME" --region "$REGION" >/dev/null 2>&1; then
    gcloud compute routers nats create "$NAT_NAME" \
      --router "$ROUTER_NAME" --region "$REGION" \
      --auto-allocate-nat-external-ips \
      --nat-all-subnet-ip-ranges
  fi
fi

# --------------------------------------------
# Namespace
# --------------------------------------------
echo "Ensuring namespace ${NAMESPACE}…"
kubectl get ns "${NAMESPACE}" >/dev/null 2>&1 || kubectl create ns "${NAMESPACE}"

# --------------------------------------------
# Deploy manifests
# --------------------------------------------

echo "Deploying manifests from ${MANIFEST_DIR}/base…"
if [[ ! -d "${MANIFEST_DIR}/base" ]]; then
  echo "Manifest directory not found: ${MANIFEST_DIR}/base"
  exit 1
fi

# Patch the deployment manifest with the correct image tag before applying
DEPLOYMENT_FILE="${MANIFEST_DIR}/base/deployment.yaml"
if [[ -f "$DEPLOYMENT_FILE" ]]; then
  echo "Patching deployment.yaml with image: $IMAGE"
  # Use yq if available, else fallback to sed
  if command -v yq >/dev/null 2>&1; then
    yq e ".spec.template.spec.containers[0].image = \"$IMAGE\"" "$DEPLOYMENT_FILE" -i
  else
    sed -i.bak "s|image: .*|image: $IMAGE|" "$DEPLOYMENT_FILE"
  fi
fi

# Apply base manifests only via kustomize
kubectl -n "${NAMESPACE}" apply -k "${MANIFEST_DIR}/base/"

# --------------------------------------------
# Wait + Print endpoint
# --------------------------------------------
echo "Waiting for rollout…"
kubectl -n "${NAMESPACE}" rollout status deploy/"${APP_NAME}" --timeout=300s || true

echo "Service status:"
kubectl -n "${NAMESPACE}" get svc -o wide

echo "Ingress status:"
kubectl -n "${NAMESPACE}" get ingress -o wide || true

echo "Done."
