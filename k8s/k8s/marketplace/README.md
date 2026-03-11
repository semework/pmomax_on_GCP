# PMOMax Kubernetes Marketplace Packaging (Skeleton)

This directory contains a starter layout for packaging PMOMax PID Architect as a Kubernetes application for Google Cloud Marketplace.

The goal is to keep this structure in place without changing the existing Cloud Run flow. The files here are intentionally minimal and should be extended following the Google Cloud Marketplace Kubernetes application documentation.

## Layout

- `schema.yaml` – user-facing configuration schema (parameters, validation).
- `application.yaml` – top-level Application CR describing the deployment.
- `manifest/` – Kubernetes resource manifests (Deployments, Services, etc.).
- `icon/` – Marketplace icon assets.
- `licenses/` – license and attribution files.

## Next Steps

- Fill in `schema.yaml` with parameter definitions (e.g., namespace, replicas, image, service type).
- Align `application.yaml` and `manifest/` with the resources under `k8s/base` and `k8s/overlays`.
- Wire this packaging with your Marketplace listing pipeline as needed.
