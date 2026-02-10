import type { BudgetLineItem, BudgetSummary } from '../types';

const DOMAIN_BASE_RATES = {
  software: 80,
  manufacturing: 45,
  default: 60,
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

function detectDomainBaseRate(text: string): { baseRate: number; domain: string } {
  const src = String(text || '').toLowerCase();
  const hasManufacturing = /\b[\w.-]+\.(stl|step)\b/i.test(src);
  const hasSoftware = /\b[\w.-]+\.(py|js)\b/i.test(src);
  if (hasManufacturing) return { baseRate: DOMAIN_BASE_RATES.manufacturing, domain: 'manufacturing' };
  if (hasSoftware) return { baseRate: DOMAIN_BASE_RATES.software, domain: 'software' };
  return { baseRate: DOMAIN_BASE_RATES.default, domain: 'general' };
}

function detectComplexityMultiplier(text: string): { multiplier: number; reason: string } {
  const src = String(text || '').toLowerCase();
  const high = /(aerospace|medical|real-time)/i.test(src);
  const medium = /(security|iso|compliance)/i.test(src);
  if (high) return { multiplier: 1.8, reason: 'High complexity keywords detected.' };
  if (medium) return { multiplier: 1.3, reason: 'Compliance/security keywords detected.' };
  return { multiplier: 1.0, reason: 'Standard complexity assumptions.' };
}

export function computeDeterministicBudget(
  pid: any,
  contextText = '',
): { items: BudgetLineItem[]; summary: BudgetSummary } {
  const tasks = (pid?.workBreakdown || pid?.workBreakdownTasks || pid?.tasks || []) as any[];
  const hasTasks = Array.isArray(tasks) && tasks.length > 0;
  const context = collectContextText(pid, contextText);
  const { baseRate, domain } = detectDomainBaseRate(context);
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
    const rate = Math.max(0, Number(rateUsdPerHour) || 0);
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
      const justification = `Derived from ${taskCount} work items (${info.taskNames.slice(0, 3).join(', ')}${taskCount > 3 ? ', …' : ''}). ${reason} Base rate ${baseRate}/hr (${domain}).`;
      addItem(`${role} delivery`, role, money(info.hours), baseRate, multiplier, justification);
    });
    addItem('Tools & licenses', 'Tools', 0, baseRate, multiplier, `Baseline tooling and subscriptions. ${reason} Base rate ${baseRate}/hr (${domain}).`, 'deterministic');
  } else {
    addItem('Project management', 'PM', 80, baseRate, multiplier, `Baseline PM coordination. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('Engineering delivery', 'Engineering', 320, baseRate, multiplier, `Baseline engineering effort. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('Design & UX', 'Design', 80, baseRate, multiplier, `Baseline design and UX cycles. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('QA & validation', 'QA', 80, baseRate, multiplier, `Baseline QA planning and execution. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('Operations readiness', 'Ops', 60, baseRate, multiplier, `Baseline deployment and monitoring readiness. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('Tools & licenses', 'Tools', 0, baseRate, multiplier, `Baseline tooling and subscriptions. ${reason} Base rate ${baseRate}/hr (${domain}).`);
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
    notes: [`Base rate ${baseRate}/hr (${domain}) with complexity multiplier ${multiplier}×. ${reason}`],
  };

  return { items, summary };
}
