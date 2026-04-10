# PMOMax PID Architect Infrastructure Architecture

## Purpose

This document describes the PMOMax Marketplace package infrastructure shape used for Kubernetes deployment artifacts.

## Core Runtime

- Application: `pmomax-pid-architect`
- Packaging model: Google Cloud Marketplace Kubernetes deployer (envsubst)
- Main manifest templates:
  - `manifest/manifests.yaml.template`
  - `manifest/application.yaml.template`

## Control and Data Planes

- Control plane: GKE API + Marketplace deployer job
- Data plane: PMOMax app container serving HTTP on `PMOMAX_APP_PORT` (default 8080)

## Supporting Services (Estimated)

- Gemini 2.5 Pro API usage
- Cloud Logging
- Secret Manager
- Cloud Storage
- Artifact Registry
- Optional Firestore and Cloud Run integrations from parent PMOMax stack

## Deployment Flow

1. Operator provides install values (namespace, image, domain).
2. Deployer resolves templates via env vars.
3. Kubernetes resources are applied to target namespace.
4. Health probes validate service availability.

## Notes

This package is intentionally PMOMax-only and excludes inherited multi-service template components not required by PMOMax PID Architect.
