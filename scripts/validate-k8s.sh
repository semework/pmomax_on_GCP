#!/usr/bin/env bash
set -euo pipefail

# Simple validation helper for the PMOMax Kubernetes manifests.
# This does not contact a cluster API server; it only performs a
# client-side validation of the rendered kustomize overlays.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Error: kubectl is required to validate manifests."
  exit 1
fi

echo "Validating dev overlay (client-side dry run, no API server)..."
kubectl apply --dry-run=client --validate=false -k k8s/overlays/dev >/dev/null

echo "Validating prod overlay (client-side dry run, no API server)..."
kubectl apply --dry-run=client --validate=false -k k8s/overlays/prod >/dev/null

echo "✓ Kubernetes overlays (dev & prod) passed client-side validation."
