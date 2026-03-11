# PMOMax Deployment Modes

PMOMax PID Architect supports multiple deployment options on Google Cloud. This document summarizes when and how to use each mode.

## 1. Cloud Run (Default)

**Use when:** You want a fully managed, serverless HTTP endpoint with simple autoscaling and no cluster management.

- **Script:** `deploy.sh`
- **Image:** Built via Cloud Build from the root `Dockerfile` into Artifact Registry.
- **Health gate:** Script hits `/_healthz` on the deployed Cloud Run service and fails if the status code is not `200`.
- **Secrets:** `GOOGLE_API_KEY` injected via Secret Manager (`SECRET_NAME` / `SECRET_VERSION_PIN`).
- **Config:** Key variables such as `PROJECT_ID`, `REGION_PRIMARY`, `SERVICE_NAME`, `IMAGE_NAME`, and `IMAGE_TAG` are read from `.env`.
 - **Security scanning:** Container vulnerability scanning via On-Demand Scanning is **opt-in only**. It runs *only* if you explicitly set `ENABLE_VULN_SCAN=true` in `.env` to avoid surprise per-scan charges.

### Cloud Run quickstart

```bash
# From the repo root (pmo01)
export PROJECT_ID=your-gcp-project
export REGION_PRIMARY=us-central1
export SERVICE_NAME=pmomax01
export IMAGE_NAME=pmo-architect
export IMAGE_TAG=0.0.1

./deploy.sh
```

## 2. Kubernetes on GKE

**Use when:** You need Kubernetes-native features (custom controllers, complex networking, pod-level policies) or want to run alongside other GKE workloads.

- **Base manifests:** `k8s/base`
  - `deployment.yaml` – `pmomax-pid-architect` deployment, listens on port `8080`, probes `/_healthz` for readiness/liveness.
  - `service.yaml` – `LoadBalancer` service exposing port `80` → `8080`.
  - `kustomization.yaml` – references the deployment and service.
- **Overlays:** `k8s/overlays`
  - `dev/` – `namePrefix: dev-`, `replicas: 1`, lighter resource requests/limits.
  - `prod/` – `namePrefix: prod-`, stronger resources and an `HorizontalPodAutoscaler` in `hpa.yaml`.
- **Script:** `deploy-gke.sh [dev|prod]`
  - Builds and pushes the image to Artifact Registry.
  - Uses `kustomize` (or `kubectl kustomize`) to render the chosen overlay.
  - Rewrites the placeholder image (`app-image:latest`) to the Artifact Registry image.
  - Applies the manifest, waits for rollout, and hits `/_healthz` on the LoadBalancer endpoint.

### GKE quickstart

```bash
# From the repo root (pmo01)
export PROJECT_ID=your-gcp-project
export ARTIFACT_REPO=apps
export ARTIFACT_LOCATION=us-central1
export IMAGE_NAME=pmo-architect
export IMAGE_TAG=0.0.1

# GKE cluster details
export GKE_CLUSTER=your-gke-cluster
export GKE_LOCATION=us-central1
export GKE_LOCATION_TYPE=region   # or "zone"
export K8S_NAMESPACE=pmomax

# Deploy to dev overlay
./deploy-gke.sh dev

# Deploy to prod overlay
./deploy-gke.sh prod
```

## 3. Cloud Run for Marketplace

**Use when:** You are preparing or operating a Cloud Run-based listing on Google Cloud Marketplace.

- **Script:** `deploy-marketplace.sh`
  - Performs a local pre-flight build and `/_healthz` check using `server.mjs` on port `8080`.
  - Cleans `node_modules` after the pre-flight run.
  - Delegates the actual image build and Cloud Run deployment to `deploy.sh`, so Marketplace flows benefit from the same SBOM and health gate behavior. Vulnerability scanning is **disabled by default** and only runs if `ENABLE_VULN_SCAN=true`.

### Marketplace quickstart (Cloud Run)

```bash
# Environment is the same as for deploy.sh
export PROJECT_ID=your-gcp-project
export REGION_PRIMARY=us-central1
export SERVICE_NAME=pmomax01
export IMAGE_NAME=pmo-architect
export IMAGE_TAG=0.0.1

./deploy-marketplace.sh
```

## 4. Rollback Strategy

- A clean pre-Kubernetes snapshot archive is stored as `before-k8.zip` at the repo root.  
- If Kubernetes-related changes need to be reverted, you can:
  - Reset the git working tree to the commit prior to K8s additions, **or**
  - Extract `before-k8.zip` to restore the source tree (excluding build artifacts, node_modules, and nested zip files).

## 5. Validation Utilities

- Use `scripts/validate-k8s.sh` to dry-run apply the dev and prod overlays (client-side only, no calls to the API server):  
  `kubectl apply --dry-run=client -k k8s/overlays/dev`  
  `kubectl apply --dry-run=client -k k8s/overlays/prod`

Cloud Run, GKE, and Marketplace deployment paths are intentionally additive: Cloud Run remains fully supported and unchanged while Kubernetes and Marketplace support are layered alongside it.
