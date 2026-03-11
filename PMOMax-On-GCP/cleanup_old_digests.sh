#!/bin/bash
# Delete remaining 2 old deployer digests

REPO="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer"
PROJECT="katalyststreet-public"

OLD=(
  "sha256:c70973de91222efdc6872a232527e0c3b8b99342b0966c8f792d42c727302f2a"
  "sha256:f5de7f9fd24c559a8331459c0888f0b5f9fefe510a1eedf46bc4c74c0f67ef98"
)

for D in "${OLD[@]}"; do
  echo "Deleting ${D:0:23}..."
  gcloud artifacts docker images delete "${REPO}@${D}" \
    --project "${PROJECT}" --quiet 2>&1 || echo "  WARN: delete may have already occurred or failed"
done

echo "Done."
