import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/CreateMode_clean.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import NavPanel from './NavPanel';
import MainContent from './MainContent';
// Identity function for example creation
function makeExample(obj) {
    return obj;
}
// Use future-dated timelines for new projects/Gantt entries
const today = new Date().toISOString().slice(0, 10);
function makeBlankPid() {
    return {
        titleBlock: {
            projectTitle: '',
            subtitle: 'Project Initiation Document',
            generatedOn: today,
            projectId: '',
        },
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
        projectManagerOwner: { name: '', role: '' },
        teamRaci: [],
        timelineOverview: '',
        milestones: [],
        workBreakdownTasks: [],
        budgetCostBreakdown: [],
        resourcesTools: [],
        risks: [],
        mitigationsContingencies: [],
        issuesDecisionsLog: [],
        communicationPlan: [],
        governanceApprovals: [],
        complianceSecurityPrivacy: [],
        openQuestionsNextSteps: [],
        notesBackground: '',
    };
}
// Deep merge for patch-style assistant updates (arrays replaced, objects merged)
function deepMerge(base, patch) {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (!isObj(base) || !isObj(patch))
        return (patch !== null && patch !== void 0 ? patch : base);
    const out = Object.assign({}, base);
    for (const k of Object.keys(patch)) {
        const pv = patch[k];
        const bv = base[k];
        if (Array.isArray(pv))
            out[k] = pv;
        else if (isObj(bv) && isObj(pv))
            out[k] = deepMerge(bv, pv);
        else
            out[k] = pv;
    }
    return out;
}
// IMPORTANT: canonical fill: every field present and typed correctly (arrays are arrays, objects are objects)
function normalizePid(input) {
    const blank = makeBlankPid();
    const x = input && typeof input === 'object' ? input : {};
    const merged = deepMerge(blank, x);
    const out = Object.assign(Object.assign({}, blank), merged);
    out.titleBlock = Object.assign(Object.assign({}, blank.titleBlock), (merged.titleBlock || {}));
    out.titleBlock.projectTitle = String(out.titleBlock.projectTitle || '');
    out.titleBlock.subtitle = String(out.titleBlock.subtitle || 'Project Initiation Document');
    out.titleBlock.generatedOn = String(out.titleBlock.generatedOn || today);
    out.titleBlock.projectId = String(out.titleBlock.projectId || '');
    out.objectivesSmart = Array.isArray(out.objectivesSmart) ? out.objectivesSmart : [];
    out.kpis = Array.isArray(out.kpis) ? out.kpis : [];
    out.scopeInclusions = Array.isArray(out.scopeInclusions) ? out.scopeInclusions : [];
    out.scopeExclusions = Array.isArray(out.scopeExclusions) ? out.scopeExclusions : [];
    out.assumptions = Array.isArray(out.assumptions) ? out.assumptions : [];
    out.constraints = Array.isArray(out.constraints) ? out.constraints : [];
    out.dependencies = Array.isArray(out.dependencies) ? out.dependencies : [];
    out.stakeholders = Array.isArray(out.stakeholders) ? out.stakeholders : [];
    out.teamRaci = Array.isArray(out.teamRaci) ? out.teamRaci : [];
    out.milestones = Array.isArray(out.milestones) ? out.milestones : [];
    out.workBreakdownTasks = Array.isArray(out.workBreakdownTasks) ? out.workBreakdownTasks : [];
    out.budgetCostBreakdown = Array.isArray(out.budgetCostBreakdown) ? out.budgetCostBreakdown : [];
    out.resourcesTools = Array.isArray(out.resourcesTools) ? out.resourcesTools : [];
    out.risks = Array.isArray(out.risks) ? out.risks : [];
    out.mitigationsContingencies = Array.isArray(out.mitigationsContingencies) ? out.mitigationsContingencies : [];
    out.issuesDecisionsLog = Array.isArray(out.issuesDecisionsLog) ? out.issuesDecisionsLog : [];
    out.communicationPlan = Array.isArray(out.communicationPlan) ? out.communicationPlan : [];
    out.governanceApprovals = Array.isArray(out.governanceApprovals) ? out.governanceApprovals : [];
    out.complianceSecurityPrivacy = Array.isArray(out.complianceSecurityPrivacy) ? out.complianceSecurityPrivacy : [];
    out.openQuestionsNextSteps = Array.isArray(out.openQuestionsNextSteps) ? out.openQuestionsNextSteps : [];
    out.projectSponsor = Object.assign(Object.assign({}, blank.projectSponsor), (merged.projectSponsor || {}));
    out.projectManagerOwner = Object.assign(Object.assign({}, blank.projectManagerOwner), (merged.projectManagerOwner || {}));
    out.executiveSummary = String(out.executiveSummary || '');
    out.problemStatement = String(out.problemStatement || '');
    out.businessCaseExpectedValue = String(out.businessCaseExpectedValue || '');
    out.timelineOverview = String(out.timelineOverview || '');
    out.notesBackground = String(out.notesBackground || '');
    return out;
}
function buildFallbackPidFromPrompt(prompt) {
    const title = String(prompt || '').trim().split(/\n/)[0].trim() || 'New Project';
    // Start all generated timelines in the future (at least +1 day)
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const d = (days) => new Date(start.getTime() + days * 86400000).toISOString().slice(0, 10);
    const pidId = `PID-${today.replace(/-/g, '')}-${Math.floor(start.getTime() / 1000)}`;
    return normalizePid(makeExample({
        titleBlock: {
            projectTitle: title,
            subtitle: 'Project Initiation Document',
            generatedOn: today,
            projectId: pidId,
        },
        executiveSummary: `This PID defines the scope, schedule, risks, governance, and delivery plan for "${title}".`,
        problemStatement: 'The current process is fragmented, manual, and difficult to measure end-to-end outcomes.',
        businessCaseExpectedValue: 'Reduce cycle time and rework, improve quality and predictability, and deliver measurable ROI within 2 quarters.',
        objectivesSmart: [
            { objective: 'Deliver MVP', successMeasure: 'MVP shipped with core workflows and reporting' },
            { objective: 'Improve efficiency', successMeasure: 'Reduce cycle time by 25% from baseline' },
            { objective: 'Improve quality', successMeasure: 'Cut defects/rework by 30%' },
        ],
        kpis: [
            { kpi: 'Cycle time (days)', baseline: '20', target: '15' },
            { kpi: 'Defect rate (%)', baseline: '8%', target: '5%' },
            { kpi: 'On-time delivery (%)', baseline: '70%', target: '90%' },
        ],
        scopeInclusions: [
            'Requirements & success metrics',
            'Solution design & implementation',
            'Testing, launch, and adoption enablement',
        ],
        scopeExclusions: ['Full enterprise rollout (post-MVP phase)', 'Major legacy system re-architecture'],
        assumptions: [
            { assumption: 'Key stakeholders are available weekly for reviews' },
            { assumption: 'Environments and access are provisioned within 1 week' },
        ],
        constraints: [
            { constraint: 'Fixed delivery window and limited engineering capacity' },
            { constraint: 'Security and compliance reviews required before go-live' },
        ],
        dependencies: [
            { dependency: 'Identity/SSO configuration', teamOrSystem: 'IT', status: 'Planned' },
            { dependency: 'Data access approvals', teamOrSystem: 'Security', status: 'Planned' },
        ],
        stakeholders: [
            { name: 'Project Sponsor (TBD)', role: 'Executive Sponsor', contact: 'TBD' },
            { name: 'Operations Lead (TBD)', role: 'Process Owner', contact: 'TBD' },
            { name: 'Security (TBD)', role: 'Compliance Owner', contact: 'TBD' },
        ],
        projectSponsor: { name: 'TBD', role: 'Executive Sponsor' },
        projectManagerOwner: { name: 'TBD', role: 'Project Manager' },
        teamRaci: [
            {
                teamMember: 'PM',
                role: 'Delivery Lead',
                responsible: 'Plan & execution',
                accountable: 'Delivery outcomes',
                consulted: 'Stakeholders',
                informed: 'Leadership',
            },
            {
                teamMember: 'Engineering',
                role: 'Implementation',
                responsible: 'Build & test',
                accountable: 'Quality',
                consulted: 'Security',
                informed: 'PM',
            },
        ],
        timelineOverview: `Discovery (${d(0)}–${d(7)}), Build (${d(7)}–${d(35)}), Launch (${d(35)}–${d(45)}).`,
        milestones: [
            { milestone: 'Kickoff complete', targetDate: d(2) },
            { milestone: 'Requirements signed-off', targetDate: d(7) },
            { milestone: 'MVP complete', targetDate: d(35) },
            { milestone: 'Go-live', targetDate: d(45) },
        ],
        workBreakdownTasks: [
            {
                name: 'Discovery & requirements',
                owner: 'PM',
                start: d(0),
                end: d(7),
                status: 'Planned',
                priority: 'High',
                kind: 'Task',
                dependencies: [],
            },
            {
                name: 'Solution design',
                owner: 'Engineering',
                start: d(5),
                end: d(14),
                status: 'Planned',
                priority: 'High',
                kind: 'Task',
                dependencies: ['Discovery & requirements'],
            },
            {
                name: 'Implementation',
                owner: 'Engineering',
                start: d(14),
                end: d(35),
                status: 'Planned',
                priority: 'High',
                kind: 'Task',
                dependencies: ['Solution design'],
            },
            {
                name: 'Testing & validation',
                owner: 'QA',
                start: d(28),
                end: d(40),
                status: 'Planned',
                priority: 'Medium',
                kind: 'Task',
                dependencies: ['Implementation'],
            },
            {
                name: 'Launch readiness',
                owner: 'PM',
                start: d(35),
                end: d(45),
                status: 'Planned',
                priority: 'High',
                kind: 'Milestone',
                dependencies: ['Testing & validation'],
            },
            {
                name: 'Training & enablement',
                owner: 'Ops',
                start: d(30),
                end: d(42),
                status: 'Planned',
                priority: 'Medium',
                kind: 'Task',
                dependencies: ['Implementation'],
            },
            {
                name: 'Post-launch monitoring',
                owner: 'Ops',
                start: d(45),
                end: d(60),
                status: 'Planned',
                priority: 'Low',
                kind: 'Task',
                dependencies: ['Launch readiness'],
            },
        ],
        budgetCostBreakdown: [
            { item: 'Engineering (6 wks)', category: 'Labor', cost: '$60,000' },
            { item: 'QA & UAT', category: 'Labor', cost: '$10,000' },
            { item: 'Cloud / tooling', category: 'Infrastructure', cost: '$5,000' },
            { item: 'Contingency', category: 'Buffer', cost: '$10,000' },
        ],
        resourcesTools: [
            { resource: 'Project workspace', purpose: 'Planning & documentation' },
            { resource: 'CI/CD pipeline', purpose: 'Build & deploy automation' },
            { resource: 'Monitoring', purpose: 'Stability and alerting' },
        ],
        risks: [
            { risk: 'Stakeholder availability delays decisions', probability: 'Medium', impact: 'High' },
            { risk: 'Security review extends timeline', probability: 'Medium', impact: 'Medium' },
        ],
        mitigationsContingencies: [
            { mitigation: 'Weekly reviews & a decision log', contingency: 'Escalate blockers within 24 hours' },
            { mitigation: 'Pre-schedule security checkpoints', contingency: 'Use staged rollout if approvals slip' },
        ],
        issuesDecisionsLog: [
            { date: today, issue: 'Scope prioritization needed', decision: 'Adopt phased rollout for MVP', owner: 'Sponsor' },
        ],
        communicationPlan: [
            { audience: 'Core team', cadence: 'Daily', channel: 'Standup' },
            { audience: 'Stakeholders', cadence: 'Weekly', channel: 'Status email' },
        ],
        governanceApprovals: [
            { gate: 'Scope & timeline', signoffRequirement: 'Sponsor approval (email or ticket)' },
            { gate: 'Security checklist', signoffRequirement: 'Security approval (ticket)' },
        ],
        complianceSecurityPrivacy: [{ requirement: 'Access control', notes: 'Least privilege, reviewed before go-live' }],
        openQuestionsNextSteps: [
            {
                question: 'What are the final success criteria and baseline metrics?',
                nextStep: 'Confirm baseline and targets in week-1 working session.',
            },
        ],
        notesBackground: 'Background notes, assumptions, and context captured during kickoff. Update as decisions are made.',
    }));
}
const shouldShowPid = (pid) => {
    if (!pid || !pid.titleBlock)
        return false;
    return String(pid.titleBlock.projectTitle || '').trim().length > 0;
};
export const CreateMode = ({ initialData, onHelp, onCreateModeEvent, aiModel, onDraftChange = () => { }, onExportPdf, onExportWord, onExportJson, onExportZip, }) => {
    // UI / interaction state (export buttons removed; exports handled from left panel)
    const [exporting, setExporting] = useState(null);
    const [selectedExampleId, setSelectedExampleId] = useState(null);
    const [draftPid, setDraftPid] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [chat, setChat] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [lastError, setLastError] = useState(null);
    const [chatExpanded, setChatExpanded] = useState(false);
    const scrollerRef = useRef(null);
    useEffect(() => {
        if (!initialData)
            return;
        const next = normalizePid(initialData);
        setDraftPid(next);
    }, [initialData]);
    useEffect(() => {
        if (onDraftChange && draftPid)
            onDraftChange(draftPid);
    }, [draftPid, onDraftChange]);
    // Full examples array (keep stable)
    const EXAMPLES = [
        {
            id: 'tbi-mhealth',
            label: 'TBI Mobile Rehab Pilot — Diaspora',
            summary: 'A mobile-health pilot to screen, triage, and deliver at-home rehab for mild/moderate TBI in the Ethiopian diaspora, partnering with community orgs and clinics.',
            pid: normalizePid({
                titleBlock: { title: 'Diaspora TBI Mobile Rehab Pilot', projectId: `PMO-${today}-TBI`, owner: 'Hulumulu Neuro', date: today },
                executiveSummary: 'Launch a 12-week pilot that uses a smartphone-based assessment + guided rehab program for post-concussion symptoms, validated against a clinician-led baseline workflow.',
                problemStatement: 'TBI patients often face fragmented follow-up care and limited access to rehab. Diaspora communities also face barriers around language, trust, and navigating health systems.',
                goalsAndObjectives: [
                    { objective: 'Deploy an MVP app with bilingual onboarding, symptom tracking, and guided rehab modules.', successMetric: '≥70% weekly active usage across enrolled participants' },
                    { objective: 'Validate screening + progression metrics vs clinician assessments.', successMetric: 'Correlation ≥0.65 with clinician-rated outcomes' },
                    { objective: 'Establish a sustainable referral & support loop with community partners.', successMetric: '≥2 partner orgs running monthly enrollment sessions' },
                ],
                scope: {
                    inScope: [
                        'Bilingual intake + consent',
                        'Symptom tracking + reminders',
                        '3 rehab modules (cognitive, balance, sleep)',
                        'Clinician dashboard (read-only)',
                        'Pilot analytics + export',
                    ],
                    outOfScope: ['Emergency triage', 'Medication management', 'Insurance billing'],
                },
                deliverables: [
                    { deliverable: 'Mobile app MVP (iOS/Android web wrapper)', dueDate: `${today}` },
                    { deliverable: 'Clinician dashboard (read-only)', dueDate: `${today}` },
                    { deliverable: 'Pilot protocol + IRB/ethics packet', dueDate: `${today}` },
                    { deliverable: 'Outcome report + go/no-go recommendation', dueDate: `${today}` },
                ],
                milestones: [
                    { milestone: 'Pilot protocol finalized', targetDate: `${today}`, owner: 'Clinical Lead' },
                    { milestone: 'MVP feature-complete', targetDate: `${today}`, owner: 'Engineering' },
                    { milestone: 'First cohort enrolled', targetDate: `${today}`, owner: 'Community Ops' },
                    { milestone: 'Pilot readout', targetDate: `${today}`, owner: 'Program Manager' },
                ],
                requirements: [
                    { requirement: 'Offline-first symptom logging', priority: 'High' },
                    { requirement: 'Privacy-preserving identifiers and export', priority: 'High' },
                    { requirement: 'Role-based access for clinicians', priority: 'Medium' },
                ],
                stakeholders: [
                    { name: 'Clinical Lead', role: 'Protocol + validation', influence: 'High' },
                    { name: 'Community Partner', role: 'Recruitment + trust building', influence: 'High' },
                    { name: 'Participants', role: 'Primary users', influence: 'High' },
                ],
                team: [
                    { name: 'PM', role: 'Delivery + coordination', allocation: '0.5 FTE' },
                    { name: 'Full-stack Eng', role: 'App + dashboard', allocation: '1.0 FTE' },
                    { name: 'Data Scientist', role: 'Metrics + analysis', allocation: '0.5 FTE' },
                    { name: 'Clinical Lead', role: 'Validation + safety', allocation: '0.2 FTE' },
                ],
                timeline: {
                    phases: [
                        { phase: 'Design + Protocol', start: `${today}`, end: `${today}` },
                        { phase: 'Build + QA', start: `${today}`, end: `${today}` },
                        { phase: 'Pilot Execution', start: `${today}`, end: `${today}` },
                        { phase: 'Analysis + Readout', start: `${today}`, end: `${today}` },
                    ],
                },
                risks: [
                    { risk: 'Low adherence due to symptom burden', impact: 'High', mitigation: 'Reduce friction, add human check-ins, and personalize reminders.' },
                    { risk: 'Data privacy concerns reduce enrollment', impact: 'High', mitigation: 'Clear consent, minimal PII, encrypted storage, and transparent exports.' },
                    { risk: 'Clinical safety edge cases', impact: 'Medium', mitigation: 'Escalation guidance + clinician review triggers.' },
                ],
                assumptions: ['Participants have access to a smartphone.', 'Partner orgs can host onboarding sessions.'],
                constraints: ['Pilot budget capped at $25k.', 'No PHI stored in logs beyond minimal identifiers.'],
                dependencies: ['App hosting + auth provider', 'Clinician reviewers availability', 'Recruitment pipeline'],
                budgetAndCosts: {
                    estimatedBudget: '$25,000',
                    breakdown: [
                        { item: 'Engineering', cost: '$12,000' },
                        { item: 'Clinical time', cost: '$6,000' },
                        { item: 'Participant support + incentives', cost: '$5,000' },
                        { item: 'Ops + tooling', cost: '$2,000' },
                    ],
                },
                governance: {
                    decisionMakers: ['PM', 'Clinical Lead'],
                    cadence: 'Weekly 30-min check-in; monthly steering review',
                },
                communications: {
                    channels: ['Email', 'Slack', 'Monthly community session'],
                    reporting: 'Weekly KPI snapshot; end-of-pilot report',
                },
                complianceAndSecurity: {
                    security: ['HTTPS everywhere', 'Least-privilege roles', 'Audit logging (minimal)'],
                    compliance: ['IRB/ethics review', 'Data minimization', 'Participant consent + withdrawal flow'],
                },
                qualityPlan: {
                    tests: ['Unit tests for parsing/export', 'Manual QA for onboarding flows'],
                    acceptanceCriteria: ['No P1 crashes in pilot', 'Exports match schema', 'Consent flow passes review'],
                },
                operationalPlan: {
                    supportModel: 'Email support with 24–48h response; clinician escalation protocol',
                    monitoring: 'Basic uptime + error logs; weekly cohort review',
                },
                successCriteria: ['≥60% cohort completion', 'Clinician validation metrics met', 'Partner commitment for next cohort'],
                openQuestions: ['Which rehab module sequencing yields best adherence?', 'What is the minimum viable clinician dashboard?'],
                decisions: [{ decision: 'Pilot cohort size set to 40 participants', date: `${today}` }],
                changeLog: [{ change: 'Initial PID created', date: `${today}`, author: 'CreateMode Examples' }],
                appendices: ['Draft consent language', 'Pilot survey', 'Outcome rubric'],
            }),
        },
        {
            id: 'cold-chain',
            label: 'Cold-Chain Logistics Upgrade — Ops',
            summary: 'A multi-warehouse cold-chain modernization: IoT sensors, alerting, and SOP rollout to reduce spoilage and improve compliance across facilities.',
            pid: normalizePid({
                titleBlock: { title: 'Cold-Chain Modernization Program', projectId: `PMO-${today}-OPS`, owner: 'Hulumulu Labs', date: today },
                executiveSummary: 'Modernize cold-chain operations across 3 warehouses with temperature sensors, real-time alerting, and updated SOPs to reduce spoilage and ensure audit readiness.',
                problemStatement: 'Current temperature logs are manual and inconsistent, leading to spoilage events and audit findings. We need automated monitoring and standardized procedures.',
                goalsAndObjectives: [
                    { objective: 'Deploy sensors + gateways to 3 warehouses', successMetric: '≥95% coverage of cold storage zones' },
                    { objective: 'Reduce spoilage events', successMetric: '≥30% reduction vs previous quarter baseline' },
                    { objective: 'Pass compliance audits with zero major findings', successMetric: '0 major findings in next audit cycle' },
                ],
                scope: {
                    inScope: ['Sensor procurement', 'Gateway installation', 'Alerting rules', 'SOP updates', 'Training + drills'],
                    outOfScope: ['Replacing refrigeration hardware', 'ERP overhaul'],
                },
                deliverables: [
                    { deliverable: 'Sensor + gateway deployment', dueDate: `${today}` },
                    { deliverable: 'Alerting + dashboard', dueDate: `${today}` },
                    { deliverable: 'Updated SOPs + training materials', dueDate: `${today}` },
                    { deliverable: 'Audit-ready evidence package', dueDate: `${today}` },
                ],
                milestones: [
                    { milestone: 'Vendor selected', targetDate: `${today}`, owner: 'Ops Lead' },
                    { milestone: 'Warehouse 1 live', targetDate: `${today}`, owner: 'Field Tech' },
                    { milestone: 'All warehouses live', targetDate: `${today}`, owner: 'Ops Lead' },
                    { milestone: 'First internal audit pass', targetDate: `${today}`, owner: 'Compliance' },
                ],
                requirements: [
                    { requirement: 'Sensor readings every 5 minutes', priority: 'High' },
                    { requirement: 'SMS/email alert on threshold breach', priority: 'High' },
                    { requirement: 'Exportable audit logs', priority: 'High' },
                ],
                stakeholders: [
                    { name: 'Operations Lead', role: 'Program sponsor', influence: 'High' },
                    { name: 'Warehouse Managers', role: 'Execution + staffing', influence: 'High' },
                    { name: 'Compliance Officer', role: 'Audit readiness', influence: 'High' },
                    { name: 'IT', role: 'Network + integrations', influence: 'Medium' },
                ],
                team: [
                    { name: 'Program Manager', role: 'Plan + delivery', allocation: '1.0 FTE' },
                    { name: 'Field Technician', role: 'Install + calibration', allocation: '1.0 FTE' },
                    { name: 'Ops Analyst', role: 'Dashboards + reporting', allocation: '0.5 FTE' },
                    { name: 'Compliance Officer', role: 'Controls + audits', allocation: '0.2 FTE' },
                ],
                timeline: {
                    phases: [
                        { phase: 'Vendor selection', start: `${today}`, end: `${today}` },
                        { phase: 'Install + calibration', start: `${today}`, end: `${today}` },
                        { phase: 'Alerting + SOP rollout', start: `${today}`, end: `${today}` },
                        { phase: 'Internal audit + stabilization', start: `${today}`, end: `${today}` },
                    ],
                },
                risks: [
                    { risk: 'Sensor drift or calibration errors', impact: 'High', mitigation: 'Calibration SOP + monthly spot checks.' },
                    { risk: 'Network coverage gaps', impact: 'Medium', mitigation: 'Site survey and add repeaters where needed.' },
                    { risk: 'Operational resistance to SOP changes', impact: 'Medium', mitigation: 'Training + drills + manager KPIs.' },
                ],
                assumptions: ['Warehouses permit installation windows.', 'Vendor lead times are <4 weeks.'],
                constraints: ['Budget capped at $80k.', 'No downtime >2 hours per zone.'],
                dependencies: ['Procurement approvals', 'Warehouse access windows', 'IT network changes'],
                budgetAndCosts: {
                    estimatedBudget: '$80,000',
                    breakdown: [
                        { item: 'Sensors + gateways', cost: '$45,000' },
                        { item: 'Installation labor', cost: '$15,000' },
                        { item: 'Dashboards + alerting', cost: '$12,000' },
                        { item: 'Training + SOP rollout', cost: '$8,000' },
                    ],
                },
                governance: { decisionMakers: ['Ops Lead', 'Compliance Officer'], cadence: 'Twice-weekly rollout standup during install' },
                communications: { channels: ['Email', 'Ops standup'], reporting: 'Daily install report during rollout; weekly KPI report' },
                complianceAndSecurity: {
                    security: ['Network segmentation for IoT', 'Device inventory + rotation', 'Access control for dashboards'],
                    compliance: ['Temperature log retention', 'SOP versioning', 'Audit evidence pack'],
                },
                qualityPlan: { tests: ['Pilot install in one zone', 'Alerting dry run'], acceptanceCriteria: ['Alerts within 2 minutes', 'Exports match audit format'] },
                operationalPlan: { supportModel: 'On-call rotation during rollout; vendor escalation path', monitoring: 'Dashboard + weekly exception review' },
                successCriteria: ['Spoilage reduction achieved', 'No major audit findings', 'SOP adoption ≥90% by managers'],
                openQuestions: ['Which alert thresholds minimize false positives?', 'What retention period is required per customer contracts?'],
                decisions: [{ decision: 'Targeting 5-minute sampling interval', date: `${today}` }],
                changeLog: [{ change: 'Initial PID created', date: `${today}`, author: 'CreateMode Examples' }],
                appendices: ['Draft SOPs', 'Warehouse floor plans', 'Vendor comparison matrix'],
            }),
        },
    ];
    const examples = useMemo(() => EXAMPLES, []);
    // Only show the first 2 canonical examples
    const visibleExamples = examples.slice(0, 2);
    const applyExampleToDraft = (ex) => {
        setLastError(null);
        setDraftPid(normalizePid(ex.pid));
        setSelectedExampleId(ex.id);
        setChat([]);
        if (typeof onCreateModeEvent === 'function')
            onCreateModeEvent();
    };
    const callAssistant = async () => {
        const q = chatInput.trim();
        if (!q || isSending)
            return;
        setIsSending(true);
        setLastError(null);
        const nextChat = [...chat, { role: 'user', content: q }];
        setChat(nextChat);
        setChatInput('');
        try {
            const res = await fetch('/api/ai/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: nextChat.map((m) => ({ role: m.role, content: m.content })),
                    pidData: draftPid || makeBlankPid(),
                    model: aiModel || undefined,
                }),
            });
            if (!res.ok) {
                const t = await res.text().catch(() => '');
                throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
            }
            const data = await res.json();
            let aiMsg = { role: 'assistant', content: '' };
            const nextPid = (data && typeof data === 'object' && (data.pid || data.pidData)) || null;
            const patch = (data && typeof data === 'object' && data.patch) || null;
            if (nextPid && typeof nextPid === 'object') {
                setDraftPid(normalizePid(nextPid));
            }
            else if (patch && typeof patch === 'object') {
                setDraftPid((prev) => normalizePid(Object.assign(Object.assign({}, (prev || makeBlankPid())), patch)));
            }
            if (typeof (data === null || data === void 0 ? void 0 : data.reply) === 'string' && data.reply.trim().length > 0) {
                aiMsg.content = data.reply;
            }
            else {
                aiMsg.content = 'Done.';
            }
            setChat((prev) => [...prev, aiMsg]);
            // keep newest messages visible when expanded
            if (chatExpanded && scrollerRef.current) {
                requestAnimationFrame(() => {
                    var _a;
                    try {
                        (_a = scrollerRef.current) === null || _a === void 0 ? void 0 : _a.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    catch (_b) { }
                });
            }
        }
        catch (err) {
            setLastError((err === null || err === void 0 ? void 0 : err.message) || 'Assistant failed');
            setChat((prev) => [...prev, { role: 'assistant', content: '[Error: Assistant failed]' }]);
        }
        finally {
            setIsSending(false);
        }
    };
    const handleReset = () => {
        setDraftPid(makeBlankPid());
        setChat([]);
        setSelectedExampleId(null);
        setChatInput('');
        setLastError(null);
    };
    // Auto-expand chat the first time we get an assistant reply
    const autoExpandedRef = useRef(false);
    useEffect(() => {
        if (!chatExpanded && !autoExpandedRef.current) {
            const hasAssistant = chat.some((m) => m.role === 'assistant');
            if (hasAssistant) {
                autoExpandedRef.current = true;
                setChatExpanded(true);
            }
        }
    }, [chat, chatExpanded]);
    // Keep newest messages visible whenever chat grows in expanded mode
    useEffect(() => {
        if (chatExpanded && scrollerRef.current) {
            try {
                scrollerRef.current.scrollTop = 0;
            }
            catch (_a) { }
        }
    }, [chatExpanded, chat.length]);
    return (_jsxs("div", { className: "w-full h-full overflow-y-auto p-1 md:p-2 relative", children: [isSending && (_jsxs("div", { className: "absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm transition-all", style: { pointerEvents: 'all' }, children: [_jsx("img", { src: "/logos/pmomax_logo.png", alt: "PMOMax Logo", className: "w-32 h-32 drop-shadow-xl mb-6", style: { filter: 'drop-shadow(0 0 18px rgba(15,23,42,0.9))' } }), _jsx("div", { className: "text-2xl md:text-3xl font-semibold text-brand-text", children: "Architecting your PID\u2026" })] })), exporting && (_jsxs("div", { className: "absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm transition-all", style: { pointerEvents: 'all' }, children: [_jsx("img", { src: "/logos/pmomax_logo.png", alt: "Exporting", className: "w-24 h-24 drop-shadow-xl mb-4", style: { filter: 'drop-shadow(0 0 18px rgba(15,23,42,0.9))' } }), _jsxs("div", { className: "text-lg font-semibold text-brand-text mb-2", children: ["Exporting ", exporting, "\u2026"] })] })), _jsxs("div", { className: "w-full space-y-1.5 md:space-y-2", style: isSending ? { opacity: 0.25, filter: 'blur(2px)' } : {}, children: [_jsx("div", { className: "rounded-lg border border-brand-border bg-brand-panel p-1.5 md:p-3", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { className: "flex-1 min-w-[220px]", children: [_jsx("div", { className: "text-xl md:text-3xl font-extrabold text-white leading-tight", children: "Create" }), _jsx("div", { className: "text-sm md:text-[14px] font-semibold text-white/90 leading-snug", children: "Click an example card (right) or describe what you want \u2014 the AI will draft a complete PID below." })] }), _jsxs("div", { className: "flex items-center gap-1.5 md:gap-2 flex-wrap mt-2 md:mt-0", children: [onHelp && (_jsx("button", { type: "button", onClick: () => onHelp && onHelp('create-mode'), className: "rounded-full bg-amber-500 px-2 py-1 text-xs md:text-sm font-semibold text-black hover:bg-amber-400", children: "? Help" })), _jsx("button", { type: "button", onClick: handleReset, className: "rounded-full bg-red-600 px-2 py-1 text-xs md:text-sm font-semibold text-white hover:bg-red-700 border border-red-500", title: "Reset all fields and chat", children: "Reset" })] })] }) }), lastError && (_jsx("div", { className: "rounded border border-red-500/60 bg-red-950/40 px-2 py-1 text-xs text-red-200", children: lastError })), !isSending && (_jsx("div", { className: "mt-2 mb-4 rounded-lg border border-brand-border bg-black/10 p-1.5 md:p-2 relative z-10", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-[1fr_320px] gap-2 items-stretch", children: [_jsxs("div", { className: "rounded-lg border border-brand-border bg-black/20 p-2 md:p-2.5", children: [_jsx("div", { className: "flex items-center justify-between gap-1 md:gap-2", children: _jsxs("div", { children: [_jsx("div", { className: "text-lg md:text-xl font-extrabold text-white leading-tight", children: "AI Create Assistant" }), _jsx("div", { className: "text-sm md:text-[14px] font-semibold text-white/90 leading-snug", children: "Tell me what you\u2019re building, why it matters, key constraints, stakeholders, and target dates. I\u2019ll draft a complete PID and keep the draft below updated as we refine it." })] }) }), _jsxs("div", { className: "mt-2 flex flex-col gap-2 h-full", children: [_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }, children: _jsx("button", { type: "button", onClick: () => setChatExpanded((prev) => !prev), className: "rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-black hover:bg-amber-400 border border-amber-400/60", style: { minWidth: 80 }, children: chatExpanded ? 'Collapse' : 'Expand' }) }), _jsxs("div", { ref: scrollerRef, className: `flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 pr-1 ${chatExpanded
                                                        ? 'min-h-16 max-h-[55vh] sm:max-h-[60vh] lg:max-h-[70vh]'
                                                        : 'min-h-10 max-h-24 sm:max-h-28'}`, children: [[...chat].reverse().map((m, idx) => (_jsx("div", { className: `rounded border border-brand-border px-2 py-1.5 text-xs md:text-[13px] whitespace-pre-wrap ${m.role === 'assistant'
                                                                ? 'bg-brand-panel text-brand-text'
                                                                : 'bg-black/40 text-white'}`, children: m.content }, idx))), chat.length === 0 && (_jsx("div", { className: "rounded border border-brand-border bg-black/20 px-3 py-2 text-sm md:text-base font-semibold text-white", children: "Try: \u201CCreate a PID for a 3-month data platform migration with a hard security review gate and weekly stakeholder updates.\u201D" }))] }), _jsxs("div", { className: "rounded-lg border border-amber-400/40 bg-black/60 p-2", children: [_jsx("div", { className: "text-xs md:text-[13px] font-extrabold text-white mb-1", children: "Describe your project (Enter = send, Shift+Enter = newline)" }), _jsxs("div", { className: "flex items-end gap-1.5", children: [_jsx("textarea", { value: chatInput, onChange: (e) => setChatInput(e.target.value), onKeyDown: (e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            callAssistant();
                                                                        }
                                                                    }, rows: 2, placeholder: "Describe what you want to create\u2026", className: "flex-1 rounded border border-amber-300 bg-black px-3 py-2 text-base font-semibold text-amber-200 resize-none", style: {
                                                                        background: '#181200',
                                                                        color: '#f7b84b',
                                                                        fontSize: '1rem',
                                                                        fontWeight: 600,
                                                                        letterSpacing: '0.01em',
                                                                        borderColor: '#f7b84b',
                                                                    } }), _jsx("button", { type: "button", onClick: callAssistant, disabled: isSending || !chatInput.trim(), className: `rounded border px-3 py-2 text-xs md:text-[13px] font-extrabold transition ${isSending || !chatInput.trim()
                                                                        ? 'border-brand-border bg-black/30 text-brand-text-secondary cursor-not-allowed'
                                                                        : 'border-amber-400/60 bg-amber-500 text-black hover:bg-amber-400'}`, children: isSending ? 'Sending…' : 'Send' })] })] })] })] }), _jsxs("div", { className: "rounded-lg border border-brand-border bg-black/20 p-2 md:p-2.5", children: [_jsx("div", { className: "text-xs md:text-sm font-extrabold text-white tracking-wide", children: "Examples \u2014 Click to load" }), _jsx("div", { className: "mt-2 flex flex-col gap-2 pb-0", style: { marginBottom: 0, paddingBottom: 0 }, children: visibleExamples.map((ex, idx) => {
                                                const selected = ex.id === selectedExampleId;
                                                return (_jsxs("button", { type: "button", onClick: () => applyExampleToDraft(ex), className: `w-full text-left rounded-xl border-2 p-4 shadow-lg transition-all duration-100 ring-2 ring-transparent focus:outline-none focus:ring-amber-400/80 ${selected
                                                        ? 'border-amber-400 bg-amber-400 text-black ring-amber-400/80 scale-105'
                                                        : 'border-slate-700 bg-black/80 hover:bg-amber-500/10 hover:border-amber-400 ring-slate-700/40 hover:ring-amber-400/30 text-white'} ${idx === visibleExamples.length - 1 ? 'mb-0' : ''}`, style: idx === visibleExamples.length - 1 ? { marginBottom: 0, paddingBottom: 0 } : {}, children: [_jsx("div", { className: `font-extrabold text-base md:text-lg mb-1 ${selected ? 'text-black' : 'text-amber-400'}`, children: ex.label }), _jsx("div", { className: `text-xs md:text-sm leading-snug ${selected ? 'text-black/80' : 'text-amber-200/90'}`, children: ex.summary })] }, ex.id));
                                            }) })] })] }) })), shouldShowPid(draftPid) && (_jsx("div", { className: "w-full rounded-lg border border-brand-border bg-brand-panel p-2 md:p-3 mt-4 relative z-0", children: _jsx("div", { className: "flex flex-col gap-2", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-2", children: [_jsx("div", { className: "min-w-0", children: _jsx(MainContent, { pidData: draftPid, onHelp: onHelp }) }), _jsx("div", { className: "hidden lg:block", children: _jsx(NavPanel, { pidData: draftPid }) })] }) }) }))] })] }));
};
export default CreateMode;
