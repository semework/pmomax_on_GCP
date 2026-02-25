import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';

import type { PMOMaxPID, ChatMessage, BudgetLineItem, BudgetSummary } from '../types';
import { safeErrorMessage } from '../lib/safeError';
import { normalizeError } from '../lib/errorTools';
import { computeDeterministicBudget } from '../lib/deterministicBudget';
import { perfMonitor } from '../lib/performanceMonitor';
import { MAX_WORDS } from '../lib/supportedFormats';

/**
 * usePidLogic.ts
 *
 * Goals:
 * - Always keep PID shape complete (all canonical fields present)
 * - Deterministic-first budget baseline; optional AI enrichment
 * - Robust cancellation + timeouts
 * - Avoid accidental “create a whole PID” when user asks a question (client-side safety)
 *
 * Notes:
 * - This module intentionally avoids OCR.
 * - This hook is written to be tolerant of server response shape drift (pid / pidData / patch / reply JSON).
 */

// -----------------------------
// Client-side parse limits
// -----------------------------
const PARSE_SOFT_WARN_CHARS = 1_800_000;
const PARSE_HARD_MAX_CHARS = 3_500_000;

// -----------------------------
// Small utilities
// -----------------------------
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const capWords = (text: string, maxWords: number): { text: string; truncated: boolean } => {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text, truncated: false };
  return { text: words.slice(0, maxWords).join(' '), truncated: true };
};

const hashText = (input: string) => {
  let h = 0;
  const s = String(input || '');
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
};

const isPlainObject = (v: any): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

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

// -----------------------------
// Fetch helpers (timeout + retry)
// -----------------------------
async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 45_000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort('Timeout'), ms);

  const external = init.signal;
  if (external) {
    if (external.aborted) controller.abort((external as any).reason ?? 'Abort');
    else external.addEventListener('abort', () => controller.abort((external as any).reason ?? 'Abort'), { once: true });
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchWithTimeoutAndBackoff(
  url: string,
  init: RequestInit = {},
  ms = 45_000,
  maxRetries = 5,
): Promise<Response> {
  let attempt = 0;
  let lastErr: any = null;

  while (attempt <= maxRetries) {
    try {
      const res = await fetchWithTimeout(url, init, ms);

      // Retry on rate limits / transient overloads.
      if (res.status === 429 || res.status === 503) {
        // honor Retry-After if present
        const retryHeader = res.headers.get('Retry-After');
        let retryAfter = 0;
        if (retryHeader) {
          const parsed = parseInt(retryHeader, 10);
          if (!Number.isNaN(parsed)) retryAfter = parsed * 1000;
        }
        const jitter = Math.floor(Math.random() * 250);
        const backoff = Math.min(8_000, 500 * Math.pow(2, attempt));
        await sleep(retryAfter || backoff + jitter);
        attempt += 1;
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }

      return res;
    } catch (e: any) {
      lastErr = e;
      if (e?.name === 'AbortError') throw e;
      const jitter = Math.floor(Math.random() * 250);
      const backoff = Math.min(8_000, 500 * Math.pow(2, attempt));
      await sleep(backoff + jitter);
      attempt += 1;
    }
  }

  throw lastErr ?? new Error('Network error');
}

async function postJson<T>(
  url: string,
  body: any,
  timeoutMs = 120_000,
  controller?: AbortController,
): Promise<T> {
  const c = controller ?? new AbortController();
  const res = await fetchWithTimeoutAndBackoff(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: c.signal,
    },
    timeoutMs,
    6,
  );

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

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const t = await res.text().catch(() => '');
    const preview = t ? ` ${String(t).slice(0, 200)}` : '';
    throw new Error(`Server Error: Malformed Response.${preview}`);
  }

  return (await res.json()) as T;
}

// -----------------------------
// PID canonical shape utilities
// -----------------------------
export const makeEmptyPid = (): PMOMaxPID => ({
  titleBlock: { projectTitle: '', subtitle: '', generatedOn: '', projectId: '' } as any,
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
  projectSponsor: { name: '', role: '' } as any,
  projectManagerOwner: { name: '' } as any,
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

const toNumber = (value: any, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeBudgetItem = (row: any, fallbackSource: 'deterministic' | 'ai' = 'deterministic'): BudgetLineItem | null => {
  if (!row || typeof row !== 'object') return null;
  const task = String(row.task || row.item || row.name || 'Work item').trim() || 'Work item';
  const role = String(row.role || row.category || row.owner || 'Engineering').trim() || 'Engineering';
  const estimatedHours = toNumber(row.estimatedHours ?? row.hours, 0);
  const rateUsdPerHour = toNumber(row.rateUsdPerHour ?? row.hourlyRate ?? row.rate, 0);
  const complexityMultiplier = toNumber(row.complexityMultiplier ?? row.multiplier, 1) || 1;
  const totalCostUsd = toNumber(row.totalCostUsd ?? row.cost, Math.max(0, estimatedHours * rateUsdPerHour * complexityMultiplier));
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
  } as any;
};

const normalizeBudgetItems = (rows: any[], fallbackSource: 'deterministic' | 'ai') =>
  (Array.isArray(rows) ? rows : []).map((r) => normalizeBudgetItem(r, fallbackSource)).filter(Boolean) as BudgetLineItem[];

const buildBudgetSummary = (items: BudgetLineItem[]): BudgetSummary => {
  const subtotalByRoleUsd = items.reduce<Record<string, number>>((acc, item: any) => {
    const role = String(item.role || 'Other');
    acc[role] = (acc[role] || 0) + (Number(item.totalCostUsd) || 0);
    return acc;
  }, {});
  const totalCostUsd = Object.values(subtotalByRoleUsd).reduce((sum, val) => sum + val, 0);
  return {
    currency: 'USD',
    totalCostUsd,
    subtotalByRoleUsd,
    notes: ['USD baseline generated deterministically; refine with actuals when available.'],
  } as any;
};

const normalizeBudgetSummary = (summary: any, fallback: BudgetSummary): BudgetSummary => {
  if (!summary || typeof summary !== 'object') return fallback;
  const totalCostUsd = toNumber(summary.totalCostUsd ?? summary.total, (fallback as any).totalCostUsd);
  const subtotalByRoleUsd =
    summary.subtotalByRoleUsd && typeof summary.subtotalByRoleUsd === 'object'
      ? summary.subtotalByRoleUsd
      : (fallback as any).subtotalByRoleUsd;
  const notes = Array.isArray(summary.notes)
    ? summary.notes.map((n: any) => String(n)).filter(Boolean)
    : Array.isArray(summary.assumptions)
      ? summary.assumptions.map((n: any) => String(n)).filter(Boolean)
      : (fallback as any).notes;

  return { currency: 'USD', totalCostUsd, subtotalByRoleUsd, notes } as any;
};

const mergeBudgetItems = (baseItems: BudgetLineItem[], aiItems: BudgetLineItem[]): BudgetLineItem[] => {
  const merged = [...baseItems];
  const index = new Map<string, number>();
  merged.forEach((row: any, idx) => index.set(`${row.role}::${row.task}`, idx));

  aiItems.forEach((aiRow: any) => {
    const key = `${aiRow.role}::${aiRow.task}`;
    if (index.has(key)) {
      const idx = index.get(key) as number;
      const base: any = merged[idx];
      const estimatedHours = Number.isFinite(aiRow.estimatedHours) && aiRow.estimatedHours > 0 ? aiRow.estimatedHours : base.estimatedHours;
      const rateUsdPerHour = Number.isFinite(aiRow.rateUsdPerHour) && aiRow.rateUsdPerHour > 0 ? aiRow.rateUsdPerHour : base.rateUsdPerHour;
      const complexityMultiplier = Number.isFinite(aiRow.complexityMultiplier) && aiRow.complexityMultiplier > 0 ? aiRow.complexityMultiplier : base.complexityMultiplier;
      const totalCostUsd = Number.isFinite(aiRow.totalCostUsd) && aiRow.totalCostUsd > 0 ? aiRow.totalCostUsd : Math.max(0, estimatedHours * rateUsdPerHour * complexityMultiplier);
      merged[idx] = { ...base, estimatedHours, rateUsdPerHour, complexityMultiplier, totalCostUsd, justification: aiRow.justification || base.justification } as any;
    } else {
      merged.push({ ...(aiRow as any), source: 'ai' } as any);
    }
  });

  return merged;
};

/**
 * Merge parsed partial PID into a full PMOMaxPID shape.
 * Arrays are replaced (so the model can delete/reorder).
 */
function mergeWithEmptyPid(parsed: Partial<PMOMaxPID> | null | undefined): PMOMaxPID {
  const blank = makeEmptyPid();
  const x: any = parsed && typeof parsed === 'object' ? parsed : {};
  const out: any = { ...blank, ...x };

  out.titleBlock = { ...blank.titleBlock, ...(x.titleBlock || {}) };
  out.titleBlock.projectTitle = String(out.titleBlock.projectTitle || '');
  out.titleBlock.subtitle = String(out.titleBlock.subtitle || '');
  out.titleBlock.generatedOn = String(out.titleBlock.generatedOn || '');
  out.titleBlock.projectId = String(out.titleBlock.projectId || '');

  // arrays
  const arrKeys = [
    'objectivesSmart',
    'kpis',
    'scopeInclusions',
    'scopeExclusions',
    'assumptions',
    'constraints',
    'dependencies',
    'stakeholders',
    'teamRaci',
    'milestones',
    'workBreakdownTasks',
    'budgetCostBreakdown',
    'resourcesTools',
    'risks',
    'mitigationsContingencies',
    'issuesDecisionsLog',
    'communicationPlan',
    'governanceApprovals',
    'complianceSecurityPrivacy',
    'openQuestionsNextSteps',
  ];
  for (const k of arrKeys) out[k] = Array.isArray(out[k]) ? out[k] : [];

  // objects
  out.projectSponsor = { ...blank.projectSponsor, ...(x.projectSponsor || {}) };
  out.projectManagerOwner = { ...blank.projectManagerOwner, ...(x.projectManagerOwner || {}) };

  // strings
  out.executiveSummary = String(out.executiveSummary || '');
  out.problemStatement = String(out.problemStatement || '');
  out.businessCaseExpectedValue = String(out.businessCaseExpectedValue || '');
  out.timelineOverview = String(out.timelineOverview || '');
  out.notesBackground = String(out.notesBackground || '');

  return out as PMOMaxPID;
}

function applyDeterministicBudget(pid: PMOMaxPID, contextText = ''): PMOMaxPID {
  const baseline = computeDeterministicBudget(pid, contextText);
  const normalizedRows = normalizeBudgetItems((pid as any)?.budgetCostBreakdown, 'deterministic');
  const rows = normalizedRows.length > 0 ? normalizedRows : (baseline as any).items;
  const summaryFallback = buildBudgetSummary(rows);
  const summary = normalizeBudgetSummary((pid as any)?.budgetSummary, summaryFallback);

  return { ...pid, budgetCostBreakdown: rows as any, budgetSummary: summary as any } as any;
}

const normalizePid = (parsed: Partial<PMOMaxPID> | null | undefined): PMOMaxPID =>
  mergeWithEmptyPid(parsed);

// -----------------------------
// Assistant reply JSON extraction
// -----------------------------
const tryParseJsonObject = (s: string): any | null => {
  const raw = String(s || '').trim();
  if (!raw) return null;

  const candidates: string[] = [];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) candidates.push(fence[1]);
  candidates.push(raw);

  for (const c of candidates) {
    const t = c.trim();
    if (!t) continue;
    if (!(t.startsWith('{') || t.startsWith('['))) continue;
    try {
      return JSON.parse(t);
    } catch {
      // ignore
    }
  }
  return null;
};

// -----------------------------
// UI helpers
// -----------------------------
const scrollColumnsTop = () => {
  try {
    // Keep this intentionally minimal; avoid crashing SSR/tests.
    const el = document?.querySelector?.('#main-scroll-container') as any;
    if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: 0, behavior: 'smooth' });
    else window?.scrollTo?.({ top: 0, behavior: 'smooth' } as any);
  } catch {
    // ignore
  }
};

// -----------------------------
// Main Hook
// -----------------------------
type ParseEnvelope =
  | { ok: true; pid: PMOMaxPID; warnings?: string[]; meta?: any }
  | { ok: false; error: string; warnings?: string[]; meta?: any };

export const usePidLogic = () => {
  const [pid, setPid] = useState<PMOMaxPID | null>(null);
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [aiAssistantHistory, setAiAssistantHistory] = useState<ChatMessage[]>([]);
  const [assistantDraft, setAssistantDraft] = useState<PMOMaxPID | null>(null); // kept for compat; auto-applied
  const [isLoading, setIsLoading] = useState(false);
  const [isBudgeting, setIsBudgeting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastAssistantCreatedAt, setLastAssistantCreatedAt] = useState<number | null>(null);

  const [lastParsedText, setLastParsedText] = useState<string>('');
  const [lastParsedTextLength, setLastParsedTextLength] = useState<number>(0);

  // Tokens / keys to dedupe requests
  const notesChunkTokenRef = useRef<number>(0);
  const lastParseRequestKey = useRef<string>('');
  const parseInFlightKey = useRef<string>('');
  const lastAssistantRequestKey = useRef<string>('');
  const assistantInFlightKey = useRef<string>('');
  const budgetInFlightKey = useRef<string>('');
  const lastBudgetRequestKey = useRef<string>('');

  // Abort controllers
  const parseAbortRef = useRef<AbortController | null>(null);
  const assistantAbortRef = useRef<AbortController | null>(null);
  const budgetAbortRef = useRef<AbortController | null>(null);
  const demoAbortRef = useRef<AbortController | null>(null);
  const createAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Keep pid = null on first load so the center panel can show the welcome schema.
  }, []);

  const clearAll = useCallback(() => {
    try { parseAbortRef.current?.abort('UserCancel'); } catch {}
    parseAbortRef.current = null;

    try { assistantAbortRef.current?.abort('UserCancel'); } catch {}
    assistantAbortRef.current = null;

    try { budgetAbortRef.current?.abort('UserCancel'); } catch {}
    budgetAbortRef.current = null;

    try { demoAbortRef.current?.abort('UserCancel'); } catch {}
    demoAbortRef.current = null;

    try { createAbortRef.current?.abort('UserCancel'); } catch {}
    createAbortRef.current = null;

    setPid(null);
    setGeneralNotes('');
    setAiAssistantHistory([]);
    setAssistantDraft(null);
    setError(null);
    setWarnings([]);
    setLastAssistantCreatedAt(null);
    setIsBudgeting(false);
    setIsLoading(false);

    requestAnimationFrame(scrollColumnsTop);
  }, []);

  const requestBudgetForPid = useCallback(
    async (pidData: PMOMaxPID, contextText = '') => {
      if (!pidData) return;

      // Avoid concurrent budget runs
      if (isBudgeting) return;

      const baselinePid = applyDeterministicBudget(mergeWithEmptyPid(pidData), contextText);
      const baselineItems = normalizeBudgetItems((baselinePid as any).budgetCostBreakdown, 'deterministic');
      const baselineSummary = normalizeBudgetSummary((baselinePid as any).budgetSummary, buildBudgetSummary(baselineItems));
      setPid({ ...(baselinePid as any), budgetCostBreakdown: baselineItems as any, budgetSummary: baselineSummary as any });

      // Dedupe budget request key
      const key = [
        (pidData as any)?.titleBlock?.projectTitle || '',
        (pidData as any)?.timelineOverview || '',
        (pidData as any)?.notesBackground || '',
        String((pidData as any)?.workBreakdownTasks?.length || 0),
      ].join('|');

      const budgetKey = `${hashText(key)}:${hashText(contextText || '')}`;
      if (lastBudgetRequestKey.current === budgetKey) return;
      if (budgetInFlightKey.current === budgetKey) return;

      lastBudgetRequestKey.current = budgetKey;
      budgetInFlightKey.current = budgetKey;

      // Cancel any previous in-flight budget request
      try { budgetAbortRef.current?.abort('UserCancel'); } catch {}
      const controller = new AbortController();
      budgetAbortRef.current = controller;

      setIsBudgeting(true);
      try {
        const budgetEnv = await postJson<any>('/api/ai/budget', { pidData: baselinePid, contextText }, 120_000, controller);

        if (budgetEnv?.ok && (budgetEnv.pid || budgetEnv.budgetCostBreakdown || budgetEnv.budgetSummary)) {
          const aiPid = budgetEnv.pid || budgetEnv;
          const aiItems = normalizeBudgetItems((aiPid as any)?.budgetCostBreakdown, 'ai');
          const mergedItems = mergeBudgetItems(baselineItems, aiItems);
          const mergedSummary = normalizeBudgetSummary((aiPid as any)?.budgetSummary, buildBudgetSummary(mergedItems));
          setPid({ ...(baselinePid as any), budgetCostBreakdown: mergedItems as any, budgetSummary: mergedSummary as any });
        }
      } catch (e: any) {
        // Budget errors are non-fatal; keep deterministic baseline silently.
        const msg = normalizeErrorMessage(e, '');
        if (msg && /HTTP\s+429/i.test(msg)) {
          // ignore rate limit noise
        }
      } finally {
        setIsBudgeting(false);
        budgetAbortRef.current = null;
        if (budgetInFlightKey.current === budgetKey) budgetInFlightKey.current = '';
      }
    },
    [isBudgeting],
  );

  // NOTE: Budget generation is now opt-in only (no automatic budget injection).

  const loadDemoData = useCallback(async () => {
    try { demoAbortRef.current?.abort('UserCancel'); } catch {}
    const controller = new AbortController();
    demoAbortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setWarnings([]);
    setAiAssistantHistory([]);

    try {
      await sleep(80);
      if (controller.signal.aborted) return;

      const res = await fetchWithTimeout('/api/load-demo', { method: 'GET' }, 30_000);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: any = await res.json().catch(() => ({}));
      const demoPid = normalizePid(data?.pid || data?.pidData || data);

      startTransition(() => {
        setPid(demoPid);
        setGeneralNotes('');
        setAiAssistantHistory([
          { role: 'assistant', content: 'Demo data loaded. Ask me to add a risk, refine an objective, or adjust dates.' } as any,
        ]);
      });

      requestAnimationFrame(scrollColumnsTop);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      setError('Failed to load demo data from server. Please try again.');
    } finally {
      setIsLoading(false);
      demoAbortRef.current = null;
    }
  }, []);

  const createNew = useCallback(async () => {
    try { createAbortRef.current?.abort('UserCancel'); } catch {}
    const controller = new AbortController();
    createAbortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      await sleep(50);
      if (controller.signal.aborted) return;
      setPid(makeEmptyPid());
      setGeneralNotes('');
      setAiAssistantHistory([]);
      setAssistantDraft(null);
    } catch {
      if (controller.signal.aborted) return;
      setError('Failed to create new document.');
    } finally {
      setIsLoading(false);
      createAbortRef.current = null;
    }
  }, []);

  // -----------------------------
  // Parse pipeline
  // -----------------------------
  const parseDocument = useCallback(
    async (text: string, model?: 'gemini-2.5-flash' | 'gemini-pro-2.5', _initialWarnings: string[] = []) => {
      const start = performance.now();
      notesChunkTokenRef.current += 1;
      const notesToken = notesChunkTokenRef.current;

      // Clear PID and related state before parsing new content
      setPid(null);
      setGeneralNotes('');
      setAiAssistantHistory([]);
      setAssistantDraft(null);
      setError(null);
      setWarnings([]);
      setIsLoading(true);

      // Cancel any previous parse
      try { parseAbortRef.current?.abort('UserCancel'); } catch {}
      const controller = new AbortController();
      parseAbortRef.current = controller;

      try {
        if (!text || !text.trim()) {
          setError('Please paste or upload some content to parse.');
          return { ok: false as const, error: 'No content to parse.' };
        }

        if (text.length > PARSE_HARD_MAX_CHARS) {
          setError(`Text too long (max ${Math.round(PARSE_HARD_MAX_CHARS / 1000)}KB). Please shorten or split your document.`);
          return { ok: false as const, error: 'Text too long.' };
        }

        const capped = capWords(text, MAX_WORDS);
        const safeText = capped.text;

        if (safeText.length > PARSE_SOFT_WARN_CHARS) {
          // soft warning only; do not surface in UI
          console.warn('[PIDLOGIC] parseDocument: above soft warn threshold', safeText.length);
        }

        const parseKey = `${model || 'default'}:${hashText(safeText)}`;
        if (parseInFlightKey.current === parseKey || lastParseRequestKey.current === parseKey) {
          return { ok: true as const };
        }
        parseInFlightKey.current = parseKey;

        let env: ParseEnvelope;
        try {
          env = await postJson<ParseEnvelope>(
            '/api/ai/parse',
            model ? { text: safeText, model } : { text: safeText },
            60_000,
            controller,
          );
        } catch (fetchErr) {
          setError('Parse API request failed. Please try again later.');
          return { ok: false as const, error: 'Parse API request failed.' };
        }

        if (!env || typeof env !== 'object') {
          setError('Parse API returned an unexpected response.');
          return { ok: false as const, error: 'Unexpected parse response.' };
        }

        if (env.ok !== true) {
          const errMsg = (env as any)?.error || '';
          // Only set error if there is a real error message
          if (errMsg && !/parse failed/i.test(errMsg)) {
            setError(errMsg);
            return { ok: false as const, error: errMsg };
          }
          // If no real error, clear error and continue
          setError(null);
          return { ok: false as const, error: '' };
        }

        const merged = normalizePid((env as any).pid);
        setError(null); // Clear any lingering error on success
        const notesText = String((merged as any).notesBackground || '');
        const chunkSize = 2000;

        if (notesText.length > 10_000) {
          const firstChunk = notesText.slice(0, chunkSize);

          startTransition(() => {
            setPid({ ...(merged as any), notesBackground: firstChunk });
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
              return { ...(prev as any), notesBackground: `${String((prev as any).notesBackground || '')}${next}` } as any;
            });

            requestAnimationFrame(pump);
          };

          requestAnimationFrame(pump);
        } else {
          startTransition(() => {
            setPid(merged);
            setError(null);
          });
        }

        setLastParsedText(String(text || ''));
        setLastParsedTextLength(String(text || '').length);

        requestAnimationFrame(scrollColumnsTop);

        perfMonitor.logEvent('parse_document', performance.now() - start, { textLength: text.length });
        lastParseRequestKey.current = parseKey;

        return { ok: true as const };
      } catch (e: any) {
        if (e?.message === 'USER_CANCELLED' || (e as any)?.code === 'USER_CANCELLED') {
          setError('Parse cancelled by user.');
          return { ok: false as const, error: 'USER_CANCELLED' };
        }
        let msg = '';
        if (isTimeoutError(e)) {
          msg = 'Parsing is taking too long for this document. Try splitting the file or reducing the content.';
        } else {
          msg = normalizeErrorMessage(e, '');
        }
        // Only show 'Parsing failed.' if there is a true parse failure (error, not partial/empty)
        if (msg && msg !== '' && msg !== '[object Object]') {
          setError(msg);
          return { ok: false as const, error: msg };
        } else {
          setError(null);
          return { ok: false as const, error: '' };
        }
      } finally {
        setIsLoading(false);
        parseAbortRef.current = null;
        if (parseInFlightKey.current) parseInFlightKey.current = '';
      }
    },
    [requestBudgetForPid],
  );

  const cancelParsing = useCallback(() => {
    try { parseAbortRef.current?.abort('UserCancel'); } catch {}
    parseAbortRef.current = null;

    try { demoAbortRef.current?.abort('UserCancel'); } catch {}
    demoAbortRef.current = null;

    try { createAbortRef.current?.abort('UserCancel'); } catch {}
    createAbortRef.current = null;

    setIsLoading(false);
  }, []);

  // -----------------------------
  // Assistant
  // -----------------------------
  const askAssistant = useCallback(
    async (userText: string, model?: 'gemini-2.5-flash' | 'gemini-pro-2.5', appState?: any) => {
      if (!userText || !userText.trim()) {
        setError('Please type a question or instruction for the assistant.');
        return;
      }

      const trimmedQuestion = userText.trim();
      const lowerQ = trimmedQuestion.toLowerCase();

      // Handle trivial/gibberish locally
      if (/^([a-z])\1{3,}$/i.test(lowerQ) || /^\W+$/.test(lowerQ)) {
        setAiAssistantHistory((prev) => [...prev, { role: 'user', content: trimmedQuestion } as any, { role: 'assistant', content: "I didn't understand that. Please rephrase your request (e.g., 'add 3 risks' or 'refine objectives')." } as any]);
        return;
      }

      // Handle basic intro locally
      if (
        lowerQ === 'what do you do' ||
        lowerQ === 'what do you do?' ||
        lowerQ === 'what can you do' ||
        lowerQ === 'what can you do?'
      ) {
        setAiAssistantHistory((prev) => [
          ...prev,
          { role: 'user', content: trimmedQuestion } as any,
          {
            role: 'assistant',
            content:
              'I am PMOMax, the AI copilot for PMO leaders and project managers. I can parse or create Project Initiation Documents (PIDs), suggest objectives, KPIs, risks, timelines, and governance structures, and refine any section before export.',
          } as any,
        ]);
        return;
      }

      // Lightweight local answers that must reflect live PID data
      const hasPidLocal =
        pid &&
        isPlainObject(pid) &&
        (pid as any).titleBlock &&
        typeof (pid as any).titleBlock.projectTitle === 'string' &&
        (pid as any).titleBlock.projectTitle.trim().length > 0;

      const safeArr = (v: any) => (Array.isArray(v) ? v : []);
      const asText = (v: any) => (typeof v === 'string' ? v.trim() : '');

      const summarizeRisks = () => {
        const rows = safeArr((pid as any)?.risks);
        if (rows.length === 0) return 'Risks: none listed in the current PID.';
        const top = rows
          .filter((r: any) => r && (asText(r.risk) || asText(r.mitigation)))
          .slice(0, 8)
          .map((r: any, i: number) => {
            const risk = asText(r.risk) || 'Risk';
            const mit = asText(r.mitigation);
            return mit ? `${i + 1}. ${risk} — Mitigation: ${mit}` : `${i + 1}. ${risk}`;
          });
        return `Risks (${rows.length}):\n` + (top.length ? top.join('\n') : 'Risks: listed but empty rows.');
      };

      const summarizeCompliance = () => {
        const rows = safeArr((pid as any)?.complianceSecurityPrivacy);
        if (rows.length === 0) return 'Compliance gaps: no compliance/security/privacy items listed in the current PID.';
        const missingNotes = rows.filter((r: any) => r && asText(r.requirement) && !asText(r.notes)).length;
        const top = rows
          .filter((r: any) => r && (asText(r.requirement) || asText(r.notes)))
          .slice(0, 8)
          .map((r: any, i: number) => {
            const req = asText(r.requirement) || 'Requirement';
            const notes = asText(r.notes);
            return notes ? `${i + 1}. ${req} — Notes: ${notes}` : `${i + 1}. ${req} — Notes: (missing)`;
          });
        const gapLine = missingNotes > 0 ? `\nPotential gaps: ${missingNotes} item(s) missing notes.` : '';
        return `Compliance / Security / Privacy (${rows.length}):\n` + (top.length ? top.join('\n') : 'Compliance: listed but empty rows.') + gapLine;
      };

      const summarizeStatus = () => {
        const title = asText((pid as any)?.titleBlock?.projectTitle) || 'Untitled project';
        const phase = asText((pid as any)?.titleBlock?.phase);
        const tasks = safeArr((pid as any)?.workBreakdownTasks);
        const milestones = safeArr((pid as any)?.milestones);
        const allDates: number[] = [];
        const pushDate = (s: any) => {
          const t = Date.parse(String(s || ''));
          if (Number.isFinite(t)) allDates.push(t);
        };
        tasks.forEach((t: any) => {
          pushDate(t?.start);
          pushDate(t?.end);
        });
        milestones.forEach((m: any) => pushDate(m?.targetDate));
        let window = '';
        if (allDates.length) {
          const min = new Date(Math.min(...allDates));
          const max = new Date(Math.max(...allDates));
          const fmt = (d: Date) => d.toISOString().slice(0, 10);
          window = `Timeline (from tasks/milestones): ${fmt(min)} to ${fmt(max)}.`;
        }
        const phaseLine = phase ? `Phase: ${phase}.` : '';
        return `Current project status:\nTitle: ${title}. ${phaseLine}${phaseLine && window ? ' ' : ''}${window}`.trim();
      };

      if (hasPidLocal) {
        if (/(^|\b)(summarize|summary|list|show|current)(\b|$)/.test(lowerQ) && /\brisk(s)?\b/.test(lowerQ)) {
          setAiAssistantHistory((prev) => [...prev, { role: 'user', content: trimmedQuestion } as any, { role: 'assistant', content: summarizeRisks() } as any]);
          return;
        }
        if (/(compliance|security|privacy)/.test(lowerQ) && /(gap|gaps|summarize|summary|list|show|check|current)/.test(lowerQ)) {
          setAiAssistantHistory((prev) => [...prev, { role: 'user', content: trimmedQuestion } as any, { role: 'assistant', content: summarizeCompliance() } as any]);
          return;
        }
        if (/(project status|current status)/.test(lowerQ)) {
          setAiAssistantHistory((prev) => [...prev, { role: 'user', content: trimmedQuestion } as any, { role: 'assistant', content: summarizeStatus() } as any]);
          return;
        }
      }

      if (/(how do i use create mode|use create mode|create mode help)/.test(lowerQ)) {
        setAiAssistantHistory((prev) => [...prev, { role: 'user', content: trimmedQuestion } as any, { role: 'assistant', content: 'Create mode lets you draft a PID from scratch. Describe the project (goal, scope, timeline, stakeholders), chat with the assistant to refine fields, and load examples to prefill. When ready, the PID appears below for review and export.' } as any]);
        return;
      }

      if (/(request help|help me|need help)/.test(lowerQ)) {
        setAiAssistantHistory((prev) => [...prev, { role: 'user', content: trimmedQuestion } as any, { role: 'assistant', content: 'Tell me what you want to do (e.g., create a PID, refine objectives, summarize risks, check compliance gaps, or fix a section). If a PID is loaded, I can summarize or update specific sections.' } as any]);
        return;
      }

      setIsLoading(true);
      setError(null);

      const assistantKeyBase = JSON.stringify({
        q: trimmedQuestion,
        model: model || '',
        pidTitle: (pid as any)?.titleBlock?.projectTitle || '',
        pidId: (pid as any)?.titleBlock?.projectId || '',
        mode: appState?.mode || '',
        activeSection: appState?.activeSectionId || '',
        navOpen: !!appState?.navOpen,
        createMode: !!appState?.isCreateMode,
        hasDraft: !!appState?.hasDraftPid,
      });
      const assistantKey = hashText(assistantKeyBase);

      if (assistantInFlightKey.current === assistantKey || lastAssistantRequestKey.current === assistantKey) return;
      assistantInFlightKey.current = assistantKey;

      const newHistory: ChatMessage[] = [...aiAssistantHistory, { role: 'user', content: trimmedQuestion } as any];

      // Only send PID if it has a non-empty title (avoid sending empty shells)
      const hasPid =
        pid &&
        isPlainObject(pid) &&
        (pid as any).titleBlock &&
        typeof (pid as any).titleBlock.projectTitle === 'string' &&
        (pid as any).titleBlock.projectTitle.trim().length > 0;

      const msgArr = newHistory.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m?.content === 'string' ? m.content : String(m?.content ?? ''),
      }));

      const baseBody = hasPid
        ? (model ? { pidData: pid, messages: msgArr, model } : { pidData: pid, messages: msgArr })
        : (model ? { messages: msgArr, model } : { messages: msgArr });

      const reqBody = appState && typeof appState === 'object'
        ? { ...(baseBody as any), appState }
        : baseBody;

      // Cancel any previous assistant request
      try { assistantAbortRef.current?.abort('UserCancel'); } catch {}
      const controller = new AbortController();
      assistantAbortRef.current = controller;

      const hadPid = !!pid;

      try {
        const res = await postJson<any>('/api/ai/assistant', reqBody, 45_000, controller);
        if (!res || res.ok !== true) throw new Error(res?.error || 'Assistant returned an unexpected response.');

        let applied = false;

        // Apply returned PID/patch if present (auto-apply; no 'apply' gating)
        if (res.pid && isPlainObject(res.pid)) {
          setPid(() => normalizePid(res.pid));
          applied = true;
        } else if (res.pidData && isPlainObject(res.pidData)) {
          setPid(() => normalizePid(res.pidData));
          applied = true;
        } else if (res.patch && isPlainObject(res.patch)) {
          setPid((prev) => {
            const base = prev && isPlainObject(prev) ? (prev as any) : (makeEmptyPid() as any);
            return normalizePid({ ...base, ...(res.patch as any) });
          });
          applied = true;
        } else if (typeof res.reply === 'string') {
          const parsed = tryParseJsonObject(res.reply);
          if (parsed && isPlainObject(parsed)) {
            if ((parsed as any).titleBlock || (parsed as any).executiveSummary) {
              setPid(() => normalizePid(parsed));
            } else {
              setPid((prev) => {
                const base = prev && isPlainObject(prev) ? (prev as any) : (makeEmptyPid() as any);
                return normalizePid({ ...base, ...(parsed as any) });
              });
            }
            applied = true;
          }
        }

        // If a brand-new PID was created, record it
        if (applied && !hadPid) setLastAssistantCreatedAt(Date.now());

        const replyText = typeof res.reply === 'string' ? res.reply : '';
        const modelMsg: ChatMessage = {
          role: 'assistant',
          content: replyText || 'Done.',
        } as any;

        setAiAssistantHistory([...newHistory, modelMsg]);
        requestAnimationFrame(scrollColumnsTop);
        lastAssistantRequestKey.current = assistantKey;
      } catch (e: any) {
        let msg = normalizeErrorMessage(e, '');
        if (e?.name === 'AbortError') msg = 'Request timed out. The server may be busy or unavailable.';
        setError(msg);
        setWarnings([msg]);
      } finally {
        assistantAbortRef.current = null;
        if (assistantInFlightKey.current === assistantKey) assistantInFlightKey.current = '';
        setIsLoading(false);
      }
    },
    [aiAssistantHistory, pid],
  );

  const cancelAssistant = useCallback(() => {
    try { assistantAbortRef.current?.abort('UserCancel'); } catch {}
    assistantAbortRef.current = null;
    setIsLoading(false);
  }, []);

  // -----------------------------
  // Agents
  // -----------------------------
  const runRiskAgent = useCallback(async (appState?: any) => {
    let workingPid = pid;
    if (!workingPid) {
      workingPid = makeEmptyPid();
      setPid(workingPid);
    }
    setIsLoading(true);
    setError(null);

    // Immediate UX feedback
    setAiAssistantHistory((prev) => [
      ...prev,
      { role: 'user', content: 'Run Risk Agent' } as any,
      { role: 'assistant', content: 'Running risk analysis on the current PID…' } as any,
    ]);

    try {
      const res = await postJson<any>('/api/ai/risk', appState && typeof appState === 'object' ? { pidData: workingPid, appState } : { pidData: workingPid }, 45_000);
      if (res && typeof res.reply === 'string' && res.reply.trim()) {
        setAiAssistantHistory((prev) => [...prev, { role: 'assistant', content: res.reply } as any]);
      }
      if (res && Array.isArray(res.risks)) {
        setPid((prev) => {
          const base = prev && isPlainObject(prev) ? (prev as any) : (makeEmptyPid() as any);
          return normalizePid({ ...base, risks: res.risks });
        });
      }
    } catch (e: any) {
      const msg = normalizeErrorMessage(e, 'Risk agent failed.');
      setError(msg);
      setWarnings([msg]);
    } finally {
      setIsLoading(false);
    }
  }, [pid]);

  const runComplianceAgent = useCallback(async (appState?: any) => {
    let workingPid = pid;
    if (!workingPid) {
      workingPid = makeEmptyPid();
      setPid(workingPid);
    }
    setIsLoading(true);
    setError(null);

    // Immediate UX feedback
    setAiAssistantHistory((prev) => [
      ...prev,
      { role: 'user', content: 'Run Compliance Agent' } as any,
      { role: 'assistant', content: 'Running compliance/security analysis on the current PID…' } as any,
    ]);

    try {
      const res = await postJson<any>('/api/ai/compliance', appState && typeof appState === 'object' ? { pidData: workingPid, appState } : { pidData: workingPid }, 45_000);
      if (res && typeof res.reply === 'string' && res.reply.trim()) {
        setAiAssistantHistory((prev) => [...prev, { role: 'assistant', content: res.reply } as any]);
      }
      const checklist = Array.isArray(res.checklist)
        ? res.checklist
        : Array.isArray(res.items)
          ? res.items
          : Array.isArray(res.compliance)
            ? res.compliance
            : null;

      if (checklist) {
        setPid((prev) => {
          const base = prev && isPlainObject(prev) ? (prev as any) : (makeEmptyPid() as any);
          return normalizePid({ ...base, complianceSecurityPrivacy: checklist });
        });
      }
    } catch (e: any) {
      const msg = normalizeErrorMessage(e, 'Compliance agent failed.');
      setError(msg);
      setWarnings([msg]);
    } finally {
      setIsLoading(false);
    }
  }, [pid]);

  // Cleanup controllers on unmount
  useEffect(() => {
    return () => {
      try { parseAbortRef.current?.abort('UserCancel'); } catch {}
      try { assistantAbortRef.current?.abort('UserCancel'); } catch {}
      try { budgetAbortRef.current?.abort('UserCancel'); } catch {}
      try { demoAbortRef.current?.abort('UserCancel'); } catch {}
      try { createAbortRef.current?.abort('UserCancel'); } catch {}
    };
  }, []);

  const pidData = useMemo(() => pid, [pid]);

  const appendAssistantMessage = useCallback((message: ChatMessage) => {
    if (!message || !message.content) return;
    setAiAssistantHistory((prev) => [...prev, message]);
  }, []);

  return {
    pidData,
    setPidData: setPid, // convenience for editors
    generalNotes,
    setGeneralNotes,
    aiAssistantHistory,
    setAiAssistantHistory,
    appendAssistantMessage,
    assistantDraft,
    setAssistantDraft,
    isLoading,
    isBudgeting,
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
    lastParsedText,
    lastParsedTextLength,
  };
};
