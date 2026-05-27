# Cognitive Governance Glossary

## Cognitive Boundary

- **Plain English:** The line around what an AI system is allowed to see, change, recommend, or decide.
- **Technical:** A scoped control definition covering data access, tool access, permitted actions, prohibited actions, and escalation conditions.
- **Enterprise relevance:** Prevents AI initiatives from expanding beyond approved scope.
- **PMOMax mapping:** Scope inclusions/exclusions, assumptions, constraints, dependencies, compliance notes.
- **Example:** "The assistant may summarize project risks but may not approve vendor selection."

## Cognitive Authority

- **Plain English:** The level of decision power granted to an AI workflow.
- **Technical:** An authority class describing whether the system can suggest, draft, execute, or approve.
- **Enterprise relevance:** Clarifies where human ownership remains mandatory.
- **PMOMax mapping:** Governance approvals, sponsor/owner fields, RACI, decision log.
- **Example:** "AI may draft a mitigation plan; the risk owner approves it."

## Cognitive Trace

- **Plain English:** A record of how an AI-assisted output was produced.
- **Technical:** Request metadata, context summary, model/tool identifiers, policy checks, warnings, output summary, and review state.
- **Enterprise relevance:** Creates reviewable evidence for governance and audit.
- **PMOMax mapping:** `_auditMeta`, `_auditTrace`, structured `ai_decision_trace` logs.
- **Example:** A compliance review output includes trace level, request ID, warnings, and reviewed fields.

## Cognitive Audit

- **Plain English:** Reviewing the record of AI-assisted work.
- **Technical:** Inspection of cognitive traces, governance decisions, policy checks, escalation events, and exported artifacts.
- **Enterprise relevance:** Supports internal audit, customer assurance, and regulated workflow review.
- **PMOMax mapping:** Audit metadata/logging plus exportable PID records.
- **Example:** An auditor reviews who owned a decision and what AI warnings were generated.

## Cognitive Escalation

- **Plain English:** Sending an AI-assisted issue to a human when risk or uncertainty is too high.
- **Technical:** A rule or signal that changes review state from automated processing to human review required.
- **Enterprise relevance:** Keeps high-impact decisions under accountable human control.
- **PMOMax mapping:** Approvals, open questions, risks, mitigation gaps, compliance notes.
- **Example:** Missing privacy review triggers escalation before project approval.

## Cognitive Workload

- **Plain English:** Work that involves interpretation, reasoning, planning, review, or decision support.
- **Technical:** A task class involving model inference, context processing, tool use, or structured judgment.
- **Enterprise relevance:** Helps separate routine automation from AI governance-relevant work.
- **PMOMax mapping:** PID drafting, risk review, budget review, compliance review, assistant workflows.
- **Example:** Turning stakeholder notes into a risk register is a cognitive workload.

## Policy-Constrained Reasoning

- **Plain English:** AI reasoning bounded by rules and review expectations.
- **Technical:** Model output generation with explicit constraints, validation, guardrails, and escalation criteria.
- **Enterprise relevance:** Reduces uncontrolled or unsupported recommendations.
- **PMOMax mapping:** Prompt defense, PID guard, compliance review, structured PID schema.
- **Example:** The system may recommend risks only within the approved project scope.

## Human Override

- **Plain English:** A human can correct, reject, or supersede an AI output.
- **Technical:** A control state where human review determines final disposition.
- **Enterprise relevance:** Preserves accountability and operational judgment.
- **PMOMax mapping:** Approval fields, decision log, owner fields, exported review artifacts.
- **Example:** A sponsor rejects an AI-generated milestone as unrealistic.

## Decision Ownership

- **Plain English:** The person or role accountable for the outcome.
- **Technical:** Owner metadata attached to a decision, approval, risk, mitigation, or workflow state.
- **Enterprise relevance:** Prevents accountability gaps.
- **PMOMax mapping:** Sponsor, project manager/owner, RACI, approvals, decision log.
- **Example:** The compliance lead owns the decision to proceed after privacy review.

## Agent Responsibility Model

- **Plain English:** A clear map of what each AI or human role is responsible for.
- **Technical:** Role definitions for planner, reviewer, compliance, risk, tool-executor, and human owner.
- **Enterprise relevance:** Makes multi-agent systems governable.
- **PMOMax mapping:** Current PMOMax is not a full multi-agent system; RACI and owner fields provide a foundation.
- **Example:** A reviewer agent flags gaps; a human owner approves final disposition.

## Governance Checkpoint

- **Plain English:** A required review point before work moves forward.
- **Technical:** A workflow gate with required fields, evidence, approvals, or policy checks.
- **Enterprise relevance:** Prevents unreviewed AI work from entering production.
- **PMOMax mapping:** Governance approvals, compliance/security/privacy notes, next steps.
- **Example:** No deployment until risk owner and sponsor approvals are captured.

## Scope Drift

- **Plain English:** AI work expands beyond the approved project boundary.
- **Technical:** A mismatch between actual model/tool behavior and approved scope constraints.
- **Enterprise relevance:** Reduces uncontrolled expansion of AI impact.
- **PMOMax mapping:** Scope inclusions/exclusions, constraints, decisions, open questions.
- **Example:** An assistant begins recommending HR policy changes in a finance workflow.

## Goal Drift

- **Plain English:** The AI starts optimizing for the wrong outcome.
- **Technical:** Deviation between system behavior and stated objectives/KPIs.
- **Enterprise relevance:** Protects business intent and compliance obligations.
- **PMOMax mapping:** Objectives, KPIs, problem statement, business case.
- **Example:** A cost-saving agent recommends actions that conflict with customer commitments.

## Memory Risk

- **Plain English:** Stored context may expose sensitive information or influence later outputs incorrectly.
- **Technical:** Risk arising from retained prompts, embeddings, traces, files, or session state.
- **Enterprise relevance:** Important for privacy, confidentiality, and audit boundaries.
- **PMOMax mapping:** Audit trace levels, redaction keys, optional storage backends.
- **Example:** Full trace mode should be approved before storing sensitive project context.

## Model Uncertainty

- **Plain English:** The model may be unsure even when the output sounds confident.
- **Technical:** Confidence, warnings, incomplete context, ambiguous evidence, or unverifiable inference.
- **Enterprise relevance:** Drives review and escalation.
- **PMOMax mapping:** Warning counts, open questions, compliance review notes.
- **Example:** AI flags insufficient data for a budget estimate.

## Regulated Cognition

- **Plain English:** AI-assisted reasoning used in environments with compliance obligations.
- **Technical:** Cognitive workloads governed by legal, policy, audit, privacy, or safety constraints.
- **Enterprise relevance:** Applies to healthcare, finance, government, procurement, and critical operations.
- **PMOMax mapping:** Compliance/security/privacy notes, approvals, risks, audit metadata.
- **Example:** AI drafts a healthcare workflow PID, but privacy and clinical owners must review.

## Cognitive Orchestration

- **Plain English:** Coordinating AI steps, tools, checks, and human reviews.
- **Technical:** Workflow sequencing across model calls, tools, validation, escalation, and audit events.
- **Enterprise relevance:** Required for controlled agentic systems.
- **PMOMax mapping:** Current PMOMax supports AI-assisted workflows; full orchestration is roadmap.
- **Example:** Planner drafts, reviewer checks, compliance flags, human approves.

## Machine Cognition

- **Plain English:** AI work that resembles reasoning, planning, summarizing, reviewing, or deciding.
- **Technical:** Inference-driven processing over context with generated outputs and possible tool calls.
- **Enterprise relevance:** Creates governance needs beyond ordinary automation.
- **PMOMax mapping:** PID generation, AI assistant, parsing, budget/risk/compliance reviews.
- **Example:** AI interprets project notes and turns them into structured risks.

## Cognitive Governance Layer

- **Plain English:** The control layer around AI reasoning and action.
- **Technical:** Policies, boundaries, authority, checkpoints, traces, escalations, and human ownership.
- **Enterprise relevance:** Lets organizations scale AI without losing accountability.
- **PMOMax mapping:** PMOMax provides a project initiation control artifact and traceable governance workspace.
- **Example:** A PID becomes the upstream record defining what an AI project is allowed to do.
