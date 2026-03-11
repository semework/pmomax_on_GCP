#!/usr/bin/env bash
# Add manifest-level OCI annotation to deployer:1.0.5 → new deployer:1.0.6
# Then verify and retag submission tags
set -euo pipefail

REPO="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer"
PROJECT="katalyststreet-public"
PRE_ANNOT="${REPO}@sha256:daad5a7222f92d403b44a2813613835b6954c09c199df228936671e66ac06619"
ANN_KEY="com.googleapis.cloudmarketplace.product.service.name"
ANN_VAL="services/pmo-max.endpoints.katalyststreet-public.cloud.goog"
STAGING_TAG="${REPO}:1.0.6"

echo "================================================================"
echo " STEP 1: crane mutate — add manifest annotation"
echo "================================================================"
crane mutate \
  --annotation "${ANN_KEY}=${ANN_VAL}" \
  --tag "${STAGING_TAG}" \
  "${PRE_ANNOT}" 2>&1
echo "crane mutate done"

echo ""
echo "================================================================"
echo " STEP 2: Get final annotated digest"
echo "================================================================"
FINAL=$(crane digest "${STAGING_TAG}" 2>&1)
echo "Final annotated digest: ${FINAL}"

echo ""
echo "================================================================"
echo " STEP 3: Verify manifest annotation"
echo "================================================================"
crane manifest "${REPO}@${FINAL}" | python3 -c "
import json, sys
m = json.load(sys.stdin)
ann = m.get('annotations', {})
print('Manifest annotations:', json.dumps(ann, indent=2))
KEY='com.googleapis.cloudmarketplace.product.service.name'
if KEY in ann:
    print('ANNOTATION CHECK: PASS')
else:
    print('ANNOTATION CHECK: FAIL')
    import sys; sys.exit(1)
" 2>&1

echo ""
echo "================================================================"
echo " STEP 4: Verify config Labels"
echo "================================================================"
crane config "${REPO}@${FINAL}" | python3 -c "
import json, sys
c = json.load(sys.stdin)
labels = c.get('config', {}).get('Labels', {})
KEY = 'com.googleapis.cloudmarketplace.product.service.name'
print('Config Labels:', json.dumps(labels, indent=2))
if KEY in labels:
    print('CONFIG LABEL CHECK: PASS')
else:
    print('CONFIG LABEL CHECK: FAIL (annotation is only in manifest, not in config — this is acceptable)')
" 2>&1

echo ""
echo "================================================================"
echo " STEP 5: Verify deploy_with_tests.sh contains scheduling pre-wait"
echo "================================================================"
WORK="/tmp/new105"
rm -rf "${WORK}" && mkdir -p "${WORK}"
crane export "${REPO}@${FINAL}" - | tar -x -C "${WORK}" \
  "bin/deploy_with_tests.sh" "data-test/tester.yaml" 2>/dev/null || true

echo "--- grep: tester scheduling wait ---"
grep -n "tester pod to be scheduled\|_si in\|_TESTER_PHASE\|600s\|timed out" "${WORK}/bin/deploy_with_tests.sh" 2>/dev/null || echo "(NOT FOUND)"

echo ""
echo "--- grep: ttlSecondsAfterFinished ---"
grep -n "ttlSecondsAfterFinished" "${WORK}/data-test/tester.yaml" 2>/dev/null || echo "(NOT FOUND)"

echo ""
echo "--- CHECKSUMS ---"
sha256sum "${WORK}/bin/deploy_with_tests.sh" "${WORK}/data-test/tester.yaml" 2>/dev/null || true

echo ""
echo "FINAL ANNOTATED DIGEST: ${FINAL}"
echo "STAGING TAG: ${STAGING_TAG}"
echo ""
echo "DONE."
