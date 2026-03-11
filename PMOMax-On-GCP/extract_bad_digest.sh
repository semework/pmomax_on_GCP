#!/usr/bin/env bash
# Extract key runtime files from df5f51a and dump them fully
set -euo pipefail

BAD="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:df5f51a030c8ea17bcf7d8608a9a022938e7b4db0d92e1018f788679957f7f78"
WORK="/tmp/df5f51a_extract"
rm -rf "${WORK}" && mkdir -p "${WORK}"

echo "================================================================"
echo " MANIFEST (full) for df5f51a"
echo "================================================================"
crane manifest "${BAD}" 2>&1

echo ""
echo "================================================================"
echo " Extracting filesystem from df5f51a"
echo "================================================================"
crane export "${BAD}" - | tar -x -C "${WORK}" 2>/dev/null || true

echo "Files extracted:"
find "${WORK}" -type f | sort

echo ""
echo "================================================================"
echo " /bin/deploy.sh"
echo "================================================================"
cat "${WORK}/bin/deploy.sh" 2>/dev/null || echo "FILE NOT FOUND: /bin/deploy.sh"

echo ""
echo "================================================================"
echo " /bin/deploy_with_tests.sh"
echo "================================================================"
cat "${WORK}/bin/deploy_with_tests.sh" 2>/dev/null || echo "FILE NOT FOUND: /bin/deploy_with_tests.sh"

echo ""
echo "================================================================"
echo " /data-test/tester.yaml"
echo "================================================================"
cat "${WORK}/data-test/tester.yaml" 2>/dev/null || echo "FILE NOT FOUND: /data-test/tester.yaml"
find "${WORK}/data-test" -type f 2>/dev/null || echo "No data-test dir"

echo ""
echo "================================================================"
echo " /data/schema.yaml"
echo "================================================================"
cat "${WORK}/data/schema.yaml" 2>/dev/null || echo "FILE NOT FOUND: /data/schema.yaml"

echo ""
echo "================================================================"
echo " KEY PATTERN CHECKS"
echo "================================================================"
echo "--- print_config ---"
grep -rn "print_config\|expand_config" "${WORK}/bin/" 2>/dev/null || echo "(not found)"

echo "--- /tmp/params.env vs /data/params.env ---"
grep -rn "params.env" "${WORK}/bin/" 2>/dev/null || echo "(not found)"

echo "--- ttlSecondsAfterFinished ---"
grep -rn "ttlSecondsAfterFinished" "${WORK}/" 2>/dev/null || echo "(not found)"

echo "--- not found guard ---"
grep -rn "not found\|not_found\|notfound" "${WORK}/bin/" 2>/dev/null || echo "(not found)"

echo ""
echo "================================================================"
echo " SHA256 of key scripts"
echo "================================================================"
sha256sum "${WORK}/bin/deploy.sh" "${WORK}/bin/deploy_with_tests.sh" 2>/dev/null || true
find "${WORK}/data-test" -type f -exec sha256sum {} \; 2>/dev/null || true

echo ""
echo "DONE."
