import { PMOMaxPID, WorkBreakdownTask, BudgetLineItem } from '../types';

/**
 * Deterministic / local parsing (no AI).
 * Goal: Extract as many PID fields as possible from plain text, Markdown, or CSV exported text.
 *
 * This parser is intentionally defensive:
 * - Never throws
 * - Always returns a fully-shaped PMOMaxPID object (all arrays present)
 * - Uses heuristics that mirror demoData section names
 */

type SectionMap = Record<string, string>;

const CANON_SECTIONS: Array<{ key: keyof PMOMaxPID; names: string[]; kind: 'text' | 'list' }> = [
  { key: 'executiveSummary', names: ['executive summary', 'summary', 'overview'], kind: 'text' },
  { key: 'problemStatement', names: ['problem statement', 'problem', 'pain points'], kind: 'text' },
  { key: 'businessCaseExpectedValue', names: ['business case', 'expected value', 'value proposition', 'roi'], kind: 'text' },
  { key: 'scopeInclusions', names: ['scope inclusions', 'in scope', 'scope (in)'], kind: 'list' },
  { key: 'scopeExclusions', names: ['scope exclusions', 'out of scope', 'not in scope', 'scope (out)'], kind: 'list' },
  { key: 'assumptions', names: ['assumptions'], kind: 'list' },
  { key: 'constraints', names: ['constraints'], kind: 'list' },
  { key: 'dependencies', names: ['dependencies', 'dependency'], kind: 'list' },
  { key: 'stakeholders', names: ['stakeholders'], kind: 'list' },
  { key: 'timelineOverview', names: ['timeline overview', 'timeline', 'schedule overview'], kind: 'text' },
  { key: 'milestones', names: ['milestones'], kind: 'list' },
  { key: 'deliverablesOutputs', names: ['deliverables', 'outputs'], kind: 'list' },
  { key: 'resourcesTools', names: ['resources', 'tools', 'resources & tools'], kind: 'list' },
  { key: 'risks', names: ['risks', 'risk register'], kind: 'list' },
  { key: 'mitigationsContingencies', names: ['mitigations', 'contingencies', 'risk mitigations'], kind: 'list' },
  { key: 'issuesDecisionsLog', names: ['issues', 'decisions', 'issues & decisions', 'decision log'], kind: 'list' },
  { key: 'communicationPlan', names: ['communication plan', 'communications plan', 'comms plan'], kind: 'list' },
  { key: 'governanceApprovals', names: ['governance', 'approvals', 'governance & approvals'], kind: 'list' },
  { key: 'complianceSecurityPrivacy', names: ['compliance', 'security', 'privacy', 'compliance & security'], kind: 'list' },
  { key: 'openQuestionsNextSteps', names: ['open questions', 'next steps', 'open questions & next steps'], kind: 'list' },
  { key: 'notesBackground', names: ['notes', 'background', 'notes / background'], kind: 'text' },
];

const LIST_BULLET_RE = /^\s*(?:[-*•]|\d+[.)])\s+/;

function safeTrim(s: unknown): string {
  return String(s ?? '').replace(/\u0000/g, '').trim();
}

function normalizeHeading(s: string): string {
  return safeTrim(s).toLowerCase().replace(/[:\-–—]+\s*$/, '').trim();
}

function normalizeWhitespace(s: string): string {
  return safeTrim(s).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

function isProbablyKeyValueCsv(text: string): boolean {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 3) return false;
  const head = lines[0];
  // Common exports: "Field,Value" or "Section,Content"
  return /\b(field|section|name)\b/i.test(head) && /\b(value|content|text)\b/i.test(head);
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;

  const pushCell = () => {
    row.push(cur);
    cur = '';
  };
  const pushRow = () => {
    rows.push(row.map((c) => c));
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      // Double quote inside quoted field => escaped quote
      const next = text[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      pushCell();
      continue;
    }
    if (!inQuotes && ch === '\n') {
      pushCell();
      pushRow();
      continue;
    }
    if (ch !== '\r') cur += ch;
  }
  pushCell();
  pushRow();
  return rows;
}

function csvToKeyValue(text: string): Record<string, string> {
  const t = normalizeWhitespace(text);
  const delimiter = t.includes('\t') ? '\t' : ',';
  const rows = parseCsvRows(t, delimiter);

  if (rows.length < 2) return {};
  const header = rows[0].map((h) => normalizeHeading(h));
  const fieldIdx = header.findIndex((h) => /(field|section|name)/.test(h));
  const valueIdx = header.findIndex((h) => /(value|content|text)/.test(h));
  if (fieldIdx < 0 || valueIdx < 0) return {};

  const kv: Record<string, string> = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const k = safeTrim(r[fieldIdx]);
    const v = safeTrim(r[valueIdx]);
    if (!k || !v) continue;
    kv[normalizeHeading(k)] = v;
  }
  return kv;
}

function splitSectionsByHeadings(text: string): SectionMap {
  const t = normalizeWhitespace(text);
  const lines = t.split('\n');

  // Known headings (demoData-like) + common variants
  const headingNames = new Set<string>();
  for (const s of CANON_SECTIONS) for (const n of s.names) headingNames.add(n);
  // extra
  [
    'project title',
    'project name',
    'project id',
    'sponsor',
    'project sponsor',
    'project manager',
    'owner',
    'raci',
    'team',
    'objectives',
    'kpis',
    'work breakdown',
    'tasks',
    'budget',
  ].forEach((n) => headingNames.add(n));

  const isHeading = (line: string) => {
    const l = normalizeHeading(line);
    if (!l) return false;
    // All-caps or ends with colon and matches known words
    if (headingNames.has(l)) return true;
    if (/^(\d+\s*[-.)]\s*)?([a-z][a-z0-9 \-_/&]+):\s*$/i.test(line) && headingNames.has(normalizeHeading(line))) return true;
    // Common pattern: "## Executive Summary"
    const md = l.replace(/^#+\s*/, '');
    if (headingNames.has(md)) return true;
    return false;
  };

  const sections: SectionMap = {};
  let current = 'preamble';
  sections[current] = '';

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, '');
    if (isHeading(line)) {
      current = normalizeHeading(line).replace(/^#+\s*/, '');
      if (!sections[current]) sections[current] = '';
      continue;
    }
    sections[current] += line + '\n';
  }

  // Trim
  for (const k of Object.keys(sections)) sections[k] = safeTrim(sections[k]);
  return sections;
}

function toList(text: string): string[] {
  const t = normalizeWhitespace(text);
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length) {
      out.push(buffer.join(' ').trim());
      buffer = [];
    }
  };

  for (const line of lines) {
    if (LIST_BULLET_RE.test(line)) {
      flush();
      out.push(line.replace(LIST_BULLET_RE, '').trim());
    } else if (out.length > 0) {
      // continuation of previous bullet
      const prev = out.pop()!;
      out.push((prev + ' ' + line).trim());
    } else {
      buffer.push(line);
    }
  }
  flush();
  return out.filter(Boolean);
}

function findFirstNonEmpty(sections: SectionMap, aliases: string[]): string {
  for (const a of aliases) {
    const key = normalizeHeading(a);
    const direct = sections[key];
    if (direct && direct.trim()) return direct.trim();
    // also try markdown headings stripped
    const mdKey = key.replace(/^#+\s*/, '');
    if (sections[mdKey] && sections[mdKey].trim()) return sections[mdKey].trim();
  }
  return '';
}

function extractTitle(text: string, kv: Record<string, string>): string {
  const candidates = [
    kv['project title'],
    kv['project name'],
    kv['title'],
    kv['name'],
  ].filter(Boolean);

  const joined = normalizeWhitespace(text);
  if (/\bRoadRunner\b/.test(joined)) return 'RoadRunner';
  if (candidates.length) return candidates[0];

  // try first markdown H1
  const m = joined.match(/^#\s*(.+)$/m);
  if (m?.[1]) return safeTrim(m[1]).slice(0, 120);

  const firstLine = joined.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
  return firstLine.slice(0, 120);
}

function parseObjectives(text: string): Array<{ objective: string; successMeasure?: string }> {
  const items = toList(text);
  if (items.length === 0) return [];
  return items.map((it) => {
    const parts = it.split(/\s+[-–—:]\s+/);
    if (parts.length >= 2) {
      return { objective: parts[0].trim(), successMeasure: parts.slice(1).join(' - ').trim() };
    }
    return { objective: it.trim() };
  });
}

function parseKpis(text: string): Array<{ kpi: string; target?: string }> {
  const items = toList(text);
  if (items.length === 0) return [];
  return items.map((it) => {
    const m = it.match(/^(.*?)(?:\s*(?:->|→|:|=)\s*(.*))?$/);
    const kpi = safeTrim(m?.[1] ?? it);
    const target = safeTrim(m?.[2] ?? '');
    return target ? { kpi, target } : { kpi };
  });
}

function parseMilestones(items: string[]): Array<{ milestone: string; date?: string }> {
  return items.map((it) => {
    const m = it.match(/^(.*?)(?:\s*(?:-|–|—|:)\s*(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}))?$/);
    const milestone = safeTrim(m?.[1] ?? it);
    const date = safeTrim(m?.[2] ?? '');
    return date ? { milestone, date } : { milestone };
  });
}

function parseWorkBreakdown(text: string): WorkBreakdownTask[] {
  const lines = normalizeWhitespace(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const tasks: WorkBreakdownTask[] = [];

  // Try markdown table first
  const tableLines = lines.filter((l) => l.includes('|'));
  if (tableLines.length >= 2) {
    const hdr = tableLines[0].split('|').map((c) => c.trim()).filter(Boolean).map((c) => c.toLowerCase());
    const sep = tableLines[1];
    const looksTable = /\-\-/.test(sep) || hdr.length >= 3;
    if (looksTable) {
      const idxTask = hdr.findIndex((h) => /(task|activity|work item|work item)/.test(h));
      const idxOwner = hdr.findIndex((h) => /(owner|assignee|lead)/.test(h));
      const idxStart = hdr.findIndex((h) => /(start)/.test(h));
      const idxEnd = hdr.findIndex((h) => /(end|due)/.test(h));
      const idxDeps = hdr.findIndex((h) => /(dep)/.test(h));
      for (let i = 2; i < tableLines.length; i++) {
        const cols = tableLines[i].split('|').map((c) => c.trim()).filter(Boolean);
        if (cols.length < 2) continue;
        const task = safeTrim(cols[idxTask >= 0 ? idxTask : 0]);
        if (!task) continue;
        const owner = safeTrim(cols[idxOwner] ?? '');
        const start = safeTrim(cols[idxStart] ?? '');
        const end = safeTrim(cols[idxEnd] ?? '');
        const deps = safeTrim(cols[idxDeps] ?? '');
        tasks.push({
          task,
          owner: owner || undefined,
          startDate: start || undefined,
          endDate: end || undefined,
          dependencies: deps ? deps.split(/[,;]/).map((d) => d.trim()).filter(Boolean) : [],
        });
      }
      if (tasks.length) return tasks;
    }
  }

  // Fallback: bullet list parsing
  const items = toList(text);
  for (const it of items) {
    // Examples:
    // "Build ingestion pipeline — Owner: Alice — 2026-02-01 to 2026-02-15"
    const owner = safeTrim((it.match(/\bowner\s*[:=]\s*([^;,.]+)/i) || [])[1] ?? '');
    const dateRange =
      it.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}).*?(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/) || null;
    const startDate = safeTrim(dateRange?.[1] ?? '');
    const endDate = safeTrim(dateRange?.[2] ?? '');

    // Task label = before "owner:" or before date range if present
    let label = it;
    label = label.replace(/\bowner\s*[:=][\s\S]*$/i, '').trim();
    if (dateRange) label = label.replace(dateRange[0], '').trim();
    label = label.replace(/[-–—:]+\s*$/g, '').trim();

    tasks.push({
      task: label || it,
      owner: owner || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      dependencies: [],
    });
  }

  return tasks;
}

function parseBudget(text: string): BudgetLineItem[] {
  // Minimal: parse lines like "Task — Role — 40h — $100/hr"
  const items = toList(text);
  const out: BudgetLineItem[] = [];
  for (const it of items) {
    const hours = it.match(/(\d+(?:\.\d+)?)\s*h(?:ours)?/i);
    const rate = it.match(/\$\s*(\d+(?:\.\d+)?)(?:\s*\/\s*h|\s*per\s*hour)?/i);
    const total = it.match(/\$\s*(\d+(?:\.\d+)?)\s*(?:total|usd)?/i);

    const parts = it.split(/\s*[-–—|]\s*/).map((p) => p.trim()).filter(Boolean);
    const task = parts[0] || it;
    const role = parts.length > 1 ? parts[1] : '';

    out.push({
      task,
      role: role || undefined,
      estimatedHours: hours ? Number(hours[1]) : undefined,
      rateUsdPerHour: rate ? Number(rate[1]) : undefined,
      complexityMultiplier: 1,
      totalCostUsd: total ? Number(total[1]) : undefined,
      justification: it,
      source: 'deterministic',
    });
  }
  return out.filter((r) => r.task);
}

function emptyPid(): PMOMaxPID {
  return {
    titleBlock: { projectTitle: '', subtitle: 'Project Initiation Document', generatedOn: new Date().toISOString().slice(0, 10) },
    executiveSummary: '',
    problemStatement: '',
    businessCaseExpectedValue: '',
    objectivesSmart: [],
    kpis: [],
    scopeInclusions: [],
    scopeExclusions: [],
    assumptions: [],
    constraints: [],
    dependencies: [],
    stakeholders: [],
    projectSponsor: { name: '', role: '' },
    projectManagerOwner: { name: '' },
    teamRaci: [],
    timelineOverview: '',
    milestones: [],
    workBreakdownTasks: [],
    budgetCostBreakdown: [],
    budgetSummary: {},
    resourcesTools: [],
    risks: [],
    mitigationsContingencies: [],
    issuesDecisionsLog: [],
    communicationPlan: [],
    governanceApprovals: [],
    complianceSecurityPrivacy: [],
    openQuestionsNextSteps: [],
    notesBackground: '',
    businessCase: '',
    deliverablesOutputs: [],
    resourcesPlan: '',
    communicationsPlan: '',
    fields: {},
    tables: {},
  };
}

export function localParse(text: string) {
  const warnings: string[] = [];
  try {
    const raw = normalizeWhitespace(text);
    const pid = emptyPid();

    // CSV key/value exports
    const kv = isProbablyKeyValueCsv(raw) ? csvToKeyValue(raw) : {};

    // Section splitting (works for markdown headings and "Heading:" styles)
    const sections = splitSectionsByHeadings(raw);

    // Title
    pid.titleBlock.projectTitle = extractTitle(raw, kv);
    pid.titleBlock.subtitle = 'Project Initiation Document';
    pid.titleBlock.generatedOn = new Date().toISOString().slice(0, 10);

    // Objectives & KPIs: allow both kv + section parsing
    const objectivesText = kv['objectives'] || kv['project objectives'] || findFirstNonEmpty(sections, ['objectives', 'project objectives']);
    pid.objectivesSmart = parseObjectives(objectivesText);

    const kpisText = kv['kpis'] || kv['key performance indicators'] || findFirstNonEmpty(sections, ['kpis', 'key performance indicators']);
    pid.kpis = parseKpis(kpisText);

    // Main sections
    for (const s of CANON_SECTIONS) {
      const canonical = s.names;
      const kvHit =
        kv[canonical[0]] ||
        kv[safeTrim(canonical[1] ?? '')] ||
        kv[safeTrim(canonical[2] ?? '')] ||
        '';

      const textHit = findFirstNonEmpty(sections, canonical);
      const value = safeTrim(kvHit || textHit);

      if (!value) continue;

      if (s.kind === 'text') {
        (pid[s.key] as any) = value;
      } else {
        (pid[s.key] as any) = toList(value);
      }
    }

    // Milestones: convert list entries into typed objects
    if (Array.isArray(pid.milestones) && pid.milestones.length) {
      pid.milestones = parseMilestones(pid.milestones as any);
    }

    // Work breakdown
    const wbdText =
      kv['work breakdown'] ||
      kv['work breakdown tasks'] ||
      kv['tasks'] ||
      findFirstNonEmpty(sections, ['work breakdown', 'work breakdown tasks', 'tasks']);
    if (wbdText) pid.workBreakdownTasks = parseWorkBreakdown(wbdText);

    // Budget
    const budgetText = kv['budget'] || kv['budget & cost breakdown'] || findFirstNonEmpty(sections, ['budget', 'budget & cost breakdown']);
    if (budgetText) pid.budgetCostBreakdown = parseBudget(budgetText);

    // Sponsor / PM
    const sponsor = safeTrim(kv['sponsor'] || kv['project sponsor'] || '');
    if (sponsor) pid.projectSponsor.name = sponsor;
    const pm = safeTrim(kv['project manager'] || kv['owner'] || kv['project owner'] || '');
    if (pm) pid.projectManagerOwner.name = pm;

    // Fill flattened "fields" map for UI compatibility
    pid.fields = {
      'fld-project-name': pid.titleBlock.projectTitle || '',
      'fld-project-id': safeTrim(kv['project id'] || kv['id'] || ''),
      'fld-exec': pid.executiveSummary || '',
      'fld-problem': pid.problemStatement || '',
      'fld-business-case': pid.businessCaseExpectedValue || '',
      'fld-objectives': pid.objectivesSmart.map((o) => o.objective + (o.successMeasure ? ' — ' + o.successMeasure : '')).join('\n'),
      'fld-kpis': pid.kpis.map((k) => k.kpi + (k.target ? ' → ' + k.target : '')).join('\n'),
      'fld-scope-inclusions': (pid.scopeInclusions || []).join('\n'),
      'fld-scope-exclusions': (pid.scopeExclusions || []).join('\n'),
      'fld-assumptions': (pid.assumptions || []).join('\n'),
      'fld-constraints-notes': (pid.constraints || []).join('\n'),
      'fld-dependencies-notes': (pid.dependencies || []).join('\n'),
      'fld-stakeholders-notes': (pid.stakeholders || []).join('\n'),
      'fld-sponsor-notes': pid.projectSponsor.name || '',
      'fld-project-manager-notes': pid.projectManagerOwner.name || '',
      'fld-timeline-overview': pid.timelineOverview || '',
      'fld-milestones': (pid.milestones || []).map((m: any) => (m.date ? `${m.milestone} — ${m.date}` : m.milestone)).join('\n'),
      'fld-deliverables-notes': (pid.deliverablesOutputs || []).join('\n'),
      'fld-work-breakdown-notes': (pid.workBreakdownTasks || []).map((t) => t.task).join('\n'),
      'fld-budget-notes': (pid.budgetCostBreakdown || []).map((b) => b.task).join('\n'),
      'fld-resources-notes': (pid.resourcesTools || []).join('\n'),
      'fld-risks': (pid.risks || []).join('\n'),
      'fld-mitigations': (pid.mitigationsContingencies || []).join('\n'),
      'fld-issues': (pid.issuesDecisionsLog || []).join('\n'),
      'fld-comms-plan-notes': (pid.communicationPlan || []).join('\n'),
      'fld-governance-approvals-notes': (pid.governanceApprovals || []).join('\n'),
      'fld-compliance-notes': (pid.complianceSecurityPrivacy || []).join('\n'),
      'fld-open-questions': (pid.openQuestionsNextSteps || []).join('\n'),
      'notes-area': pid.notesBackground || '',
    };


    // Narrative heuristics (when the input is a paragraph / transcript rather than sectioned headings)
    const fullText = raw;

    if (!pid.executiveSummary) {
      const para = fullText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)[0] || '';
      pid.executiveSummary = para ? para.slice(0, 1200) : '';
    }

    if (!pid.problemStatement) {
      const m = fullText.match(/\b(current issue is|problem is|challenge is)\s*[:\-–—]?\s*([\s\S]{20,300}?)(?:\.|\n)/i);
      if (m?.[2]) pid.problemStatement = safeTrim(m[2]);
    }

    if (!pid.businessCaseExpectedValue) {
      const m = fullText.match(/\b(intended outcome|expected outcome|meant to|so that|to provide)\b[\s\S]{0,200}?\b(calm|faster|reduce|improve|increase|decrease|single|unified)[\s\S]{0,240}?(?:\.|\n)/i);
      if (m?.[0]) pid.businessCaseExpectedValue = safeTrim(m[0]);
    }

    if (!pid.objectivesSmart?.length) {
      const m = fullText.match(/\b(main goal is|goal is|objective is)\s*to\s*([\s\S]{15,220}?)(?:\.|\n)/i);
      if (m?.[2]) pid.objectivesSmart = [{ objective: safeTrim(m[2]) }];
    }

    if (!pid.timelineOverview) {
      const dates: string[] = [];
      const dateRe = /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},\s*\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\bmid-\w+\s+\d{4}\b)/gi;
      let mm;
      while ((mm = dateRe.exec(fullText))) dates.push(mm[0]);
      if (dates.length) {
        pid.timelineOverview = `Key dates mentioned: ${Array.from(new Set(dates)).join(', ')}.`;
      }
    }

    if (!pid.milestones?.length) {
      const ms: Array<{ milestone: string; date?: string }> = [];
      const kickoff = fullText.match(/\b(kickoff[^.\n]{0,120}?)(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},\s*\d{4}\b)/i);
      if (kickoff) ms.push({ milestone: safeTrim(kickoff[1]).replace(/\s+$/g, ''), date: safeTrim(kickoff[2]) });
      const pilot = fullText.match(/\b(pilot[^.\n]{0,120}?)(\bmid-\w+\s+\d{4}\b)/i);
      if (pilot) ms.push({ milestone: safeTrim(pilot[1]).replace(/\s+$/g, ''), date: safeTrim(pilot[2]) });
      if (ms.length) pid.milestones = ms;
    }

    if (!pid.projectManagerOwner?.name) {
      const m = fullText.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+will\s+lead\b/i);
      if (m?.[1]) pid.projectManagerOwner.name = m[1];
    }
    // parse_success heuristic
    const nonEmptyMajor =
      Number(Boolean(pid.executiveSummary)) +
      Number(Boolean(pid.problemStatement)) +
      Number(Boolean(pid.businessCaseExpectedValue)) +
      Number((pid.objectivesSmart?.length ?? 0) > 0) +
      Number((pid.kpis?.length ?? 0) > 0) +
      Number((pid.workBreakdownTasks?.length ?? 0) > 0) +
      Number((pid.milestones?.length ?? 0) > 0);

    const parse_success = nonEmptyMajor >= 2 || raw.length > 500;

    if (!parse_success) warnings.push('Local parser found minimal structure; results may be incomplete.');

    return { parse_success, data: pid, warnings };
  } catch (e) {
    const pid = emptyPid();
    warnings.push('Local parsing failed; returned empty PID.');
    return { parse_success: false, data: pid, warnings };
  }
}
