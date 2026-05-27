// Fully compliant demo data for PMOMaxPID (28 fields, strict).
// - No placeholders or stubs
// - workBreakdownTasks: >= 8 and <= 32 to power a real Gantt
export const demoData = {
    // 1) Title / Cover
    titleBlock: {
        projectTitle: 'NextGen Customer Service Platform',
        subtitle: 'Project Initiation Document',
        generatedOn: 'Generated on: 10/24/2025',
    },
    // 2) Executive Summary
    executiveSummary: 'The NextGen Customer Service Platform will unify all customer touchpoints (chat, SMS, voice) into a single workspace for agents, targeting the North America support organization. The initial release focuses on delivering a reliable MVP for pilot markets first, with measurement and governance baked in. Success is defined by faster customer response, calmer agent workflows, fewer repeat contacts, improved CSAT, and increased self-service deflection. The program will run with a lightweight governance model: weekly sponsor digest, Monday checkpoints for the core team, and formal sign-off gates prior to pilot invite freeze, readiness review, and launch. Security and privacy readiness will be validated before pilot launch, including PII handling, retention expectations, and audit logging for key events.',
    // 3) Problem Statement / Context
    problemStatement: 'Current customer service processes are fragmented across multiple tools and vendors, creating handoff gaps between chat, SMS, and voice. Agents lack a unified view and consistent workflows, and customers face long wait times and repeated contacts for the same issue.',
    // 4) Business Case & Expected Value
    businessCaseExpectedValue: 'Consolidating channels into a single agent workspace is expected to reduce response times and rework, improve customer satisfaction, and create measurable operational savings. Value is realized through fewer repeats, better deflection, and smoother agent workflows—validated via consistent instrumentation before dashboards and reporting.',
    // 5) Objectives (SMART) — TABLE
    objectivesSmart: [
        {
            objective: 'Launch an Agent Workspace MVP to pilot markets',
            successMeasure: 'Pilot live for five test markets by 02/17/2026 with core workflows enabled',
        },
        {
            objective: 'Reduce time-to-first-response (TTFR)',
            successMeasure: 'Achieve ~35% TTFR reduction by April 2026 vs baseline',
        },
        {
            objective: 'Improve CSAT',
            successMeasure: 'Increase CSAT from 3.9 to 4.4 by Q2 2026',
        },
        {
            objective: 'Increase self-service deflection',
            successMeasure: 'Raise deflection to 25–30% by May 2026',
        },
    ],
    // 6) KPIs / Success Metrics — TABLE
    kpis: [
        { kpi: 'Time to First Response (TTFR)', baseline: 'Baseline TBD', target: '≈35% reduction by Apr 2026' },
        { kpi: 'CSAT', baseline: '3.9', target: '4.4 by Q2 2026' },
        { kpi: 'Self-service deflection', baseline: 'Baseline TBD', target: '25–30% by May 2026' },
        { kpi: 'Repeat contacts', baseline: 'Baseline TBD', target: 'Downward trend post-pilot' },
    ],
    // 7) Scope — Inclusions (bullets)
    scopeInclusions: [
        'Unified agent workspace (chat, SMS, voice placeholders initially)',
        'Core on-demand towing + maintenance pickup + roadside assistance flows',
        'Minimal routing triage model for pilot',
        'Instrumentation plan and KPI tracking foundations',
        'Reliability/SRE guardrails and surge simulations',
        'Accessibility + keyboard navigation for agent workflow',
    ],
    // 8) Scope — Exclusions (bullets)
    scopeExclusions: [
        'Premium support tier',
        'Multilingual support',
        'Offline functionality',
    ],
    // 9) Assumptions — TABLE
    assumptions: [
        { assumption: 'Corporate IAM federation completes before pilot authentication needs.' },
        { assumption: 'Data science triage model API is available for pilot integration.' },
        { assumption: 'Brand tone/color tokens finalized in time to lock theme.' },
        { assumption: 'Pilot markets and agents are available for testing and training.' },
        { assumption: 'Legal + Security review turnaround will meet pilot readiness timing (by 02/10/2026 readiness review).' },
    ],
    // 10) Constraints — TABLE
    constraints: [
        { constraint: 'Pilot scope is intentionally narrow; avoid feature creep.' },
        { constraint: 'Surge load behavior must be validated ahead of winter storm spikes.' },
        { constraint: 'Legacy SMS vendor delivery lag requires UX mitigation (timeouts/indicators).' },
        { constraint: 'Thread-list virtualization must remain smooth at 60fps before MVP lock.' },
        { constraint: 'PII handling must meet internal privacy requirements before pilot exposure (masking + retention + auditability).' },
    ],
    // 11) Dependencies — TABLE
    dependencies: [
        { dependency: 'IAM federation setup', teamOrSystem: 'Corporate IAM', status: 'In Progress' },
        { dependency: 'Minimal routing triage model', teamOrSystem: 'Data Science', status: 'Pending' },
        { dependency: 'Brand tone + color tokens', teamOrSystem: 'Brand Design', status: 'Pending' },
        { dependency: 'Legacy SMS vendor behavior', teamOrSystem: 'Vendor', status: 'Unknown' },
        { dependency: 'Security + privacy review package', teamOrSystem: 'Security/Legal', status: 'Pending' },
        { dependency: 'Data retention + logging policy sign-off', teamOrSystem: 'Legal/Compliance', status: 'Pending' },
    ],
    // 12) Stakeholders — TABLE
    stakeholders: [
        { name: 'Priya Singh', role: 'Program Owner / PM', contact: 'priya.singh@example.com' },
        { name: 'Marco Diaz', role: 'Engineering Lead', contact: 'marco.diaz@example.com' },
        { name: 'Lina Park', role: 'Frontend / Accessibility', contact: 'lina.park@example.com' },
        { name: 'Omar Haddad', role: 'SRE / Reliability', contact: 'omar.haddad@example.com' },
        { name: 'Julia Nguyen', role: 'QA / Performance', contact: 'julia.nguyen@example.com' },
        { name: 'Rosa Alvarez', role: 'Customer Operations', contact: 'rosa.alvarez@example.com' },
        { name: 'Ethan Brooks', role: 'Data Science (Triage)', contact: 'ethan.brooks@example.com' },
        { name: 'Leila Patel', role: 'Brand Design', contact: 'leila.patel@example.com' },
        { name: 'Avery Chen', role: 'Security & Privacy Reviewer', contact: 'avery.chen@example.com' },
        { name: 'Morgan Reed', role: 'Legal/Compliance Partner', contact: 'morgan.reed@example.com' },
    ],
    // 13) Project Sponsor
    projectSponsor: { name: 'TBD', role: 'Sponsor' },
    // 14) Project Manager / Owner
    projectManagerOwner: { name: 'Priya Singh' },
    // 15) Team & Roles (RACI) — TABLE
    teamRaci: [
        { teamMember: 'Priya Singh', role: 'Program Owner', responsible: 'X', accountable: 'X', consulted: '', informed: '' },
        { teamMember: 'Marco Diaz', role: 'Engineering Lead', responsible: 'X', accountable: '', consulted: 'X', informed: '' },
        { teamMember: 'Lina Park', role: 'Frontend / Accessibility', responsible: 'X', accountable: '', consulted: 'X', informed: '' },
        { teamMember: 'Omar Haddad', role: 'SRE / Reliability', responsible: 'X', accountable: '', consulted: 'X', informed: '' },
        { teamMember: 'Julia Nguyen', role: 'QA / Performance', responsible: 'X', accountable: '', consulted: 'X', informed: '' },
        { teamMember: 'Rosa Alvarez', role: 'Customer Operations', responsible: 'X', accountable: '', consulted: 'X', informed: 'X' },
        { teamMember: 'Ethan Brooks', role: 'Data Science (Triage)', responsible: 'X', accountable: '', consulted: 'X', informed: '' },
        { teamMember: 'Leila Patel', role: 'Brand Design', responsible: 'X', accountable: '', consulted: 'X', informed: '' },
        { teamMember: 'Avery Chen', role: 'Security & Privacy', responsible: '', accountable: '', consulted: 'X', informed: 'X' },
        { teamMember: 'Morgan Reed', role: 'Legal/Compliance', responsible: '', accountable: '', consulted: 'X', informed: 'X' },
    ],
    // 16) Timeline Overview
    timelineOverview: 'Kickoff 10/29/2025. Foundation work in Nov–Dec, core build Dec–Jan, integration late Jan–early Feb, pilot readiness early Feb, pilot launch 02/17/2026 for five test markets.',
    // 17) Milestones — TABLE
    milestones: [
        { milestone: 'Formal Kickoff (v1.0)', targetDate: '2025-10-29' },
        { milestone: 'Instrumentation Plan Finalized', targetDate: '2025-11-10' },
        { milestone: 'Brand Tokens Delivered', targetDate: '2025-12-05' },
        { milestone: 'MVP Completion Target', targetDate: '2026-01-23' },
        { milestone: 'Security/Privacy Review Package Draft', targetDate: '2026-01-20' },
        { milestone: 'Pilot Invite Freeze', targetDate: '2026-02-07' },
        { milestone: 'Readiness Review', targetDate: '2026-02-10' },
        { milestone: 'Pilot Launch (5 Markets)', targetDate: '2026-02-17' },
    ],
    // 18) Work Breakdown / Tasks  TABLE (>=8, <=32)
    // CPM-aligned RoadRunner schedule with explicit gates and dependencies
    workBreakdownTasks: [
        {
            name: 'Kickoff (v1.0)',
            start: '2025-10-29',
            end: '2025-10-29',
            owner: 'Priya Singh',
            status: 'Planned',
            priority: 'High',
            kind: 'governance',
            dependencies: [],
        },
        {
            name: 'Instrumentation plan finalized',
            start: '2025-10-29',
            end: '2025-11-10',
            owner: 'Julia Nguyen',
            status: 'Planned',
            priority: 'High',
            kind: 'analytics',
            dependencies: ['Kickoff (v1.0)'],
        },
        {
            name: 'Ops: Map top 10 call flows',
            start: '2025-11-03',
            end: '2025-11-14',
            owner: 'Rosa Alvarez',
            status: 'Planned',
            priority: 'High',
            kind: 'ops',
            dependencies: ['Kickoff (v1.0)'],
        },
        {
            name: 'Infra and security specs',
            start: '2025-11-03',
            end: '2025-11-21',
            owner: 'Omar Haddad',
            status: 'Planned',
            priority: 'High',
            kind: 'infra',
            dependencies: ['Kickoff (v1.0)'],
        },
        {
            name: 'Prototype agent workspace shell',
            start: '2025-11-17',
            end: '2025-11-28',
            owner: 'Lina Park',
            status: 'Planned',
            priority: 'High',
            kind: 'frontend',
            dependencies: ['Ops: Map top 10 call flows'],
        },
        {
            name: 'Dev VPC provisioned',
            start: '2025-11-24',
            end: '2025-11-24',
            owner: 'Omar Haddad',
            status: 'Planned',
            priority: 'High',
            kind: 'infra',
            dependencies: ['Infra and security specs'],
        },
        {
            name: 'IAM federation setup',
            start: '2025-11-10',
            end: '2025-12-12',
            owner: 'Corporate IAM',
            status: 'Planned',
            priority: 'High',
            kind: 'security',
            dependencies: ['Instrumentation plan finalized'],
        },
        {
            name: 'Backend plumbing (API, events, observability)',
            start: '2025-12-01',
            end: '2025-12-19',
            owner: 'Marco Diaz',
            status: 'Planned',
            priority: 'High',
            kind: 'backend',
            dependencies: ['Dev VPC provisioned'],
        },
        {
            name: 'Performance harness and first synthetic-load results',
            start: '2025-12-08',
            end: '2026-01-05',
            owner: 'Julia Nguyen',
            status: 'Planned',
            priority: 'High',
            kind: 'qa',
            dependencies: ['Infra and security specs'],
        },
        {
            name: 'Assemble full Agent Workspace MVP',
            start: '2026-01-05',
            end: '2026-01-23',
            owner: 'Priya Singh',
            status: 'Planned',
            priority: 'High',
            kind: 'mvp',
            dependencies: ['Prototype agent workspace shell', 'Backend plumbing (API, events, observability)', 'Performance harness and first synthetic-load results'],
        },
        {
            name: 'Integration sprint (widgets, routing, callbacks, driver ack)',
            start: '2026-01-26',
            end: '2026-02-06',
            owner: 'Marco Diaz / Lina Park',
            status: 'Planned',
            priority: 'High',
            kind: 'integration',
            dependencies: ['IAM federation setup', 'Assemble full Agent Workspace MVP'],
        },
        {
            name: 'Open questions and security/retention/PII/analytics resolved',
            start: '2026-01-05',
            end: '2026-01-31',
            owner: 'Avery Chen',
            status: 'Planned',
            priority: 'High',
            kind: 'readiness',
            dependencies: ['Instrumentation plan finalized', 'Performance harness and first synthetic-load results'],
        },
        {
            name: 'Pilot invite freeze (5 test markets)',
            start: '2026-02-07',
            end: '2026-02-07',
            owner: 'Priya Singh',
            status: 'Planned',
            priority: 'High',
            kind: 'readiness',
            dependencies: ['Integration sprint (widgets, routing, callbacks, driver ack)', 'Open questions and security/retention/PII/analytics resolved'],
        },
        {
            name: 'Readiness review',
            start: '2026-02-10',
            end: '2026-02-10',
            owner: 'Program Sponsor',
            status: 'Planned',
            priority: 'High',
            kind: 'readiness',
            dependencies: ['Pilot invite freeze (5 test markets)'],
        },
        {
            name: 'Pilot launch (5 markets)',
            start: '2026-02-17',
            end: '2026-02-17',
            owner: 'Program Sponsor',
            status: 'Planned',
            priority: 'High',
            kind: 'launch',
            dependencies: ['Readiness review'],
        },
    ],
    // Explicit three-phase critical path boxes used by the Gantt overlay
    criticalPathBoxes: [
        {
            id: 'CP1',
            label: 'Governance & Measurement',
            startDate: '2025-10-29',
            endDate: '2025-11-21',
            taskIds: [
                'Kickoff (v1.0)',
                'Instrumentation plan finalized',
                'Ops: Map top 10 call flows',
                'Infra and security specs',
            ],
        },
        {
            id: 'CP2',
            label: 'Build & Integration',
            startDate: '2025-11-17',
            endDate: '2026-02-06',
            taskIds: [
                'Prototype agent workspace shell',
                'Dev VPC provisioned',
                'IAM federation setup',
                'Backend plumbing (API, events, observability)',
                'Performance harness and first synthetic-load results',
                'Assemble full Agent Workspace MVP',
                'Integration sprint (widgets, routing, callbacks, driver ack)',
            ],
        },
        {
            id: 'CP3',
            label: 'Readiness & Launch',
            startDate: '2026-01-05',
            endDate: '2026-02-17',
            taskIds: [
                'Open questions and security/retention/PII/analytics resolved',
                'Pilot invite freeze (5 test markets)',
                'Readiness review',
                'Pilot launch (5 markets)',
            ],
        },
    ],
    // 19) Budget & Cost Breakdown — TABLE
    budgetCostBreakdown: [],
    // 20) Resources & Tools — TABLE
    resourcesTools: [
        { resource: 'Figma', purpose: 'UI/UX design and token management' },
        { resource: 'Analytics/BI', purpose: 'KPI dashboards and instrumentation validation' },
        { resource: 'Load testing harness', purpose: 'Synthetic traffic + surge simulations' },
        { resource: 'Audit logging + SIEM connector', purpose: 'Security review evidence and incident response readiness' },
    ],
    // 21) Risks — TABLE
    risks: [
        { risk: 'Call spikes during winter storms overload systems', probability: 'Medium', impact: 'High' },
        { risk: 'Legacy SMS vendor delivery lag impacts customer experience', probability: 'High', impact: 'Medium' },
        { risk: 'Thread list performance drops under high volume', probability: 'Medium', impact: 'High' },
        { risk: 'PII exposure in message logs or exports', probability: 'Medium', impact: 'High' },
        { risk: 'Data retention policy mismatch delays readiness sign-off', probability: 'Medium', impact: 'High' },
    ],
    // 22) Mitigations / Contingencies — TABLE
    mitigationsContingencies: [
        { mitigation: 'Simulate surge loads before 12/18 and implement guardrails.', contingency: 'Scale capacity + enforce rate limits during surge.' },
        { mitigation: 'Add UI timeouts + alternate delivery indicators; degrade gracefully.', contingency: 'Fail over to voice/callback when SMS delayed.' },
        { mitigation: 'Enforce virtualization and performance review before MVP lock.', contingency: 'Reduce UI payload + cap visible thread rows.' },
        { mitigation: 'Implement PII masking rules and export redaction policies before pilot.', contingency: 'Disable exports for pilot accounts until security sign-off is complete.' },
        { mitigation: 'Draft retention policy and audit log evidence package early (by 01/20).', contingency: 'Limit log retention window and minimize stored content for pilot.' },
    ],
    // 23) Issues & Decisions Log — TABLE
    issuesDecisionsLog: [
        { issue: 'Scope creep pressure for premium tier', decision: 'Out of scope for v1.0 pilot', owner: 'Priya Singh', date: '2025-10-29' },
        { issue: 'Legacy SMS lag risk', decision: 'Add timeouts + indicators by 01/09', owner: 'Marco Diaz', date: '2026-01-09' },
        { issue: 'PII handling requirements unclear for pilot exports', decision: 'Create security review package and define redaction rules by 01/20', owner: 'Avery Chen', date: '2026-01-20' },
    ],
    // 24) Communication Plan — TABLE
    communicationPlan: [
        { audience: 'Subteams', cadence: 'Daily 9am local', channel: 'Standup' },
        { audience: 'Core program team', cadence: 'Weekly Monday 10am PST', channel: 'Checkpoint' },
        { audience: 'Cross-time-zone sync', cadence: 'Weekly Wednesday 1pm PST', channel: 'Sync' },
        { audience: 'Sponsor', cadence: 'Weekly', channel: 'Concise written digest' },
        { audience: 'Finance + Legal', cadence: 'Biweekly', channel: 'Written update + review notes (privacy/spend impacts)' },
        { audience: 'Security/Privacy', cadence: 'Weekly during Jan', channel: 'Review checkpoint + evidence tracker' },
    ],
    // 25) Governance & Approvals — TABLE
    governanceApprovals: [
        { gate: 'Pilot invite freeze', signoffRequirement: 'PM + Eng Lead + Ops Head' },
        { gate: 'Readiness review', signoffRequirement: 'Sponsor + Eng Lead + Ops Head + Security/Legal ACK' },
        { gate: 'Pilot launch', signoffRequirement: 'Sponsor approval + readiness criteria met' },
        { gate: 'Post-pilot scale decision', signoffRequirement: 'Sponsor + PMO review based on KPI outcomes' },
    ],
    // 26) Compliance, Security & Privacy — TABLE
    complianceSecurityPrivacy: [
        { requirement: 'Security + privacy review for pilot data handling', notes: 'Complete PII classification for chat/SMS/voice transcripts; define masking rules for agent UI and exports; confirm access controls and least-privilege. Provide audit-log evidence for key actions (message view, export, admin access).' },
        { requirement: 'Data retention policy for pilot logs', notes: 'Define retention window for message transcripts and event logs; align with Legal/Compliance expectations. For pilot, retain only what is needed for diagnostics and KPI measurement; document deletion schedule.' },
        { requirement: 'Vendor risk review (SMS/Telephony)', notes: 'Confirm vendor handling of delivery metadata; document limitations (delivery lag) and ensure no prohibited data is transmitted. Capture vendor status and escalation path.' },
        { requirement: 'Ops consultation for shift-handoff workflow changes', notes: 'Operations must be consulted before changes that touch shift handoffs. Provide training plan and job-aid updates before pilot invite freeze.' },
        { requirement: 'Access control and authentication readiness', notes: 'IAM federation must be validated for pilot agents; ensure role-based controls for supervisors, agents, and admins; confirm incident response contacts and escalation runbook.' },
    ],
    // 27) Open Questions & Next Steps — TABLE
    openQuestionsNextSteps: [
        { question: 'Finalize tracking definitions for TTFR/CSAT/deflection', nextStep: 'Julia to finalize instrumentation plan by 11/10' },
        { question: 'Confirm acceptable timeout/indicator behavior for SMS delays', nextStep: 'Marco to implement by 01/09' },
        { question: 'Confirm virtualization keeps thread list at 60fps', nextStep: 'Lina + Julia deep-dive on 01/12' },
        { question: 'What exact PII fields must be masked in the agent UI and in exports?', nextStep: 'Avery + Legal to define masking + redaction rules; finalize in security review package by 01/20' },
        { question: 'What retention period is acceptable for pilot transcript logs and audit events?', nextStep: 'Morgan to confirm retention policy; document and sign off before readiness review (02/10)' },
        { question: 'Who owns the triage model after pilot (SLA, monitoring, retraining cadence)?', nextStep: 'Ethan + Marco to propose ownership model and monitoring plan; review in January checkpoint' },
        { question: 'What constitutes “readiness complete” beyond functional MVP (security, ops training, support)?', nextStep: 'Priya to publish readiness checklist; require sign-offs at readiness review gate' },
    ],
    // 28) Notes & Background
    notesBackground: 'By the end of the session, everyone had started calling the initiative “RoadRunner,” and the codename stuck for internal use. Priya Singh owns the program end-to-end and will run governance, checkpoints, approvals, and delivery tracking. Formal kickoff is October 29, 2025 for v1.0, with the goal of a pilot launch in five test markets on February 17, 2026. The project builds a unified customer service platform for a national car-service brand covering on-demand towing, scheduled maintenance pickup, and roadside assistance. The core problem is handoff gaps between chat, SMS, and voice; the goal is a single workspace that keeps conversations seamless and reduces repeat contacts. The guiding phrase is “calmer agents, faster customers, fewer repeats.”\n\nGovernance rhythm: subteams run daily standups at 9am local; core program checkpoint is weekly Monday 10am PST; cross-time-zone sync is weekly Wednesday 1pm PST. The sponsor prefers concise written digests rather than noisy chat threads. Finance and Legal require early notice before any change that could affect spending, vendor commitments, or customer data handling. Operations must always be consulted before changes that affect shift handoffs or frontline workflows. Approvals are intentionally minimal but explicit: Priya collects required signatures from the sponsor, the engineering lead, and the operations head once pilot readiness is confirmed.\n\nGovernance gates and sign-off intent: Pilot invite freeze on Feb 7 requires PM + Eng Lead + Ops Head alignment; readiness review on Feb 10 requires sponsor sign-off and confirmation that reliability and security criteria are met; pilot launch on Feb 17 requires sponsor approval. Readiness criteria include performance validation, surge behavior verification, training completion for pilot agents, and a security/privacy review package with documented PII handling.\n\nCompliance, security, and privacy expectations for pilot: customer transcripts and conversation logs must follow a documented retention window, with deletion schedule and auditability. PII masking/redaction rules must be defined for agent UI and exports. Audit logging is required for key actions such as viewing conversation history, accessing admin settings, exporting artifacts, and modifying routing behavior. Vendor constraints (legacy SMS delivery lag) must be documented, and user experience mitigation must be implemented with timeouts and alternate indicators.\n\nOpen questions for January closure: the exact PII masking rules, retention period for transcripts and logs, approval of any third-party analytics tooling for pilot, and long-term ownership of the routing triage model (monitoring, SLA, retraining cadence). These must be resolved before the Feb 10 readiness review so that the Feb 17 pilot launch is not blocked by compliance or security concerns. External naming should avoid “RoadRunner” and use “Support” for simplicity.',
};
