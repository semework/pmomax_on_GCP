
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

 const sections: { key: string, content: string[] }[] = [];
 let currentSection: { key: string, content: string[] } | null = null;
 const prologue: string[] = [];
 const lines = text.split('\n');
 let headingsFound = 0;

 for (const line of lines) {
 const trimmedLine = line.trim();
  
 let matchedKey: string | null = null;
 // A heading should not be too long and must contain some text.
 if (trimmedLine && trimmedLine.length < 100) {
 const normalizedLine = _norm(trimmedLine.replace(/^[#\s\d\.\*]*/, ''));
 for (const alias in HEADING_ALIASES) {
 const normalizedAlias = _norm(alias);
 if (normalizedLine === normalizedAlias) {
 matchedKey = HEADING_ALIASES[alias];
 break;
 }
 }
 }

 if (matchedKey) {
 headingsFound++;
 if (currentSection) {
 sections.push(currentSection);
 }
 currentSection = { key: matchedKey, content: [] };
 } else {
 if (currentSection) {
 // Add the original line (not trimmed) to preserve formatting within sections
 currentSection.content.push(line); 
 } else if (trimmedLine) { // Only add non-empty lines to prologue
 // Content before the first heading
 prologue.push(line);
 }
 }
 }

 if (currentSection) {
 sections.push(currentSection);
 }

 // If there are no headings at all, attempt to extract fields from narrative text using heuristics
 if (headingsFound === 0) {
    const trimmed = text.trim();
    if (!trimmed) {
       return { parse_success: false, error: "Local parser found no structured data. Falling back to AI." };
    }
    // Heuristic extraction: look for key fields in the narrative
    const narrativeFields: { [key: string]: RegExp } = {
       'fld-project-name': /project (name|title)\s*[:\-]?\s*([^\n]+)/i,
       'fld-project-id': /project id\s*[:\-]?\s*([^\n]+)/i,
       'fld-version': /version\s*[:\-]?\s*([^\n]+)/i,
       'fld-date': /date\s*[:\-]?\s*([^\n]+)/i,
       'fld-owner': /project manager|owner\s*[:\-]?\s*([^\n]+)/i,
       'fld-sponsor': /sponsor\s*[:\-]?\s*([^\n]+)/i,
       'fld-exec': /executive summary\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
       'fld-problem': /problem statement|context\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
       'fld-business-case': /business case|expected value\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
       'fld-scope-inclusions': /in scope|scope inclusions\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
       'fld-scope-exclusions': /out of scope|scope exclusions\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
       'fld-assumptions': /assumptions\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
       'fld-timeline-overview': /timeline overview\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
       'fld-budget-notes': /budget( & cost breakdown)?\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
       'fld-compliance-notes': /compliance|security|privacy\s*[:\-]?\s*([\s\S]+?)(?=\n\s*\w+\s*[:\-])/i,
    };
    const fields: ParserFields = Object.fromEntries(FIELD_KEYS.map(k => [k, ""]));
    for (const [key, regex] of Object.entries(narrativeFields)) {
       const match = text.match(regex);
       if (match && match[2]) {
          fields[key] = match[2].trim();
       } else if (match && match[1]) {
          fields[key] = match[1].trim();
       }
    }
    // Fallback: assign first non-empty line as project name if not found
    if (!fields['fld-project-name']) {
       const firstLine = trimmed.split('\n').find(l => l.trim().length > 0);
       if (firstLine) fields['fld-project-name'] = firstLine.trim();
    }
    // Assign the whole text to executive summary if nothing else found
    const fieldsFound = Object.values(fields).some(v => v && v.length > 0);
    if (!fieldsFound) {
       fields['fld-exec'] = trimmed;
    }
    return { parse_success: true, data: { fields, tables: Object.fromEntries(Object.keys(TABLE_KEYS).map(k => [k, []])) } };
 }

 // Process the prologue (content before first heading)
 if (prologue.length > 0) {
 // Simple heuristic: assign to title/id
 let titleLine = prologue[0].replace(/^[#\s]*/, ''); // Remove leading markdown headers
 titleLine = titleLine.replace(/^(project name|project title|title)\s*[:\-]?\s*/i, ''); // Remove label
 fields['fld-project-name'] = titleLine.trim();

 if (prologue.length > 1) {
 const idLineIndex = prologue.findIndex(l => l.match(/(id|#|no\.)/i));
 if (idLineIndex > -1) {
 fields['fld-project-id'] = prologue[idLineIndex].replace(/.*(id|#|no\.)\s*[:\s]*/i, '').trim();
 }
 }
 }

 for (const section of sections) {
 const contentStr = section.content.join('\n').trim();
 if (!contentStr) continue;

 const tableData = parseTable(contentStr) || parseBulletList(contentStr);

 if (section.key.startsWith('tbl-') && tableData) {
 const canonicalHeaders = TABLE_KEYS[section.key];
 const mappedTable = tableData.map((row, index) => {
 const newRow: { [key: string]: any } = { id: tables[section.key].length + index + 1 };
 for (const [colHeader, value] of Object.entries(row)) {
 const normColHeader = _norm(colHeader);
 const matchingCanonical = canonicalHeaders.find(ch => _norm(ch) === normColHeader);
 newRow[matchingCanonical || colHeader] = value;
 }
 return newRow;
 });
 tables[section.key].push(...mappedTable);
 } else if (section.key.startsWith('fld-')) {
 fields[section.key] = contentStr;
 } else if (section.key.startsWith('tbl-')) {
 const fallbackField = section.key.replace('tbl-', 'fld-') + '-notes';
 if (fields[fallbackField] !== undefined) {
 fields[fallbackField] = contentStr;
 } else {
 const bulletPoints = parseBulletList(contentStr);
 if(bulletPoints) {
 tables[section.key].push(...bulletPoints.map((bp, i) => ({id: i, item: bp.item})));
 }
 }
 }
 }

 const fieldsFound = Object.values(fields).some(v => v && v.length > 0);
 const tablesFound = Object.values(tables).some(v => v.length > 0);

 if (!fieldsFound && !tablesFound) {
 return { parse_success: false, error: "Local parser found no structured data. Falling back to AI." };
 }

 return { parse_success: true, data: { fields, tables } };
 } catch (e) {
 const error = e instanceof Error ? e.message : String(e);
 console.error("Error in localParse:", error);
 return { parse_success: false, error };
 }
};
