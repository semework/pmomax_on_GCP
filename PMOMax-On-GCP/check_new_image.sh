#!/usr/bin/env bash
set -euo pipefail
NEW="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:7afb90cb0c76cd2430aa41dd542af3dda6f57f5fd63a531d0af497652b07770f"
WORK2="/tmp/new_v2"
rm -rf "${WORK2}" && mkdir -p "${WORK2}"
crane export "${NEW}" - | tar -x -C "${WORK2}" 2>/dev/null

echo "=== Files at script paths ==="
ls -la "${WORK2}/bin/deploy_with_tests.sh" "${WORK2}/usr/bin/deploy_with_tests.sh" 2>/dev/null || echo "(paths missing)"

echo ""
echo "=== grep 600s / timed out ==="
grep -n "600s\|timed out\|tester pod to be scheduled\|_si in" \
    "${WORK2}/bin/deploy_with_tests.sh" \
    "${WORK2}/usr/bin/deploy_with_tests.sh" 2>/dev/null || echo "(NOT FOUND)"

echo ""
echo "=== sha256 checksums ==="
sha256sum "${WORK2}/bin/deploy_with_tests.sh" "${WORK2}/usr/bin/deploy_with_tests.sh" 2>/dev/null || true

echo ""
echo "=== First 50 lines of deploy_with_tests.sh ==="
head -50 "${WORK2}/bin/deploy_with_tests.sh" 2>/dev/null || head -50 "${WORK2}/usr/bin/deploy_with_tests.sh" 2>/dev/null || echo "(file not found)"
echo "DONE"
