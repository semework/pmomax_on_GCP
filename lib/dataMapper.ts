// lib/dataMapper.ts
//
// Unified mapper for:
//  - Local parser output: { fields, tables }
//  - Gemini JSON PID schema output: 28-field object (see pidSchemaDescription)
//
// This module is intentionally self-contained so it can be consumed
// from both frontend TypeScript and the Node backend (via the .js build).

export type ParserFields = { [key: string]: unknown };
export type ParserTables = { [key: string]: unknown[] };
export type ParserOutput = { fields: ParserFields; tables: ParserTables };

// Matches PIDData in types.ts
export interface PidDataApi {
  projectTitleAndId: { title: string; id: string };
  executiveSummary: string;
  problemStatement: string;
  businessCase: string;
  objectives: unknown[];
  kpis: unknown[];
  scopeInclusions: string;
  scopeExclusions: string;
  assumptions: string;
  constraints: unknown[];
  dependencies: unknown[];
  stakeholders: unknown[];
  projectSponsor: string;
  projectManager: string;
  teamAndRoles: unknown[];
  timelineOverview: string;
  milestones: unknown[];
  deliverables: unknown[];
  workBreakdown: string;
  budgetAndCost: {
    summary: string;
    table: unknown[];
  };
  resourcesAndTools: string;
  risks: unknown[];
  mitigations: string;
  issuesAndDecisions: unknown[];
  communicationPlan: unknown[];
  governance: unknown[];
  compliance: string;
  openQuestions: unknown[];
}

// Safe, conservative empty PID
export const emptyPidData: PidDataApi = {
  projectTitleAndId: { title: '', id: '' },
  executiveSummary: '',
  problemStatement: '',
  businessCase: '',
  objectives: [],
  kpis: [],
  scopeInclusions: '',
  scopeExclusions: '',
  assumptions: '',
  constraints: [],
  dependencies: [],
  stakeholders: [],
  projectSponsor: '',
  projectManager: '',
  teamAndRoles: [],
  timelineOverview: '',
  milestones: [],
  deliverables: [],
  workBreakdown: '',
  budgetAndCost: {
    summary: '',
    table: [],
  },
  resourcesAndTools: '',
  risks: [],
  mitigations: '',
  issuesAndDecisions: [],
  communicationPlan: [],
  governance: [],
  compliance: '',
  openQuestions: [],
};

export const toText = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();

  if (Array.isArray(v)) {
    const parts = v
      .map((x) =>
        typeof x === 'string'
          ? x.trim()
          : x && typeof x === 'object' && 'text' in x && typeof (x as any).text === 'string'
            ? (x as any).text.trim()
            : '',
      )
      .filter((s) => s.length > 0);
    return parts.join('\n');
  }

  if (typeof v === 'object') {
    const obj: any = v;
    for (const key of ['text', 'value', 'summary', 'description', 'body']) {
      if (typeof obj[key] === 'string') return obj[key].trim();
    }
    try {
      return JSON.stringify(v);
    } catch {
      return '[object]';
    }
  }

  try {
    return String(v).trim();
  } catch {
    return '[unstringifiable]';
  }
};

export const asArray = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
};

// --- Date normalization helpers -------------------------------------------

// Normalize date strings to ISO format YYYY-MM-DD
const normalizeDate = (dateStr: any): string => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Return original if invalid
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return dateStr;
  }
};

// Normalize milestones array to ensure dates are in ISO format
const normalizeMilestones = (arr: any[]): any[] => {
  return arr.map(item => ({
    ...item,
    date: normalizeDate(item.date)
  }));
};

// Normalize deliverables array to ensure start/end dates are in ISO format
// If dates are missing, synthesize realistic ones
const normalizeDeliverables = (arr: any[]): any[] => {
  if (!arr || arr.length === 0) return [];
  
  // Find earliest and latest dates from existing items to establish project bounds
  const today = new Date();
  const projectStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const projectEnd = new Date(projectStart);
  projectEnd.setMonth(projectEnd.getMonth() + 6); // Default 6-month project
  
  // Calculate default duration per deliverable (evenly distribute across timeline)
  const defaultDurationDays = 14; // 2 weeks per deliverable
  
  return arr.map((item, idx) => {
    let start = normalizeDate(item.start);
    let end = normalizeDate(item.end);
    
    // If dates are missing, synthesize them
    if (!start || !end) {
      const deliverableStart = new Date(projectStart);
      deliverableStart.setDate(deliverableStart.getDate() + (idx * defaultDurationDays));
      
      const deliverableEnd = new Date(deliverableStart);
      deliverableEnd.setDate(deliverableEnd.getDate() + defaultDurationDays - 1);
      
      start = start || deliverableStart.toISOString().split('T')[0];
      end = end || deliverableEnd.toISOString().split('T')[0];
    }
    
    return {
      ...item,
      start,
      end,
      targetDate: normalizeDate(item.targetDate)
    };
  });
};

// --- Timeline normalization helper -----------------------------------------

interface NormalizedTimeline {
  text: string;
  milestones: { id: number; name: string; date: string; owner?: string; status?: string }[];
}

/**
 * Accepts:
 *  - a plain string timeline
 *  - a JSON string like {"kickoff":"Oct 1, 2025", ...}
 *  - an object with key→date entries
 * Produces:
 *  - human-readable bullet-style text
 *  - a list of synthetic milestone rows suitable for the Milestones table
 */
function normalizeTimeline(value: unknown): NormalizedTimeline {
  if (value == null) {
    return { text: '', milestones: [] };
  }

  let raw: any = value;

  // JSON string → object
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return { text: '', milestones: [] };
    }
    try {
      raw = JSON.parse(trimmed);
    } catch {
      // Not JSON; use as plain text
      return { text: toText(trimmed), milestones: [] };
    }
  }

  if (!raw || typeof raw !== 'object') {
    return { text: toText(String(value)), milestones: [] };
  }

  const entries = Object.entries(raw as Record<string, unknown>).filter(
    ([, v]) => v != null && String(v).trim().length > 0,
  );
  if (entries.length === 0) {
    return { text: '', milestones: [] };
  }

  const bullets: string[] = [];
  const milestones: { id: number; name: string; date: string; owner?: string; status?: string }[] = [];

  let id = 1;
  for (const [key, v] of entries) {
    const label = key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const textVal = String(v).trim();
    if (!textVal) continue;

    bullets.push(`${label}: ${textVal}`);

    milestones.push({
      id: id++,
      name: label[0].toUpperCase() + label.slice(1),
      date: textVal,
      owner: '',
      status: 'Planned',
    });
  }

  return {
    text: bullets.join(' • '),
    milestones,
  };
}

// --- Mapping from Gemini JSON PID object (see lib/pidSchema.js) ---

const mapFromGemini = (raw: any): PidDataApi => {
  if (!raw || typeof raw !== 'object') {
    return { ...emptyPidData };
  }

  const timelineNorm = normalizeTimeline(
    (raw as any).timelineOverview ?? (raw as any).timeline ?? (raw as any).schedule ?? null,
  );

  const base: PidDataApi = {
    ...emptyPidData,
    projectTitleAndId: {
      title: toText((raw as any).title ?? (raw as any).projectTitle ?? (raw as any).name),
      id: toText((raw as any).projectId ?? (raw as any).id ?? (raw as any).projectNumber),
    },
    executiveSummary: toText((raw as any).executiveSummary ?? (raw as any).summary ?? (raw as any).executive_summary),
    problemStatement: toText((raw as any).problemStatement ?? (raw as any).problem ?? (raw as any).background ?? (raw as any).context),
    businessCase: toText((raw as any).businessCase ?? (raw as any).business_case ?? (raw as any).justification),
    objectives: asArray((raw as any).objectives ?? (raw as any).goals),
    kpis: asArray((raw as any).kpis ?? (raw as any).metrics ?? (raw as any).successCriteria),
    scopeInclusions: toText((raw as any).scopeInclusions ?? (raw as any).scope ?? (raw as any).inScope),
    scopeExclusions: toText((raw as any).scopeExclusions ?? (raw as any).outOfScope ?? (raw as any).out_of_scope),
    assumptions: toText((raw as any).assumptions),
    constraints: asArray((raw as any).constraints),
    dependencies: asArray((raw as any).dependencies),
    stakeholders: asArray((raw as any).stakeholders),
    projectSponsor: toText((raw as any).projectSponsor ?? (raw as any).sponsor),
    projectManager: toText((raw as any).projectManager ?? (raw as any).owner),
    teamAndRoles: asArray((raw as any).teamAndRoles),
    timelineOverview: timelineNorm.text || toText((raw as any).timelineOverview),
    milestones: normalizeMilestones(asArray((raw as any).milestones)),
    deliverables: normalizeDeliverables(asArray((raw as any).deliverables)),
    workBreakdown: toText(
      (raw as any).workBreakdown ?? (raw as any).workBreakdownStructure ?? (raw as any).wbs,
    ),
    budgetAndCost: {
      summary: toText((raw as any).budgetSummary ?? (raw as any).budget),
      table: asArray((raw as any).budgetTable),
    },
    resourcesAndTools: toText((raw as any).resourcesAndTools ?? (raw as any).resources),
    risks: asArray((raw as any).risks),
    mitigations: toText((raw as any).mitigations),
    issuesAndDecisions: asArray((raw as any).issuesAndDecisions ?? (raw as any).decisions),
    communicationPlan: asArray((raw as any).communicationPlan),
    governance: asArray((raw as any).governance ?? (raw as any).approvals),
    compliance: toText((raw as any).compliance),
    openQuestions: asArray((raw as any).openQuestions ?? (raw as any).questions),
  };

  // If Gemini didn’t fill structured milestones but timeline JSON is rich, synthesize them.
  if ((!base.milestones || base.milestones.length === 0) && timelineNorm.milestones.length > 0) {
    (base as any).milestones = timelineNorm.milestones;
  }

  return base;
};

// --- Mapping from local parser { fields, tables } ---

const mapFromParser = (parsed: ParserOutput): PidDataApi => {
  if (!parsed || typeof parsed !== 'object') {
    return { ...emptyPidData };
  }
  const fields = parsed.fields || {};
  const tables = parsed.tables || {};

  const get = (key: string, fallbackKey?: string): string => {
    const v =
      (fields as any)[key] ??
      (fallbackKey ? (fields as any)[fallbackKey] : undefined);
    return toText(v);
  };

  const timelineNorm = normalizeTimeline((fields as any)['fld-timeline-overview']);

  // Helper: pull “notes” for synthesizing 1-row tables
  const note = (key: string): string => get(key);

  const synthRisks = (): any[] => {
    const text = note('fld-risks-notes');
    if (!text) return [];
    return [
      {
        id: 1,
        risk: text,
        probability: 'M',
        impact: 'M',
        mitigation: '',
        owner: '',
        targetDate: '',
      },
    ];
  };

  const synthDependencies = (): any[] => {
    const text = note('fld-dependencies-notes');
    if (!text) return [];
    return [
      {
        id: 1,
        description: text,
        teamSystem: '',
        status: 'Open',
      },
    ];
  };

  const synthIssues = (): any[] => {
    const text = note('fld-issues-decisions-notes');
    if (!text) return [];
    return [
      {
        id: 1,
        description: text,
        status: 'Open',
        owner: '',
        date: '',
      },
    ];
  };

  const synthComms = (): any[] => {
    const text = note('fld-comms-plan-notes');
    if (!text) return [];
    return [
      {
        id: 1,
        communication: text,
        audience: '',
        frequency: '',
        channel: '',
      },
    ];
  };

  const synthGovernance = (): any[] => {
    const text = note('fld-governance-approvals-notes');
    if (!text) return [];
    return [
      {
        id: 1,
        gate: '',
        approver: text,
        date: '',
      },
    ];
  };

  const out: PidDataApi = {
    ...emptyPidData,
    projectTitleAndId: {
      title: get('fld-project-name', 'projectTitle'),
      id: get('fld-project-id', 'projectId'),
    },
    executiveSummary: get('fld-exec', 'executiveSummary'),
    problemStatement: get('fld-problem', 'problemStatement'),
    businessCase: get('fld-business-case', 'businessCase'),
    objectives: asArray((tables as any)['tbl-objectives']),
    kpis: asArray((tables as any)['tbl-kpis']),
    scopeInclusions: get('fld-scope-inclusions', 'scope'),
    scopeExclusions: get('fld-scope-exclusions', 'outOfScope'),
    assumptions: get('fld-assumptions', 'assumptions'),
    constraints: asArray((tables as any)['tbl-constraints']),
    dependencies:
      asArray((tables as any)['tbl-dependencies']).length > 0
        ? asArray((tables as any)['tbl-dependencies'])
        : synthDependencies(),
    stakeholders: asArray((tables as any)['tbl-stakeholders']),
    projectSponsor: get('fld-sponsor', 'sponsor'),
    projectManager: get('fld-owner', 'manager'),
    teamAndRoles: asArray((tables as any)['tbl-team']),
    timelineOverview: timelineNorm.text || get('fld-timeline-overview', 'timeline'),
    milestones: normalizeMilestones(asArray((tables as any)['tbl-milestones'])),
    deliverables: normalizeDeliverables(asArray((tables as any)['tbl-deliverables'])),
    workBreakdown: get('fld-deliverables-notes', 'workBreakdown'),
    budgetAndCost: {
      summary: get('fld-budget-notes', 'budget'),
      table: asArray((tables as any)['tbl-costs']),
    },
    resourcesAndTools: get('fld-resources-tools', 'resources'),
    risks:
      asArray((tables as any)['tbl-risks']).length > 0
        ? asArray((tables as any)['tbl-risks'])
        : synthRisks(),
    mitigations: get('fld-mitigations-notes', 'mitigations'),
    issuesAndDecisions:
      asArray((tables as any)['tbl-decisions']).length > 0
        ? asArray((tables as any)['tbl-decisions'])
        : synthIssues(),
    communicationPlan:
      asArray((tables as any)['tbl-comms-plan']).length > 0
        ? asArray((tables as any)['tbl-comms-plan'])
        : synthComms(),
    governance:
      asArray((tables as any)['tbl-approvals']).length > 0
        ? asArray((tables as any)['tbl-approvals'])
        : synthGovernance(),
    compliance: get('fld-compliance-notes', 'compliance'),
    openQuestions: asArray((tables as any)['tbl-open-questions']),
  };

  if ((!out.milestones || out.milestones.length === 0) && timelineNorm.milestones.length > 0) {
    (out as any).milestones = timelineNorm.milestones;
  }

  return out;
};

/**
 * Main entry point used by server.mjs
 *
 * Accepts either:
 *  - Gemini JSON PID object (28-field schema), OR
 *  - { fields, tables } from the local parser.
 */
export const mapLocalParserOutputToPidData = (raw: unknown): PidDataApi => {
  try {
    // Case: local parser output
    if (
      raw &&
      typeof raw === 'object' &&
      'fields' in (raw as any) &&
      'tables' in (raw as any)
    ) {
      return mapFromParser(raw as ParserOutput);
    }

    // Case: object with any of the schema keys
    if (
      raw &&
      typeof raw === 'object' &&
      (
        'title' in (raw as any) ||
        'projectId' in (raw as any) ||
        'executiveSummary' in (raw as any) ||
        'objectives' in (raw as any) ||
        'projectTitle' in (raw as any)
      )
    ) {
      return mapFromGemini(raw);
    }

    // Fallback: nothing we recognize
    return { ...emptyPidData };
  } catch (err) {
    // Never let mapping throw; backend should always return a well-formed pidData object.
    console.error('[PID_MAPPER] Failed to map parse result', err);
    return { ...emptyPidData };
  }
};
