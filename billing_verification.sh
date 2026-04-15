#!/usr/bin/env bash
set -euo pipefail

# Manual Billing Verification helper for PMOMax Marketplace review.
#
# Optional overrides:
#   APP_NAME=pmo-architect NAMESPACE=<namespace> ./billing_verification.sh
#
# If APP_NAME/NAMESPACE are not provided, the script searches for a Deployment
# with a sidecar container named "ubbagent".

if [[ -z "${APP_NAME:-}" || -z "${NAMESPACE:-}" ]]; then
  detected="$(
    kubectl get deploy -A -o json \
      | jq -r '
          .items[]
          | select(any(.spec.template.spec.containers[]?; .name == "ubbagent"))
          | "\(.metadata.namespace) \(.metadata.name)"
        ' \
      | head -n 1
  )"

  if [[ -z "${detected}" ]]; then
    detected="$(
      kubectl get secret -A -o json \
        | jq -r '
            .items[]
            | select(.metadata.name | endswith("-reporting-secret"))
            | "\(.metadata.namespace) \(.metadata.name | sub("-reporting-secret$"; ""))"
          ' \
        | head -n 1
    )"
  fi

  if [[ -z "${detected}" ]]; then
    echo "ERROR: Could not find a ubbagent Deployment or reporting secret." >&2
    echo "Set APP_NAME and NAMESPACE explicitly, then retry." >&2
    exit 1
  fi

  NAMESPACE="${NAMESPACE:-$(awk '{print $1}' <<<"${detected}")}"
  APP_NAME="${APP_NAME:-$(awk '{print $2}' <<<"${detected}")}"
fi

secret_name="${APP_NAME}-reporting-secret"

echo "APP_NAME=${APP_NAME}"
echo "NAMESPACE=${NAMESPACE}"
echo "REPORTING_SECRET=${secret_name}"

consumer_id="$(
  kubectl get secret "${secret_name}" -n "${NAMESPACE}" --output json \
    | jq -r '.data["consumer-id"]' \
    | base64 -d \
    | cut -d: -f2
)"

if [[ -z "${consumer_id}" || "${consumer_id}" == "null" ]]; then
  echo "ERROR: Could not extract consumer-id from ${secret_name}." >&2
  exit 1
fi

echo "CONSUMER_ID=${consumer_id}"
echo
echo "Use this value in check_billing.sql:"
echo "  WHERE project.id = '${consumer_id}'"
echo
if kubectl get deploy "${APP_NAME}" -n "${NAMESPACE}" -o json \
  | jq -e 'any(.spec.template.spec.containers[]?; .name == "ubbagent")' >/dev/null; then
  echo "Recent ubbagent heartbeat/reporting logs:"
  kubectl logs "deployment/${APP_NAME}" -c ubbagent -n "${NAMESPACE}" --tail=200 \
    | grep -Ei "Reporting|Heartbeat|success|Successful report" || true
else
  echo "WARNING: Deployment ${NAMESPACE}/${APP_NAME} does not currently include a container named ubbagent."
  echo "The reporting secret exists, but this cluster is not running the 1.4.1 billing sidecar manifest."
fi
echo
echo "To follow live ubbagent reporting logs, run:"
echo "kubectl logs -f deployment/${APP_NAME} -c ubbagent -n ${NAMESPACE} | grep -Ei 'Reporting|Heartbeat|success|Successful report'"
