#!/usr/bin/env bash
set -u

PROJECT="${1:-katalyststreet-public}"
OUT="PMOMAX_COST_AUDIT_READONLY_$(date +%Y%m%d_%H%M%S).txt"

{
  echo "PMOMAX READ-ONLY COST / DEPENDENCY AUDIT"
  echo "Project: $PROJECT"
  echo "Generated: $(date)"
  echo

  echo "=== AUTH / PROJECT ==="
  gcloud auth list || true
  gcloud config get-value project || true
  echo

  echo "=== ENABLED SERVICES ==="
  gcloud services list --enabled --project="$PROJECT" || true
  echo

  echo "=== CLOUD RUN SERVICES ==="
  for r in us-east1 us-central1 us-west1; do
    echo "--- region: $r ---"
    gcloud run services list --platform=managed --region="$r" --project="$PROJECT" || true
  done
  echo

  echo "=== CLOUD RUN DESCRIBE pmo-architect ==="
  gcloud run services describe pmo-architect --region=us-east1 --project="$PROJECT" \
    --format="yaml(metadata.name,status.url,status.traffic,spec.template.spec.containers,spec.template.metadata.annotations)" || true
  echo

  echo "=== GKE CLUSTERS ==="
  gcloud container clusters list --project="$PROJECT" || true
  echo

  echo "=== GKE WORKLOADS: pmomax-auto ==="
  gcloud container clusters get-credentials pmomax-auto --region=us-central1 --project="$PROJECT" >/dev/null 2>&1 || true
  kubectl get namespaces || true
  kubectl get pods -A || true
  kubectl get deployments -A || true
  kubectl get pods -A | egrep -i "ubb|meter|pmo|pmomax" || true
  echo

  echo "=== GKE WORKLOADS: cluster-1 ==="
  gcloud container clusters get-credentials cluster-1 --zone=us-central1-a --project="$PROJECT" >/dev/null 2>&1 || true
  kubectl get namespaces || true
  kubectl get pods -A || true
  kubectl get deployments -A || true
  kubectl get pods -A | egrep -i "ubb|meter|pmo|pmomax|crmint" || true
  echo

  echo "=== ARTIFACT REGISTRY REPOSITORIES ==="
  gcloud artifacts repositories list --project="$PROJECT" || true
  echo

  echo "=== ARTIFACT IMAGES: apps ==="
  gcloud artifacts docker images list us-east1-docker.pkg.dev/"$PROJECT"/apps --project="$PROJECT" || true
  echo

  echo "=== ARTIFACT IMAGES: pmomax ==="
  gcloud artifacts docker images list us-docker.pkg.dev/"$PROJECT"/pmomax --project="$PROJECT" || true
  echo

  echo "=== CLOUD SCHEDULER JOBS ==="
  for loc in us-central1 us-east1; do
    echo "--- location: $loc ---"
    gcloud scheduler jobs list --location="$loc" --project="$PROJECT" || true
  done
  echo

  echo "=== PUBSUB TOPICS ==="
  gcloud pubsub topics list --project="$PROJECT" || true
  echo

  echo "=== PUBSUB SUBSCRIPTIONS ==="
  gcloud pubsub subscriptions list --project="$PROJECT" || true
  echo

  echo "=== APP ENGINE SERVICES ==="
  gcloud app services list --project="$PROJECT" || true
  echo

  echo "=== APP ENGINE VERSIONS ==="
  gcloud app versions list --project="$PROJECT" || true
  echo

  echo "=== RECENT CLOUD BUILDS ==="
  gcloud builds list --project="$PROJECT" --limit=20 || true
  echo

  echo "=== NOTES ==="
  echo "This script is read-only. It did not delete, disable, pause, or modify resources."
} | tee "$OUT"

echo
echo "Saved report to: $OUT"
