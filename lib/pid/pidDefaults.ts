import type { PMOMaxPID } from '../../types';
import { computeDeterministicBudget } from '../deterministicBudget';

// Identity helper
function makeExample<T>(obj: T): T {
	return obj;
}

const today = new Date().toISOString().slice(0, 10);

function countMeaningfulRows(rows: any[], fields: string[]) {
	return (Array.isArray(rows) ? rows : []).filter((row) => {
		if (typeof row === 'string') return row.trim().length > 0;
		if (!row || typeof row !== 'object') return false;
		return fields.some((field) => String((row as any)?.[field] ?? '').trim().length > 0);
	}).length;
}

function ensureStrategicSections(pid: PMOMaxPID): PMOMaxPID {
	const out: any = { ...pid };
	const title = String(out?.titleBlock?.projectTitle || 'the project').trim();
	const summaryText = [
		out.executiveSummary,
		out.problemStatement,
		out.businessCaseExpectedValue,
		out.notesBackground,
	].filter(Boolean).join('\n');

	if (countMeaningfulRows(out.scopeInclusions, ['item', 'inclusion']) < 3) {
		const existing = Array.isArray(out.scopeInclusions) ? out.scopeInclusions : [];
		out.scopeInclusions = [
			...existing,
			'Core workflow design, build, validation, and controlled release for the initial production-ready scope.',
			'Reporting, traceability, and stakeholder-ready documentation needed to operate the solution after handoff.',
			'Operational readiness items such as access setup, monitoring, and launch support required for adoption.',
		].slice(0, Math.max(existing.length, 3));
	}

	if (countMeaningfulRows(out.scopeExclusions, ['item', 'exclusion']) < 2) {
		const existing = Array.isArray(out.scopeExclusions) ? out.scopeExclusions : [];
		out.scopeExclusions = [
			...existing,
			'Enterprise-wide transformation outside the first governed release window.',
			'Unplanned legacy re-platforming or unrelated feature requests not tied to the stated business objective.',
		].slice(0, Math.max(existing.length, 2));
	}

	if (countMeaningfulRows(out.constraints, ['constraint']) < 3) {
		const existing = Array.isArray(out.constraints) ? out.constraints : [];
		out.constraints = [
			...existing,
			{ constraint: 'Delivery must fit within the available team capacity and agreed release window without assuming additional headcount.' },
			{ constraint: 'Security, compliance, and access approvals must be completed before production rollout or external exposure.' },
			{ constraint: 'Dependencies on external systems, vendors, or stakeholder decisions can shift sequencing and must be surfaced early.' },
		].slice(0, Math.max(existing.length, 3));
	}

	if (countMeaningfulRows(out.risks, ['risk']) < 3) {
		const existing = Array.isArray(out.risks) ? out.risks : [];
		out.risks = [
			...existing,
			{ risk: 'Scope expansion after kickoff increases delivery effort without a matching timeline or budget adjustment.', probability: 'Medium', impact: 'High' },
			{ risk: 'Upstream dependencies or stakeholder review delays create idle time and compress downstream testing.', probability: 'Medium', impact: 'High' },
			{ risk: 'Security, compliance, or production-readiness findings late in the cycle require rework before launch.', probability: 'Medium', impact: 'High' },
		].slice(0, Math.max(existing.length, 3));
	}

	if (countMeaningfulRows(out.governanceApprovals, ['gate', 'signoffRequirement']) < 3) {
		const existing = Array.isArray(out.governanceApprovals) ? out.governanceApprovals : [];
		out.governanceApprovals = [
			...existing,
			{ gate: 'Scope, objectives, and success metrics baseline', signoffRequirement: 'Sponsor and delivery owner approval before detailed execution starts.' },
			{ gate: 'Architecture / solution design checkpoint', signoffRequirement: 'Engineering and platform review of design, dependencies, and operational approach.' },
			{ gate: 'Go-live readiness checkpoint', signoffRequirement: 'Security, operations, and business owner approval before release or external access.' },
		].slice(0, Math.max(existing.length, 3));
	}

	if (countMeaningfulRows(out.complianceSecurityPrivacy, ['requirement', 'notes']) < 3) {
		const existing = Array.isArray(out.complianceSecurityPrivacy) ? out.complianceSecurityPrivacy : [];
		out.complianceSecurityPrivacy = [
			...existing,
			{ requirement: 'Access control and least privilege', notes: 'Define who can view, edit, approve, and administer the solution before go-live.' },
			{ requirement: 'Data handling and retention', notes: 'Confirm whether project data contains confidential, regulated, or customer-sensitive content and document retention expectations.' },
			{ requirement: 'Operational logging and auditability', notes: 'Ensure key actions, decisions, and production changes can be traced for support and governance review.' },
		].slice(0, Math.max(existing.length, 3));
	}

	const budgetRows = Array.isArray(out.budgetCostBreakdown) ? out.budgetCostBreakdown : [];
	const hasUsableBudget = budgetRows.some((row: any) => Number(row?.totalCostUsd) > 0 || Number(row?.estimatedHours) > 0);
	if (!hasUsableBudget) {
		const computed = computeDeterministicBudget(out, summaryText);
		out.budgetCostBreakdown = computed.items;
		out.budgetSummary = computed.summary;
	} else if (!out.budgetSummary || !Number.isFinite(Number(out.budgetSummary?.totalCostUsd))) {
		const subtotalByRoleUsd = budgetRows.reduce((acc: Record<string, number>, row: any) => {
			const role = String(row?.role || 'Other');
			const total = Number(row?.totalCostUsd) || 0;
			acc[role] = (acc[role] || 0) + total;
			return acc;
		}, {});
		out.budgetSummary = {
			currency: 'USD',
			totalCostUsd: Object.values(subtotalByRoleUsd).reduce((sum, value) => sum + value, 0),
			subtotalByRoleUsd,
			notes: ['Budget summary derived from budget line items.'],
		};
	}

	return out as PMOMaxPID;
}

export function makeBlankPid(): PMOMaxPID {
	return {
		notesBackground: '',
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
		workBreakdownTasks: [],
		budgetCostBreakdown: [],
		resourcesTools: [],
		risks: [],
		milestones: [],
		mitigationsContingencies: [],
		issuesDecisionsLog: [],
		communicationPlan: [],
		governanceApprovals: [],
		complianceSecurityPrivacy: [],
		openQuestionsNextSteps: [],
	} as PMOMaxPID;
}

export function deepMerge<T>(base: T, patch: any): T {
	const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
	if (!isObj(base) || !isObj(patch)) return (patch ?? base) as T;

	const out: any = { ...(base as any) };
	for (const k of Object.keys(patch)) {
		const pv = patch[k];
		const bv = (base as any)[k];
		if (Array.isArray(pv)) out[k] = pv;
		else if (isObj(bv) && isObj(pv)) out[k] = deepMerge(bv, pv);
		else out[k] = pv;
	}
	return out as T;
}

export function normalizePid(input: any): PMOMaxPID {
	const blank = makeBlankPid();
	const x = input && typeof input === 'object' ? input : {};

	const titleBlock = x.titleBlock && typeof x.titleBlock === 'object' ? x.titleBlock : {};
	const normalizedTitleBlock = {
		projectTitle: String((titleBlock.projectTitle ?? titleBlock.title ?? '') || ''),
		subtitle: String((titleBlock.subtitle ?? 'Project Initiation Document') || 'Project Initiation Document'),
		generatedOn: String((titleBlock.generatedOn ?? titleBlock.date ?? today) || today),
		projectId: String((titleBlock.projectId ?? titleBlock.id ?? '') || ''),
	};

	const merged = deepMerge(blank, x);
	const out: any = { ...blank, ...merged };
	out.titleBlock = { ...blank.titleBlock, ...normalizedTitleBlock };

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

	out.projectSponsor = { ...blank.projectSponsor, ...(merged.projectSponsor || {}) };
	out.projectManagerOwner = { ...blank.projectManagerOwner, ...(merged.projectManagerOwner || {}) };

	out.executiveSummary = String(out.executiveSummary || '');
	out.problemStatement = String(out.problemStatement || '');
	out.businessCaseExpectedValue = String(out.businessCaseExpectedValue || '');
	out.timelineOverview = String(out.timelineOverview || '');
	out.notesBackground = String(out.notesBackground || '');

	out.workBreakdownTasks = (out.workBreakdownTasks || []).map((t: any, idx: number) => {
		const task = t && typeof t === 'object' ? { ...t } : {};
		task.id = String(task.id ?? task.name ?? `task-${idx + 1}`);
		task.name = String(task.name ?? `Task ${idx + 1}`);
		const rawDeps = task.deps ?? task.dependsOn ?? task.dependencies ?? [];
		const depsArr: string[] = [];
		if (Array.isArray(rawDeps)) {
			rawDeps.forEach((d: any) => {
				if (d !== null && d !== undefined) depsArr.push(String(d));
			});
		} else if (rawDeps !== null && rawDeps !== undefined) {
			String(rawDeps)
				.split(',')
				.forEach((s) => {
					const v = s.trim();
					if (v) depsArr.push(v);
				});
		}
		task.dependencies = Array.from(new Set(depsArr));
		return task;
	});

	return ensureStrategicSections(out as PMOMaxPID);
}

export function buildFallbackPidFromPrompt(prompt: string): PMOMaxPID {
	const title = String(prompt || '').trim().split(/\n/)[0].trim() || 'New Project';
	const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
	const d = (days: number) => new Date(start.getTime() + days * 86400000).toISOString().slice(0, 10);
	const pidId = `PID-${today.replace(/-/g, '')}-${Math.floor(start.getTime() / 1000)}`;

	return normalizePid(
		makeExample({
			titleBlock: {
				projectTitle: title,
				subtitle: 'Project Initiation Document',
				generatedOn: today,
				projectId: pidId,
			},
			executiveSummary: `This PID defines the scope, schedule, risks, governance, and delivery plan for "${title}".`,
			problemStatement: 'The current process is fragmented, manual, and difficult to measure end-to-end outcomes.',
			businessCaseExpectedValue:
				'Reduce cycle time and rework, improve quality and predictability, and deliver measurable ROI within 2 quarters.',
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
			scopeInclusions: ['Requirements & success metrics', 'Solution design & implementation', 'Testing, launch, adoption enablement'],
			scopeExclusions: ['Full enterprise rollout (post-MVP phase)', 'Major legacy system re-architecture'],
			assumptions: [
				{ assumption: 'Key stakeholders are available weekly for reviews' },
				{ assumption: 'Environments and access are provisioned within 1 week' },
			],
			constraints: [
				{ constraint: 'Delivery must fit within the agreed release window and currently available team capacity.' },
				{ constraint: 'Security, compliance, and access reviews must be closed before production launch.' },
				{ constraint: 'Dependencies on upstream data, systems, or stakeholder decisions can shift sequencing and require explicit escalation.' },
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
				{ name: 'Discovery & requirements', owner: 'PM', start: d(0), end: d(7), status: 'Planned', priority: 'High', kind: 'Task', dependencies: [] },
				{ name: 'Solution design', owner: 'Engineering', start: d(5), end: d(14), status: 'Planned', priority: 'High', kind: 'Task', dependencies: ['Discovery & requirements'] },
				{ name: 'Implementation', owner: 'Engineering', start: d(14), end: d(35), status: 'Planned', priority: 'High', kind: 'Task', dependencies: ['Solution design'] },
				{ name: 'Testing & validation', owner: 'QA', start: d(28), end: d(40), status: 'Planned', priority: 'Medium', kind: 'Task', dependencies: ['Implementation'] },
				{ name: 'Launch readiness', owner: 'PM', start: d(35), end: d(45), status: 'Planned', priority: 'High', kind: 'Milestone', dependencies: ['Testing & validation'] },
			],
			budgetCostBreakdown: [],
			budgetSummary: { currency: 'USD', totalCostUsd: 0, subtotalByRoleUsd: {}, notes: ['Deterministic budget will be synthesized from task structure and context.'] },
			resourcesTools: [
				{ resource: 'Project workspace', purpose: 'Planning & documentation' },
				{ resource: 'CI/CD pipeline', purpose: 'Build & deploy automation' },
				{ resource: 'Monitoring', purpose: 'Stability and alerting' },
			],
			risks: [
				{ risk: 'Stakeholder availability delays scope decisions and compresses downstream execution time.', probability: 'Medium', impact: 'High' },
				{ risk: 'Security, privacy, or integration findings surface late and require rework before launch.', probability: 'Medium', impact: 'High' },
				{ risk: 'Scope expansion after kickoff adds work without a matching budget or milestone adjustment.', probability: 'Medium', impact: 'High' },
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
				{ gate: 'Scope, objectives, and KPI baseline', signoffRequirement: 'Sponsor approval before detailed build execution starts.' },
				{ gate: 'Solution design / dependency checkpoint', signoffRequirement: 'Engineering and platform owner approval before implementation is considered locked.' },
				{ gate: 'Go-live readiness', signoffRequirement: 'Security, operations, and business owner signoff before release.' },
			],
			complianceSecurityPrivacy: [
				{ requirement: 'Access control', notes: 'Least privilege, role separation, and environment access review before go-live.' },
				{ requirement: 'Data handling', notes: 'Confirm retention, confidentiality, and any regulated or customer-sensitive data pathways.' },
				{ requirement: 'Auditability', notes: 'Operational and decision logs must be available for support, governance, and post-release review.' },
			],
			openQuestionsNextSteps: [
				{ question: 'What are the final success criteria and baseline metrics?', nextStep: 'Confirm baseline and targets in week-1 working session.' },
			],
			notesBackground: 'Background notes, assumptions, and context captured during kickoff. Update as decisions are made.',
		})
	);
}
