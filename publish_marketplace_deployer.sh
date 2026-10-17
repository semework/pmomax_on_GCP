#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
AR_HOST="${AR_HOST:-us-docker.pkg.dev}"
AR_REPO="${AR_REPO:-pmomax}"
MARKETPLACE_SERVICE_NAME="${MARKETPLACE_SERVICE_NAME:-services/pmo-max.endpoints.${PROJECT_ID}.cloud.goog}"
ANNOTATION_KEY="com.googleapis.cloudmarketplace.product.service.name"

if [[ $# -ne 1 || -z "${1:-}" ]]; then
  echo "Usage: $0 <immutable-version-tag>"
  echo "Example: $0 1.4.16"
  exit 2
fi

VERSION="$1"
BASE_TAG="${BASE_TAG:-${VERSION%.*}}"
DEPLOYER_REPO="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/deployer"
UBBAGENT_REPO="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/ubbagent"

for command in gcloud crane jq python3; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "ERROR: ${command} is required."
    exit 1
  fi
done

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud auth configure-docker "${AR_HOST}" --quiet >/dev/null

resolve_digest() {
  gcloud artifacts docker images describe "$1" \
    --project "${PROJECT_ID}" \
    --format='value(image_summary.digest)'
}

verify_annotation() {
  local image="$1"
  local actual
  actual="$(crane manifest "${image}" | jq -r --arg key "${ANNOTATION_KEY}" '.annotations[$key] // empty')"
  if [[ "${actual}" != "${MARKETPLACE_SERVICE_NAME}" ]]; then
    echo "ERROR: Marketplace annotation missing or incorrect on ${image}."
    echo "  expected: ${MARKETPLACE_SERVICE_NAME}"
    echo "  actual:   ${actual:-<empty>}"
    exit 1
  fi
}

DEPLOYER_DIGEST="$(resolve_digest "${DEPLOYER_REPO}:${VERSION}")"
UBBAGENT_DIGEST="$(resolve_digest "${UBBAGENT_REPO}:${VERSION}")"

if [[ -z "${DEPLOYER_DIGEST}" || -z "${UBBAGENT_DIGEST}" ]]; then
  echo "ERROR: Both immutable version images must exist before release tagging."
  exit 1
fi

verify_annotation "${DEPLOYER_REPO}@${DEPLOYER_DIGEST}"
verify_annotation "${UBBAGENT_REPO}@${UBBAGENT_DIGEST}"

check_image_vulnerabilities() {
  local report
  report="$(gcloud artifacts docker images describe "$1" --project "${PROJECT_ID}" --show-package-vulnerability --format=json)"
  python3 - "${report}" <<'PYSCAN'
import datetime as dt
import json
import sys

def validate(report, max_age_hours=24, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    discoveries = report.get('discovery_summary', {}).get('discovery', [])
    scans = [item.get('discovery', {}) for item in discoveries]
    successful = [scan for scan in scans if scan.get('analysisStatus') == 'FINISHED_SUCCESS']
    if not successful:
        raise ValueError('No completed successful Artifact Analysis scan')
    latest = max((scan.get('lastScanTime', '') for scan in successful), default='')
    if not latest:
        raise ValueError('Successful scan has no lastScanTime')
    scanned_at = dt.datetime.fromisoformat(latest.replace('Z', '+00:00'))
    if now - scanned_at > dt.timedelta(hours=max_age_hours):
        raise ValueError(f'Artifact Analysis scan is stale: {latest}')
    findings = []
    for group, occurrences in report.get('package_vulnerability_summary', {}).get('vulnerabilities', {}).items():
        for occurrence in occurrences:
            vulnerability = occurrence.get('vulnerability', {})
            severity = vulnerability.get('effectiveSeverity') or vulnerability.get('severity') or group
            if severity in ('CRITICAL', 'HIGH'):
                findings.append(f"{severity}: {vulnerability.get('shortDescription', occurrence.get('noteName', 'unknown'))}")
    if findings:
        raise ValueError('\n'.join(findings))
    return latest


try:
    report = json.loads(sys.argv[1])
    latest = validate(report)
    print(f"PASS {report['image_summary']['fully_qualified_digest']}: no effective Critical/High findings; scan {latest}")
except (ValueError, KeyError) as error:
    print(f"RELEASE BLOCKED: {error}", file=sys.stderr)
    sys.exit(1)
PYSCAN
}

# Resolve and scan immutable digests before moving all three publisher release-track tags.
APP_IMAGE="${PMOMAX_APP_IMAGE:-${AR_HOST}/${PROJECT_ID}/${AR_REPO}/application:${VERSION}}"
APP_REF="$(gcloud artifacts docker images describe "${APP_IMAGE}" --project "${PROJECT_ID}" --format='value(image_summary.fully_qualified_digest)')"
check_image_vulnerabilities "${DEPLOYER_REPO}@${DEPLOYER_DIGEST}"
check_image_vulnerabilities "${UBBAGENT_REPO}@${UBBAGENT_DIGEST}"
check_image_vulnerabilities "${APP_REF}"
verify_annotation "${APP_REF}"

gcloud artifacts docker tags add \
  "${DEPLOYER_REPO}@${DEPLOYER_DIGEST}" \
  "${DEPLOYER_REPO}:${BASE_TAG}" \
  --project "${PROJECT_ID}" --quiet
gcloud artifacts docker tags add \
  "${UBBAGENT_REPO}@${UBBAGENT_DIGEST}" \
  "${UBBAGENT_REPO}:${BASE_TAG}" \
  --project "${PROJECT_ID}" --quiet

gcloud artifacts docker tags add \
  "${APP_REF}" \
  "${AR_HOST}/${PROJECT_ID}/${AR_REPO}/application:${BASE_TAG}" \
  --project "${PROJECT_ID}" --quiet

VERIFY_DEPLOYER="$(resolve_digest "${DEPLOYER_REPO}:${BASE_TAG}")"
VERIFY_UBBAGENT="$(resolve_digest "${UBBAGENT_REPO}:${BASE_TAG}")"
VERIFY_APP="$(resolve_digest "${AR_HOST}/${PROJECT_ID}/${AR_REPO}/application:${BASE_TAG}")"

if [[ "${VERIFY_DEPLOYER}" != "${DEPLOYER_DIGEST}" || "${VERIFY_UBBAGENT}" != "${UBBAGENT_DIGEST}" || "${VERIFY_APP}" != "${APP_REF##*@}" ]]; then
  echo "ERROR: Release-track tag verification failed."
  exit 1
fi

echo "Prepared publisher release track ${BASE_TAG} for version ${VERSION}:"
echo "  deployer: ${DEPLOYER_DIGEST}"
echo "  ubbagent: ${UBBAGENT_DIGEST}"
echo "  application: ${VERIFY_APP}"
echo "  annotation: ${MARKETPLACE_SERVICE_NAME}"
