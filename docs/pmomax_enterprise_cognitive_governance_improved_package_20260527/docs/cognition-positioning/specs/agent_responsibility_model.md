# Agent Responsibility Model

Status: Proposed extension

## Purpose

This model defines how PMOMax could assign responsibilities across agentic workflows while preserving human accountability. It is a roadmap architecture, not a claim that PMOMax currently runs these agents as a production multi-agent system.

## Responsibility Roles

| Role | Responsibility | Authority | Required controls |
|---|---|---|---|
| Planner agent | Drafts plan, scope, tasks, dependencies, milestones. | Draft/recommend only. | Must cite source context and respect scope constraints. |
| Reviewer agent | Checks completeness, consistency, missing fields, contradictions. | Warn/recommend. | Must produce warnings and review state. |
| Compliance agent | Reviews compliance, privacy, security, policy, and audit concerns. | Warn/escalate. | Must escalate high-risk or missing-owner findings. |
| Risk agent | Identifies risks, impact, probability, mitigations, contingencies. | Recommend. | Must preserve uncertainty and human risk ownership. |
| Human owner | Owns final decision, approval, rejection, and operational accountability. | Approve/reject/override. | Must be named in governance record. |

## Control Principles

- Agents do not own outcomes.
- Agents may draft or recommend unless explicitly approved for execution.
- Human owners approve high-impact decisions.
- Policy failures trigger escalation.
- Audit records attach to each material cognitive workload.
- Scope and goal drift should be checked before approval.

## Example Workflow

```json
{
  "workflow": "PID governance review",
  "plannerAgent": "drafts PID sections",
  "reviewerAgent": "checks missing fields",
  "complianceAgent": "flags privacy and security gaps",
  "riskAgent": "adds risk and mitigation candidates",
  "humanOwner": "approves final PID for governance review"
}
```

## PMOMax Mapping

- **Implemented today:** PID fields, RACI, approvals, risks, compliance notes, AI-assisted review endpoints, trace metadata.
- **Partial:** Policy-constrained review and structured warnings.
- **Roadmap:** Separate named planner/reviewer/compliance/risk agents with formal responsibility contracts.
