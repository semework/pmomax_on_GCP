# PMOMax PID Architect

## Overview
PMOMax PID Architect is an AI-powered application that generates structured Project Initiation Documents (PID) from raw text or uploaded documents. It features an interactive AI assistant for document refinement and editing, and supports export, compliance, and reporting workflows.

## Features
- Automated PID generation from text or files
- Conversational AI assistant for document editing
- Export to multiple formats
- Health check endpoint (`/_healthz`)
- SBOM and vulnerability reporting
- Google Cloud Marketplace-ready deployment

## Deployment

PMOMax PID Architect supports multiple deployment modes on Google Cloud:

- **Cloud Run (default)**  
	- Container image built from the root `Dockerfile` (multi-stage, exposes port `8080`, runs `server.mjs`).  
	- Use `deploy.sh` to build, push to Artifact Registry, and deploy to Cloud Run with a post-deploy health gate on `/_healthz`.  
	- `cloudbuild.yaml` is available for CI-driven image builds.

- **Kubernetes (GKE)**  
	- Base manifests live under `k8s/base` (`deployment.yaml`, `service.yaml`, `kustomization.yaml`) and expose port `8080` with readiness/liveness probes on `/_healthz`.  
	- Environment-specific overlays live under `k8s/overlays/dev` and `k8s/overlays/prod` (prod adds an HPA).  
	- Use `deploy-gke.sh [dev|prod]` to build/push the image to Artifact Registry, apply the chosen overlay, wait for rollout, and run an HTTP health check against the LoadBalancer service.

- **Cloud Run for Marketplace**  
	- `deploy-marketplace.sh` runs a local pre-flight build + health check, then delegates to `deploy.sh` so Marketplace-oriented deployments reuse the hardened Cloud Run flow and health gate.

- **Validation**  
	- Use `scripts/validate-k8s.sh` to run a client-side dry-run validation of the dev and prod Kubernetes overlays before deploying.

See `DEPLOYMENT-MODES.md` for a side-by-side comparison of these deployment options.

## API Endpoints
See openapi.yaml for full API specification.
- `GET /_healthz`: Health check
- `GET /api/demo`: Demo data
- `POST /api/export`: Export user data

## Licensing
Licensed under the Apache 2.0 License. See LICENSE for details.

## Compliance
- SBOM and vulnerability reports included
- All required Marketplace files present

## Support
For support, see SUPPORT.md or contact the maintainers listed in metadata.json.

## Documentation
See pmomax-docs.html for full user and API documentation.
# pmomax
