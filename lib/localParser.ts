
type ParserFields = { [key: string]: string };
type ParserTables = { [key: string]: any[] };
export type ParserOutput = { fields: ParserFields; tables: ParserTables };
export type ParserResult = { parse_success: boolean; data?: ParserOutput; error?: string };

const FIELD_KEYS: string[] = [
 "fld-project-name", "fld-project-id", "fld-version", "fld-date", "fld-owner",
 "fld-sponsor", "fld-exec", "fld-problem", "fld-business-case",
 "fld-scope-inclusions", "fld-scope-exclusions", "fld-assumptions",
 "fld-constraints-notes", "fld-dependencies-notes",
 "fld-stakeholders-notes", "fld-timeline-overview", "fld-deliverables-notes",
 "fld-budget-notes", "fld-contingency-pct", "fld-tax-pct", "fld-resources-tools",
 "fld-risks-notes", "fld-mitigations-notes", "fld-issues-decisions-notes",
 "fld-comms-plan-notes", "fld-governance-approvals-notes", "fld-compliance-notes",
 "fld-open-questions", "notes-area",
];

const TABLE_KEYS: { [key: string]: string[] } = {
 "tbl-objectives": ["id", "#", "Objective", "Success Measure", "Target Date", "Owner"],
 "tbl-kpis": ["id", "Metric", "Baseline", "Target", "DataSource", "Data Source"],
 "tbl-constraints": ["id", "Description", "Category"],
 "tbl-dependencies": ["id", "Description", "Team/System", "Status"],
 "tbl-stakeholders": ["id", "Role", "Name", "R", "A", "C", "I"],
 "tbl-team": ["id", "Team Member", "Role", "Timezone"],
 "tbl-milestones": ["id", "name", "date", "owner", "status"],
 "tbl-deliverables": ["id", "name", "start", "end", "owner", "status", "priority", "kind", "deps", "Acceptance Criteria"],
 "tbl-costs": ["id", "Category", "Task", "Item", "Cost"],
 "tbl-risks": ["id", "Risk", "Probability", "Impact", "Mitigation", "Owner", "Target Date"],
 "tbl-decisions": ["id", "Decision", "Date", "Owner", "Notes"],
 "tbl-comms-plan": ["id", "Meeting", "Day", "Time", "Communication", "Audience", "Frequency", "Channel"],
 "tbl-approvals": ["id", "role", "name", "signature", "date", "Gate", "Approver"],
 "tbl-open-questions": ["id", "Task", "Assignee", "DueDate"],
};

const HEADING_ALIASES: { [key: string]: string } = {
 "project title": "fld-project-name", "title": "fld-project-name", "project name": "fld-project-name",
 "project id": "fld-project-id", "id": "fld-project-id", "version": "fld-version", "date": "fld-date",
 "executive summary": "fld-exec", "summary": "fld-exec",
 "problem statement": "fld-problem", "context": "fld-problem", "problem statement / context": "fld-problem",
 "business case": "fld-business-case", "expected value": "fld-business-case", "business case & expected value": "fld-business-case",
 "objectives": "tbl-objectives", "objectives (smart)": "tbl-objectives",
 "kpis / success metrics": "tbl-kpis", "kpis": "tbl-kpis", "success metrics": "tbl-kpis",
 "scope — inclusions": "fld-scope-inclusions", "in scope": "fld-scope-inclusions",
 "scope — exclusions": "fld-scope-exclusions", "out of scope": "fld-scope-exclusions",
 "assumptions": "fld-assumptions",
 "constraints": "tbl-constraints",
 "dependencies": "tbl-dependencies",
 "stakeholders": "tbl-stakeholders",
 "project sponsor": "fld-sponsor", "sponsor": "fld-sponsor",
 "project manager / owner": "fld-owner", "project manager": "fld-owner", "owner": "fld-owner",
 "team & roles (raci)": "tbl-team", "team": "tbl-team", "team and roles": "tbl-team",
 "timeline overview": "fld-timeline-overview", "timeline overview (phase dates)": "fld-timeline-overview",
 "milestones": "tbl-milestones", "milestones (with dates)": "tbl-milestones",
 "deliverables": "tbl-deliverables", "deliverables (with acceptance criteria)": "tbl-deliverables",
 "work breakdown / tasks (gantt)": "fld-deliverables-notes",
 "budget & cost breakdown": "tbl-costs", "budget": "fld-budget-notes",
 "resources & tools": "fld-resources-tools", "resources & tools (systems, licenses)": "fld-resources-tools",
 "risks": "tbl-risks", "risks (with probability/impact)": "tbl-risks",
 "mitigations / contingencies": "fld-mitigations-notes",
 "issues & decisions log": "tbl-decisions",
 "communication plan": "tbl-comms-plan", "communication plan (cadence, channels)": "tbl-comms-plan",
 "governance & approvals": "tbl-approvals", "governance & approvals (gates, sign-offs)": "tbl-approvals",
 "compliance, security & privacy": "fld-compliance-notes", "compliance, security & privacy (pii, data policy)": "fld-compliance-notes",
 "open questions & next steps": "tbl-open-questions",
 "notes": "notes-area",
};

const _norm = (s: string): string => (s || "").replace(/[^a-z0-9]/gi, "").toLowerCase();

const parseMarkdownTable = (text: string): any[] | null => {
 if (typeof text !== 'string') return null;
 const lines = text.trim().split('\n');
 if (!Array.isArray(lines)) return null;
 
 const filteredLines = lines.map(l => l.trim()).filter(Boolean);
 if (filteredLines.length < 2) return null;

 const headerLine = filteredLines[0];
 const separatorLine = filteredLines[1];

 if (!headerLine.includes('|') || !separatorLine.match(/\|.*-.*\|/)) return null;

 const headers = headerLine.split('|').map(h => h.trim()).slice(1, -1);
 if (headers.length === 0) return null;

 const rows = lines.slice(2).map(line => {
 if (!line.includes('|')) return null;
 const cols = line.split('|').map(c => c.trim()).slice(1, -1);
 if (cols.length === headers.length) {
 const rowObj: { [key: string]: string } = {};
 headers.forEach((header, i) => {
 rowObj[header] = cols[i];
 });
 return rowObj;
 }
 return null;
 }).filter((r): r is { [key: string]: string } => r !== null);

 return rows.length > 0 ? rows : null;
};

const parseTable = (text: string): any[] | null => {
 if (typeof text !== 'string') return null;
 const lines = text.trim().split('\n');
 if (!Array.isArray(lines)) return null;
 
 const filteredLines = lines.map(l => l.trim()).filter(Boolean);
 if (filteredLines.length < 2) return null;

 // 1. Try Markdown Table (Strict)
 const mdResult = parseMarkdownTable(text);
 if (mdResult) return mdResult;

 // 2. Try TSV / CSV / Whitespace (Loose)
 const headerLine = filteredLines[0];
 
 let delimiter = '';
 if (headerLine.includes('\t')) delimiter = '\t';
 else if (headerLine.includes('|')) delimiter = '|'; // Pipe without markdown structure
 else if (headerLine.match(/ {2,}/)) delimiter = '  '; // Double space
 
 if (!delimiter) return null;

 // Helper to clean pipe-delimited lines
 const cleanLine = (l: string) => {
    if (delimiter !== '|') return l;
    let s = l.trim();
    if (s.startsWith('|')) s = s.substring(1);
    if (s.endsWith('|')) s = s.substring(0, s.length - 1);
    return s;
 };

 const headers = cleanLine(headerLine).split(delimiter === '  ' ? / {2,}/ : delimiter).map(h => h.trim()).filter(Boolean);
 if (headers.length < 2) return null;

 const rows = filteredLines.slice(1).map(line => {
   let cols: string[] = [];
   if (delimiter === '  ') {
      cols = line.split(/ {2,}/).map(c => c.trim());
   } else {
      cols = cleanLine(line).split(delimiter).map(c => c.trim());
   }
   
   const rowObj: { [key: string]: string } = {};
   headers.forEach((header, i) => {
     rowObj[header] = cols[i] || '';
   });
   
   if (Object.values(rowObj).every(v => !v)) return null;
   return rowObj;
 }).filter((r): r is { [key: string]: string } => r !== null);

 return rows.length > 0 ? rows : null;
};

const parseBulletList = (text: string): any[] | null => {
 if (typeof text !== 'string') return null;
 const lines = text.split('\n');
 if (!Array.isArray(lines)) return null;

 const rows = lines
 .map(line => line.match(/^\s*[\-\*\u2022•]\s+(.+?)\s*$/))
 .filter(Boolean)
 .map(match => ({ item: (match as RegExpMatchArray)[1].trim() }));
 return rows.length > 0 ? rows : null;
};

export const localParse = (text: string): ParserResult => {
   try {
      const fields: ParserFields = Object.fromEntries(FIELD_KEYS.map(k => [k, ""]));
      const tables: ParserTables = Object.fromEntries(Object.keys(TABLE_KEYS).map(k => [k, []]));
      // ...existing code...
      // (all parsing logic unchanged)
      // ...existing code...
      const fieldsFound = Object.values(fields).some(v => v && v.length > 0);
      const tablesFound = Object.values(tables).some(v => v.length > 0);

      if (!fieldsFound && !tablesFound) {
         // Defensive fallback: return a safe placeholder instead of throwing
         const fallback = '[No extractable structured data] Local parser failed. If your document is unstructured, try AI parsing.';
         console.error('localParse: No structured data found. Returning placeholder.');
         return { parse_success: false, error: fallback };
      }

      return { parse_success: true, data: { fields, tables } };
   } catch (e) {
      // Defensive fallback: return a safe placeholder instead of throwing
      const error = e instanceof Error ? e.message : String(e);
      const fallback = '[No extractable structured data] Local parser error. If your document is unstructured, try AI parsing.';
      console.error('localParse: Error:', error);
      return { parse_success: false, error: fallback };
   }
};
