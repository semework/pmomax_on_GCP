import { randomUUID } from 'node:crypto';
import { detectPromptInjection, sanitizeUntrustedText } from '../security/promptDefense.js';

export const CANONICAL_PID_FIELDS = Object.freeze([
  'titleBlock', 'executiveSummary', 'problemStatement', 'businessCaseExpectedValue',
  'objectivesSmart', 'kpis', 'scopeInclusions', 'scopeExclusions', 'assumptions',
  'constraints', 'dependencies', 'stakeholders', 'projectSponsor',
  'projectManagerOwner', 'teamRaci', 'timelineOverview', 'milestones',
  'workBreakdownTasks', 'gantt', 'budgetCostBreakdown', 'resourcesTools', 'risks',
  'mitigationsContingencies', 'issuesDecisionsLog', 'communicationPlan',
  'governanceApprovals', 'complianceSecurityPrivacy', 'openQuestionsNextSteps',
]);

const arrays = new Set(CANONICAL_PID_FIELDS.filter((name) => ![
  'titleBlock', 'executiveSummary', 'problemStatement', 'businessCaseExpectedValue',
  'projectSponsor', 'projectManagerOwner', 'timelineOverview', 'gantt',
].includes(name)));

const isoDate = (date) => new Date(date).toISOString().slice(0, 10);
const plusDays = (date, days) => {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return isoDate(value);
};

export function emptyPid() {
  const pid = Object.fromEntries(CANONICAL_PID_FIELDS.map((key) => [key, arrays.has(key) ? [] : '']));
  pid.titleBlock = { projectTitle: '', subtitle: '', projectId: '', generatedOn: isoDate(new Date()) };
  pid.projectSponsor = { name: '', role: '' };
  pid.projectManagerOwner = { name: '', role: '' };
  pid.gantt = { rows: [], dependencyEdges: [], canRender: false, reasonIfNotRenderable: 'No scheduled tasks.' };
  return pid;
}

export function normalizePid(input = {}) {
  const base = emptyPid();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return base;
  for (const key of CANONICAL_PID_FIELDS) {
    if (!(key in input)) continue;
    if (arrays.has(key)) base[key] = Array.isArray(input[key]) ? structuredClone(input[key]) : [];
    else if (['titleBlock', 'projectSponsor', 'projectManagerOwner', 'gantt'].includes(key)) {
      base[key] = { ...base[key], ...(input[key] && typeof input[key] === 'object' ? input[key] : {}) };
    } else base[key] = String(input[key] ?? '');
  }
  base.titleBlock.projectId ||= `PMX-${randomUUID().slice(0, 12).toUpperCase()}`;
  base.titleBlock.generatedOn ||= isoDate(new Date());
  base.gantt = buildGantt(base.workBreakdownTasks);
  return base;
}

export function generatePidFromInput({ text = '', structured = null, requirements = [] } = {}) {
  const raw = String(text || '').trim();
  if (raw.length > 1_000_000) throw enterpriseError('INVALID_INPUT', 'Project text exceeds 1,000,000 characters.', 400);
  const detected = detectPromptInjection(raw);
  const clean = sanitizeUntrustedText(raw);
  const source = clean.sanitized.trim();
  if (structured && typeof structured === 'object') {
    const pid = normalizePid(structured);
    return { pid, warnings: detected.score ? ['Instruction-like document content was quarantined and treated as untrusted data.'] : [] };
  }
  if (!source) throw enterpriseError('INVALID_INPUT', 'Project text or structured project data is required.', 400);
  const sentence = source.split(/(?<=[.!?])\s+/)[0].slice(0, 600);
  const title = sentence.replace(/^(create|build|generate|draft)\s+(a\s+)?(pid|project)\s+(for\s+)?/i, '').slice(0, 100) || 'Enterprise Project';
  const start = isoDate(new Date());
  const phases = [
    ['Discovery and stakeholder alignment', 0, 14],
    ['Requirements and success metrics', 14, 28],
    ['Solution design', 28, 49],
    ['Implementation', 49, 91],
    ['Integration and security testing', 91, 112],
    ['User acceptance testing', 112, 126],
    ['Go-live readiness', 126, 140],
    ['Launch and stabilization', 140, 161],
  ];
  const tasks = phases.map(([name, begin, end], index) => ({
    name, start: plusDays(start, begin), end: plusDays(start, end), owner: 'Project team',
    status: 'Not Started', priority: index > 4 ? 'High' : 'Medium', kind: 'Task',
    dependencies: index ? [phases[index - 1][0]] : [],
  }));
  const pid = normalizePid({
    titleBlock: { projectTitle: title, subtitle: 'Project Initiation Document', generatedOn: start },
    executiveSummary: source.slice(0, 1600),
    problemStatement: source.slice(0, 1200),
    businessCaseExpectedValue: `Deliver the stated project outcomes with measurable governance, schedule, cost, risk, and compliance controls. ${requirements.join(' ')}`.trim(),
    objectivesSmart: [
      { objective: 'Confirm scope, ownership, and acceptance criteria', successMeasure: 'Approved baseline by the end of discovery' },
      { objective: 'Deliver the approved solution', successMeasure: 'All critical acceptance tests pass before launch' },
      { objective: 'Transition into supported operations', successMeasure: 'Operational owner accepts the service and runbook' },
    ],
    kpis: [
      { kpi: 'Milestone completion', baseline: '0%', target: '100%' },
      { kpi: 'Critical defects at launch', baseline: 'TBD', target: '0' },
      { kpi: 'Budget variance', baseline: '0%', target: 'Within 10%' },
      { kpi: 'Stakeholder acceptance', baseline: 'Not measured', target: 'Approved' },
    ],
    scopeInclusions: ['Discovery', 'Design', 'Implementation', 'Testing', 'Launch'],
    scopeExclusions: ['Unapproved changes outside the project charter'],
    assumptions: [{ assumption: 'Required stakeholders and systems will be available.' }],
    constraints: [{ constraint: 'Changes require project governance approval.' }],
    dependencies: [{ dependency: 'Stakeholder decisions', teamOrSystem: 'Project governance', status: 'Open' }],
    stakeholders: [], projectSponsor: { name: 'TBD', role: 'Executive Sponsor' },
    projectManagerOwner: { name: 'TBD', role: 'Project Manager' },
    teamRaci: [], timelineOverview: `${start} through ${plusDays(start, 161)}`,
    milestones: [
      { milestone: 'Design approved', targetDate: plusDays(start, 49) },
      { milestone: 'Testing completed', targetDate: plusDays(start, 126) },
      { milestone: 'Production launch', targetDate: plusDays(start, 140) },
    ],
    workBreakdownTasks: tasks,
    budgetCostBreakdown: [], resourcesTools: [],
    risks: [{ risk: 'Stakeholder decisions may delay delivery', probability: 'Medium', impact: 'High' }],
    mitigationsContingencies: [{ mitigation: 'Use scheduled decision gates with named owners.', contingency: 'Escalate overdue decisions to the sponsor.' }],
    issuesDecisionsLog: [], communicationPlan: [{ audience: 'Project stakeholders', cadence: 'Weekly', channel: 'Status review' }],
    governanceApprovals: [{ gate: 'Go-live', signoffRequirement: 'Sponsor, security, and operations approval' }],
    complianceSecurityPrivacy: [{ requirement: 'Security and privacy review', notes: 'Evidence and control owners must be confirmed.' }],
    openQuestionsNextSteps: [{ question: 'Who are the final sponsor and delivery owner?', nextStep: 'Confirm during kickoff.' }],
  });
  return {
    pid,
    warnings: detected.score ? ['Instruction-like document content was quarantined and treated as untrusted data.'] : [],
  };
}

export function buildGantt(tasks = []) {
  const rows = (Array.isArray(tasks) ? tasks : []).filter((task) => task?.name && task?.start && task?.end).map((task) => ({
    name: String(task.name), start: String(task.start), end: String(task.end), owner: String(task.owner || ''),
    status: String(task.status || ''), priority: String(task.priority || ''), kind: String(task.kind || 'Task'),
    deps: Array.isArray(task.dependencies) ? task.dependencies.join(', ') : String(task.dependencies || ''),
  }));
  const dependencyEdges = rows.flatMap((row) => row.deps.split(',').map((value) => value.trim()).filter(Boolean).map((from) => ({ from, to: row.name })));
  return { rows, dependencyEdges, canRender: rows.length > 0, reasonIfNotRenderable: rows.length ? null : 'No valid scheduled tasks.' };
}

export function identifyRisks(pid) {
  const output = (pid.risks || []).map((item, index) => ({
    id: `R${index + 1}`, risk: String(item.risk || ''), category: classifyRisk(item.risk),
    severity: severity(item.probability, item.impact), probability: String(item.probability || 'Unknown'),
    impact: String(item.impact || 'Unknown'), mitigation: String(pid.mitigationsContingencies?.[index]?.mitigation || ''),
    evidence: `project.risks[${index}]`, confidence: item.risk ? 0.95 : 0.4,
  })).filter((item) => item.risk);
  if (!pid.dependencies?.length) output.push({ id: `R${output.length + 1}`, risk: 'Untracked dependencies may affect the critical path', category: 'Schedule', severity: 'high', probability: 'Medium', impact: 'High', mitigation: 'Document dependencies, owners, and target dates.', evidence: 'project.dependencies is empty', confidence: 0.8 });
  return output;
}

export function complianceFindings(pid) {
  const rows = Array.isArray(pid.complianceSecurityPrivacy) ? pid.complianceSecurityPrivacy : [];
  const requirements = ['Access control', 'Data privacy', 'Data retention', 'Security review', 'Go-live approval'];
  return requirements.map((requirement) => {
    const evidence = rows.find((row) => `${row.requirement || ''} ${row.notes || ''}`.toLowerCase().includes(requirement.split(' ')[0].toLowerCase()));
    return { requirement, result: evidence ? 'present' : 'missing', evidence: evidence ? String(evidence.notes || evidence.requirement) : null, severity: evidence ? 'informational' : 'medium', remediation: evidence ? 'Validate evidence and accountable owner.' : `Add a documented ${requirement.toLowerCase()} requirement and evidence.`, confidence: evidence ? 0.85 : 0.75 };
  });
}

export function estimateSchedule(pid) {
  const tasks = pid.workBreakdownTasks || [];
  const starts = tasks.map((t) => Date.parse(t.start)).filter(Number.isFinite);
  const ends = tasks.map((t) => Date.parse(t.end)).filter(Number.isFinite);
  return {
    knownDates: tasks.filter((t) => t.start && t.end).map((t) => ({ task: t.name, start: t.start, end: t.end })),
    calculatedStart: starts.length ? isoDate(Math.min(...starts)) : null,
    calculatedEnd: ends.length ? isoDate(Math.max(...ends)) : null,
    assumptions: starts.length ? [] : ['No valid task dates were supplied.'],
    aiEstimates: [],
  };
}

export function estimateCost(pid) {
  const supplied = Array.isArray(pid.budgetCostBreakdown) ? pid.budgetCostBreakdown : [];
  const calculated = supplied.map((line) => ({ ...line, totalCostUsd: Number(line.totalCostUsd ?? (Number(line.estimatedHours || 0) * Number(line.rateUsdPerHour || 0) * Number(line.complexityMultiplier || 1))) }));
  return { currency: 'USD', suppliedCosts: supplied, calculatedCosts: calculated, totalCostUsd: calculated.reduce((sum, line) => sum + Number(line.totalCostUsd || 0), 0), assumptions: supplied.length ? [] : ['No cost lines were supplied; total is zero.'], inferredValues: [] };
}

export function comparePids(before, after) {
  const changedFields = CANONICAL_PID_FIELDS.filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field])).map((field) => ({ field, before: before[field], after: after[field] }));
  return { changedFields, scheduleChanges: changedFields.filter((x) => ['timelineOverview', 'milestones', 'workBreakdownTasks', 'gantt'].includes(x.field)), costChanges: changedFields.filter((x) => x.field === 'budgetCostBreakdown'), riskChanges: changedFields.filter((x) => ['risks', 'mitigationsContingencies'].includes(x.field)), complianceChanges: changedFields.filter((x) => ['complianceSecurityPrivacy', 'governanceApprovals'].includes(x.field)) };
}

export function enterpriseError(code, message, status = 400, details = undefined) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.safeDetails = details;
  return error;
}

const classifyRisk = (text = '') => /security|privacy|compliance/i.test(text) ? 'Security/Compliance' : /budget|cost|fund/i.test(text) ? 'Cost' : /schedule|delay|dependency|timeline/i.test(text) ? 'Schedule' : 'Delivery';
const score = (value) => ({ low: 1, medium: 2, high: 3, critical: 4 }[String(value || '').toLowerCase()] || 1);
const severity = (probability, impact) => score(probability) * score(impact) >= 9 ? 'critical' : score(probability) * score(impact) >= 6 ? 'high' : score(probability) * score(impact) >= 3 ? 'medium' : 'low';
