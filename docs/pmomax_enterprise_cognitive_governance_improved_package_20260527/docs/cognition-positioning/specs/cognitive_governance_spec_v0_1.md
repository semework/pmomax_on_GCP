# Cognitive Governance Spec v0.1

Status: Proposed extension

## Purpose

This specification defines a draft metadata structure for governing AI-assisted and agentic workflows. It is not currently a committed PMOMax runtime API. It is an architecture proposal that can align with PMOMax PID records and audit trace metadata.

## Required Fields

- `governanceId`
- `requestId`
- `workloadName`
- `cognitiveBoundary`
- `cognitiveAuthority`
- `humanOwner`
- `policyChecks`
- `escalation`
- `audit`

## Optional Fields

- `model`
- `tools`
- `dataSources`
- `riskProfile`
- `reviewers`
- `exportReferences`
- `retentionPolicy`

## JSON Schema Draft

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CognitiveGovernanceRecord",
  "type": "object",
  "required": ["governanceId", "requestId", "workloadName", "cognitiveBoundary", "cognitiveAuthority", "humanOwner", "policyChecks", "escalation", "audit"],
  "properties": {
    "governanceId": { "type": "string" },
    "requestId": { "type": "string" },
    "workloadName": { "type": "string" },
    "cognitiveBoundary": {
      "type": "object",
      "required": ["allowedData", "prohibitedData", "allowedActions", "prohibitedActions"],
      "properties": {
        "allowedData": { "type": "array", "items": { "type": "string" } },
        "prohibitedData": { "type": "array", "items": { "type": "string" } },
        "allowedActions": { "type": "array", "items": { "type": "string" } },
        "prohibitedActions": { "type": "array", "items": { "type": "string" } }
      }
    },
    "cognitiveAuthority": {
      "type": "object",
      "required": ["level", "approvalRequired"],
      "properties": {
        "level": { "enum": ["assist", "draft", "recommend", "execute_with_review", "execute_autonomously"] },
        "approvalRequired": { "type": "boolean" },
        "approvalRole": { "type": "string" }
      }
    },
    "humanOwner": {
      "type": "object",
      "required": ["name", "role"],
      "properties": {
        "name": { "type": "string" },
        "role": { "type": "string" },
        "email": { "type": "string" }
      }
    },
    "policyChecks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["policyId", "status"],
        "properties": {
          "policyId": { "type": "string" },
          "status": { "enum": ["pass", "warn", "fail", "not_evaluated"] },
          "message": { "type": "string" }
        }
      }
    },
    "escalation": {
      "type": "object",
      "required": ["required", "reason"],
      "properties": {
        "required": { "type": "boolean" },
        "reason": { "type": "string" },
        "assignedTo": { "type": "string" }
      }
    },
    "audit": {
      "type": "object",
      "required": ["traceLevel", "createdAt"],
      "properties": {
        "traceLevel": { "enum": ["meta", "summary", "full"] },
        "createdAt": { "type": "string", "format": "date-time" },
        "exportIds": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

## Example

```json
{
  "governanceId": "cg-2026-001",
  "requestId": "req-8f32",
  "workloadName": "AI-assisted project risk review",
  "cognitiveBoundary": {
    "allowedData": ["project charter", "stakeholder notes", "risk register"],
    "prohibitedData": ["unapproved customer PII", "production secrets"],
    "allowedActions": ["summarize", "draft risks", "recommend mitigations"],
    "prohibitedActions": ["approve project", "commit budget", "notify vendors"]
  },
  "cognitiveAuthority": {
    "level": "recommend",
    "approvalRequired": true,
    "approvalRole": "Project Sponsor"
  },
  "humanOwner": {
    "name": "Program Sponsor",
    "role": "Accountable Owner"
  },
  "policyChecks": [
    { "policyId": "privacy-review", "status": "warn", "message": "Privacy owner not assigned." }
  ],
  "escalation": {
    "required": true,
    "reason": "Missing privacy owner"
  },
  "audit": {
    "traceLevel": "summary",
    "createdAt": "2026-05-27T00:00:00Z",
    "exportIds": ["pid-export-001"]
  }
}
```

## TypeScript Interface

```ts
export interface CognitiveGovernanceRecord {
  governanceId: string;
  requestId: string;
  workloadName: string;
  cognitiveBoundary: {
    allowedData: string[];
    prohibitedData: string[];
    allowedActions: string[];
    prohibitedActions: string[];
  };
  cognitiveAuthority: {
    level: 'assist' | 'draft' | 'recommend' | 'execute_with_review' | 'execute_autonomously';
    approvalRequired: boolean;
    approvalRole?: string;
  };
  humanOwner: {
    name: string;
    role: string;
    email?: string;
  };
  policyChecks: Array<{
    policyId: string;
    status: 'pass' | 'warn' | 'fail' | 'not_evaluated';
    message?: string;
  }>;
  escalation: {
    required: boolean;
    reason: string;
    assignedTo?: string;
  };
  audit: {
    traceLevel: 'meta' | 'summary' | 'full';
    createdAt: string;
    exportIds?: string[];
  };
}
```
