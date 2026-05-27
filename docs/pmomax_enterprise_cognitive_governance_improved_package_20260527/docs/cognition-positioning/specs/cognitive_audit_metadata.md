# Cognitive Audit Metadata

Status: Proposed extension aligned to current PMOMax audit trace concepts

## Metadata Fields

| Field | Purpose |
|---|---|
| `requestId` | Unique request or workflow identifier. |
| `modelId` | Model identifier used for the cognitive workload. |
| `provider` | AI provider or runtime provider. |
| `source` | Source workflow, endpoint, or product area. |
| `confidence` | Confidence level or qualitative certainty. |
| `warnings` | Warnings, gaps, uncertainty, or policy concerns. |
| `escalation` | Whether human review is required and why. |
| `policyChecks` | Policy evaluation results. |
| `reviewState` | Draft, reviewed, approved, rejected, escalated. |
| `exportIds` | IDs for PID, PDF, Word, JSON, or audit exports. |

## JSON Example

```json
{
  "requestId": "req-2026-05-27-001",
  "modelId": "gpt-5.5",
  "provider": "OpenAI",
  "source": "pmomax:/api/ai/risk",
  "confidence": "medium",
  "warnings": [
    "Mitigation owner missing",
    "Privacy impact not confirmed"
  ],
  "escalation": {
    "required": true,
    "reason": "Privacy owner missing",
    "assignedRole": "Compliance Lead"
  },
  "policyChecks": [
    { "id": "pii-boundary", "status": "warn" },
    { "id": "approval-owner", "status": "fail" }
  ],
  "reviewState": "escalated",
  "exportIds": ["pid-json-001", "pid-pdf-001"]
}
```

## TypeScript Interface

```ts
export interface CognitiveAuditMetadata {
  requestId: string;
  modelId?: string;
  provider?: string;
  source: string;
  confidence?: 'low' | 'medium' | 'high' | 'not_assessed';
  warnings: string[];
  escalation: {
    required: boolean;
    reason?: string;
    assignedRole?: string;
  };
  policyChecks: Array<{
    id: string;
    status: 'pass' | 'warn' | 'fail' | 'not_evaluated';
    details?: string;
  }>;
  reviewState: 'draft' | 'reviewed' | 'approved' | 'rejected' | 'escalated';
  exportIds?: string[];
}
```

## PMOMax Alignment

- Current PMOMax audit trace concepts already include request-scoped metadata, trace levels, redaction controls, and structured logs.
- This file proposes a more formal vocabulary for future cognitive governance records.
- Full enforcement, signing, immutability, and external GRC synchronization remain roadmap items.
