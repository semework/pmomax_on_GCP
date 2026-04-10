#!/bin/bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-pmomax}"
kubectl get pods -n "${NAMESPACE}"
kubectl get svc -n "${NAMESPACE}"
kubectl get ingress -n "${NAMESPACE}" || true
