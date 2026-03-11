#!/usr/bin/env bash
set -euo pipefail

REPO="us-docker.pkg.dev/katalyststreet-public/pmomax/deployer"
GOOD="${REPO}@sha256:b7ecd2482658160aeea51325fd00c1128df1fcf28073eadda420508fa6684972"
BAD="${REPO}@sha256:df5f51a030c8ea17bcf7d8608a9a022938e7b4db0d92e1018f788679957f7f78"

WORK="/tmp/deployer_compare"
mkdir -p "${WORK}"

echo "================================================================"
echo " MANIFEST COMPARISON"
echo "================================================================"

echo ""
echo "--- MANIFEST GOOD (b7ecd248) ---"
crane manifest "${GOOD}" | python3 -c "
import json, sys
m = json.load(sys.stdin)
print('schemaVersion:', m.get('schemaVersion'))
print('mediaType:', m.get('mediaType'))
print('config digest:', m.get('config',{}).get('digest'))
print('annotations:', json.dumps(m.get('annotations', {}), indent=2))
print('layers:')
for l in m.get('layers', []):
    print('  ', l['digest'], 'size', l['size'])
"

echo ""
echo "--- MANIFEST BAD (df5f51a) ---"
crane manifest "${BAD}" | python3 -c "
import json, sys
m = json.load(sys.stdin)
print('schemaVersion:', m.get('schemaVersion'))
print('mediaType:', m.get('mediaType'))
print('config digest:', m.get('config',{}).get('digest'))
print('annotations:', json.dumps(m.get('annotations', {}), indent=2))
print('layers:')
for l in m.get('layers', []):
    print('  ', l['digest'], 'size', l['size'])
"

echo ""
echo "================================================================"
echo " CONFIG COMPARISON (entrypoint, cmd, labels)"
echo "================================================================"

echo ""
echo "--- CONFIG GOOD (b7ecd248) ---"
crane config "${GOOD}" | python3 -c "
import json, sys
c = json.load(sys.stdin)
cfg = c.get('config', {})
print('Entrypoint:', cfg.get('Entrypoint'))
print('Cmd:', cfg.get('Cmd'))
print('User:', cfg.get('User'))
print('WorkingDir:', cfg.get('WorkingDir'))
print('Labels:', json.dumps(cfg.get('Labels', {}), indent=2))
"

echo ""
echo "--- CONFIG BAD (df5f51a) ---"
crane config "${BAD}" | python3 -c "
import json, sys
c = json.load(sys.stdin)
cfg = c.get('config', {})
print('Entrypoint:', cfg.get('Entrypoint'))
print('Cmd:', cfg.get('Cmd'))
print('User:', cfg.get('User'))
print('WorkingDir:', cfg.get('WorkingDir'))
print('Labels:', json.dumps(cfg.get('Labels', {}), indent=2))
"

echo ""
echo "================================================================"
echo " LAYER DIFF"
echo "================================================================"

GOOD_LAYERS=$(crane manifest "${GOOD}" | python3 -c "
import json,sys; m=json.load(sys.stdin)
for l in m['layers']: print(l['digest'])
")

BAD_LAYERS=$(crane manifest "${BAD}" | python3 -c "
import json,sys; m=json.load(sys.stdin)
for l in m['layers']: print(l['digest'])
")

echo "GOOD layers:"
echo "${GOOD_LAYERS}"
echo ""
echo "BAD layers:"
echo "${BAD_LAYERS}"

echo ""
echo "--- Layers in GOOD but not in BAD ---"
comm -23 <(echo "${GOOD_LAYERS}" | sort) <(echo "${BAD_LAYERS}" | sort)

echo ""
echo "--- Layers in BAD but not in GOOD ---"
comm -13 <(echo "${GOOD_LAYERS}" | sort) <(echo "${BAD_LAYERS}" | sort)

echo ""
echo "================================================================"
echo " EXTRACTING KEY SCRIPTS FROM GOOD digest"
echo "================================================================"
mkdir -p "${WORK}/good" "${WORK}/bad"

crane export "${GOOD}" - | tar -x -C "${WORK}/good" \
    --wildcards \
    "usr/bin/deploy.sh" \
    "usr/bin/deploy_with_tests.sh" \
    "data/schema.yaml" \
    "data/manifest/application.yaml.template" \
    "data/manifest/manifests.yaml.template" \
    "data-test/tester.yaml" 2>/dev/null || true

echo "Files extracted from GOOD:"
find "${WORK}/good" -type f | sort

echo ""
echo "================================================================"
echo " EXTRACTING KEY SCRIPTS FROM BAD digest"
echo "================================================================"

crane export "${BAD}" - | tar -x -C "${WORK}/bad" \
    --wildcards \
    "usr/bin/deploy.sh" \
    "usr/bin/deploy_with_tests.sh" \
    "data/schema.yaml" \
    "data/manifest/application.yaml.template" \
    "data/manifest/manifests.yaml.template" \
    "data-test/tester.yaml" 2>/dev/null || true

echo "Files extracted from BAD:"
find "${WORK}/bad" -type f | sort

echo ""
echo "================================================================"
echo " CHECKSUMS"
echo "================================================================"

echo "GOOD checksums:"
find "${WORK}/good" -type f | sort | xargs sha256sum 2>/dev/null || true

echo ""
echo "BAD checksums:"
find "${WORK}/bad" -type f | sort | xargs sha256sum 2>/dev/null || true

echo ""
echo "================================================================"
echo " SCRIPT DIFFS"
echo "================================================================"

for SCRIPT in usr/bin/deploy.sh usr/bin/deploy_with_tests.sh data-test/tester.yaml; do
    GFILE="${WORK}/good/${SCRIPT}"
    BFILE="${WORK}/bad/${SCRIPT}"
    echo ""
    echo "--- diff: ${SCRIPT} ---"
    if [[ -f "${GFILE}" && -f "${BFILE}" ]]; then
        diff "${GFILE}" "${BFILE}" && echo "(identical)" || true
    elif [[ -f "${GFILE}" && ! -f "${BFILE}" ]]; then
        echo "MISSING in BAD"
    elif [[ ! -f "${GFILE}" && -f "${BFILE}" ]]; then
        echo "MISSING in GOOD"
    else
        echo "MISSING in BOTH"
    fi
done

echo ""
echo "================================================================"
echo " KEY PATTERN CHECKS IN SCRIPTS"
echo "================================================================"

for WHICH in good bad; do
    echo ""
    echo "=== ${WHICH} ($([ "${WHICH}" = "good" ] && echo b7ecd248 || echo df5f51a)) ==="
    for PAT in "print_config" "/tmp/params.env" "/data/params.env" "ttlSecondsAfterFinished" "not found" "BackoffLimit"; do
        FOUND=$(grep -rn "${PAT}" "${WORK}/${WHICH}/" 2>/dev/null | head -5)
        if [[ -n "${FOUND}" ]]; then
            echo "  [FOUND] ${PAT}:"
            echo "${FOUND}" | sed 's/^/    /'
        else
            echo "  [ABSENT] ${PAT}"
        fi
    done
done

echo ""
echo "================================================================"
echo " DONE"
echo "================================================================"
