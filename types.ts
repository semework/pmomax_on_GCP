// --- Canonical PMOMax PID Schema (28 fields, strict) ---

export type CriticalPathBox = {
  id: 'CP1' | 'CP2' | 'CP3';
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  taskIds: string[];
};

export type CurrencyCode = 'USD';

export interface BudgetLineItem {
  task: string;
  role: string;
  estimatedHours: number;
  rateUsdPerHour: number;
  complexityMultiplier: number;
  totalCostUsd: number;
  justification: string;
  source: 'deterministic' | 'ai';
}

export interface BudgetSummary {
  currency: CurrencyCode;
  totalCostUsd: number;
  subtotalByRoleUsd: Record<string, number>;
  notes?: string[];
}

export interface PMOMaxPID {
  // 1) Title / Cover Block
  titleBlock: {
    projectTitle: string;
    subtitle: string;
    projectId?: string;
    generatedOn: string; // display string (e.g., 2025-10-24 or 10/24/2025)
  };

  // 2) Executive Summary
  executiveSummary: string;

  // 3) Problem Statement / Context
  problemStatement: string;

  // 4) Business Case & Expected Value
  businessCaseExpectedValue: string;

  // 5) Objectives (SMART) — TABLE
  objectivesSmart: Array<{
    objective: string;
    successMeasure: string;
  }>;

  // 6) KPIs / Success Metrics — TABLE
  kpis: Array<{
    kpi: string;
    baseline: string;
    target: string;
  }>;

  // 7) Scope — Inclusions (bullets)
  scopeInclusions: string[];

  // 8) Scope — Exclusions (bullets)
  scopeExclusions: string[];

  // 9) Assumptions — TABLE
  assumptions: Array<{
    assumption: string;
  }>;

  // 10) Constraints — TABLE
  constraints: Array<{
    constraint: string;
  }>;

  // 11) Dependencies — TABLE
  dependencies: Array<{
    dependency: string;
    teamOrSystem: string;
    status: string;
  }>;

  // 12) Stakeholders — TABLE
  stakeholders: Array<{
    name: string;
    role: string;
    contact: string;
  }>;

  // 13) Project Sponsor
  projectSponsor: {
    name: string;
    role: string;
  };

  // 14) Project Manager / Owner
  projectManagerOwner: {
    name: string;
    role?: string;
  };

  // 15) Team & Roles (RACI) — TABLE
  teamRaci: Array<{
    teamMember: string;
    role: string;
    responsible: string;
    accountable: string;
    consulted: string;
    informed: string;
  }>;

  // 16) Timeline Overview
  timelineOverview: string;

  // 17) Milestones (with dates) — TABLE
  milestones: Array<{
    milestone: string;
    targetDate: string; // YYYY-MM-DD
  }>;

  // 18) Work Breakdown / Tasks — TABLE (Gantt-feeding)
  workBreakdownTasks: Array<{
    name: string;
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
    owner: string;
    status: string;
    priority: string;
    kind: string;
    dependencies: string[];
  }>;

  // 19) Gantt Chart (Derived, not copied)
  gantt?: {
    rows: Array<{
      name: string;
      start: string;
      end: string;
      owner: string;
      status: string;
      priority: string;
      kind: string;
      deps: string;
    }>;
    dependencyEdges: Array<{ from: string; to: string }>;
    canRender: boolean;
    reasonIfNotRenderable: string | null;
    rowsTruncated?: boolean;
  };

  // Optional: explicit three-phase critical path boxes (CP1/CP2/CP3)
  criticalPathBoxes?: CriticalPathBox[];

  // 20) Budget & Cost Breakdown — TABLE
  budgetCostBreakdown: BudgetLineItem[];

  budgetSummary?: BudgetSummary;

  // 21) Resources & Tools — TABLE
  resourcesTools: Array<{
    resource: string;
    purpose: string;
  }>;

  // 22) Risks — TABLE
  risks: Array<{
    risk: string;
    probability: string;
    impact: string;
  }>;

  // 23) Mitigations / Contingencies — TABLE
  mitigationsContingencies: Array<{
    mitigation: string;
    contingency: string;
  }>;

  // 24) Issues & Decisions Log — TABLE
  issuesDecisionsLog: Array<{
    issue: string;
    decision: string;
    owner: string;
    date: string;
  }>;

  // 25) Communication Plan — TABLE
  communicationPlan: Array<{
    audience: string;
    cadence: string;
    channel: string;
  }>;

  // 26) Governance & Approvals — TABLE
  governanceApprovals: Array<{
    gate: string;
    signoffRequirement: string;
  }>;

  // 27) Compliance, Security & Privacy — TABLE
  complianceSecurityPrivacy: Array<{
    requirement: string;
    notes: string;
  }>;

  // 28) Open Questions & Next Steps + Notes & Background
  openQuestionsNextSteps: Array<{
    question: string;
    nextStep: string;
  }>;
  notesBackground: string;
}
// types.ts
// Central PID types used across PMOMAXX2.
// Keep these types permissive enough to support both parsed and manually authored content.

export type Maybe<T> = T | null | undefined;

export type ParseSource = 'paste' | 'upload' | 'demo';

// --- Core row-ish helpers ---
export type KV = Record<string, any>;

export interface ProjectTitleAndId {
  title?: string;
  id?: string;
  program?: string;
  phase?: string;
  workstream?: string;
  team?: string;
}

export interface PersonRole {
  name?: string;
  email?: string;
  role?: string;
  org?: string;
}

export interface ObjectiveItem {
  objective: string;
  owner?: string;
  dueDate?: string;
  metric?: string;
  notes?: string;
}

export interface KPIItem {
  kpi: string;
  target?: string;
  baseline?: string;
  owner?: string;
  cadence?: string;
}

export interface ScopeItem {
  item: string;
  notes?: string;
}

export interface DependencyItem {
  dependency: string;
  owner?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
}

export interface DeliverableItem {
  deliverable: string;
  owner?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
}

export interface MilestoneItem {
  milestone: string;
  date?: string;
  owner?: string;
  notes?: string;
}

export interface RiskItem {
  risk: string;
  impact?: string;
  probability?: string;
  owner?: string;
  mitigation?: string;
  notes?: string;
}

export interface MitigationItem {
  mitigation: string;
  owner?: string;
  dueDate?: string;
  status?: string;
  linkedRisk?: string;
}

export interface LegacyBudgetLineItem {
  item: string;
  amount?: number | string;
  currency?: string;
  notes?: string;
}

export interface ResourceToolItem {
  item: string;
  type?: string; // Resource | Tool | Vendor | Platform | Other
  owner?: string;
  notes?: string;
}

export interface CommunicationItem {
  communication: string;
  audience?: string;
  frequency?: string;
  channel?: string;
  owner?: string;
}

export interface GovernanceApprovalItem {
  approval: string;
  approver?: string;
  date?: string;
  notes?: string;
}

export interface IssueDecisionItem {
  item: string;
  type?: 'Issue' | 'Decision';
  owner?: string;
  date?: string;
  status?: string;
  notes?: string;
}

export interface OpenQuestionItem {
  question: string;
  owner?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
}

export interface ComplianceItem {
  requirement: string;
  owner?: string;
  status?: string;
  notes?: string;
}

// --- Gantt task type used by the chart ---
export interface GanttTask {
  id: string | number;
  name: string;
  start: string; // ISO-ish string
  end: string;   // ISO-ish string
  owner?: string;
  kind?: string;
  program?: string;
  team?: string;
  phase?: string;
  workstream?: string;
  dependsOn?: Array<string | number> | string | number | null;
  milestone?: boolean;
  critical?: boolean;
  baselineStart?: string;
  baselineEnd?: string;
}

// --- The PID canonical object ---

// Canonical PIDData interface: matches all code, demo, and export usages
export interface PIDData {
  projectTitleAndId?: ProjectTitleAndId;
  executiveSummary?: string;
  problemStatement?: string;
  businessCase?: string;
  objectives?: ObjectiveItem[];
  kpis?: KPIItem[];
  scopeInclusions?: string;
  scopeExclusions?: string;
  assumptions?: string;
  constraints?: ConstraintItem[];
  dependencies?: DependencyItem[];
  stakeholders?: PersonRole[];
  projectSponsor?: string;
  projectManager?: string;
  teamAndRoles?: TeamRoleItem[];
  timelineOverview?: string;
  milestones?: MilestoneItem[];
  deliverables?: DeliverableItem[];
  workBreakdown?: string;
  budgetAndCost?: { summary: string; table: LegacyBudgetLineItem[] };
  resourcesAndTools?: string;
  risks?: RiskItem[];
  mitigations?: string;
  issuesAndDecisions?: IssueDecisionItem[];
  communicationPlan?: CommunicationItem[];
  governance?: GovernanceApprovalItem[];
  compliance?: string;
  openQuestions?: OpenQuestionItem[];
}

// Add missing types for new fields
export interface ConstraintItem {
  id?: number;
  constraint: string;
  category?: string;
}

export interface TeamRoleItem {
  id?: number;
  teamMember: string;
  role: string;
  timezone?: string;
}

// --- AI assistant chat ---

export interface ChatMessage {
  role: AssistantRole;
  content: string;
}

export type AssistantRole = 'user' | 'assistant' | 'system';

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
  ts?: number;
}

// Small helpers used across components
export function asArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
