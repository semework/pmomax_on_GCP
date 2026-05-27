import type { BudgetLineItem, BudgetSummary } from '../types';

const ROLE_BASELINES: Record<string, { rate: number; basis: string }> = {
  Engineering: { rate: 160, basis: 'Mid-level software engineer benchmark for application delivery and integration work.' },
  QA: { rate: 110, basis: 'QA and test engineer benchmark covering test design, execution, and defect verification.' },
  PM: { rate: 120, basis: 'Project manager benchmark for planning, coordination, reporting, and stakeholder alignment.' },
  Security: { rate: 170, basis: 'Security engineer benchmark for controls review, threat assessment, and approval support.' },
  Data: { rate: 175, basis: 'Data / AI engineer benchmark for pipeline, analytics, or model-related delivery work.' },
  Design: { rate: 135, basis: 'Product / UX designer benchmark for discovery, journey mapping, and interface design.' },
  Ops: { rate: 145, basis: 'Cloud / DevOps engineer benchmark for deployment, monitoring, and release readiness.' },
  Tools: { rate: 0, basis: 'Reserved for direct software, hosting, or vendor costs rather than labor hours.' },
  Compliance: { rate: 150, basis: 'Compliance and governance specialist benchmark for review, documentation, and control mapping.' },
};

function money(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function guessRole(taskName: string, roleHint?: string): string {
  const hint = (roleHint || '').trim();
  if (hint) return hint;
  const name = (taskName || '').toLowerCase();
  if (/design|ux|ui|prototype|wireframe/.test(name)) return 'Design';
  if (/qa|test|validation|verify/.test(name)) return 'QA';
  if (/security|privacy|compliance|policy|audit|governance/.test(name)) return 'Security';
  if (/data|analytics|etl|ml|ai/.test(name)) return 'Data';
  if (/ops|infra|deploy|release|runbook|sre/.test(name)) return 'Ops';
  if (/pm|project|planning|coordination|stakeholder/.test(name)) return 'PM';
  if (/tool|license|subscription|vendor/.test(name)) return 'Tools';
  return 'Engineering';
}

function estimateTaskHours(task: any): number {
  const direct = Number(task?.estimatedHours ?? task?.hours);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const start = Date.parse(task?.start || '');
  const end = Date.parse(task?.end || '');
  if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
    const days = Math.max(1, Math.round((end - start) / 86400000));
    return Math.min(80, Math.max(6, days * 6));
  }
  return 16;
}

function collectContextText(pid: any, contextText = ''): string {
  const parts: string[] = [];
  if (contextText) parts.push(contextText);
  if (pid?.notesBackground) parts.push(String(pid.notesBackground));
  if (pid?.executiveSummary) parts.push(String(pid.executiveSummary));
  if (pid?.problemStatement) parts.push(String(pid.problemStatement));
  if (pid?.businessCaseExpectedValue) parts.push(String(pid.businessCaseExpectedValue));
  if (pid?.timelineOverview) parts.push(String(pid.timelineOverview));
  if (Array.isArray(pid?.workBreakdownTasks)) {
    try {
      parts.push(JSON.stringify(pid.workBreakdownTasks));
    } catch {
      // ignore
    }
  }
  return parts.join('\n');
}

function detectDomainBaseRate(text: string): { domain: string } {
  const src = String(text || '').toLowerCase();
  const hasManufacturing = /\b[\w.-]+\.(stl|step)\b/i.test(src);
  const hasSoftware = /\b[\w.-]+\.(py|js)\b/i.test(src);
  if (hasManufacturing) return { domain: 'manufacturing' };
  if (hasSoftware) return { domain: 'software' };
  return { domain: 'general' };
}

function detectComplexityMultiplier(text: string): { multiplier: number; reason: string } {
  const src = String(text || '').toLowerCase();
  const high = /(aerospace|medical|real-time)/i.test(src);
  const highDelivery = /(multi-region|multi tenant|regulated|enterprise rollout|zero trust)/i.test(src);
  const medium = /(security|iso|compliance|integration|migration|vendor dependency)/i.test(src);
  if (highDelivery) return { multiplier: 1.55, reason: 'Higher-complexity delivery pattern detected from regulated, multi-system, or enterprise-scale keywords.' };
  if (high) return { multiplier: 1.8, reason: 'High complexity keywords detected.' };
  if (medium) return { multiplier: 1.3, reason: 'Compliance/security keywords detected.' };
  return { multiplier: 1.0, reason: 'Standard complexity assumptions.' };
}

function roleRate(role: string, domain: string): { rate: number; basis: string } {
  const baseline = ROLE_BASELINES[role] || ROLE_BASELINES.Engineering;
  if (domain === 'manufacturing' && role === 'Engineering') {
    return {
      rate: 145,
      basis: 'Engineering benchmark adjusted for implementation work with manufacturing deliverables rather than pure software delivery.',
    };
  }
  return baseline;
}

function syntheticToolingCost(context: string, taskCount: number): number {
  const src = String(context || '').toLowerCase();
  let base = 2500 + taskCount * 120;
  if (/ai|llm|vector|embedding|rag/.test(src)) base += 2200;
  if (/cloud run|gke|kubernetes|docker|autopilot/.test(src)) base += 1800;
  if (/security|compliance|audit/.test(src)) base += 900;
  return money(base);
}

export function computeDeterministicBudget(
  pid: any,
  contextText = '',
): { items: BudgetLineItem[]; summary: BudgetSummary } {
  const tasks = (pid?.workBreakdown || pid?.workBreakdownTasks || pid?.tasks || []) as any[];
  const hasTasks = Array.isArray(tasks) && tasks.length > 0;
  const context = collectContextText(pid, contextText);
  const { domain } = detectDomainBaseRate(context);
  const { multiplier, reason } = detectComplexityMultiplier(context);
  const items: BudgetLineItem[] = [];

  const addItem = (
    task: string,
    role: string,
    estimatedHours: number,
    rateUsdPerHour: number,
    complexityMultiplier: number,
    justification: string,
    source: 'deterministic' | 'ai' = 'deterministic',
  ) => {
    const hours = Math.max(0, Number(estimatedHours) || 0);
    const defaultRate = roleRate(role, domain).rate;
    const rate = Math.max(0, Number(rateUsdPerHour) || defaultRate || 0);
    const complexity = Math.max(0.1, Number(complexityMultiplier) || 1);
    const totalCostUsd = money(hours * rate * complexity);
    items.push({
      task,
      role,
      estimatedHours: hours,
      rateUsdPerHour: rate,
      complexityMultiplier: complexity,
      totalCostUsd,
      justification: justification || 'Deterministic baseline estimate.',
      source,
    });
  };

  if (hasTasks) {
    const byRole: Record<string, { hours: number; taskNames: string[] }> = {};
    for (const t of tasks) {
      const name = String(t?.task || t?.name || t?.title || '').trim() || 'Work item';
      const role = guessRole(name, t?.role || t?.ownerRole || t?.owner);
      const hours = estimateTaskHours(t);
      if (!byRole[role]) byRole[role] = { hours: 0, taskNames: [] };
      byRole[role].hours += hours;
      byRole[role].taskNames.push(name);
    }

    Object.entries(byRole).forEach(([role, info]) => {
      const taskCount = info.taskNames.length;
      const benchmark = roleRate(role, domain);
      const justification = `Estimated from ${taskCount} comparable work item${taskCount === 1 ? '' : 's'} (${info.taskNames.slice(0, 3).join(', ')}${taskCount > 3 ? ', …' : ''}). ${benchmark.basis} Complexity factor applied because ${reason.toLowerCase()}`;
      addItem(`${role} delivery`, role, money(info.hours), benchmark.rate, multiplier, justification);
    });
    const tooling = syntheticToolingCost(context, tasks.length);
    items.push({
      task: 'Tools, hosting, and vendor services',
      role: 'Tools',
      estimatedHours: 0,
      rateUsdPerHour: 0,
      complexityMultiplier: 1,
      totalCostUsd: tooling,
      justification: `Estimated from expected delivery footprint, cloud/runtime usage, and required software services. ${ROLE_BASELINES.Tools.basis}`,
      source: 'deterministic',
    });
    const laborSubtotal = money(items.filter((row) => row.role !== 'Tools').reduce((sum, row) => sum + (Number(row.totalCostUsd) || 0), 0));
    const contingency = money(laborSubtotal * 0.12);
    items.push({
      task: 'Delivery contingency reserve',
      role: 'PM',
      estimatedHours: 0,
      rateUsdPerHour: 0,
      complexityMultiplier: 1,
      totalCostUsd: contingency,
      justification: '12% reserve for change requests, dependency slippage, and rework that typically emerges after planning is refined.',
      source: 'deterministic',
    });
  } else {
    addItem('Project management', 'PM', 80, roleRate('PM', domain).rate, multiplier, `Estimated as an initial coordination baseline. ${roleRate('PM', domain).basis} Complexity factor applied because ${reason.toLowerCase()}`);
    addItem('Engineering delivery', 'Engineering', 320, roleRate('Engineering', domain).rate, multiplier, `Estimated as the core build stream for the planned solution. ${roleRate('Engineering', domain).basis} Complexity factor applied because ${reason.toLowerCase()}`);
    addItem('Design & UX', 'Design', 80, roleRate('Design', domain).rate, multiplier, `Estimated to cover requirements shaping, workflow design, and iteration. ${roleRate('Design', domain).basis}`);
    addItem('QA & validation', 'QA', 80, roleRate('QA', domain).rate, multiplier, `Estimated for system, integration, and acceptance validation. ${roleRate('QA', domain).basis}`);
    addItem('Security / compliance review', 'Security', 36, roleRate('Security', domain).rate, multiplier, `Estimated for access model, security review, and control evidence. ${roleRate('Security', domain).basis}`);
    addItem('Operations readiness', 'Ops', 60, roleRate('Ops', domain).rate, multiplier, `Estimated for deployment, observability, and release hardening. ${roleRate('Ops', domain).basis}`);
    items.push({
      task: 'Tools, hosting, and vendor services',
      role: 'Tools',
      estimatedHours: 0,
      rateUsdPerHour: 0,
      complexityMultiplier: 1,
      totalCostUsd: syntheticToolingCost(context, 6),
      justification: `Estimated from expected delivery footprint, cloud/runtime usage, and required software services. ${ROLE_BASELINES.Tools.basis}`,
      source: 'deterministic',
    });
    const laborSubtotal = money(items.filter((row) => row.role !== 'Tools').reduce((sum, row) => sum + (Number(row.totalCostUsd) || 0), 0));
    items.push({
      task: 'Delivery contingency reserve',
      role: 'PM',
      estimatedHours: 0,
      rateUsdPerHour: 0,
      complexityMultiplier: 1,
      totalCostUsd: money(laborSubtotal * 0.12),
      justification: '12% reserve for change requests, dependency slippage, and rework that typically emerges after planning is refined.',
      source: 'deterministic',
    });
  }

  const subtotalByRoleUsd = items.reduce<Record<string, number>>((acc, row) => {
    acc[row.role] = money((acc[row.role] || 0) + (Number(row.totalCostUsd) || 0));
    return acc;
  }, {});
  const totalCostUsd = money(items.reduce((sum, row) => sum + (Number(row.totalCostUsd) || 0), 0));

  const summary: BudgetSummary = {
    currency: 'USD',
    totalCostUsd,
    subtotalByRoleUsd,
    notes: [`Role-based benchmark rates were applied for ${domain} delivery with a complexity multiplier of ${multiplier}×. ${reason}`],
  };

  return { items, summary };
}
