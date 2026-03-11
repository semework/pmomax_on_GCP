#!/usr/bin/env bash
# Retag submission tags to final digest 7afb90cb, delete old digests
set -euo pipefail

REPO="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer"
PROJECT="katalyststreet-public"
FINAL="sha256:7afb90cb0c76cd2430aa41dd542af3dda6f57f5fd63a531d0af497652b07770f"

echo "================================================================"
echo " Retag submission tags → final digest ${FINAL}"
echo "================================================================"
for TAG in 1.0 1.0.1 1.0.4; do
    gcloud artifacts docker tags add "${REPO}@${FINAL}" "${REPO}:${TAG}" \
        --project "${PROJECT}" 2>&1 && echo "OK: ${TAG} -> ${FINAL}"
done

echo ""
echo "================================================================"
echo " Remove staging tags 1.0.5 and 1.0.6"
echo "================================================================"
gcloud artifacts docker tags delete "${REPO}:1.0.5" \
    --project "${PROJECT}" --quiet 2>&1 && echo "OK: deleted tag 1.0.5" || echo "1.0.5 not found"
gcloud artifacts docker tags delete "${REPO}:1.0.6" \
    --project "${PROJECT}" --quiet 2>&1 && echo "OK: deleted tag 1.0.6" || echo "1.0.6 not found"

echo ""
echo "================================================================"
echo " Delete old deployer digests"
echo "================================================================"
OLD_DIGESTS=(
  "sha256:df5f51a030c8ea17bcf7d8608a9a022938e7b4db0d92e1018f788679957f7f78"
  "sha256:daad5a7222f92d403b44a2813613835b6954c09c199df228936671e66ac06619"
)
for D in "${OLD_DIGESTS[@]}"; do
    SHORT="${D:7:16}"
    echo "Deleting ${SHORT}..."
    gcloud artifacts docker images delete "${REPO}@${D}" \
        --project "${PROJECT}" --quiet 2>&1 | tail -3 || echo "(delete failed or not found)"
    echo "---"
done

echo ""
echo "================================================================"
echo " Final registry state"
echo "================================================================"
gcloud artifacts versions list \
    --repository=pmomax \
    --location=us \
    --package="deployer" \
    --project="${PROJECT}" \
    --format="table(name,createTime)" 2>&1

echo ""
for TAG in 1.0 1.0.1 1.0.4; do
    D=$(crane digest "${REPO}:${TAG}" 2>&1)
    echo "${TAG} => ${D}"
done

echo ""
echo "================================================================"
echo " Manifest annotation check on final tags"
echo "================================================================"
crane manifest "${REPO}@${FINAL}" | python3 -c "
import json, sys
m = json.load(sys.stdin)
ann = m.get('annotations', {})
KEY = 'com.googleapis.cloudmarketplace.product.service.name'
print('annotation:', ann.get(KEY, '(MISSING)'))
if KEY in ann:
    print('ANNOTATION CHECK: PASS')
else:
    print('ANNOTATION CHECK: FAIL')
    sys.exit(1)
" 2>&1

echo ""
echo "DONE. Final digest: ${FINAL}"
