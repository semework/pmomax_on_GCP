// lib/dataMapper.ts
//
// Unified mapper for:
//  - Local parser output: { fields, tables }
//  - Gemini JSON PID schema output: 28-field object (see pidSchemaDescription)
//
// This module is intentionally self-contained so it can be consumed
// from both frontend TypeScript and the Node backend (via the .js build).
// Safe, conservative empty PID
export const emptyPidData = {
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
export const toText = (v) => {
    if (v == null)
        return '';
    if (typeof v === 'string')
        return v.trim();
    if (Array.isArray(v)) {
        const parts = v
            .map((x) => typeof x === 'string'
            ? x.trim()
            : x && typeof x === 'object' && 'text' in x && typeof x.text === 'string'
                ? x.text.trim()
                : '')
            .filter((s) => s.length > 0);
        return parts.join('\n');
    }
    if (typeof v === 'object') {
        const obj = v;
        for (const key of ['text', 'value', 'summary', 'description', 'body']) {
            if (typeof obj[key] === 'string')
                return obj[key].trim();
        }
        try {
            return JSON.stringify(v);
        }
        catch (_a) {
            return '[object]';
        }
    }
    try {
        return String(v).trim();
    }
    catch (_b) {
        return '[unstringifiable]';
    }
};
export const asArray = (v) => {
    if (Array.isArray(v))
        return v;
    if (v == null)
        return [];
    return [v];
};
// --- Date normalization helpers -------------------------------------------
// Normalize date strings to ISO format YYYY-MM-DD
const normalizeDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string')
        return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return dateStr; // Return original if invalid
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    catch (_a) {
        return dateStr;
    }
};
// Normalize milestones array to ensure dates are in ISO format
const normalizeMilestones = (arr) => {
    return arr.map(item => (Object.assign(Object.assign({}, item), { date: normalizeDate(item.date) })));
};
// Normalize deliverables array to ensure start/end dates are in ISO format
// If dates are missing, synthesize realistic ones
const normalizeDeliverables = (arr) => {
    if (!arr || arr.length === 0)
        return [];
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
        return Object.assign(Object.assign({}, item), { start,
            end, targetDate: normalizeDate(item.targetDate) });
    });
};
/**
 * Accepts:
 *  - a plain string timeline
 *  - a JSON string like {"kickoff":"Oct 1, 2025", ...}
 *  - an object with key→date entries
 * Produces:
 *  - human-readable bullet-style text
 *  - a list of synthetic milestone rows suitable for the Milestones table
 */
function normalizeTimeline(value) {
    if (value == null) {
        return { text: '', milestones: [] };
    }
    let raw = value;
    // JSON string → object
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return { text: '', milestones: [] };
        }
        try {
            raw = JSON.parse(trimmed);
        }
        catch (_a) {
            // Not JSON; use as plain text
            return { text: toText(trimmed), milestones: [] };
        }
    }
    if (!raw || typeof raw !== 'object') {
        return { text: toText(String(value)), milestones: [] };
    }
    const entries = Object.entries(raw).filter(([, v]) => v != null && String(v).trim().length > 0);
    if (entries.length === 0) {
        return { text: '', milestones: [] };
    }
    const bullets = [];
    const milestones = [];
    let id = 1;
    for (const [key, v] of entries) {
        const label = key
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_\-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const textVal = String(v).trim();
        if (!textVal)
            continue;
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
const mapFromGemini = (raw) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
    if (!raw || typeof raw !== 'object') {
        return Object.assign({}, emptyPidData);
    }
    const timelineNorm = normalizeTimeline((_c = (_b = (_a = raw.timelineOverview) !== null && _a !== void 0 ? _a : raw.timeline) !== null && _b !== void 0 ? _b : raw.schedule) !== null && _c !== void 0 ? _c : null);
    const base = Object.assign(Object.assign({}, emptyPidData), { projectTitleAndId: {
            title: toText((_e = (_d = raw.title) !== null && _d !== void 0 ? _d : raw.projectTitle) !== null && _e !== void 0 ? _e : raw.name),
            id: toText((_g = (_f = raw.projectId) !== null && _f !== void 0 ? _f : raw.id) !== null && _g !== void 0 ? _g : raw.projectNumber),
        }, executiveSummary: toText((_j = (_h = raw.executiveSummary) !== null && _h !== void 0 ? _h : raw.summary) !== null && _j !== void 0 ? _j : raw.executive_summary), problemStatement: toText((_m = (_l = (_k = raw.problemStatement) !== null && _k !== void 0 ? _k : raw.problem) !== null && _l !== void 0 ? _l : raw.background) !== null && _m !== void 0 ? _m : raw.context), businessCase: toText((_p = (_o = raw.businessCase) !== null && _o !== void 0 ? _o : raw.business_case) !== null && _p !== void 0 ? _p : raw.justification), objectives: asArray((_q = raw.objectives) !== null && _q !== void 0 ? _q : raw.goals), kpis: asArray((_s = (_r = raw.kpis) !== null && _r !== void 0 ? _r : raw.metrics) !== null && _s !== void 0 ? _s : raw.successCriteria), scopeInclusions: toText((_u = (_t = raw.scopeInclusions) !== null && _t !== void 0 ? _t : raw.scope) !== null && _u !== void 0 ? _u : raw.inScope), scopeExclusions: toText((_w = (_v = raw.scopeExclusions) !== null && _v !== void 0 ? _v : raw.outOfScope) !== null && _w !== void 0 ? _w : raw.out_of_scope), assumptions: toText(raw.assumptions), constraints: asArray(raw.constraints), dependencies: asArray(raw.dependencies), stakeholders: asArray(raw.stakeholders), projectSponsor: toText((_x = raw.projectSponsor) !== null && _x !== void 0 ? _x : raw.sponsor), projectManager: toText((_y = raw.projectManager) !== null && _y !== void 0 ? _y : raw.owner), teamAndRoles: asArray(raw.teamAndRoles), timelineOverview: timelineNorm.text || toText(raw.timelineOverview), milestones: normalizeMilestones(asArray(raw.milestones)), deliverables: normalizeDeliverables(asArray(raw.deliverables)), workBreakdown: toText((_0 = (_z = raw.workBreakdown) !== null && _z !== void 0 ? _z : raw.workBreakdownStructure) !== null && _0 !== void 0 ? _0 : raw.wbs), budgetAndCost: {
            summary: toText((_1 = raw.budgetSummary) !== null && _1 !== void 0 ? _1 : raw.budget),
            table: asArray(raw.budgetTable),
        }, resourcesAndTools: toText((_2 = raw.resourcesAndTools) !== null && _2 !== void 0 ? _2 : raw.resources), risks: asArray(raw.risks), mitigations: toText(raw.mitigations), issuesAndDecisions: asArray((_3 = raw.issuesAndDecisions) !== null && _3 !== void 0 ? _3 : raw.decisions), communicationPlan: asArray(raw.communicationPlan), governance: asArray((_4 = raw.governance) !== null && _4 !== void 0 ? _4 : raw.approvals), compliance: toText(raw.compliance), openQuestions: asArray((_5 = raw.openQuestions) !== null && _5 !== void 0 ? _5 : raw.questions) });
    // If Gemini didn’t fill structured milestones but timeline JSON is rich, synthesize them.
    if ((!base.milestones || base.milestones.length === 0) && timelineNorm.milestones.length > 0) {
        base.milestones = timelineNorm.milestones;
    }
    return base;
};
// --- Mapping from local parser { fields, tables } ---
const mapFromParser = (parsed) => {
    if (!parsed || typeof parsed !== 'object') {
        return Object.assign({}, emptyPidData);
    }
    const fields = parsed.fields || {};
    const tables = parsed.tables || {};
    const get = (key, fallbackKey) => {
        var _a;
        const v = (_a = fields[key]) !== null && _a !== void 0 ? _a : (fallbackKey ? fields[fallbackKey] : undefined);
        return toText(v);
    };
    const timelineNorm = normalizeTimeline(fields['fld-timeline-overview']);
    // Helper: pull “notes” for synthesizing 1-row tables
    const note = (key) => get(key);
    const synthRisks = () => {
        const text = note('fld-risks-notes');
        if (!text)
            return [];
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
    const synthDependencies = () => {
        const text = note('fld-dependencies-notes');
        if (!text)
            return [];
        return [
            {
                id: 1,
                description: text,
                teamSystem: '',
                status: 'Open',
            },
        ];
    };
    const synthIssues = () => {
        const text = note('fld-issues-decisions-notes');
        if (!text)
            return [];
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
    const synthComms = () => {
        const text = note('fld-comms-plan-notes');
        if (!text)
            return [];
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
    const synthGovernance = () => {
        const text = note('fld-governance-approvals-notes');
        if (!text)
            return [];
        return [
            {
                id: 1,
                gate: '',
                approver: text,
                date: '',
            },
        ];
    };
    const out = Object.assign(Object.assign({}, emptyPidData), { projectTitleAndId: {
            title: get('fld-project-name', 'projectTitle'),
            id: get('fld-project-id', 'projectId'),
        }, executiveSummary: get('fld-exec', 'executiveSummary'), problemStatement: get('fld-problem', 'problemStatement'), businessCase: get('fld-business-case', 'businessCase'), objectives: asArray(tables['tbl-objectives']), kpis: asArray(tables['tbl-kpis']), scopeInclusions: get('fld-scope-inclusions', 'scope'), scopeExclusions: get('fld-scope-exclusions', 'outOfScope'), assumptions: get('fld-assumptions', 'assumptions'), constraints: asArray(tables['tbl-constraints']), dependencies: asArray(tables['tbl-dependencies']).length > 0
            ? asArray(tables['tbl-dependencies'])
            : synthDependencies(), stakeholders: asArray(tables['tbl-stakeholders']), projectSponsor: get('fld-sponsor', 'sponsor'), projectManager: get('fld-owner', 'manager'), teamAndRoles: asArray(tables['tbl-team']), timelineOverview: timelineNorm.text || get('fld-timeline-overview', 'timeline'), milestones: normalizeMilestones(asArray(tables['tbl-milestones'])), deliverables: normalizeDeliverables(asArray(tables['tbl-deliverables'])), workBreakdown: get('fld-deliverables-notes', 'workBreakdown'), budgetAndCost: {
            summary: get('fld-budget-notes', 'budget'),
            table: asArray(tables['tbl-costs']),
        }, resourcesAndTools: get('fld-resources-tools', 'resources'), risks: asArray(tables['tbl-risks']).length > 0
            ? asArray(tables['tbl-risks'])
            : synthRisks(), mitigations: get('fld-mitigations-notes', 'mitigations'), issuesAndDecisions: asArray(tables['tbl-decisions']).length > 0
            ? asArray(tables['tbl-decisions'])
            : synthIssues(), communicationPlan: asArray(tables['tbl-comms-plan']).length > 0
            ? asArray(tables['tbl-comms-plan'])
            : synthComms(), governance: asArray(tables['tbl-approvals']).length > 0
            ? asArray(tables['tbl-approvals'])
            : synthGovernance(), compliance: get('fld-compliance-notes', 'compliance'), openQuestions: asArray(tables['tbl-open-questions']) });
    if ((!out.milestones || out.milestones.length === 0) && timelineNorm.milestones.length > 0) {
        out.milestones = timelineNorm.milestones;
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
export const mapLocalParserOutputToPidData = (raw) => {
    try {
        // Case: local parser output
        if (raw &&
            typeof raw === 'object' &&
            'fields' in raw &&
            'tables' in raw) {
            return mapFromParser(raw);
        }
        // Case: object with any of the schema keys
        if (raw &&
            typeof raw === 'object' &&
            ('title' in raw ||
                'projectId' in raw ||
                'executiveSummary' in raw ||
                'objectives' in raw ||
                'projectTitle' in raw)) {
            return mapFromGemini(raw);
        }
        // Fallback: nothing we recognize
        return Object.assign({}, emptyPidData);
    }
    catch (err) {
        // Never let mapping throw; backend should always return a well-formed pidData object.
        console.error('[PID_MAPPER] Failed to map parse result', err);
        return Object.assign({}, emptyPidData);
    }
};
