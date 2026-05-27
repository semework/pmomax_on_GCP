#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CONSUMER_ID:-}" ]]; then
  echo "ERROR: CONSUMER_ID must be set to the real Marketplace consumer ID before starting the 6-hour test."
  exit 2
fi

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
REGION="${REGION:-us-east1}"
SERVICE_NAME="${SERVICE_NAME:-pmo-architect}"
METRIC="${METRIC:-pmo-max.endpoints.katalyststreet-public.cloud.goog/M1}"
LOG_DIR="${LOG_DIR:-logs}"
mkdir -p "${LOG_DIR}"

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(status.url)')"
TOKEN="$(gcloud auth print-identity-token)"
BODY_FILE="$(mktemp)"
STATUS="$(
  curl -sS -o "${BODY_FILE}" -w '%{http_code}' -X POST "${SERVICE_URL}/api/marketplace/usage/report" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"metric\":\"${METRIC}\",\"quantity\":1,\"consumerId\":\"${CONSUMER_ID}\",\"flushImmediately\":true}"
)"
BODY="$(cat "${BODY_FILE}")"
rm -f "${BODY_FILE}"

PREFLIGHT_LOG="${LOG_DIR}/ubb_real_consumer_preflight_$(date -u +%Y%m%dT%H%M%SZ).json"
printf '{"timestamp":"%s","consumerId":"%s","httpStatus":%s,"body":%s}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${CONSUMER_ID}" "${STATUS}" "${BODY}" > "${PREFLIGHT_LOG}"

if [[ "${STATUS}" != "200" ]] || [[ "${BODY}" != *'"flushed":{"ok":true,"sent":1}'* ]]; then
  echo "ERROR: Preflight did not produce a successful flushed sent=1 response. See ${PREFLIGHT_LOG}"
  exit 1
fi

RUN_ID="real_consumer_$(date -u +%Y%m%dT%H%M%SZ)"
nohup env CONSUMER_ID="${CONSUMER_ID}" RUN_ID="${RUN_ID}" bash scripts/run_ubb_6hr_stability.sh \
  > "${LOG_DIR}/ubb_6hr_stability_${RUN_ID}_runner.out" 2>&1 &
echo "$!" > "${LOG_DIR}/ubb_6hr_stability_${RUN_ID}.pid"
echo "Started 6-hour UBB stability loop."
echo "PID: $(cat "${LOG_DIR}/ubb_6hr_stability_${RUN_ID}.pid")"
echo "Preflight: ${PREFLIGHT_LOG}"
echo "Run log: ${LOG_DIR}/ubb_6hr_stability_${RUN_ID}.jsonl"
