#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-katalyststreet-public}"
REGION="${REGION:-us-east1}"
SERVICE_NAME="${SERVICE_NAME:-pmo-architect}"
METRIC="${METRIC:-pmo-max.endpoints.katalyststreet-public.cloud.goog/M1}"
CONSUMER_ID="${CONSUMER_ID:-}"
QUANTITY="${QUANTITY:-1}"
REPORT_COUNT="${REPORT_COUNT:-24}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-900}"
LOG_DIR="${LOG_DIR:-logs}"
if [[ -z "${RUN_ID:-}" ]]; then
  RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
fi
RUN_LOG="${LOG_DIR}/ubb_6hr_stability_${RUN_ID}.jsonl"
SUMMARY_FILE="${LOG_DIR}/ubb_6hr_stability_${RUN_ID}_summary.json"

mkdir -p "${LOG_DIR}"

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(status.url)')"
START_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

for i in $(seq 1 "${REPORT_COUNT}"); do
  TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  TOKEN="$(gcloud auth print-identity-token)"
  BODY_FILE="$(mktemp)"
  if [[ -n "${CONSUMER_ID}" ]]; then
    REQUEST_BODY="{\"metric\":\"${METRIC}\",\"quantity\":${QUANTITY},\"consumerId\":\"${CONSUMER_ID}\",\"flushImmediately\":true}"
  else
    REQUEST_BODY="{\"metric\":\"${METRIC}\",\"quantity\":${QUANTITY},\"flushImmediately\":true}"
  fi
  STATUS="$(
    curl -sS -o "${BODY_FILE}" -w '%{http_code}' -X POST "${SERVICE_URL}/api/marketplace/usage/report" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${REQUEST_BODY}"
  )"
  BODY="$(cat "${BODY_FILE}")"
  rm -f "${BODY_FILE}"
  printf '{"runId":"%s","report":%s,"total":%s,"timestamp":"%s","httpStatus":%s,"body":%s}\n' \
    "${RUN_ID}" "${i}" "${REPORT_COUNT}" "${TS}" "${STATUS}" "${BODY}" >> "${RUN_LOG}"
  if [[ "${i}" -lt "${REPORT_COUNT}" ]]; then
    sleep "${INTERVAL_SECONDS}"
  fi
done

END_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="pmo-architect"' \
  --project "${PROJECT_ID}" \
  --freshness=6h \
  --format=json > sustained_ubb_6hr_logs.json

SUCCESS_COUNT="$(grep -c '"flushed":{"ok":true,"sent":1}' "${RUN_LOG}" || true)"
cat > "${SUMMARY_FILE}" <<SUMMARY
{
  "runId": "${RUN_ID}",
  "serviceUrl": "${SERVICE_URL}",
  "metric": "${METRIC}",
  "consumerId": "${CONSUMER_ID}",
  "startedAt": "${START_TIME}",
  "finishedAt": "${END_TIME}",
  "reportCount": ${REPORT_COUNT},
  "intervalSeconds": ${INTERVAL_SECONDS},
  "successfulFlushCount": ${SUCCESS_COUNT},
  "runLog": "${RUN_LOG}",
  "bulkLogExport": "sustained_ubb_6hr_logs.json"
}
SUMMARY
