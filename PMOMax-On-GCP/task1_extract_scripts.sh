#!/usr/bin/env bash
# TASK 1 — Extract and inspect all scripts from the current deployer digest
# Must be run from PMOMax-On-GCP/
set -euo pipefail

REPO="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer"
BAD_DIGEST="sha256:7afb90cb0c76cd2430aa41dd542af3dda6f57f5fd63a531d0af497652b07770f"
GOOD_DIGEST="sha256:b7ecd2482658160aeea51325fd00c1128df1fcf28073eadda420508fa6684972"
WORK="/tmp/extract_7afb90cb"

echo "================================================================"
echo " TASK 1 — Registry state"
echo "================================================================"
gcloud artifacts versions list \
  --repository=pmomax \
  --location=us \
  --package=deployer \
  --project=katalyststreet-public \
  --format="table(name,createTime)" 2>&1

echo ""
echo "================================================================"
echo " Probe GOOD digest (b7ecd248)"
echo "================================================================"
if crane manifest "${REPO}@${GOOD_DIGEST}" > /dev/null 2>&1; then
  echo "STATUS: EXISTS"
else
  echo "STATUS: NOT FOUND (deleted in prior session cleanup)"
fi

echo ""
echo "================================================================"
echo " Probe BAD digest (7afb90cb)"
echo "================================================================"
crane manifest "${REPO}@${BAD_DIGEST}" > /dev/null 2>&1 && echo "STATUS: EXISTS" || echo "STATUS: NOT FOUND"

echo ""
echo "================================================================"
echo " Manifest of 7afb90cb — annotations & entrypoint"
echo "================================================================"
crane manifest "${REPO}@${BAD_DIGEST}" 2>&1 | python3 -c "
import json,sys
m=json.load(sys.stdin)
print('Annotations:', json.dumps(m.get('annotations',{}), indent=2))
"

crane config "${REPO}@${BAD_DIGEST}" 2>&1 | python3 -c "
import json,sys
c=json.load(sys.stdin)
cfg=c.get('config',{})
print('Entrypoint:', cfg.get('Entrypoint'))
print('Cmd       :', cfg.get('Cmd'))
print('User      :', cfg.get('User'))
print('WorkingDir:', cfg.get('WorkingDir'))
print('Env       :')
for e in (cfg.get('Env') or []):
    print(' ', e)
print()
print('Labels:')
for k,v in (cfg.get('Labels') or {}).items():
    print(f'  {k}={v}')
"

echo ""
echo "================================================================"
echo " Extract filesystem from 7afb90cb"
echo "================================================================"
rm -rf "${WORK}" && mkdir -p "${WORK}"

echo "Running crane export (may take ~60s)..."
crane export "${REPO}@${BAD_DIGEST}" - | tar -xC "${WORK}" \
  "usr/bin/deploy.sh" \
  "usr/bin/deploy_with_tests.sh" \
  "data/schema.yaml" \
  "data/manifest/application.yaml.template" \
  "data/manifest/manifests.yaml.template" \
  "data-test/tester.yaml" \
  2>/dev/null || true

echo ""
echo "=== EXTRACTED FILES ==="
find "${WORK}" -type f | sort | while read f; do
  echo ""
  echo "--- ${f#${WORK}/} ---"
  sha256sum "$f"
  wc -l "$f"
done

echo ""
echo "================================================================"
echo " FULL CONTENT: deploy.sh"
echo "================================================================"
cat "${WORK}/usr/bin/deploy.sh" 2>/dev/null || cat "${WORK}/bin/deploy.sh" 2>/dev/null || echo "NOT FOUND"

echo ""
echo "================================================================"
echo " FULL CONTENT: deploy_with_tests.sh"
echo "================================================================"
cat "${WORK}/usr/bin/deploy_with_tests.sh" 2>/dev/null || cat "${WORK}/bin/deploy_with_tests.sh" 2>/dev/null || echo "NOT FOUND"

echo ""
echo "================================================================"
echo " FULL CONTENT: tester.yaml"
echo "================================================================"
cat "${WORK}/data-test/tester.yaml" 2>/dev/null || echo "NOT FOUND"

echo ""
echo "================================================================"
echo " FULL CONTENT: schema.yaml"
echo "================================================================"
cat "${WORK}/data/schema.yaml" 2>/dev/null || echo "NOT FOUND"

echo ""
echo "TASK 1 COMPLETE"
