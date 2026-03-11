# PMOMax-On-GCP

Google Cloud Marketplace packaging assets for **PMOMax PID Architect**.

## Scope

This package is intentionally scoped to a single PMOMax runtime service:

- `pmo-architect` (containerized PMOMax app)

## Folder Layout

- `deploy/schema.yaml`: Marketplace schema for install-time parameters
- `params.env`: package defaults
- `manifest/`: Marketplace-ready templates used by deployer
- `deploy/`: packaging/test helper assets
- `deployer/`: deploy container scripts
- `docs/`: PMOMax operational and pricing documentation
- `Architecture/`: PMOMax infrastructure architecture notes

## Discovered Environment (2026-03-09)

- Project: `katalyststreet-public` (active gcloud config)
- GKE cluster: `pmomax-auto` (region: `us-central1`)
- VPC/Subnet: `projects/katalyststreet-public/global/networks/default`, `projects/katalyststreet-public/regions/us-central1/subnetworks/default`
- Live workloads (namespace `pmomax`, Autopilot):
	- Deployment `deployer`: image `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.0`, replicas 2, requests `cpu 500m / mem 2Gi / eph 1Gi`, probes `/health` on 8080, imagePullPolicy IfNotPresent.
	- Deployment `pmo-architect`: image `us-docker.pkg.dev/katalyststreet-public/pmomax/pmomax:1.0`, replicas 2, same resources/probes as deployer, PORT=8080 env only.

## Apply / Validate (fresh project)

Run with an authenticated gcloud (project already set):

```bash
# 0) Set project if needed
gcloud config set project katalyststreet-public

# 1) Get GKE credentials
gcloud container clusters get-credentials pmomax-auto --region us-central1 --project katalyststreet-public

# 2) (Optional) Inspect current workloads to capture image tags, resources, env
kubectl get deployments -n <namespace> -o json

# 3) Prepare install values (example)
cat > /tmp/values.yaml <<'EOF'
APP_INSTANCE_NAME: pmo-architect
NAMESPACE: pmomax
DOMAIN: pmomax.example.com
reportingSecret: reporting-secret
deployerServiceAccount: deployer-sa
PMOMAX_APP_IMAGE: us-docker.pkg.dev/katalyststreet-public/pmomax/pmomax:1.0
PMOMAX_APP_PORT: 8080
EOF

# 4) Render params.env (Marketplace deployer style)
/bin/print_config.py --values_mode raw --values_file /tmp/values.yaml --output_file /tmp/params.env

# 5) Apply manifests (Marketplace deployer equivalent)
export $(cat /tmp/params.env | xargs)
envsubst < manifest/manifests.yaml.template | kubectl apply -n "$NAMESPACE" -f -
envsubst < manifest/application.yaml.template | kubectl apply -n "$NAMESPACE" -f -

# 6) Verify
kubectl rollout status deployment/$APP_INSTANCE_NAME -n "$NAMESPACE" --timeout=300s
kubectl get ingress $APP_INSTANCE_NAME -n "$NAMESPACE"
```

## TODO before release

- Re-run `kubectl get deployments -n <namespace> -o json` with sufficient RBAC to capture:
	- Exact container images and tags used in production
	- CPU/memory requests and limits
	- Environment variables and secrets (swap real secrets to `REPORTING_SECRET` or Secret Manager refs)
- Confirm Workload Identity binding to the correct service account (e.g., `run-pmomax-sa@katalyststreet-public.iam.gserviceaccount.com`).
- Adjust CI/CD triggers (Cloud Build/GitHub Actions) to publish to `us-docker.pkg.dev/katalyststreet-public/gcr.io/pmomax/*` if/when added.

## Marketplace Validation (mpdev)

- Validation assets live in `data-test/`:
	- `data-test/schema.yaml` (minimal schema for tester)
	- `data-test/tester.yaml` (Job that curls `http://${APP_INSTANCE_NAME}:80/health` and must exit 0)
- Install Application CRD if not present:
	- `kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/application/master/deploy/kube-app-manager-aio.yaml`
- Run local verification with mpdev:

```bash
mpdev verify --deployer=us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.0
```

- Ensure reportingSecret is supplied for usage-based billing flows; swap real secrets for Secret Manager refs in production.

## Deploy Behavior

`deployer/deploy.sh` applies:

- `manifest/manifests.yaml.template`
- optional `manifest/application.yaml.template`

Both templates are PMOMax-only and parameterized with:

- `APP_INSTANCE_NAME`
- `NAMESPACE`
- `PMOMAX_APP_IMAGE`
- `PMOMAX_APP_PORT`

## Required Inputs Before Release

1. Set production image tags in `params.env` and `deploy/test-values.yaml`.
2. Set production domain and namespace.
3. Validate Marketplace schema metadata and links.
4. Build and publish deployer image with `publish_marketplace_deployer*.sh`.

## Command-line Deployment (Kubernetes)

Authoritative Kubernetes deployment script: `../deploy_gke_ingress.sh`

Example (from parent `pmo26` root):

```bash
./deploy_gke_ingress.sh
```

If you deploy from this package alone (without parent scripts), use:

```bash
envsubst < manifest/manifests.yaml.template | kubectl apply -n "$NAMESPACE" -f -
envsubst < manifest/application.yaml.template | kubectl apply -n "$NAMESPACE" -f -
```
