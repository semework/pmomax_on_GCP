// components/CreateMode.tsx
import React, { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useRenderStats } from './useRenderStats';
import { safeErrorMessage } from '../lib/safeError';
import type { PMOMaxPID } from '../types';
import NavPanel from './NavPanel';
const CreateModeMainContent = React.lazy(() => import('./CreateModeMainContent'));
import { makeBlankPid, deepMerge, normalizePid, buildFallbackPidFromPrompt } from '../lib/pid/pidDefaults';
import { computeDeterministicBudget } from '../lib/deterministicBudget';

// Identity function for example creation
function makeExample<T>(obj: T): T {
	return obj;
}

const hashText = (input: string) => {
	let h = 0;
	const s = String(input || '');
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) | 0;
	}
	return (h >>> 0).toString(36);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const applyDeterministicBudget = (pid: PMOMaxPID): PMOMaxPID => {
	const { items, summary } = computeDeterministicBudget(pid as any);
	const rows = Array.isArray((pid as any)?.budgetCostBreakdown) ? (pid as any).budgetCostBreakdown : [];
	const hasSummary = pid?.budgetSummary && typeof pid.budgetSummary === 'object';
	return {
		...pid,
		budgetCostBreakdown: rows.length > 0 ? rows : items,
		budgetSummary: hasSummary ? pid.budgetSummary : summary,
	};
};

type Role = 'user' | 'assistant';
type ChatMessage = { role: Role; content: string };

type ExampleConfig = {
	id: string;
	label: string;
	summary: string;
	pid: PMOMaxPID;
};

// Use future-dated timelines for new projects/Gantt entries
const today = new Date().toISOString().slice(0, 10);

export interface CreateModeProps {
	initialData?: PMOMaxPID | null;
	onCancel?: () => void;
	onHelp?: (context?: string) => void;
	onShowNav?: () => void;
	onCreateModeEvent?: () => void;
	onApplyExample?: (pid: PMOMaxPID) => void;
	aiModel?: string;
	onDraftChange?: (pid: PMOMaxPID) => void;
	onExportPdf?: (pid: PMOMaxPID) => void;
	onExportWord?: (pid: PMOMaxPID) => void;
	onExportJson?: (pid: PMOMaxPID) => void;
	onExportZip?: (pid: PMOMaxPID) => void;
	onCreateMode?: () => void;
}

// PID utilities moved to lib/pid/pidDefaults.ts

const shouldShowPid = (pid: PMOMaxPID | null) => {
	if (!pid || !pid.titleBlock) return false;
	return String(pid.titleBlock.projectTitle || '').trim().length > 0;
};

export const CreateMode = (props: CreateModeProps) => {
	useRenderStats('CreateMode', 8); // Warn if more than 8 renders/sec
	 const {
	 	initialData,
	 	onHelp,
	 	onCreateModeEvent,
	 	aiModel,
	 	onDraftChange = (_pid: PMOMaxPID) => {},
	 	onApplyExample,
	 } = props;

	 // Track if reset has been triggered
	 const [hasReset, setHasReset] = useState(false);

	// UI / interaction state
	const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
	const [draftPid, setDraftPid] = useState<PMOMaxPID | null>(null);
	const [chatInput, setChatInput] = useState<string>('');
	const [chat, setChat] = useState<ChatMessage[]>([]);
	const [isSending, setIsSending] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);
	const [stickyCollapsed, setStickyCollapsed] = useState<boolean>(false); // Initialize as false
	const [isBudgeting, setIsBudgeting] = useState(false);
	const lastBudgetRequestKey = useRef<string>('');
	const budgetInFlightKey = useRef<string>('');
	const assistantInFlightKey = useRef<string>('');
	const lastAssistantRequestKey = useRef<string>('');

	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const activeControllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		console.log('[CreateMode] mounted (UI visible)');
		if (typeof window !== 'undefined') {
			if (window.innerWidth < 768) setStickyCollapsed(true);
		}
		return () => console.log('[CreateMode] unmounted');
	}, []);

	// Do NOT pre-populate a draft PID on mount — keep it null until the user
	// selects an example, drops a file, or the assistant generates content.

	 useEffect(() => {
	 	if (hasReset) return; // Prevent re-population after reset
	 	if (!initialData) return;
	 	const next = applyDeterministicBudget(normalizePid(initialData));
	 	setDraftPid(next);
	 }, [initialData, hasReset]);

	useEffect(() => {
		if (onDraftChange && draftPid) onDraftChange(draftPid);
	}, [draftPid, onDraftChange]);

	// Examples (stable via useMemo)
	const EXAMPLES: ExampleConfig[] = useMemo(() => {
		const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const d = (days: number) => new Date(start.getTime() + days * 86400000).toISOString().slice(0, 10);

		return [
			{
				id: 'saas-ai-agent',
				label: 'SaaS AI Agent — Customer Success Automation',
				summary:
					'An AI-driven agent to automate onboarding, ticket triage, and proactive outreach for a SaaS product, improving time-to-resolution and NPS.',
				pid: applyDeterministicBudget(normalizePid({
					titleBlock: { projectTitle: 'SaaS AI Customer Success Agent', projectId: `PMO-${today}-SAAS`, generatedOn: today },
					executiveSummary:
						'Build an integrated AI agent to streamline onboarding, auto-triage support tickets, and perform proactive outreach to reduce manual effort and improve customer satisfaction.',
					problemStatement:
						'High support volume and inconsistent onboarding experiences result in long resolution times and lower customer satisfaction.',
					businessCaseExpectedValue:
						'Reduce average first response time by 50%, lower ticket backlog by 40%, and increase NPS by 6 points within two quarters.',
					objectivesSmart: [
						{ objective: 'Automate 60% of common support queries', successMeasure: 'Auto-resolve rate ≥60%' },
						{ objective: 'Reduce time-to-onboard new customers', successMeasure: 'Onboarding completion time ≤3 days' },
						{ objective: 'Improve CSAT/NPS', successMeasure: 'NPS +6 points' },
					],
					kpis: [
						{ kpi: 'First response time (hrs)', baseline: '12', target: '≤6' },
						{ kpi: 'Auto-resolve (%)', baseline: '0', target: '≥60' },
						{ kpi: 'NPS', baseline: '30', target: '36' },
					],
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
					budgetCostBreakdown: [],
					resourcesTools: [
						{ resource: 'KB API', purpose: 'Knowledge ingestion' },
						{ resource: 'Monitoring', purpose: 'Agent metrics' },
					],
					risks: [{ risk: 'Incorrect triage', probability: 'Medium', impact: 'High' }],
					mitigationsContingencies: [{ mitigation: 'Human-in-loop escalation threshold', contingency: 'Rollback to manual triage' }],
					issuesDecisionsLog: [],
					communicationPlan: [{ audience: 'CS team', cadence: 'Daily during pilot', channel: 'Slack' }],
					governanceApprovals: [],
					complianceSecurityPrivacy: [{ requirement: 'Data minimization', notes: 'Redact PII and follow retention rules' }],
					notesBackground: 'Pilot to validate approach and metrics before broader rollout.',
				})),
			},
			{
				id: 'cold-chain',
				label: 'Cold-Chain Logistics Upgrade — Ops',
				summary:
					'A multi-warehouse cold-chain modernization: sensors, alerting, and SOP rollout to reduce spoilage and improve audit readiness.',
				pid: applyDeterministicBudget(normalizePid({
					titleBlock: { projectTitle: 'Cold-Chain Modernization Program', projectId: `PMO-${today}-OPS`, generatedOn: today },
					executiveSummary:
						'Modernize cold-chain operations across 3 warehouses with monitoring, alerting, and SOP updates to reduce spoilage and improve compliance.',
					problemStatement:
						'Manual temperature logs are inconsistent, contributing to spoilage and audit findings. We need automated monitoring and standardized procedures.',
					businessCaseExpectedValue:
						'Reduce spoilage and rework, improve audit readiness, and increase reliability of cold storage across facilities.',
					objectivesSmart: [
						{ objective: 'Deploy sensors + gateways to 3 warehouses', successMeasure: '≥95% coverage of cold storage zones' },
						{ objective: 'Reduce spoilage events', successMeasure: '≥30% reduction vs baseline quarter' },
						{ objective: 'Improve compliance readiness', successMeasure: 'Zero major findings in next audit' },
					],
					kpis: [
						{ kpi: 'Spoilage events', baseline: '10/qtr', target: '≤7/qtr' },
						{ kpi: 'Coverage (%)', baseline: '0%', target: '≥95%' },
						{ kpi: 'Major audit findings', baseline: '2', target: '0' },
					],
					scopeInclusions: ['Sensor procurement', 'Gateway installation', 'Alerting rules', 'SOP updates', 'Training + drills'],
					scopeExclusions: ['Replacing refrigeration hardware', 'ERP overhaul'],
					assumptions: [{ assumption: 'Warehouses permit installation windows' }],
					constraints: [{ constraint: 'Budget capped at $80k; no downtime >2 hours per zone' }],
					dependencies: [
						{ dependency: 'Procurement approvals', teamOrSystem: 'Finance', status: 'Planned' },
						{ dependency: 'Network changes', teamOrSystem: 'IT', status: 'Planned' },
					],
					stakeholders: [
						{ name: 'Operations Lead', role: 'Program sponsor', contact: 'TBD' },
						{ name: 'Compliance Officer', role: 'Audit readiness', contact: 'TBD' },
					],
					projectSponsor: { name: 'Ops Lead', role: 'Sponsor' },
					projectManagerOwner: { name: 'Program Manager', role: 'Owner' },
					teamRaci: [
						{
							teamMember: 'PM',
							role: 'Delivery',
							responsible: 'Plan',
							accountable: 'Sponsor',
							consulted: 'Ops',
							informed: 'Stakeholders',
						},
						{ teamMember: 'IT', role: 'Network', responsible: 'Connectivity', accountable: 'Uptime', consulted: 'Ops', informed: 'PM' },
					],
					timelineOverview: `Vendor selection (${d(0)}–${d(10)}), Install (${d(10)}–${d(24)}), SOP rollout (${d(24)}–${d(38)}), Stabilization (${d(38)}–${d(52)}).`,
					milestones: [
						{ milestone: 'Vendor selected', targetDate: d(10) },
						{ milestone: 'All warehouses live', targetDate: d(24) },
						{ milestone: 'Internal audit pass', targetDate: d(52) },
					],
					workBreakdownTasks: [
						{ name: 'Vendor selection', owner: 'Ops', start: d(0), end: d(10), status: 'Planned', priority: 'High', kind: 'Task', dependencies: [] },
						{
							name: 'Sensor installation',
							owner: 'Field Tech',
							start: d(10),
							end: d(24),
							status: 'Planned',
							priority: 'High',
							kind: 'Task',
							dependencies: ['Vendor selection'],
						},
						{
							name: 'SOP rollout + training',
							owner: 'Compliance',
							start: d(24),
							end: d(38),
							status: 'Planned',
							priority: 'High',
							kind: 'Task',
							dependencies: ['Sensor installation'],
						},
					],
					budgetCostBreakdown: [],
					resourcesTools: [
						{ resource: 'IoT dashboard', purpose: 'Monitoring + alerting' },
						{ resource: 'SOP docs', purpose: 'Compliance + training' },
					],
					risks: [
						{ risk: 'Calibration errors', probability: 'Medium', impact: 'High' },
						{ risk: 'Network coverage gaps', probability: 'Medium', impact: 'Medium' },
					],
					mitigationsContingencies: [
						{ mitigation: 'Calibration SOP + monthly checks', contingency: 'Replace drift devices quickly' },
						{ mitigation: 'Site survey + repeaters', contingency: 'Adjust placement and add gateways' },
					],
					issuesDecisionsLog: [{ date: today, issue: 'Sampling interval', decision: '5-minute interval', owner: 'Ops Lead' }],
					communicationPlan: [
						{ audience: 'Warehouse managers', cadence: 'Weekly', channel: 'Ops standup' },
						{ audience: 'Leadership', cadence: 'Biweekly', channel: 'Email KPI report' },
					],
					governanceApprovals: [{ gate: 'Go-live', signoffRequirement: 'Ops + Compliance approval' }],
					complianceSecurityPrivacy: [{ requirement: 'Log retention', notes: 'Retain temperature logs per policy and audit needs' }],
					openQuestionsNextSteps: [{ question: 'Alert thresholds to minimize false positives?', nextStep: 'Tune thresholds during stabilization' }],
					notesBackground: 'Focus on audit readiness and reduction of spoilage through automation + SOP adoption.',
				})),
			},
		];
	}, []);

	const visibleExamples = EXAMPLES.slice(0, 2);

	const applyExampleToDraft = (ex?: ExampleConfig | null) => {
		try {
			activeControllerRef.current?.abort();
		} catch {}
		activeControllerRef.current = null;

		if (!ex || !ex.id) {
			setLastError('Invalid example selected');
			return;
		}

		setLastError(null);
		const nextPid = applyDeterministicBudget(normalizePid(ex.pid));
		setDraftPid(nextPid);
		setSelectedExampleId(ex.id);
		setChat([]);
		setIsBudgeting(false);

		if (typeof onCreateModeEvent === 'function') onCreateModeEvent();
		if (typeof onDraftChange === 'function') onDraftChange(nextPid);
		if (typeof onApplyExample === 'function') onApplyExample(nextPid);
	};

	const requestBudgetForPid = async (pid: PMOMaxPID, contextText = '') => {
		if (!pid || isBudgeting) return;
		const baselinePid = applyDeterministicBudget(normalizePid(pid));
		setDraftPid(baselinePid);
		const key = `${pid?.titleBlock?.projectTitle || ''}|${pid?.timelineOverview || ''}|${pid?.notesBackground || ''}`;
		const budgetKey = `${hashText(key)}:${hashText(contextText || '')}`;
		if (lastBudgetRequestKey.current === budgetKey) return;
		if (budgetInFlightKey.current === budgetKey) return;
		lastBudgetRequestKey.current = budgetKey;
		budgetInFlightKey.current = budgetKey;

		const fallbackContext = [
			contextText,
			pid?.notesBackground || '',
			pid?.executiveSummary || '',
			pid?.problemStatement || '',
			pid?.timelineOverview || '',
			Array.isArray((pid as any)?.teamRaci) ? (pid as any).teamRaci.map((r: any) => `${r?.role || ''} ${r?.teamMember || ''}`.trim()).filter(Boolean).join('; ') : '',
			Array.isArray((pid as any)?.resourcesTools) ? (pid as any).resourcesTools.map((r: any) => r?.resource || '').join('; ') : '',
		].filter(Boolean).join('\n');

		setIsBudgeting(true);
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		try {
			const controller = new AbortController();
			timeoutId = setTimeout(() => controller.abort('Timeout'), 60_000);
			const retryDelays = [400, 1200];
			let attempt = 0;
			let res: Response | null = null;
			while (true) {
				res = await fetch('/api/ai/budget', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					signal: controller.signal,
					body: JSON.stringify({ pidData: baselinePid, contextText: fallbackContext, model: aiModel || undefined }),
				});
				if (res.status === 429 && attempt < retryDelays.length) {
					await sleep(retryDelays[attempt]);
					attempt += 1;
					continue;
				}
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
				}
				break;
			}
			const data = await res.json().catch(() => ({}));
			if (data && typeof data === 'object' && (data as any).pid) {
				setDraftPid(applyDeterministicBudget(normalizePid((data as any).pid)));
			}
			// Remove budget warning: always assume budget is present for example/created PIDs
		} catch (err: any) {
			const isTimeout = /timed\s*out|timeout/i.test(String(err?.message || err));
			setLastError(isTimeout ? 'Budget enrichment timed out — using deterministic baseline.' : (safeErrorMessage(err) || 'Budget generation failed'));
		} finally {
			try {
				if (timeoutId) clearTimeout(timeoutId);
			} catch {}
			setIsBudgeting(false);
			if (budgetInFlightKey.current === budgetKey) budgetInFlightKey.current = '';
		}
	};

	useEffect(() => {
		if (!draftPid) return;
		const rows = Array.isArray((draftPid as any).budgetCostBreakdown) ? (draftPid as any).budgetCostBreakdown : [];
		const isDeterministicOnly = rows.length > 0 && rows.every((r: any) => r?.source === 'deterministic');
		if (rows.length > 0 && !isDeterministicOnly) return;
		requestBudgetForPid(draftPid, draftPid.notesBackground || '');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draftPid]);

	const callAssistant = async () => {
		const q = chatInput.trim();
		if (!q || isSending) return;

		// Simple gibberish / accidental key-mash detection (e.g., "gggg")
		const compact = q.toLowerCase().replace(/[^a-z0-9]/g, '');
		const repeated = compact.length > 0 && /^([a-z0-9])\1+$/.test(compact);
		const commonShort = new Set(['hi', 'hey', 'yo', 'ok', 'yes', 'no']);
		if ((repeated && compact.length <= 8) || (compact.length <= 2 && !commonShort.has(compact))) {
			const nextChat: ChatMessage[] = [...chat, { role: 'user', content: q }, { role: 'assistant', content: "I didn't understand that. Try a full sentence like: \"Create a PID for a 3-month data platform migration.\"" }];
			setChat(nextChat);
			setChatInput('');
			return;
		}
		const assistantKey = hashText(
			JSON.stringify({
				q,
				model: aiModel || '',
				pidTitle: draftPid?.titleBlock?.projectTitle || '',
			}),
		);
		if (assistantInFlightKey.current === assistantKey || lastAssistantRequestKey.current === assistantKey) return;
		assistantInFlightKey.current = assistantKey;

		setIsSending(true);
		setLastError(null);

		const nextChat: ChatMessage[] = [...chat, { role: 'user', content: q }];
		setChat(nextChat);
		setChatInput('');

			// Smart, create-focused assistant logic
			// Only route true non-create tasks (parse/import/export) to the left panel.
			// Refinement requests (objectives/timeline/risk) should be handled here.
			const referToLeftPanel = /parse|parsing|export|load|import|sidebar|left panel|other tool/i;
		const createIntent = /create|draft|start|initiate|new pid|project idea|project plan|project initiation|help me create|generate/i;
		let customReply = null;
		if (referToLeftPanel.test(q) && !createIntent.test(q)) {
				customReply = "I'm your Create Assistant. I draft and refine new Project Initiation Documents (PIDs) here. For importing/parsing files or exporting PDF/Word/JSON, use the tools in the left panel.";
		} else if (/what do you do|who are you|your purpose|help/i.test(q)) {
			customReply = "I'm your AI assistant for project creation. I help you draft, structure, and refine new Project Initiation Documents (PIDs) from scratch or from your ideas. Ask me to create a PID, suggest objectives, generate timelines, or summarize your draft. For parsing or editing existing PIDs, use the left panel tools.";
		}

		try {
			if (customReply) {
				setChat((prev) => [...prev, { role: 'assistant', content: customReply! }]);
			} else {
				const controller = new AbortController();
				activeControllerRef.current = controller;

				const retryDelays = [400, 1200];
				let attempt = 0;
				let res: Response | null = null;
				while (true) {
					res = await fetch('/api/ai/assistant', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						signal: controller.signal,
						body: JSON.stringify({
							messages: nextChat.map((m) => ({ role: m.role, content: m.content })),
							pidData: draftPid || makeBlankPid(),
							model: aiModel || undefined,
							appState: {
								mode: 'create',
								stickyCollapsed,
								hasDraftPid: Boolean(draftPid),
								selectedExampleId,
							},
						}),
					});
					if (res.status === 429 && attempt < retryDelays.length) {
						await sleep(retryDelays[attempt]);
						attempt += 1;
						continue;
					}
					if (!res.ok) {
						const t = await res.text().catch(() => '');
						throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
					}
					break;
				}

				const data = await res.json().catch(() => ({}));
				const nextPid = (data && typeof data === 'object' && ((data as any).pid || (data as any).pidData)) || null;
				const patch = (data && typeof data === 'object' && (data as any).patch) || null;

				if (nextPid && typeof nextPid === 'object') {
					setDraftPid(applyDeterministicBudget(normalizePid(nextPid)));
				} else if (patch && typeof patch === 'object') {
					setDraftPid((prev) => applyDeterministicBudget(normalizePid(deepMerge(prev || makeBlankPid(), patch))));
				}

				const reply =
					typeof (data as any)?.reply === 'string' && String((data as any).reply).trim().length > 0
						? String((data as any).reply)
						: 'Done.';

				setChat((prev) => [...prev, { role: 'assistant', content: reply }]);
				lastAssistantRequestKey.current = assistantKey;

				if (scrollerRef.current) {
					try {
						scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
					} catch {}
				}
			}
		} catch (err: any) {
			if (err?.name === 'AbortError') setLastError('Request aborted');
			else setLastError(safeErrorMessage(err) || 'Assistant failed');
			setChat((prev) => [...prev, { role: 'assistant', content: '[Error: Assistant failed]' }]);
		} finally {
			activeControllerRef.current = null;
			setIsSending(false);
			if (assistantInFlightKey.current === assistantKey) assistantInFlightKey.current = '';
		}
	};

	 const handleReset = () => {
	 	try {
	 		activeControllerRef.current?.abort();
	 	} catch {}
	 	activeControllerRef.current = null;

		// Only clear CreateMode state, not main PID
		setDraftPid(null);
		setChat([]);
		setSelectedExampleId(null);
		setChatInput('');
		setLastError(null);
		setStickyCollapsed(false); // Always show create area after reset
		setHasReset(false); // Allow new PID creation after reset
		// Simulate pressing Create in left panel
		if (typeof props.onCreateMode === 'function') props.onCreateMode();
	 };

	const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setLastError(null);

		try {
			const items = e.dataTransfer?.files;
			if (!items || items.length === 0) return;

			const f = items[0];
			const text = await f.text();

			// Try JSON parse first
			try {
				const parsed = JSON.parse(text);
				if (parsed && typeof parsed === 'object') {
					const norm = applyDeterministicBudget(normalizePid(parsed));
					setDraftPid(norm);
					if (typeof onDraftChange === 'function') onDraftChange(norm);
					return;
				}
			} catch {}

			// Fallback: treat file text as prompt
			const seeded = buildFallbackPidFromPrompt(text.slice(0, 1000));
			setDraftPid(seeded);
			if (typeof onDraftChange === 'function') onDraftChange(seeded);
		} catch (err: any) {
			setLastError(safeErrorMessage(err) || 'Failed to import file');
		}
	};

	// Only render a PID when we actually have a draft; otherwise pass null
	const pidToRender = draftPid;

	return (
		<div
			className="w-full h-full min-h-0 flex flex-col p-1 md:p-2 relative"
			onDrop={handleFileDrop}
			onDragOver={(e) => e.preventDefault()}
		>
			<div className="rounded-lg border border-brand-border bg-brand-panel p-2 md:p-3">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<div className="text-xl md:text-3xl font-extrabold text-white leading-tight">Create</div>
						<div className="text-sm md:text-[14px] font-semibold text-white/90 leading-snug">
							Click an example card (right) or describe what you want — the AI will draft a complete PID below.
						</div>
					</div>
					<div className="flex items-center gap-1.5 md:gap-2 flex-wrap mt-1 md:mt-0 w-full md:w-auto">
						{onHelp && (
							<button
								type="button"
								onClick={() => onHelp('create-mode')}
								className="rounded-full bg-amber-500 px-2 py-1 text-xs md:text-sm font-semibold text-black hover:bg-amber-400"
							>
								? Help
							</button>
						)}
						<button
							type="button"
							onClick={() => {
								// Reset to create view: clear PID, chat, input, errors, and keep user in create area
								setDraftPid(null);
								setSelectedExampleId(null);
								setChat([]);
								setChatInput('');
								setStickyCollapsed(false);
								setLastError(null);
								setHasReset(true);
								if (typeof onDraftChange === 'function') onDraftChange(null as any);
							}}
							className="rounded-full bg-red-600 px-2 py-1 text-xs md:text-sm font-semibold text-white hover:bg-red-700 border border-red-500"
							title="Reset Create page fully"
						>
							Reset
						</button>
					</div>
				</div>
			</div>

			{lastError && (
				<div className="mt-2 rounded border border-red-500/60 bg-red-950/40 px-2 py-1 text-xs text-red-200">
					{lastError}
				</div>
			)}

			{/* TOP: Assistant + Examples (always visible, sticky) */}
			<div
				className="mt-2 mb-3 rounded-lg border border-brand-border bg-black/10 p-2 md:p-2.5 relative z-30 md:sticky md:top-0 flex flex-col md:flex-row md:flex-nowrap gap-2 items-stretch"
				   style={{ overflow: 'visible', WebkitFontSmoothing: 'antialiased' }}
			   >
				   {/* Left: Assistant/chat */}
				   <div style={{ flex: '1 1 auto', minWidth: 0 }} className="flex flex-col w-full h-full">
					   <div
						   className="rounded-lg border border-brand-border bg-black/20 p-2 md:p-2.5 flex flex-col h-full min-h-0"
						   style={{ overflow: 'hidden' }}
					   >
						   <div className="flex items-center gap-4 mb-2">
							   <div className="text-lg md:text-xl font-extrabold text-white leading-tight">AI Chat Agent</div>
						   </div>
						   {/* Removed repeated AI assistant intro and bullet list */}
						   <div className="mt-2 flex flex-col gap-2 h-full justify-between min-h-0">
							   {/* Chat messages */}
							   {!stickyCollapsed && (
								   <div
									   ref={scrollerRef}
									   className="flex flex-col gap-1 flex-1 min-h-8 pr-1 overflow-y-auto scroll-smooth max-h-[240px] md:max-h-[500px]"
									   style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
								   >
									   {chat.map((m, idx) => {
										   const isUser = m.role === 'user';
										   return (
											   <div
												   key={`${m.role}-${idx}`}
												   className={`rounded-lg border p-2 text-sm md:text-sm font-semibold leading-snug whitespace-pre-wrap ${
													   isUser
														   ? 'border-slate-700/70 bg-black/30 text-slate-100'
														   : 'border-amber-400/40 bg-black/60 text-amber-100'
												   }`}
											   >
												   {m.content}
											   </div>
										   );
									   })}
								   {chat.length === 0 && (
									   <div className="rounded border border-brand-border bg-black/20 px-3 py-2 text-sm md:text-base font-medium text-white leading-snug">
										 <div className="mb-1">
											 Use the AI assistant to draft, summarize, or refine your project. Try these prompts:
										 </div>
										 <ul className="list-disc ml-5 mt-1 text-sm md:text-base text-amber-200">
											 <li>"Create a PID for a 90-day data platform migration with a security review gate."</li>
											 <li>"Add 3 SMART objectives and KPIs for this project."</li>
											 <li>"Shift the timeline by 2 weeks and update milestones."</li>
											 <li>"Rewrite objective #2 to be measurable and shorter."</li>
										 </ul>
									   </div>
								   )}
								   </div>
							   )}
							   {/* Input box */}
							   {!stickyCollapsed && (
								   <div className="rounded-lg border border-amber-400/40 bg-black/60 p-3 mt-2">
									   <div className="text-base md:text-lg font-extrabold text-white mb-2">
										   Type your message and press Enter (Shift+Enter for newline)
									   </div>
									   <div className="flex items-end gap-2">
										   <input
											   type="text"
											   className="flex-1 px-4 py-2 rounded-xl border-2 border-amber-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/70 font-semibold placeholder:text-amber-200/60 text-amber-200 text-lg md:text-xl bg-black/90"
											   placeholder="Ask the AI assistant..."
											   value={chatInput}
											   onChange={e => setChatInput(e.target.value)}
											   onKeyDown={e => {
												   if (e.key === 'Enter' && !e.shiftKey) {
													   e.preventDefault();
													   callAssistant();
												   }
											   }}
											   disabled={isSending}
											   aria-label="Ask the AI assistant"
										   />
										   <button
											   type="button"
											   className="px-4 py-2 rounded-xl bg-amber-400 text-black font-extrabold hover:bg-amber-300 active:bg-amber-500 border border-amber-700 shadow-lg text-lg md:text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
											   style={{ letterSpacing: '0.04em' }}
											   disabled={isSending || !chatInput.trim()}
											   onClick={callAssistant}
										   >
											   Send
										   </button>
									   </div>
								   </div>
							   )}
						   </div>
					   </div>
				   </div>

			   	{/* Center: single Hide/Show button (replaces duplicates) */}
			   	{shouldShowPid(pidToRender) && (
			   		<div className="flex items-start justify-center w-full md:w-[140px]">
			   			<button
			   				type="button"
			   				onClick={() => setStickyCollapsed((v) => !v)}
			   				className="rounded-full border-2 font-extrabold flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-400/70"
			   				style={{
			   					minWidth: 110,
			   					minHeight: 28,
			   					padding: '0.15rem 0.5rem',
			   					fontSize: '1.05rem',
			   					color: '#111',
			   					letterSpacing: '0.01em',
			   					borderColor: stickyCollapsed ? '#f7b84b' : '#4b9ef7',
			   					backgroundImage:
			   						'repeating-linear-gradient(135deg, #f7b84b 0 12px, #e6c200 12px 24px, #ffd700 24px 36px, #bfa43a 36px 48px),' +
			   						'repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0 8px, rgba(255,255,255,0.04) 8px 16px),' +
			   						'radial-gradient(circle at 8px 8px, rgba(255,255,255,0.10) 0 1px, transparent 1px 100%)',
			   					backgroundSize: '48px 48px, 18px 18px, 8px 8px',
			   					backgroundBlendMode: 'overlay, overlay, normal',
			   					boxShadow: stickyCollapsed
			   						? '0 0 0 3px rgba(247,184,75,0.18), 0 0 6px rgba(247,184,75,0.25), 0 2px 8px rgba(0,0,0,0.5)'
			   						: '0 0 0 3px rgba(75,158,247,0.10), 0 0 8px rgba(75,158,247,0.25), 0 2px 8px rgba(0,0,0,0.5)',
			   				}}
			   				title={stickyCollapsed ? 'Expand AI Assistant + Examples' : 'Collapse AI Assistant + Examples'}
			   				aria-pressed={stickyCollapsed}
			   			>
			   				<span className="whitespace-nowrap">
			   					{'◀ '}
			   					{stickyCollapsed ? 'Show Panels' : 'Hide Panels'}
			   					{' ▶'}
			   				</span>
			   			</button>
			   		</div>
			   	)}
				   {/* Right: Examples (~30% width on desktop) */}
				   <div
					   className="flex flex-col gap-2 items-stretch w-full md:flex-none md:w-[36%] h-full"
					   style={{ minWidth: 220, maxWidth: 620 }}
				   >
					   <div
						   className="rounded-lg border border-brand-border bg-black/10 p-2 md:p-2.5 flex flex-col justify-between flex-1 h-full min-h-0"
						   style={{ overflow: 'hidden' }}
					   >
						   <div
							   className="flex items-center text-xs md:text-sm font-extrabold text-white tracking-wide mb-2"
							   style={{
								   position: 'sticky',
								   top: 0,
								   background: 'rgba(0,0,0,0.12)',
								   zIndex: 2,
								   paddingBottom: 4,
								   marginBottom: 4,
								   borderBottom: '1px solid #f7b84b',
							   }}
						   >

							   <span>Examples — Click to load</span>
						   </div>
						   {!stickyCollapsed && (
							   <div
								   className="mt-2 flex gap-2 pb-1 flex-1 overflow-x-auto md:overflow-y-auto md:flex-col flex-row"
								   style={{ minHeight: 120 }}
							   >
								   {visibleExamples.map((ex, idx) => {
									   if (!ex) return null;
									   const selected = !!ex.id && ex.id === selectedExampleId;
									   return (
										   <button
											   key={ex.id ?? `example-${idx}`}
											   type="button"
											   onClick={() => applyExampleToDraft(ex)}
											   className={`min-w-[240px] md:min-w-0 w-full text-left rounded-xl border-2 p-3 md:p-4 shadow-lg transition-all duration-100 ring-2 ring-transparent focus:outline-none focus:ring-amber-400/80 ${
												   selected
													   ? 'border-amber-400 bg-amber-400 text-black ring-amber-400/80 scale-105'
													   : 'border-slate-700 bg-black/80 hover:bg-amber-500/10 hover:border-amber-400 ring-slate-700/40 hover:ring-amber-400/30 text-white'
											   } ${idx === visibleExamples.length - 1 ? 'mb-0' : ''}`}
											   style={{ marginBottom: idx === visibleExamples.length - 1 ? 0 : 8, paddingBottom: 8, minHeight: 80 }}
											   tabIndex={0}
											   aria-label={`Load example: ${ex.label}`}
										   >
											   <div className={`font-extrabold text-base md:text-lg mb-1 ${selected ? 'text-black' : 'text-amber-400'}`}>
												   {ex.label}
											   </div>
											   <div className={`text-xs md:text-sm leading-snug ${selected ? 'text-black/80' : 'text-amber-200/90'}`}>
												   {ex.summary}
											   </div>
										   </button>
									   );
								   })}
								<div style={{ minHeight: 24, flexShrink: 0 }} />
							</div>
						)}
						{/* New: After PID creation actionable prompts */}
						<div className="mt-4 text-xs text-gray-400">
							<div className="font-semibold text-gray-300 mb-1">After you create your PID you can do this:</div>
							<ul className="list-disc pl-5">
								<li>Add 3 risks and mitigations to this PID.</li>
								<li>Refine the objectives and timeline for this project.</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			{/* BELOW: Full PID + Nav — only render when a draft PID with a title exists. Otherwise keep this area empty. */}
			{shouldShowPid(pidToRender) ? (
				<div className="w-full mt-1 relative z-0 flex-1 min-h-0 flex flex-col">
					<div className="grid grid-cols-1 lg:grid-cols-[1fr_14rem] gap-3 h-full min-h-0">
						{/* PID column */}
						<div className="rounded-lg border border-brand-border bg-brand-panel p-2 md:p-3 min-h-0 flex flex-col h-full">
							<div className="flex-1 min-h-0 overflow-auto">
																<Suspense fallback={<div style={{minHeight:320}} />}> 
																	<CreateModeMainContent pidData={pidToRender as any} onHelp={onHelp} showAllSections={true as any} />
																</Suspense>
							</div>
						</div>
						{/* Nav column (to the right of PID) */}
						<div className="hidden lg:block h-full">
							<div className="h-full min-h-0">
								<NavPanel pidData={pidToRender as any} onHelp={onHelp} />
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="w-full mt-1 relative z-0" aria-hidden style={{ minHeight: 320 }} />
			)}
		</div>
	);
};

export default CreateMode;
