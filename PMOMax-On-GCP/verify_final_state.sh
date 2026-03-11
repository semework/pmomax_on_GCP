#!/bin/bash
REPO="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer"
FINAL="sha256:df5f51a030c8ea17bcf7d8608a9a022938e7b4db0d92e1018f788679957f7f78"

echo "========================================"
echo "FINAL STATE VERIFICATION"
echo "========================================"

echo ""
echo "=== 1. All remaining deployer versions (should be exactly ONE) ==="
gcloud artifacts versions list \
  --repository=pmomax --location=us --package="deployer" \
  --project=katalyststreet-public \
  --format="value(name)" 2>&1 | grep -v "^$"

echo ""
echo "=== 2. All current tags and resolved digests ==="
while IFS= read -r TAG; do
  D=$(crane digest "${REPO}:${TAG}" 2>/dev/null)
  if [ "${D}" = "${FINAL}" ]; then
    echo "  ${TAG} => ${D}  [CORRECT - matches final]"
  else
    echo "  ${TAG} => ${D}  [WRONG - does not match final]"
  fi
done < <(crane ls "${REPO}" 2>&1)

echo ""
echo "=== 3. Manifest-level annotation on final digest ==="
crane manifest "${REPO}@${FINAL}" | python3 -c "
import json, sys
m = json.load(sys.stdin)
ann = m.get('annotations', {})
print(json.dumps(ann, indent=2))
"

echo ""
echo "=== 4. Image config Labels ==="
crane config "${REPO}@${FINAL}" | python3 -c "
import json, sys
c = json.load(sys.stdin)
labels = c.get('config', {}).get('Labels', {})
print(json.dumps(labels, indent=2))
"

echo ""
echo "=== 5. Manifest mediaType ==="
crane manifest "${REPO}@${FINAL}" | python3 -c "
import json, sys
m = json.load(sys.stdin)
mt = m.get('mediaType', '(absent = OCI format)')
print(mt)
"
echo "========================================"
