# PMOMax User Guide

## Overview

PMOMax is an AI-assisted workspace for creating and improving Project Initiation Documents. It helps users organize project inputs, identify missing details, review risks and compliance considerations, and generate structured outputs for review and handoff.

## Typical Workflow

1. Start a new project workspace or use an existing PID.
2. Add project notes, documents, spreadsheet content, meeting notes, or pasted text.
3. Use Create Agent or AI-assisted parsing to structure the input into PID sections.
4. Review objectives, scope, assumptions, dependencies, deliverables, milestones, stakeholders, approvals, risks, mitigations, decisions, and open questions.
5. Use governance, risk, budget, assistant, and compliance workflows to identify gaps or inconsistencies.
6. Review all AI-assisted changes before using them as project decisions.
7. Export or share structured outputs for project teams and stakeholders.

## Human Review

PMOMax assists with drafting, structuring, and analysis. It does not replace accountable project, legal, compliance, security, or executive review. Human stakeholders remain responsible for final approval, exception handling, and governance decisions.

## AI Audit Traceability

AI-assisted outputs include audit metadata and trace information where supported by the endpoint. This can include request ID, endpoint, source, duration, trace level, step labels, and redacted or summarized trace steps depending on configuration.

## Marketplace Deployment Notes

For Marketplace deployment, use the Marketplace package and deployer flow. For hosted Cloud Run runtime deployment, use `deploy-fast.sh`. The root `Dockerfile` builds the Marketplace deployer image, not the Cloud Run runtime app image.

## Safe Operating Practices

- Review generated text before approval or distribution.
- Confirm project owners, dates, risks, and approvals manually.
- Avoid placing secrets in prompts or uploaded content.
- Use customer IAM and Cloud Logging controls for retention and access.
- Enable optional audit backends only when the customer wants additional storage patterns.
