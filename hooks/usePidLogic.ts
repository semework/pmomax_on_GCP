import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
// Additional abort controllers for demo and create actions
const demoAbortRef = { current: null as AbortController | null };
const createAbortRef = { current: null as AbortController | null };

// --- Single-flight and dedupe for parse requests ---
const parseInFlightMap: Record<string, Promise<any>> = {};
const parseAbortMap: Record<string, AbortController> = {};
import { PMOMaxPID, ChatMessage, BudgetLineItem, BudgetSummary } from '../types';
import { demoData } from '../data/demoData';
import { safeErrorMessage } from '../lib/safeError';
import { normalizeError } from '../lib/errorTools';
import { computeDeterministicBudget } from '../lib/deterministicBudget';

import { perfMonitor } from '../lib/performanceMonitor';
import { MAX_WORDS, MAX_PAGES } from '../lib/supportedFormats';


// Client-side parse limits (should roughly match server.mjs)
const PARSE_SOFT_WARN_CHARS = 1_800_000;
const PARSE_HARD_MAX_CHARS = 3_500_000;

const capWords = (text: string, maxWords: number): { text: string; truncated: boolean } => {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text, truncated: false };
  return { text: words.slice(0, maxWords).join(' '), truncated: true };
};

async function fetchWithTimeoutAndBackoff(url: string, init: RequestInit = {}, ms = 45000, maxRetries = 6) {
  let attempt = 0;
  let lastErr;
  let delay = 500;
  let controller: AbortController | undefined;
  while (attempt <= maxRetries) {
    controller = new AbortController();
    const id = setTimeout(() => controller!.abort('Timeout'), ms);
    const externalSignal = init.signal;
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort((externalSignal as any).reason ?? 'Abort');
      } else {
        externalSignal.addEventListener(
          'abort',
          () => controller!.abort((externalSignal as any).reason ?? 'Abort'),
          { once: true },
        );
      }
    }
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.status !== 429 && res.status !== 503) {
        clearTimeout(id);
        return res;
      }
      // Exponential backoff + jitter for 429/503
      let retryAfter = 0;
      const retryHeader = res.headers.get('Retry-After');
      if (retryHeader) {
        const parsed = parseInt(retryHeader, 10);
        if (!isNaN(parsed)) retryAfter = parsed * 1000;
      }
      const jitter = Math.floor(Math.random() * 250);
      await new Promise(r => setTimeout(r, retryAfter || Math.min(8000, delay * Math.pow(2, attempt)) + jitter));
      attempt++;
      lastErr = new Error(`HTTP ${res.status}`);
      clearTimeout(id);
      continue;
    } catch (e) {
      lastErr = e;
      clearTimeout(id);
      if (e?.name === 'AbortError') throw e;
      // Retry on network errors
      await new Promise(r => setTimeout(r, Math.min(8000, delay * Math.pow(2, attempt)) + Math.floor(Math.random() * 250)));
      attempt++;
    }
  }
  throw lastErr;
}

// Keep column scroll positions tidy
const scrollColumnsTop = () => {
  document.querySelectorAll('[data-col-scroll]').forEach((el) => {
    if (el) (el as HTMLElement).scrollTop = 0;
  });
};

// --- Single-flight parse logic ---
async function singleFlightParse(url: string, body: any, hash: string, opts: { signal?: AbortSignal } = {}) {
  if (parseInFlightMap[hash]) {
    return parseInFlightMap[hash];
  }
  const controller = new AbortController();
  parseAbortMap[hash] = controller;
  const mergedSignal = opts.signal
    ? new AbortController()
    : controller;
  if (opts.signal) {
    opts.signal.addEventListener('abort', () => controller.abort('UserCancel'), { once: true });
  }
  const p = (async () => {
    try {
      const res = await fetchWithTimeoutAndBackoff(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      }, 60000, 7);
      if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
      return await res.json();
    } finally {
      delete parseInFlightMap[hash];
      delete parseAbortMap[hash];
    }
  })();
  parseInFlightMap[hash] = p;
  return p;
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

type ParseEnvelope =
  | { ok: true; pid: PMOMaxPID; warnings?: string[]; meta?: any }
  | { ok: false; error: string; warnings?: string[]; meta?: any };

// ---- Empty PID factory (strict, prevents UI crashes) ----
export const makeEmptyPid = (): PMOMaxPID => ({
  titleBlock: { projectTitle: '', subtitle: '', generatedOn: '' },
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
  projectManagerOwner: { name: '' },
  teamRaci: [],
  timelineOverview: '',
  milestones: [],
  workBreakdownTasks: [],
  budgetCostBreakdown: [],
  budgetSummary: undefined,
  resourcesTools: [],
  risks: [],
  mitigationsContingencies: [],
  issuesDecisionsLog: [],
  communicationPlan: [],
  governanceApprovals: [],
  complianceSecurityPrivacy: [],
  openQuestionsNextSteps: [],
  notesBackground: '',
});

function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function coerceArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

const toNumber = (value: any, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeBudgetItem = (
  row: any,
  fallbackSource: 'deterministic' | 'ai' = 'deterministic',
): BudgetLineItem | null => {
  if (!row || typeof row !== 'object') return null;
  const task = String(row.task || row.item || row.name || 'Work item').trim() || 'Work item';
  const role = String(row.role || row.category || row.owner || 'Engineering').trim() || 'Engineering';
  const estimatedHours = toNumber(row.estimatedHours ?? row.hours, 0);
  const rateUsdPerHour = toNumber(row.rateUsdPerHour ?? row.hourlyRate ?? row.rate, 0);
  const complexityMultiplier = toNumber(row.complexityMultiplier ?? row.multiplier, 1) || 1;
  const totalCostUsd = toNumber(
    row.totalCostUsd ?? row.cost,
    Math.max(0, estimatedHours * rateUsdPerHour * complexityMultiplier),
  );
  const justification = String(row.justification || row.notes || '').trim();
  const source: 'deterministic' | 'ai' = row.source === 'ai' ? 'ai' : fallbackSource;
  return {
    task,
    role,
    estimatedHours,
    rateUsdPerHour,
    complexityMultiplier,
    totalCostUsd,
    justification: justification || 'AI justification pending — using deterministic baseline.',
    source,
  };
};

const normalizeBudgetItems = (rows: any[], fallbackSource: 'deterministic' | 'ai') =>
  coerceArray<any>(rows)
    .map((row) => normalizeBudgetItem(row, fallbackSource))
    .filter(Boolean) as BudgetLineItem[];

const buildBudgetSummary = (items: BudgetLineItem[]): BudgetSummary => {
  const subtotalByRoleUsd = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.role] = (acc[item.role] || 0) + (Number(item.totalCostUsd) || 0);
    return acc;
  }, {});
  const totalCostUsd = Object.values(subtotalByRoleUsd).reduce((sum, val) => sum + val, 0);
  return {
    currency: 'USD',
    totalCostUsd,
    subtotalByRoleUsd,
    notes: ['USD baseline generated deterministically; refine with actuals when available.'],
  };
};

const normalizeBudgetSummary = (summary: any, fallback: BudgetSummary): BudgetSummary => {
  if (!summary || typeof summary !== 'object') return fallback;
  const totalCostUsd = toNumber(summary.totalCostUsd ?? summary.total, fallback.totalCostUsd);
  const subtotalByRoleUsd =
    summary.subtotalByRoleUsd && typeof summary.subtotalByRoleUsd === 'object'
      ? summary.subtotalByRoleUsd
      : fallback.subtotalByRoleUsd;
  const notes = Array.isArray(summary.notes)
    ? summary.notes.map((n: any) => String(n)).filter(Boolean)
    : Array.isArray(summary.assumptions)
    ? summary.assumptions.map((n: any) => String(n)).filter(Boolean)
    : fallback.notes;
  return {
    currency: 'USD',
    totalCostUsd,
    subtotalByRoleUsd,
    notes,
  };
};

const mergeBudgetItems = (baseItems: BudgetLineItem[], aiItems: BudgetLineItem[]): BudgetLineItem[] => {
  const merged = [...baseItems];
  const index = new Map<string, number>();
  merged.forEach((row, idx) => {
    index.set(`${row.role}::${row.task}`, idx);
  });

  aiItems.forEach((aiRow) => {
    const key = `${aiRow.role}::${aiRow.task}`;
    if (index.has(key)) {
      const idx = index.get(key) as number;
      const base = merged[idx];
      const estimatedHours = Number.isFinite(aiRow.estimatedHours) && aiRow.estimatedHours > 0 ? aiRow.estimatedHours : base.estimatedHours;
      const rateUsdPerHour = Number.isFinite(aiRow.rateUsdPerHour) && aiRow.rateUsdPerHour > 0 ? aiRow.rateUsdPerHour : base.rateUsdPerHour;
      const complexityMultiplier = Number.isFinite(aiRow.complexityMultiplier) && aiRow.complexityMultiplier > 0
        ? aiRow.complexityMultiplier
        : base.complexityMultiplier;
      const totalCostUsd = Number.isFinite(aiRow.totalCostUsd) && aiRow.totalCostUsd > 0
        ? aiRow.totalCostUsd
        : Math.max(0, estimatedHours * rateUsdPerHour * complexityMultiplier);
      merged[idx] = {
        ...base,
        estimatedHours,
        rateUsdPerHour,
        complexityMultiplier,
        totalCostUsd,
        justification: aiRow.justification || base.justification,
      };
    } else {
      merged.push({ ...aiRow, source: 'ai' });
    }
  });

  return merged;
};

/**
 * Merge parsed partial PID into a full PMOMaxPID shape.
 * Arrays are replaced (so the model can delete/reorder).
 */
// Strict canonical fill: every field present and non-empty
function mergeWithEmptyPid(parsed: Partial<PMOMaxPID> | null | undefined): PMOMaxPID {
  const blank = makeEmptyPid();
  const x = parsed && typeof parsed === 'object' ? parsed : {};
  const out: any = { ...blank, ...x };
  // Title block
  out.titleBlock = { ...blank.titleBlock, ...(x.titleBlock || {}) };
  out.titleBlock.projectTitle = String(out.titleBlock.projectTitle || '');
  out.titleBlock.subtitle = String(out.titleBlock.subtitle || 'Project Initiation Document');
  out.titleBlock.generatedOn = String(out.titleBlock.generatedOn || '');
  out.titleBlock.projectId = String(out.titleBlock.projectId || '');
  // All arrays
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
  // All objects
  out.projectSponsor = { ...blank.projectSponsor, ...(x.projectSponsor || {}) };
  out.projectManagerOwner = { ...blank.projectManagerOwner, ...(x.projectManagerOwner || {}) };
  // All strings
  out.executiveSummary = String(out.executiveSummary || '');
  out.problemStatement = String(out.problemStatement || '');
  out.businessCaseExpectedValue = String(out.businessCaseExpectedValue || '');
  out.timelineOverview = String(out.timelineOverview || '');
  out.notesBackground = String(out.notesBackground || '');
  return out as PMOMaxPID;
}

function applyDeterministicBudget(pid: PMOMaxPID, contextText = ''): PMOMaxPID {
  const baseline = computeDeterministicBudget(pid, contextText);
  const normalizedRows = normalizeBudgetItems(pid?.budgetCostBreakdown, 'deterministic');
  const rows = normalizedRows.length > 0 ? normalizedRows : baseline.items;
  const summaryFallback = buildBudgetSummary(rows);
  const summary = normalizeBudgetSummary(pid?.budgetSummary, summaryFallback);
  return {
    ...pid,
    budgetCostBreakdown: rows,
    budgetSummary: summary,
  };
}

const normalizePid = (parsed: Partial<PMOMaxPID> | null | undefined): PMOMaxPID =>
  applyDeterministicBudget(mergeWithEmptyPid(parsed));

async function postJson<T>(
  url: string,
  body: any,
  timeoutMs = 240_000,
  existingController?: AbortController,
): Promise<T> {
  const controller = existingController ?? new AbortController();
  const retryDelays = url.startsWith('/api/ai/') ? [400, 1200] : [];
  let attempt = 0;
  try {
    while (true) {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      }, timeoutMs);

      if (res.status === 429 && attempt < retryDelays.length) {
        if (controller.signal.aborted) throw new Error('USER_CANCELLED');
        await sleep(retryDelays[attempt]);
        attempt += 1;
        continue;
      }

      if (!res.ok) {
        let detail = '';
        try {
          const data: any = await res.json();
          if (data && typeof data === 'object') {
            if (typeof data.error === 'string') detail = data.error;
            else if (data.error && typeof data.error.message === 'string') detail = data.error.message;
            else if (typeof data.errorMessage === 'string') detail = data.errorMessage;
            else detail = safeErrorMessage(data);
          } else if (typeof data === 'string') {
            detail = data;
          }
        } catch {
          const t = await res.text().catch(() => '');
          detail = t;
        }
        const suffix = detail ? `: ${String(detail).slice(0, 300)}` : '';
        throw new Error(`HTTP ${res.status}${suffix}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const t = await res.text().catch(() => '');
        const preview = t ? ` ${String(t).slice(0, 200)}` : '';
        throw new Error(`Server Error: Malformed Response.${preview}`);
      }
      return (await res.json()) as T;
    }
  } catch (e: any) {
    const reason = (controller as any)?.signal?.reason;
    // Distinguish user-initiated cancels from real timeouts.
    if (reason === 'UserCancel') {
      const cancelErr: any = new Error('USER_CANCELLED');
      cancelErr.code = 'USER_CANCELLED';
      throw cancelErr;
    }
    // Normalize aborts and timeouts into a clear, user-friendly timeout message.
    if (e?.name === 'AbortError' || e === 'Timeout' || (typeof e?.message === 'string' && /Timeout/i.test(e.message))) {
      throw new Error('Request timed out. The server may be busy or your document may be very large. Please try again or use a smaller, more structured PID.');
    }
    throw e;
  } finally {
    // fetchWithTimeout handles its own timer cleanup.
  }
}

const normalizeErrorMessage = (err: any, fallback: string) => {
  const msg = normalizeError(err).message || safeErrorMessage(err);
  if (msg && msg !== '[object Object]') return msg;
  return fallback;
};

const isTimeoutError = (err: any) => {
  if (!err) return false;
  if (err?.name === 'AbortError') return true;
  const msg = String(err?.message || err);
  return /timed\s*out|timeout/i.test(msg);
};

export const usePidLogic = () => {
  const [pid, setPid] = useState<PMOMaxPID | null>(null);
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [aiAssistantHistory, setAiAssistantHistory] = useState<ChatMessage[]>([]);
  const [assistantDraft, setAssistantDraft] = useState<PMOMaxPID | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBudgeting, setIsBudgeting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastAssistantCreatedAt, setLastAssistantCreatedAt] = useState<number | null>(null);
  const [lastParsedText, setLastParsedText] = useState<string>('');
  const [lastParsedTextLength, setLastParsedTextLength] = useState<number>(0);
  const notesChunkTokenRef = useRef<number>(0);
  const lastAutoBudgetKey = useRef<string>('');
  const lastParseRequestKey = useRef<string>('');
  const parseInFlightKey = useRef<string>('');
  const lastAssistantRequestKey = useRef<string>('');
  const assistantInFlightKey = useRef<string>('');
  const budgetInFlightKey = useRef<string>('');

  // Track in-flight parse so the UI can cancel it (Reset, Load Demo, etc.).
  const parseAbortRef = useRef<AbortController | null>(null);
  // Track in-flight assistant requests so UI can cancel them (Reset, Cancel, etc.).
  const assistantAbortRef = useRef<AbortController | null>(null);
  const budgetAbortRef = useRef<AbortController | null>(null);
  const lastBudgetRequestKey = useRef<string>('');

  useEffect(() => {
    // Keep pid = null on first load so the center panel can show the welcome schema.
  }, []);

  const clearAll = useCallback(() => {
    // Abort any in-flight parse or assistant requests before clearing state
    try { parseAbortRef.current?.abort('UserCancel'); } catch {}
    parseAbortRef.current = null;
    try { assistantAbortRef.current?.abort('UserCancel'); } catch {}
    assistantAbortRef.current = null;
    try { budgetAbortRef.current?.abort('UserCancel'); } catch {}
    budgetAbortRef.current = null;
    lastBudgetRequestKey.current = '';
    setIsBudgeting(false);

    setPid(null);
    setGeneralNotes('');
    setAiAssistantHistory([]);
    setWarnings([]);
    setError(null);
    setLastAssistantCreatedAt(null);
    requestAnimationFrame(scrollColumnsTop);
  }, []);

  const requestBudgetForPid = useCallback(
    async (pidData: PMOMaxPID, contextText = '') => {
      if (!pidData || isBudgeting) return;
      const rows = normalizeBudgetItems(pidData?.budgetCostBreakdown, 'deterministic');
      const isDeterministicOnly = rows.length > 0 && rows.every((r: any) => r?.source === 'deterministic');
      if (rows.length > 0 && !isDeterministicOnly) return;

      const baselinePid = applyDeterministicBudget(mergeWithEmptyPid(pidData), contextText);
      const baselineItems = normalizeBudgetItems(baselinePid.budgetCostBreakdown, 'deterministic');
      const baselineSummary = normalizeBudgetSummary(
        baselinePid.budgetSummary,
        buildBudgetSummary(baselineItems),
      );
      setPid({
        ...baselinePid,
        budgetCostBreakdown: baselineItems,
        budgetSummary: baselineSummary,
      });

      const key = [
        pidData?.titleBlock?.projectTitle || '',
        pidData?.timelineOverview || '',
        pidData?.notesBackground || '',
        String(pidData?.workBreakdownTasks?.length || 0),
      ].join('|');
      const budgetKey = `${hashText(key)}:${hashText(contextText || '')}`;
      if (lastBudgetRequestKey.current === budgetKey) return;
      if (budgetInFlightKey.current === budgetKey) return;
      lastBudgetRequestKey.current = budgetKey;
      budgetInFlightKey.current = budgetKey;

      const controller = new AbortController();
      budgetAbortRef.current = controller;
      setIsBudgeting(true);
      try {
        const budgetEnv = await postJson<any>(
          '/api/ai/budget',
          { pidData: baselinePid, contextText },
          120_000,
          controller,
        );

        if (budgetEnv?.ok && (budgetEnv.pid || budgetEnv.budgetCostBreakdown || budgetEnv.budgetSummary)) {
          const aiPid = budgetEnv.pid || budgetEnv;
          const aiItems = normalizeBudgetItems(aiPid?.budgetCostBreakdown, 'ai');
          const mergedItems = mergeBudgetItems(baselineItems, aiItems);
          const mergedSummary = normalizeBudgetSummary(
            aiPid?.budgetSummary,
            buildBudgetSummary(mergedItems),
          );
          setPid({
            ...baselinePid,
            budgetCostBreakdown: mergedItems,
            budgetSummary: mergedSummary,
          });
        }
        const budgetWarnings = Array.isArray(budgetEnv?.warnings) ? budgetEnv.warnings : [];
        if (budgetWarnings.length) {
          setWarnings((prev) => [...prev, ...budgetWarnings]);
        }
      } catch (e: any) {
        if (e?.message === 'USER_CANCELLED' || e?.code === 'USER_CANCELLED') return;
        const msg = isTimeoutError(e)
          ? 'Budget enrichment timed out — using deterministic baseline.'
          : normalizeErrorMessage(e, 'Budget generation failed.');
        setWarnings((prev) => [...prev, msg]);
      } finally {
        setIsBudgeting(false);
        budgetAbortRef.current = null;
        if (budgetInFlightKey.current === budgetKey) budgetInFlightKey.current = '';
      }
    },
    [isBudgeting],
  );

  useEffect(() => {
    if (!pid || !lastParsedTextLength || lastParsedTextLength <= 10000) return;
    const key = `${pid?.titleBlock?.projectTitle || ''}|${lastParsedTextLength}`;
    if (lastAutoBudgetKey.current === key) return;
    lastAutoBudgetKey.current = key;
    requestBudgetForPid(pid, lastParsedText);
  }, [pid, lastParsedTextLength, lastParsedText, requestBudgetForPid]);

  useEffect(() => {
    if (!pid) return;
    const rows = normalizeBudgetItems(pid.budgetCostBreakdown, 'deterministic');
    const isDeterministicOnly = rows.length > 0 && rows.every((r: any) => r?.source === 'deterministic');
    if (rows.length > 0 && !isDeterministicOnly) return;
    const contextText = pid.notesBackground || pid.executiveSummary || '';
    requestBudgetForPid(pid, contextText);
  }, [pid, requestBudgetForPid]);

  const loadDemoData = useCallback(async () => {
    if (demoAbortRef.current) {
      try { demoAbortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    demoAbortRef.current = controller;
    setIsLoading(true);
    setError(null);
    setWarnings([]);
    setAiAssistantHistory([]);
    try {
      // Small delay so spinners show consistently
      await new Promise((r) => setTimeout(r, 80));
      if (controller.signal.aborted) return;
      const demoPid = normalizePid(demoData as any);
      const budgetWarnings: string[] = [];
      startTransition(() => {
        setPid(normalizePid(demoPid));
        setGeneralNotes('RoadRunner is the internal codename. Use this space to capture high-level notes.');
        setAiAssistantHistory([
          { role: 'assistant', content: 'Demo data loaded. Ask me to add a risk, refine an objective, or adjust dates.' },
          ...(budgetWarnings.length ? [{ role: 'assistant', content: `⚠️ Budget needs more inputs: ${budgetWarnings.join(' ')}` }] : []),
        ]);
        if (budgetWarnings.length) setWarnings(budgetWarnings);
      });
      requestBudgetForPid(demoPid as any, demoPid.notesBackground || '');
      requestAnimationFrame(scrollColumnsTop);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      if (e?.message && e.message.includes('429')) {
        setError('Too many requests. Please wait a moment and try again.');
        setWarnings(['Too many requests. Please wait a moment and try again.']);
      } else {
        setError('Failed to load demo data. Please try again.');
        setWarnings(['Demo data could not be loaded.']);
      }
    } finally {
      setIsLoading(false);
      demoAbortRef.current = null;
    }
  }, []);
  // Example createNew action (if present)
  const createNew = useCallback(async () => {
    if (createAbortRef.current) {
      try { createAbortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    createAbortRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      // ...create logic here...
      if (controller.signal.aborted) return;
      // Simulate creation
      setPid(makeEmptyPid());
      setGeneralNotes('');
      setAiAssistantHistory([]);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      if (e?.message && e.message.includes('429')) {
        setError('Too many requests. Please wait a moment and try again.');
        setWarnings(['Too many requests. Please wait a moment and try again.']);
      } else {
        setError('Failed to create new document.');
        setWarnings(['Failed to create new document.']);
      }
    } finally {
      setIsLoading(false);
      createAbortRef.current = null;
    }
  }, []);


  // --- Section A: Parse pipeline (AI-backed, matches runtime JS behavior) ---
  const parseDocument = useCallback(
    async (text: string, model?: 'gemini-2.5-flash' | 'gemini-pro-2.5', initialWarnings: string[] = []) => {
      const start = performance.now();
      notesChunkTokenRef.current += 1;
      const notesToken = notesChunkTokenRef.current;
      setIsLoading(true);
      setError(null);
      setWarnings([]);
      const localWarnings: string[] = [...initialWarnings];
      try {
        // Cancel any previous in-flight parse before starting a new one.
        if (parseAbortRef.current) {
          try {
            parseAbortRef.current.abort('UserCancel');
          } catch {
            // ignore
          }
        }

        const controller = new AbortController();
        parseAbortRef.current = controller;

        if (!text || !text.trim()) {
          throw new Error('Please paste or upload some content to parse.');
        }
        if (text.length > PARSE_HARD_MAX_CHARS) {
          throw new Error(
            `Text too long (max ${Math.round(
              PARSE_HARD_MAX_CHARS / 1000,
            )}KB). Please shorten or split your document.`,
          );
        }

        const capped = capWords(text, MAX_WORDS);
        const safeText = capped.text;
        if (capped.truncated) {
          localWarnings.push(`Input exceeded ~${MAX_PAGES} pages; only the first ${MAX_PAGES} pages were parsed.`);
        }

        const parseKey = `${model || 'default'}:${hashText(safeText)}`;
        if (parseInFlightKey.current === parseKey || lastParseRequestKey.current === parseKey) {
          return { ok: true as const };
        }
        parseInFlightKey.current = parseKey;

        if (safeText.length > PARSE_SOFT_WARN_CHARS) {
          console.warn('[PIDLOGIC] parseDocument: above soft warn threshold', safeText.length);
        }

        const env = await postJson<ParseEnvelope>(
          '/api/ai/parse',
          model ? { text: safeText, model } : { text: safeText },
          60_000,
          controller,
        );

        if (!env || typeof env !== 'object') {
          throw new Error('Parse API returned an unexpected response.');
        }
        if (env.ok !== true) {
          // Support structured error { code, message } as well as legacy string
          const eAny: any = env as any;
          const structuredMsg = typeof eAny?.error?.message === 'string' ? eAny.error.message : null;
          const errMsg = structuredMsg || safeErrorMessage(eAny?.error ?? eAny?.errorMessage ?? eAny);
          throw new Error(errMsg || 'Parse failed.');
        }

        const merged = normalizePid(env.pid);
        const mergedWarnings = [
          ...(Array.isArray(env.warnings) ? env.warnings : []),
          ...localWarnings,
        ];
        const notesText = String(merged.notesBackground || '');
        const chunkSize = 2000;
        if (notesText.length > 10000) {
          const firstChunk = notesText.slice(0, chunkSize);
          startTransition(() => {
            setPid({ ...merged, notesBackground: firstChunk });
            setWarnings(mergedWarnings);
            setError(null);
          });
          let offset = chunkSize;
          const pump = () => {
            if (notesChunkTokenRef.current !== notesToken) return;
            if (offset >= notesText.length) return;
            const next = notesText.slice(offset, offset + chunkSize);
            offset += chunkSize;
            setPid((prev) => {
              if (!prev) return prev;
              return { ...prev, notesBackground: `${prev.notesBackground || ''}${next}` };
            });
            requestAnimationFrame(pump);
          };
          requestAnimationFrame(pump);
        } else {
          startTransition(() => {
            setPid(merged);
            setWarnings(mergedWarnings);
            setError(null);
          });
        }
        setLastParsedText(String(text || ''));
        setLastParsedTextLength(String(text || '').length);
        requestBudgetForPid(merged, merged.notesBackground || safeText || '');
        requestAnimationFrame(scrollColumnsTop);
        perfMonitor.logEvent('parse_document', performance.now() - start, {
          textLength: text.length,
        });
        lastParseRequestKey.current = parseKey;
        return { ok: true as const };
      } catch (e: any) {
        // Swallow explicit user cancellations so Reset/Load Demo can interrupt cleanly.
        if (e?.message === 'USER_CANCELLED' || (e as any)?.code === 'USER_CANCELLED') {
          return { ok: false as const, error: 'USER_CANCELLED' };
        }
        // Always surface a concrete, user-readable error message.
        const msg = isTimeoutError(e)
          ? 'Parsing is taking too long for this document. I parsed what I could—try splitting the file or removing images.'
          : normalizeErrorMessage(e, 'Parsing failed due to an unexpected error.');
        setError(msg);
        setWarnings([msg]);
        return { ok: false as const, error: msg };
      } finally {
        setIsLoading(false);
        parseAbortRef.current = null;
        if (parseInFlightKey.current) parseInFlightKey.current = '';
      }
    },
    [requestBudgetForPid],
  );

  const cancelParsing = useCallback(() => {
    if (parseAbortRef.current) {
      try { parseAbortRef.current.abort('UserCancel'); } catch {}
      parseAbortRef.current = null;
    }
    if (demoAbortRef.current) {
      try { demoAbortRef.current.abort(); } catch {}
      demoAbortRef.current = null;
    }
    if (createAbortRef.current) {
      try { createAbortRef.current.abort(); } catch {}
      createAbortRef.current = null;
    }
    setIsLoading(false);
  }, []);
  // Clean up controllers on unmount
  useEffect(() => {
    return () => {
      try { parseAbortRef.current?.abort(); } catch {}
      try { demoAbortRef.current?.abort(); } catch {}
      try { createAbortRef.current?.abort(); } catch {}
    };
  }, []);

  
const askAssistant = useCallback(
  async (userText: string, model?: 'gemini-2.5-flash' | 'gemini-pro-2.5') => {
    if (!userText || !userText.trim()) {
      setError('Please type a question or instruction for the assistant.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const trimmedQuestion = userText.trim();
    const assistantKeyBase = JSON.stringify({
      q: trimmedQuestion,
      model: model || '',
      pidTitle: pid?.titleBlock?.projectTitle || '',
      pidId: pid?.titleBlock?.projectId || '',
    });
    const assistantKey = hashText(assistantKeyBase);
    if (assistantInFlightKey.current === assistantKey || lastAssistantRequestKey.current === assistantKey) {
      return;
    }
    assistantInFlightKey.current = assistantKey;

    // Support quick client-side apply of a previously returned assistant draft
    const lowerTrim = trimmedQuestion.toLowerCase();
    if (lowerTrim === 'apply' || lowerTrim === 'apply draft' || lowerTrim === 'apply the draft') {
      if (!assistantDraft) {
        setError('No assistant draft is available to apply. Ask the assistant to draft a PID first.');
        setIsLoading(false);
        return;
      }
      setPid(() => normalizePid(assistantDraft));
      setAssistantDraft(null);
      setAiAssistantHistory((prev) => [...prev, { role: 'assistant', content: '✅ Assistant draft applied to the PID.' }]);
      setIsLoading(false);
      return;
    }

    // Handle simple "what do you do" introductions entirely client-side
    const lowerQ = trimmedQuestion.toLowerCase();
    if (lowerQ === 'what do you do' || lowerQ === 'what do you do?' || lowerQ === 'what can you do' || lowerQ === 'what can you do?') {
      const introReply: ChatMessage = {
        role: 'assistant',
        content:
          'I am PMOMax, the AI copilot for PMO leaders and project managers. I can help you parse or create Project Initiation Documents (PIDs), suggest objectives, KPIs, risks, timelines, and governance structures, and refine any section before export. You can use me or the Create button when you want to start a brand-new PID.',
      };
      setAiAssistantHistory((prev) => [
        ...prev,
        { role: 'user', content: trimmedQuestion },
        introReply,
      ]);
      setIsLoading(false);
      return;
    }

    const newHistory: ChatMessage[] = [
      ...aiAssistantHistory,
      { role: 'user', content: trimmedQuestion },
    ];

    const tryParseJsonObject = (s: string): any | null => {
      const raw = String(s || '').trim();
      if (!raw) return null;
      // Extract JSON from fenced blocks or raw text.
      const candidates: string[] = [];
      const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fence?.[1]) candidates.push(fence[1]);
      candidates.push(raw);

      for (const c of candidates) {
        const t = c.trim();
        if (!t) continue;
        if (!(t.startsWith('{') || t.startsWith('['))) continue;
        try {
          const obj = JSON.parse(t);
          return obj;
        } catch {
          // ignore
        }
      }
      return null;
    };

    try {
      // Only send PID if it has a valid title (avoid sending empty/incomplete PIDs)
      const hasPid = pid && 
        isPlainObject(pid) && 
        (pid as any).titleBlock && 
        typeof (pid as any).titleBlock.projectTitle === 'string' && 
        (pid as any).titleBlock.projectTitle.trim().length > 0;
      
      const effectivePid = hasPid ? pid : undefined;
      const msgArr = newHistory.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m?.content === 'string' ? m.content : String(m?.content ?? ''),
      }));

      const reqBody = effectivePid
        ? (model ? { pidData: effectivePid, messages: msgArr, model } : { pidData: effectivePid, messages: msgArr })
        : (model ? { messages: msgArr, model } : { messages: msgArr });

      // Cancel any previous assistant request before starting a new one
      if (assistantAbortRef.current) {
        try { assistantAbortRef.current.abort('UserCancel'); } catch {}
      }
      const controller = new AbortController();
      assistantAbortRef.current = controller;

      const res = await postJson<any>(
        '/api/ai/assistant',
        reqBody,
        45000,
        controller,
      );

      if (!res || res.ok !== true) {
        throw new Error(res?.error || 'Assistant returned an unexpected response.');
      }

      const hadPid = !!pid;
      let applied = false;
      if (pid) {
        // Only apply assistant changes if assistant explicitly allows applying (res.apply !== false)
        const allowApply = res.apply !== false;
        if (allowApply) {
          if (res.pid && isPlainObject(res.pid)) {
            setPid(() => normalizePid(res.pid));
            applied = true;
          } else if (res.pidData && isPlainObject(res.pidData)) {
            setPid(() => normalizePid(res.pidData));
            applied = true;
          } else if (res.patch && isPlainObject(res.patch)) {
            setPid((prev) => {
              const base = prev && isPlainObject(prev) ? prev : makeEmptyPid();
              return normalizePid({ ...(base as any), ...(res.patch as any) });
            });
            applied = true;
          } else if (typeof res.reply === 'string') {
            // Fallback: try to parse JSON from the reply (either {patch} or full pid)
            const parsed = tryParseJsonObject(res.reply);
            if (parsed && isPlainObject(parsed)) {
              if ((parsed as any).titleBlock || (parsed as any).executiveSummary) {
                setPid(() => normalizePid(parsed));
                applied = true;
              } else {
                setPid((prev) => {
                  const base = prev && isPlainObject(prev) ? prev : makeEmptyPid();
                  return normalizePid({ ...(base as any), ...(parsed as any) });
                });
                applied = true;
              }
            }
          }
        }
        else {
          // Assistant returned a draft but did not request auto-apply — save it locally so user can "apply" later
          try {
            if (res.pid && isPlainObject(res.pid)) {
              setAssistantDraft(() => normalizePid(res.pid));
              setAiAssistantHistory((h) => [...h, { role: 'assistant', content: 'A draft PID is available. Say "apply" to merge it into the current PID.' }]);
            } else if (res.pidData && isPlainObject(res.pidData)) {
              setAssistantDraft(() => normalizePid(res.pidData));
              setAiAssistantHistory((h) => [...h, { role: 'assistant', content: 'A draft PID is available. Say "apply" to merge it into the current PID.' }]);
            } else if (res.patch && isPlainObject(res.patch)) {
              // Save patch as a draft by merging with current pid or empty pid
              setAssistantDraft(() => normalizePid({ ...(pid as any), ...(res.patch as any) }));
              setAiAssistantHistory((h) => [...h, { role: 'assistant', content: 'A draft patch is available. Say "apply" to merge it into the current PID.' }]);
            }
          } catch (err) {
            // ignore draft-save failures
          }
        }
      } else {
        // No existing PID: allow assistant to create a fresh PID when it returns one.
        // But treat assistant-created PIDs as drafts unless assistant sets apply===true.
        const allowApply = res.apply !== false;
        if (allowApply) {
          if (res.pid && isPlainObject(res.pid)) {
            setPid(() => normalizePid(res.pid));
            applied = true;
          } else if (res.pidData && isPlainObject(res.pidData)) {
            setPid(() => normalizePid(res.pidData));
            applied = true;
          } else if (res.patch && isPlainObject(res.patch)) {
            setPid(() => normalizePid({ ...(makeEmptyPid() as any), ...(res.patch as any) }));
            applied = true;
          } else if (typeof res.reply === 'string') {
            const parsed = tryParseJsonObject(res.reply);
            if (parsed && isPlainObject(parsed)) {
              setPid(() => normalizePid(parsed));
              applied = true;
            }
          }
        }
        else {
          try {
            if (res.pid && isPlainObject(res.pid)) {
              setAssistantDraft(() => normalizePid(res.pid));
              setAiAssistantHistory((h) => [...h, { role: 'assistant', content: 'A draft PID is available. Say "apply" to make it the active PID.' }]);
            } else if (res.pidData && isPlainObject(res.pidData)) {
              setAssistantDraft(() => normalizePid(res.pidData));
              setAiAssistantHistory((h) => [...h, { role: 'assistant', content: 'A draft PID is available. Say "apply" to make it the active PID.' }]);
            } else if (res.patch && isPlainObject(res.patch)) {
              setAssistantDraft(() => normalizePid({ ...(makeEmptyPid() as any), ...(res.patch as any) }));
              setAiAssistantHistory((h) => [...h, { role: 'assistant', content: 'A draft patch is available. Say "apply" to make it the active PID.' }]);
            }
          } catch (err) {
            // ignore
          }
        }
      }

      const replyText = typeof res.reply === 'string' ? res.reply : '';

      // When the assistant creates a brand-new PID from scratch, record the event
      if (applied && !hadPid) {
        setLastAssistantCreatedAt(Date.now());
      }

      const modelMsg: ChatMessage = {
        role: 'assistant',
        content: (() => {
          let base = replyText || 'Done.';
          // When the assistant creates a brand-new PID, include the guidance line
          if (applied && !hadPid) {
            base += '\n\nYou can use me or the Create button.';
          }
          return base;
        })(),
      };

      setAiAssistantHistory([...newHistory, modelMsg]);
      requestAnimationFrame(scrollColumnsTop);
      lastAssistantRequestKey.current = assistantKey;
    } catch (e: any) {
      let msg = normalizeErrorMessage(e, 'Assistant failed due to an unexpected error.');
      if (e?.name === 'AbortError') {
        msg = 'Request timed out. The server may be busy or unavailable.';
      }
      setError(msg);
      setWarnings([msg]);
    } finally {
      // clear assistant abort controller when done
      try { assistantAbortRef.current = null; } catch {}
      if (assistantInFlightKey.current === assistantKey) assistantInFlightKey.current = '';
      setIsLoading(false);
    }
  },
  [aiAssistantHistory, pid, setPid]
);

  const cancelAssistant = useCallback(() => {
    if (assistantAbortRef.current) {
      try { assistantAbortRef.current.abort('UserCancel'); } catch {}
      assistantAbortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const runRiskAgent = useCallback(async () => {
      if (!pid) {
        setError('No PID is loaded. Load or parse a PID before running the Risk Agent.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await postJson<any>('/api/ai/risk', { pidData: pid }, 45000);
        // Merge any assistant-style reply into history
        if (res && typeof res.reply === 'string' && res.reply.trim()) {
          setAiAssistantHistory((prev) => [...prev, { role: 'assistant', content: res.reply }]);
        }
        // Merge returned risks array into PID if present
        if (res && Array.isArray(res.risks)) {
          setPid((prev) => {
            const base = prev && isPlainObject(prev) ? prev : makeEmptyPid();
            return normalizePid({ ...(base as any), risks: res.risks });
          });
        }
      } catch (e: any) {
        let msg = normalizeErrorMessage(e, 'Risk agent failed.');
        setError(msg);
        setWarnings([msg]);
      } finally {
        setIsLoading(false);
      }
    }, [pid]);

    const runComplianceAgent = useCallback(async () => {
      if (!pid) {
        setError('No PID is loaded. Load or parse a PID before running the Compliance Agent.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await postJson<any>('/api/ai/compliance', { pidData: pid }, 45000);
        if (res && typeof res.reply === 'string' && res.reply.trim()) {
          setAiAssistantHistory((prev) => [...prev, { role: 'assistant', content: res.reply }]);
        }
        // Support a few possible response shapes for compliance checklist
        const checklist = Array.isArray(res.checklist)
          ? res.checklist
          : Array.isArray(res.items)
          ? res.items
          : Array.isArray(res.compliance)
          ? res.compliance
          : null;
        if (checklist) {
          setPid((prev) => {
            const base = prev && isPlainObject(prev) ? prev : makeEmptyPid();
            return normalizePid({ ...(base as any), complianceSecurityPrivacy: checklist });
          });
        }
      } catch (e: any) {
        let msg = normalizeErrorMessage(e, 'Compliance agent failed.');
        setError(msg);
        setWarnings([msg]);
      } finally {
        setIsLoading(false);
      }
    }, [pid]);

const pidData = useMemo(() => pid, [pid]);

  return {
    pidData, // MainContent expects pidData prop name
    setPidData: setPid, // convenience for any editors
    generalNotes,
    setGeneralNotes,
    aiAssistantHistory,
    setAiAssistantHistory,
    isLoading,
    error,
    warnings,
    parseDocument,
    cancelParsing,
    cancelAssistant,
    askAssistant,
    loadDemoData,
    createNew,
    clearAll,
    runRiskAgent,
    runComplianceAgent,
    lastAssistantCreatedAt,
  };
};