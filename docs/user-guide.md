# PMOMax - User Guide (Marketplace Package)

## Overview

PMOMax is an AI-assisted Project Initiation Document (PID) workspace. This package provides a Marketplace-compatible Kubernetes deployment layout for PMOMax PID Architect.

## What This Package Contains

- Marketplace schema and parameter templates
- Application CR template
- PMOMax workload/service/ingress manifests
- Deployer image build and install scripts
- Pricing and log-storage guidance

## Prerequisites

- Google Cloud project with billing enabled
- GKE cluster access (`kubectl` configured)
- IAM permissions for deployment and Artifact Registry
- DNS/domain if ingress hostnames are used

## Key Parameters

Set in `params.env` or `deploy/params.env`:

- `APP_INSTANCE_NAME` (default `pmo-architect`)
- `NAMESPACE` (default `pmomax`)
- `DOMAIN` (default `pmomax.example.com`)
- `DEPLOYER_IMAGE`
- `PMOMAX_APP_IMAGE`
- `PMOMAX_APP_PORT`
- `SERVICE_ACCOUNT`

## Install Flow

1. Populate values (`NAMESPACE`, `DOMAIN`, image tags).
2. Build/publish deployer image if needed.
3. Run deployer or apply manifests directly.
4. Validate pods/service/ingress.

## Quick Validation

```bash
kubectl get pods -n <namespace>
kubectl get svc -n <namespace>
kubectl get ingress -n <namespace>
```

## Main Documents

- `docs/PMOMax_Pricing_and_Log_Storage_Requirements.md`
- `Architecture/PMOMax_PID_Architect_Infrastructure_Architecture.md`

## Parent Project Operational Scripts

Use existing scripts from parent `pmo26` for broader deployment operations:

- `../deploy.sh` (Cloud Run flow)
- `../deploy-marketplace.sh` (Marketplace-ready Cloud Run foundations)
- `../deploy_gke_ingress.sh` (GKE + ingress deployment)
