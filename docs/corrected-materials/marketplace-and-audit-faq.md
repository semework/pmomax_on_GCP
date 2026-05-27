# PMOMax Marketplace and Audit FAQ

## Does PMOMax require a database?

No required PMOMax-owned database is needed for the default AI audit traceability model. The app emits structured logs that are captured by customer-owned Cloud Logging.

## Where do audit logs go by default?

AI decision trace logs are emitted to stdout as structured Winston JSON. GKE or Cloud Run captures stdout into Cloud Logging in the customer-controlled GCP environment.

## What is the structured audit event?

`message="ai_decision_trace"`

## What fields are attached to AI responses?

PMOMax attaches `_auditMeta` and `_auditTrace` to supported AI-assisted responses.

## Can customers enable additional audit storage?

Yes. Customers can configure optional GCS, BigQuery, or Firestore backends. These are customer-managed and optional.

## Is the audit trail immutable by default?

No. PMOMax does not claim immutable forensic logging by default. Customers can configure GCP retention, lock, IAM, BigQuery governance, or other controls when immutability is required.

## Does PMOMax centrally collect customer audit logs?

No. The default model keeps logs in customer-controlled infrastructure.

## Does PMOMax currently implement A2A?

No verified current A2A runtime implementation should be claimed. Describe PMOMax as AI-assisted PID, governance, compliance, risk, and traceability software unless A2A support is separately implemented and verified.

## What should Marketplace reviewers understand?

PMOMax is designed for customer-tenant operation, stateless runtime services, no required PMOMax-owned persistence layer, Cloud Logging by default, optional customer-managed audit backends, and Google Cloud Marketplace deployment packaging.
