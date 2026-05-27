# PMOMax Required Secret Backup Checklist

No secret values are included in this checklist.

## Blocking Before `pmomax-auto` Deletion

- [ ] Secret name: `pmomax/pmo-architect-reporting-secret`
  - Why needed: UBB/reporting sidecar uses it for `AGENT_ENCODED_KEY` and `AGENT_CONSUMER_ID`.
  - Where currently stored: Kubernetes secret in namespace `pmomax`.
  - Backup confirmed? No.
  - Safe to delete cluster afterward? Only after secure backup or confirmed obsolescence.

- [ ] Secret name: `pmo-architect-reporting-secret` key `reporting-key`
  - Why needed: Reporting credential for UBB/Service Control validation.
  - Where currently stored: Kubernetes secret key in namespace `pmomax`.
  - Backup confirmed? No.
  - Safe to delete cluster afterward? Only after secure backup or confirmed recreation path.

- [ ] Secret name: `pmo-architect-reporting-secret` key `consumer-id`
  - Why needed: Consumer identity for UBB/Service Control validation.
  - Where currently stored: Kubernetes secret key in namespace `pmomax`.
  - Backup confirmed? No.
  - Safe to delete cluster afterward? Only after secure backup or confirmed recreation path.

- [ ] Secret name: `pmomax/pmomax-license-998217`
  - Why needed: PMOMax license/validation material.
  - Where currently stored: Kubernetes secret in namespace `pmomax`.
  - Backup confirmed? No.
  - Safe to delete cluster afterward? Only after secure backup or confirmed obsolescence.

- [ ] Secret name: `default/pmomax-license-998217`
  - Why needed: PMOMax license/validation material duplicate or install artifact.
  - Where currently stored: Kubernetes secret in namespace `default`.
  - Backup confirmed? No.
  - Safe to delete cluster afterward? Only after secure backup or confirmed obsolescence.

## Strongly Recommended Before Deletion

- [ ] Secret/reference: `REPORTS/service-account-key.yaml`
  - Why needed: Possible source for reporting credential recovery.
  - Where currently stored: local file.
  - Backup confirmed? Unconfirmed.
  - Safe to delete cluster afterward? Only after a human verifies whether it matches the Kubernetes reporting key.

- [ ] Secret/reference: `MARKETPLACE_ACCESS_TOKEN`
  - Why needed: Local Marketplace/test workflow token.
  - Where currently stored: `.env`.
  - Backup confirmed? Local only confirmed.
  - Safe to delete cluster afterward? Yes for cluster deletion, but secure durable backup is recommended.

- [ ] Secret/reference: `OPENAI_API_KEY`
  - Why needed: AI runtime/server paths if future validation uses OpenAI.
  - Where currently stored: current shell environment.
  - Backup confirmed? No durable storage confirmed by audit.
  - Safe to delete cluster afterward? Yes for current Cloud Run/GKE secret deletion, but back up if needed for future validation.

## Already Recoverable Or Non-Blocking

- [x] Secret/reference: `GOOGLE_API_KEY`
  - Why needed: Gemini/Google AI paths.
  - Where currently stored: `.env` and Secret Manager metadata.
  - Backup confirmed? Likely yes.
  - Safe to delete cluster afterward? Yes.

- [x] Secret/reference: `MARKETPLACE_SERVICE_NAME`
  - Why needed: Marketplace/Service Control routing.
  - Where currently stored: Cloud Run metadata, `.env`, manifests.
  - Backup confirmed? Yes as configuration.
  - Safe to delete cluster afterward? Yes.

- [x] Secret/reference: `MARKETPLACE_REPORT_ENDPOINT`
  - Why needed: Cloud Run Marketplace reporting config.
  - Where currently stored: Cloud Run metadata.
  - Backup confirmed? Yes as configuration.
  - Safe to delete cluster afterward? Yes.

- [x] Secret/reference: `pmo-architect-ubbagent-config`
  - Why needed: UBB config structure for future validation cluster recreation.
  - Where currently stored: Kubernetes ConfigMap export.
  - Backup confirmed? Yes for config only.
  - Safe to delete cluster afterward? Only after referenced reporting secret values are backed up.

## Final Gate

Do not approve `pmomax-auto` deletion until all blocking checklist items are either:

- backed up into an approved secure store, or
- explicitly declared obsolete by the owner of PMOMax Marketplace validation and billing/metering.

