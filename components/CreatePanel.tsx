import { useState, useEffect, useMemo, useRef } from 'react';
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)
// (pad)

import type { PMOMaxPID } from '../types';
import NavPanel from './NavPanel';
import MainContent from './MainContent';
import { makeBlankPid, deepMerge, normalizePid, buildFallbackPidFromPrompt } from '../lib/pid/pidDefaults';
import { safeErrorMessage } from '../lib/safeError';

// Identity function for example creation
function makeExample<T>(obj: T): T {
	return obj;
              id: 'saas-ai-agent',
              label: 'SaaS AI Agent — Customer Success Automation',
              summary: 'An AI-driven agent to automate onboarding, ticket triage, and proactive outreach for a SaaS product, improving time-to-resolution and NPS.',
              pid: normalizePid({
                titleBlock: { projectTitle: 'SaaS AI Customer Success Agent', projectId: `PMO-${today}-SAAS`, generatedOn: today },
                executiveSummary: 'Build an integrated AI agent to streamline onboarding, auto-triage support tickets, and perform proactive outreach to reduce manual effort and improve customer satisfaction.',
                problemStatement: 'High support volume and inconsistent onboarding experiences result in long resolution times and lower customer satisfaction.',
                businessCaseExpectedValue: 'Reduce average first response time by 50%, lower ticket backlog by 40%, and increase NPS by 6 points within two quarters.',
                objectivesSmart: [
                  { objective: 'Automate 60% of common support queries', successMeasure: 'Auto-resolve rate ≥60%' },
                  { objective: 'Reduce time-to-onboard new customers', successMeasure: 'Onboarding completion time ≤3 days' },
                  { objective: 'Improve CSAT/NPS', successMeasure: 'NPS +6 points' },
                ],
                kpis: [
                  { kpi: 'First response time (hrs)', baseline: '12', target: '≤6' },
                  { kpi: 'Auto-resolve (%)', baseline: '0', target: '≥60' },
                  { kpi: 'NPS', baseline: '30', target: '36' },
        setLastError(safeErrorMessage(err) || 'Assistant failed');
                scopeInclusions: ['Onboarding flows automation', 'Ticket triage + suggested replies', 'Knowledge base integration', 'Analytics & reporting'],
                scopeExclusions: ['Billing system overhaul', 'Full CRM replacement'],
                assumptions: [{ assumption: 'Access to support logs and KB API' }],
                constraints: [{ constraint: 'No PHI stored; privacy-preserving defaults' }],
                dependencies: [
                  { dependency: 'KB API', teamOrSystem: 'Platform', status: 'Planned' },
                  { dependency: 'Support queue integration', teamOrSystem: 'Ops', status: 'Planned' },
                ],
                stakeholders: [
                  { name: 'Head of CS', role: 'Sponsor', contact: 'TBD' },
                  { name: 'Platform Lead', role: 'Owner', contact: 'TBD' },
                ],
                projectSponsor: { name: 'Head of CS', role: 'Sponsor' },
                projectManagerOwner: { name: 'Platform Lead', role: 'Owner' },
                teamRaci: [
                  { teamMember: 'PM', role: 'Delivery', responsible: 'Coordination' },
                  { teamMember: 'ML Eng', role: 'Modeling', responsible: 'Agent models' },
                  { teamMember: 'Platform', role: 'Integration', responsible: 'APIs' },
                ],
                timelineOverview: `Pilot (${d(0)}–${d(30)}), Iterate (${d(30)}–${d(75)}), Rollout (${d(75)}–${d(120)}).`,
                milestones: [
                  { milestone: 'Agent MVP', targetDate: d(30) },
                  { milestone: 'Pilot complete', targetDate: d(75) },
                  { milestone: 'Rollout start', targetDate: d(120) },
                ],
                workBreakdownTasks: [
                  { name: 'Define intent taxonomy', owner: 'ML Eng', start: d(0), end: d(7), status: 'Planned' },
                  { name: 'Integrate KB + ticketing', owner: 'Platform', start: d(7), end: d(21), status: 'Planned' },
                  { name: 'Pilot & evaluation', owner: 'CS', start: d(30), end: d(75), status: 'Planned' },
                ],
                budgetCostBreakdown: [
                  { task: 'ML development', role: 'Engineering', estimatedHours: 420, rateUsdPerHour: 160, complexityMultiplier: 1.1, totalCostUsd: 73920, justification: 'Baseline ML model build and tuning.', source: 'deterministic' },
                  { task: 'Integration', role: 'Engineering', estimatedHours: 180, rateUsdPerHour: 160, complexityMultiplier: 1.05, totalCostUsd: 30240, justification: 'API integration and workflows.', source: 'deterministic' },
                ],
                budgetSummary: { currency: 'USD', totalCostUsd: 104160, subtotalByRoleUsd: { Engineering: 104160 }, notes: ['Example budget baseline.'] },
                resourcesTools: [
                  { resource: 'KB API', purpose: 'Knowledge ingestion' },
                  { resource: 'Monitoring', purpose: 'Agent metrics' },
                ],
                risks: [
                  { risk: 'Incorrect triage', probability: 'Medium', impact: 'High' },
                ],
                mitigationsContingencies: [
                  { mitigation: 'Human-in-loop escalation threshold', contingency: 'Rollback to manual triage' },
                ],
                issuesDecisionsLog: [],
                communicationPlan: [
                  { audience: 'CS team', cadence: 'Daily during pilot', channel: 'Slack' },
                ],
                governanceApprovals: [],
                complianceSecurityPrivacy: [{ requirement: 'Data minimization', notes: 'Redact PII and follow retention rules' }],
                notesBackground: 'Pilot to validate approach and metrics before broader rollout.',
              }),
      },
      executiveSummary:
        'Launch a 12-week pilot that uses a smartphone-based assessment + guided rehab program for post-concussion symptoms, validated against a clinician-led baseline workflow.',
      problemStatement:
        'TBI patients often face fragmented follow-up care and limited access to rehab. Diaspora communities also face barriers around language, trust, and navigating health systems.',
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
    summary:
      'A multi-warehouse cold-chain modernization: IoT sensors, alerting, and SOP rollout to reduce spoilage and improve compliance across facilities.',
    pid: normalizePid({
      titleBlock: {
        projectTitle: 'Cold-Chain Modernization Program',
        subtitle: 'IoT monitoring + SOP rollout',
        projectId: `PMO-${today}-OPS`,
        owner: 'Hulumulu Labs',
        generatedOn: today,
      },
      executiveSummary:
        'Modernize cold-chain operations across 3 warehouses with temperature sensors, real-time alerting, and updated SOPs to reduce spoilage and ensure audit readiness.',
      problemStatement:
        'Current temperature logs are manual and inconsistent, leading to spoilage events and audit findings. We need automated monitoring and standardized procedures.',
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
  {
    id: 'fintech-aml',
    label: 'FinTech KYC/AML Automation — Compliance',
    summary:
      'Modernize onboarding and transaction monitoring with policy-as-code, audit-ready reporting, and human-in-the-loop reviews (highly regulated, security-first).',
    pid: normalizePid({
      titleBlock: {
        projectTitle: 'FinTech KYC/AML Automation Program',
        subtitle: 'Policy-as-code + human-in-the-loop reviews',
        projectId: `PMO-${today}-AML`,
        owner: 'Hulumulu Labs',
        generatedOn: today,
      },
      executiveSummary:
        'Implement a compliant onboarding and monitoring workflow that reduces false positives, speeds investigations, and produces audit-ready evidence packages on demand.',
      problemStatement:
        'Manual case reviews and inconsistent policy execution increase operational cost, slow onboarding, and expose regulatory/audit risk. Current tooling lacks end-to-end traceability.',
      goalsAndObjectives: [
        { objective: 'Reduce onboarding time for low-risk customers', successMetric: 'Median time-to-approve ≤ 10 minutes' },
        { objective: 'Lower false positives in transaction monitoring', successMetric: '≥25% reduction with no increase in missed alerts' },
        { objective: 'Audit readiness', successMetric: 'One-click export of evidence pack for any case' },
      ],
      scope: {
        inScope: ['Policy rules engine', 'Case management workflow', 'Role-based access controls', 'Evidence pack export', 'Model monitoring + drift checks'],
        outOfScope: ['Core ledger rewrite', 'Cross-border expansion policy changes (future phase)'],
      },
      deliverables: [
        { deliverable: 'Rules engine + policy library (v1)', dueDate: `${today}` },
        { deliverable: 'Case management UI + queues', dueDate: `${today}` },
        { deliverable: 'Audit evidence export templates', dueDate: `${today}` },
        { deliverable: 'Go-live runbook + monitoring', dueDate: `${today}` },
      ],
      milestones: [
        { milestone: 'Policy mapping complete', targetDate: `${today}`, owner: 'Compliance Lead' },
        { milestone: 'v1 in staging', targetDate: `${today}`, owner: 'Engineering' },
        { milestone: 'Pilot with analysts', targetDate: `${today}`, owner: 'Ops Lead' },
        { milestone: 'Regulatory-ready launch', targetDate: `${today}`, owner: 'Compliance Lead' },
      ],
      requirements: [
        { requirement: 'Immutable audit trail per case', priority: 'High' },
        { requirement: 'Least-privilege permissions for all roles', priority: 'High' },
        { requirement: 'Review queue SLAs + escalation', priority: 'Medium' },
      ],
      stakeholders: [
        { name: 'Compliance Lead', role: 'Regulatory owner', influence: 'High' },
        { name: 'Risk Officer', role: 'Controls oversight', influence: 'High' },
        { name: 'Ops Analysts', role: 'Daily case reviews', influence: 'High' },
        { name: 'Security', role: 'Access + logging', influence: 'High' },
      ],
      team: [
        { name: 'PM', role: 'Program delivery', allocation: '0.8 FTE' },
        { name: 'Backend Eng', role: 'Rules engine + APIs', allocation: '1.0 FTE' },
        { name: 'Frontend Eng', role: 'Case UI', allocation: '0.8 FTE' },
        { name: 'Compliance SME', role: 'Policy mapping', allocation: '0.3 FTE' },
      ],
      timeline: {
        phases: [
          { phase: 'Policy mapping + design', start: `${today}`, end: `${today}` },
          { phase: 'Build + integration', start: `${today}`, end: `${today}` },
          { phase: 'Pilot + tuning', start: `${today}`, end: `${today}` },
          { phase: 'Audit readiness + launch', start: `${today}`, end: `${today}` },
        ],
      },
      risks: [
        { risk: 'Regulatory interpretation drift', impact: 'High', mitigation: 'Versioned policy library + periodic compliance review.' },
        { risk: 'Access misconfiguration', impact: 'High', mitigation: 'RBAC templates + automated checks + quarterly audits.' },
        { risk: 'Alert fatigue', impact: 'Medium', mitigation: 'Threshold tuning + explainable prioritization + analyst feedback loop.' },
      ],
      assumptions: ['Existing KYC vendors can provide required signals.', 'Security team supports RBAC rollout.'],
      constraints: ['Zero tolerance for missing audit fields.', 'PII handling requires strict controls.'],
      dependencies: ['Policy sign-off', 'Security review', 'Vendor API access'],
      budgetAndCosts: {
        estimatedBudget: '$120,000',
        breakdown: [
          { item: 'Engineering', cost: '$75,000' },
          { item: 'Compliance + policy mapping', cost: '$20,000' },
          { item: 'Security review + hardening', cost: '$15,000' },
          { item: 'Ops training', cost: '$10,000' },
        ],
      },
      governance: { decisionMakers: ['Compliance Lead', 'Security Lead', 'PM'], cadence: 'Weekly steering + daily standup during pilot' },
      communications: { channels: ['Slack', 'Email', 'Weekly review'], reporting: 'Weekly KPIs + monthly control attestations' },
      complianceAndSecurity: {
        security: ['RBAC', 'Encryption at rest/in transit', 'Immutable audit log', 'Secrets management'],
        compliance: ['KYC/AML policy mapping', 'Retention policies', 'Evidence pack templates', 'Regular access reviews'],
      },
      qualityPlan: { tests: ['Policy unit tests', 'End-to-end case simulations'], acceptanceCriteria: ['Audit pack completeness', 'SLA adherence', 'No P1 security findings'] },
      operationalPlan: { supportModel: 'On-call during launch; analyst escalation path', monitoring: 'Case queue metrics + alert volumes + drift checks' },
      successCriteria: ['Onboarding SLA met', 'False positives reduced', 'Audit pass without major findings'],
      openQuestions: ['What is the initial risk scoring rubric?', 'Which evidence fields are mandatory per regulator?'],
      decisions: [{ decision: 'Launch with human-in-the-loop for all high-risk cases', date: `${today}` }],
      changeLog: [{ change: 'Initial PID created', date: `${today}`, author: 'CreateMode Examples' }],
      appendices: ['Policy mapping spreadsheet', 'Audit evidence template', 'RBAC matrix'],
    }),
  },
  {
    id: 'microgrid',
    label: 'Community Microgrid Deployment — Renewable',
    summary:
      'Design and deploy a solar + battery microgrid for a community facility, including permitting, commissioning, and an O&M plan.',
    pid: normalizePid({
      titleBlock: {
        projectTitle: 'Community Microgrid Deployment',
        subtitle: 'Solar + battery + critical-load resilience',
        projectId: `PMO-${today}-GRID`,
        owner: 'Hulumulu Holdings',
        generatedOn: today,
      },
      executiveSummary:
        'Deliver a resilient microgrid for a community facility, improving uptime during outages and lowering energy costs through optimized dispatch.',
      problemStatement:
        'Grid outages and peak pricing create reliability and cost issues for the facility. A microgrid can ensure critical loads remain powered and reduce annual energy spend.',
      goalsAndObjectives: [
        { objective: 'Deploy 250kW solar + 500kWh storage', successMetric: 'Commissioned and producing within 16 weeks' },
        { objective: 'Improve outage resilience for critical loads', successMetric: '≥8 hours autonomous critical-load support' },
        { objective: 'Reduce annual electricity cost', successMetric: '≥15% reduction vs baseline' },
      ],
      scope: {
        inScope: ['Site assessment', 'System design', 'Permitting', 'Installation', 'Commissioning', 'O&M plan'],
        outOfScope: ['Major building electrical rewire', 'Expansion to other buildings (future phase)'],
      },
      deliverables: [
        { deliverable: 'Electrical + civil design package', dueDate: `${today}` },
        { deliverable: 'Permits approved', dueDate: `${today}` },
        { deliverable: 'Installed solar + storage system', dueDate: `${today}` },
        { deliverable: 'Commissioning report + O&M plan', dueDate: `${today}` },
      ],
      milestones: [
        { milestone: 'Site survey complete', targetDate: `${today}`, owner: 'Engineering' },
        { milestone: 'Permits submitted', targetDate: `${today}`, owner: 'PM' },
        { milestone: 'Mechanical completion', targetDate: `${today}`, owner: 'Installer' },
        { milestone: 'Commissioning complete', targetDate: `${today}`, owner: 'Engineering' },
      ],
      requirements: [
        { requirement: 'Critical-load panel segregation', priority: 'High' },
        { requirement: 'Remote monitoring dashboard', priority: 'Medium' },
        { requirement: 'Safety + shutdown procedures', priority: 'High' },
      ],
      stakeholders: [
        { name: 'Facility Director', role: 'Sponsor', influence: 'High' },
        { name: 'Utility Interconnect', role: 'Approvals', influence: 'High' },
        { name: 'Community Board', role: 'Governance', influence: 'Medium' },
      ],
      team: [
        { name: 'PM', role: 'Delivery + permits', allocation: '0.6 FTE' },
        { name: 'Electrical Engineer', role: 'Design + commissioning', allocation: '0.5 FTE' },
        { name: 'Installer', role: 'Construction', allocation: '1.0 FTE' },
      ],
      timeline: {
        phases: [
          { phase: 'Assessment + design', start: `${today}`, end: `${today}` },
          { phase: 'Permitting + procurement', start: `${today}`, end: `${today}` },
          { phase: 'Install', start: `${today}`, end: `${today}` },
          { phase: 'Commission + handover', start: `${today}`, end: `${today}` },
        ],
      },
      risks: [
        { risk: 'Permit delays', impact: 'High', mitigation: 'Early utility engagement + complete submittals.' },
        { risk: 'Supply chain lead times', impact: 'Medium', mitigation: 'Pre-order long-lead items; qualify alternates.' },
        { risk: 'Construction safety incident', impact: 'High', mitigation: 'Safety plan + daily toolbox talks + audits.' },
      ],
      assumptions: ['Roof/ground space available for PV.', 'Utility interconnect requirements are known.'],
      constraints: ['Noise and access limits during facility hours.', 'Budget cap $350k.'],
      dependencies: ['Utility approval', 'Vendor procurement', 'Site access schedule'],
      budgetAndCosts: {
        estimatedBudget: '$350,000',
        breakdown: [
          { item: 'Solar panels + inverters', cost: '$170,000' },
          { item: 'Battery system', cost: '$120,000' },
          { item: 'Engineering + permits', cost: '$30,000' },
          { item: 'Installation labor', cost: '$30,000' },
        ],
      },
      governance: { decisionMakers: ['Facility Director', 'PM'], cadence: 'Weekly construction meeting' },
      communications: { channels: ['Email', 'Weekly meeting'], reporting: 'Weekly status + milestone sign-offs' },
      complianceAndSecurity: {
        security: ['Lockout/tagout procedures', 'Remote access controls for monitoring'],
        compliance: ['Electrical code compliance', 'Utility interconnect standards', 'Permit documentation'],
      },
      qualityPlan: { tests: ['Factory acceptance (if applicable)', 'Commissioning checklist'], acceptanceCriteria: ['Stable islanding', 'Monitoring online', 'As-built docs delivered'] },
      operationalPlan: { supportModel: 'Installer warranty + O&M contract', monitoring: 'Real-time performance + monthly reports' },
      successCriteria: ['Resilience target met', 'Cost reduction achieved', 'Commissioning pass'],
      openQuestions: ['Which loads are truly critical?', 'Preferred O&M vendor?'],
      decisions: [{ decision: 'Prioritize resilience for refrigeration + communications', date: `${today}` }],
      changeLog: [{ change: 'Initial PID created', date: `${today}`, author: 'CreateMode Examples' }],
      appendices: ['One-line diagram draft', 'Permitting checklist', 'Load study'],
    }),
  },
];


	const examples = EXAMPLES;
	// Show all 4 built-in examples
	const visibleExamples = examples;

	const applyExampleToDraft = (ex: ExampleConfig) => {
		setLastError(null);
		const nextPid = normalizePid(ex.pid);
		setDraftPid(nextPid); // Always set, even if same as previous
		setSelectedExampleId(ex.id);
		setChat([]); // Always clear chat on example select
		if (typeof onCreateModeEvent === 'function') onCreateModeEvent();
		// Always call onDraftChange and onApplyExample to update parent state
		if (typeof onDraftChange === 'function') onDraftChange(nextPid);
		if (typeof onApplyExample === 'function') onApplyExample(nextPid);
	};

	const callAssistant = async () => {
		const q = chatInput.trim();
		if (!q || isSending) return;

		setIsSending(true);
		setLastError(null);

		const nextChat: ChatMessage[] = [...chat, { role: 'user', content: q }];
		setChat(nextChat);
		setChatInput('');

		try {
			const controller = new AbortController();
			activeControllerRef.current = controller;
			// store on function-scoped ref for aborting
			activeControllerRef.current = controller;
			const res = await fetch('/api/ai/assistant', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: controller.signal,
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
			let aiMsg: ChatMessage = { role: 'assistant', content: '' };

			const nextPid = (data && typeof data === 'object' && (data.pid || data.pidData)) || null;
			const patch = (data && typeof data === 'object' && data.patch) || null;

			if (nextPid && typeof nextPid === 'object') {
				setDraftPid(normalizePid(nextPid));
			} else if (patch && typeof patch === 'object') {
				setDraftPid((prev) => normalizePid({ ...(prev || makeBlankPid()), ...(patch as any) }));
			}

			if (typeof data?.reply === 'string' && data.reply.trim().length > 0) {
				aiMsg.content = data.reply;
			} else {
				aiMsg.content = 'Done.';
			}

			setChat((prev) => [...prev, aiMsg]);

			// keep newest messages visible (expand/collapse removed)
						if (scrollerRef.current) {
							requestAnimationFrame(() => {
								try {
									scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
								} catch {}
							});
						}
		} catch (err: any) {
			if (err?.name === 'AbortError') {
				setLastError('Request aborted');
			} else {
        setLastError(safeErrorMessage(err) || 'Assistant failed');
			}
			setChat((prev) => [...prev, { role: 'assistant', content: '[Error: Assistant failed]' }]);
		} finally {
			activeControllerRef.current = null;
			setIsSending(false);
		}
	};

	const handleReset = () => {
		// Abort any in-flight assistant work
		try { activeControllerRef.current?.abort(); } catch {}
		activeControllerRef.current = null;
		setDraftPid(makeBlankPid());
		setChat([]);
		setSelectedExampleId(null);
		setChatInput('');
		setLastError(null);
	};

	// No expand/collapse logic remains

	return (
		<div className="w-full h-full overflow-y-auto p-1 md:p-2 relative flex flex-col" onDrop={handleFileDrop} onDragOver={e => e.preventDefault()}>
			<div className="rounded-lg border border-brand-border bg-brand-panel p-1.5 md:p-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex-1 min-w-[220px]">
						<div className="text-xl md:text-3xl font-extrabold text-white leading-tight">Create</div>
						<div className="text-sm md:text-[14px] font-semibold text-white/90 leading-snug">
							Click an example card (right) or describe what you want — the AI will draft a complete
							PID below.
						</div>
					</div>
					<div className="flex items-center gap-1.5 md:gap-2 flex-wrap mt-2 md:mt-0">
						{onHelp && (
							<button
								type="button"
								onClick={() => onHelp && onHelp('create-mode')}
								className="rounded-full bg-amber-500 px-2 py-1 text-xs md:text-sm font-semibold text-black hover:bg-amber-400"
							>
								? Help
							</button>
						)}
						<button
							type="button"
							onClick={handleReset}
							className="rounded-full bg-red-600 px-2 py-1 text-xs md:text-sm font-semibold text-white hover:bg-red-700 border border-red-500"
							title="Reset all fields and chat"
						>
							Reset
						</button>
					</div>
				</div>
			</div>

			{lastError && (
				<div className="rounded border border-red-500/60 bg-red-950/40 px-2 py-1 text-xs text-red-200">
					{lastError}
				</div>
			)}

			{/* Only show the assistant/chat and examples if not sending */}
			{!isSending && (
				<div className="mt-2 mb-4 rounded-lg border border-brand-border bg-black/10 p-1.5 sm:p-2 relative z-10 flex flex-col sm:flex-row sm:flex-nowrap gap-2" style={{overflow: 'visible', minHeight: 340}}>
					{/* Left: Assistant/chat */}
					<div className="flex-1 min-w-0 flex flex-col" style={{minWidth: 0}}>
						<div className="rounded-lg border border-brand-border bg-black/20 p-2 md:p-2.5 flex flex-col h-full" style={{minHeight: 220, maxHeight: 400, overflowY: 'auto'}}>
							<div className="flex items-center justify-between gap-1 md:gap-2">
								<div>
									<div className="text-lg md:text-xl font-extrabold text-white leading-tight">
										AI Create Assistant
									</div>
									<div className="text-sm md:text-[14px] font-semibold text-white/90 leading-snug">
										Tell me what you’re building, why it matters, key constraints, stakeholders,
										and target dates. I’ll draft a complete PID and keep the draft below updated as
										we refine it.
									</div>
								</div>
							</div>

							<div className="mt-2 flex flex-col gap-2 h-full">


								<div
									ref={scrollerRef}
									className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-10 max-h-60 pr-1"
								>
									{[...chat].reverse().map((m, idx) => (
										<div
											key={idx}
											className={`rounded border border-brand-border px-2 py-1.5 text-xs md:text-[13px] whitespace-pre-wrap ${
												m.role === 'assistant'
													? 'bg-brand-panel text-brand-text'
													: 'bg-black/40 text-white'
											}`}
										>
											{m.content}
										</div>
									))}
									{chat.length === 0 && (
										<div className="rounded border border-brand-border bg-black/20 px-3 py-2 text-sm md:text-base font-semibold text-white">
											Try: “Create a PID for a 3-month data platform migration with a hard security review gate
											and weekly stakeholder updates.”
										</div>
									)}
								</div>

								<div className="rounded-lg border border-amber-400/40 bg-black/60 p-2">
									<div className="text-xs md:text-[13px] font-extrabold text-white mb-1">
										Describe your project (Enter = send, Shift+Enter = newline)
									</div>
									<div className="flex items-end gap-1.5">
										<textarea
											value={chatInput}
											onChange={(e) => setChatInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && !e.shiftKey) {
													e.preventDefault();
													callAssistant();
												}
											}}
											rows={2}
											placeholder="Describe what you want to create…"
											className="flex-1 rounded border border-amber-300 bg-black px-3 py-2 text-base font-semibold text-amber-200 resize-none"
											style={{
												background: '#181200',
												color: '#f7b84b',
												fontSize: '1rem',
												fontWeight: 600,
												letterSpacing: '0.01em',
												borderColor: '#f7b84b',
											}}
										/>
										<button
											type="button"
											onClick={callAssistant}
											disabled={isSending || !chatInput.trim()}
											className={`rounded border px-3 py-2 text-xs md:text-[13px] font-extrabold transition ${
												isSending || !chatInput.trim()
													? 'border-brand-border bg-black/30 text-brand-text-secondary cursor-not-allowed'
													: 'border-amber-400/60 bg-amber-500 text-black hover:bg-amber-400'
											}`}
										>
											{isSending ? 'Sending…' : 'Send'}
										</button>
									</div>
								</div>
							</div>
						</div>

					{/* Right: Examples and navigation */}
					<div className="flex flex-col gap-2 items-stretch w-full sm:flex-none sm:w-[30%]" style={{ minWidth: 220, maxWidth: 420 }}>
						<div className="rounded-lg border border-brand-border bg-black/20 p-2 md:p-2.5 flex flex-col" style={{minHeight: 220, maxHeight: 320, overflowY: 'auto'}}>
							<div className="text-xs md:text-sm font-extrabold text-white tracking-wide" style={{position: 'sticky', top: 0, background: 'rgba(0,0,0,0.12)', zIndex: 2, paddingBottom: 4, marginBottom: 4, borderBottom: '1px solid #f7b84b'}}>
								Examples — Click to load
							</div>
							<div className="mt-2 flex flex-col gap-2 pb-0" style={{marginBottom: 0, paddingBottom: 0, minHeight: 120, maxHeight: 240, overflowY: 'auto'}}>
								{visibleExamples.map((ex, idx) => {
									const selected = ex.id === selectedExampleId;
									return (
										<button
											key={ex.id}
											type="button"
											onClick={() => applyExampleToDraft(ex)}
											className={`w-full text-left rounded-xl border-2 p-4 shadow-lg transition-all duration-100 ring-2 ring-transparent focus:outline-none focus:ring-amber-400/80 ${
												selected
													? 'border-amber-400 bg-amber-400 text-black ring-amber-400/80 scale-105'
													: 'border-slate-700 bg-black/80 hover:bg-amber-500/10 hover:border-amber-400 ring-slate-700/40 hover:ring-amber-400/30 text-white'
											} ${idx === visibleExamples.length - 1 ? 'mb-0' : ''}`}
											style={{ marginBottom: idx === visibleExamples.length - 1 ? 0 : 8, paddingBottom: 8, minHeight: 80 }}
											tabIndex={0}
											aria-label={`Load example: ${ex.label}`}
										>
											<div
												className={`font-extrabold text-base md:text-lg mb-1 ${
													selected ? 'text-black' : 'text-amber-400'
												}`}
											>
												{ex.label}
											</div>
											<div
												className={`text-xs md:text-sm leading-snug ${
													selected ? 'text-black/80' : 'text-amber-200/90'
												}`}
											>
												{ex.summary}
											</div>
										</button>
									);
								})}
								<div style={{minHeight: 24, flexShrink: 0}} />
							</div>
						</div>
						{/* Navigation panel always visible below examples */}
						<div className="flex-1 min-h-[180px] mt-2">
							<NavPanel pidData={draftPid as any} />
						</div>
					</div>
					</div>
				</div>
			)}

			{shouldShowPid(draftPid) && draftPid && (
				<div className="w-full rounded-lg border border-brand-border bg-brand-panel p-2 md:p-3 mt-4 relative z-0" style={{minHeight: 320}}>
					<MainContent pidData={draftPid as any} onHelp={onHelp} />
				</div>
			)}
		</div>
	);
};

export default CreateMode;
