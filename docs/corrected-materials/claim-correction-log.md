# Claim Correction Log

This file records statements from older PMOMax drafts that should not be reused without correction.

## A2A Protocol

Incorrect or risky claim: PMOMax is built on the Agent-to-Agent protocol and all agents interoperate through A2A.

Corrected claim: PMOMax is an AI-assisted project initiation and governance platform. A2A may be discussed only as future-facing ecosystem context unless runtime A2A endpoints and Agent Cards are implemented and verified.

## Anthos

Incorrect or risky claim: PMOMax is built on Anthos.

Corrected claim: PMOMax is packaged for Google Cloud Marketplace Kubernetes/GKE deployment and also supports a hosted Cloud Run runtime deployment flow.

## Google Docs and Google Sheets

Incorrect or risky claim: PMOMax includes native Google Docs and Google Sheets add-ins.

Corrected claim: PMOMax supports structured PID work, file/input processing, and exports. Native Docs/Sheets add-ins should not be claimed unless separately implemented and verified.

## Immutable Audit Logs

Incorrect or risky claim: PMOMax creates immutable decision logs by default.

Corrected claim: PMOMax emits structured AI audit traces to customer-owned Cloud Logging by default and can optionally write to customer-managed GCS, BigQuery, or Firestore. Immutable retention depends on customer-configured GCP controls.

## Autonomous Governance Enforcement

Incorrect or risky claim: Governance agents prevent every rule bypass and block every noncompliant action.

Corrected claim: PMOMax helps surface governance gaps and supports AI-assisted governance review. Final approval, enforcement, and exception handling remain customer-controlled.

## Three-Agent Architecture

Incorrect or risky claim: PMOMax currently consists of three independent agents: AI Assistant Agent, Governance Agent, and Compliance Agent, all interoperating over A2A.

Corrected claim: PMOMax supports AI-assisted assistant, parsing, budget, risk, and compliance workflows. These should be described as capabilities unless a separate agent runtime architecture is implemented and verified.

## Central Audit Storage

Incorrect or risky claim: PMOMax centrally stores customer audit evidence.

Corrected claim: PMOMax is designed for customer-tenant operation. Audit traces remain in customer-controlled infrastructure by default.
