import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { demoData } from '../data/demoData';
import { perfMonitor } from '../lib/performanceMonitor';
// Client-side parse limits (should roughly match server.mjs)
const PARSE_SOFT_WARN_CHARS = 250000;
const PARSE_HARD_MAX_CHARS = 400000;
// Keep column scroll positions tidy
const scrollColumnsTop = () => {
    document.querySelectorAll('[data-col-scroll]').forEach((el) => {
        if (el)
            el.scrollTop = 0;
    });
};
// ---- Empty PID factory (strict, prevents UI crashes) ----
export const makeEmptyPid = () => ({
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
function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}
function coerceArray(v) {
    return Array.isArray(v) ? v : [];
}
/**
 * Merge parsed partial PID into a full PMOMaxPID shape.
 * Arrays are replaced (so the model can delete/reorder).
 */
// Strict canonical fill: every field present and non-empty
function mergeWithEmptyPid(parsed) {
    const blank = makeEmptyPid();
    const x = parsed && typeof parsed === 'object' ? parsed : {};
    const out = Object.assign(Object.assign({}, blank), x);
    // Title block
    out.titleBlock = Object.assign(Object.assign({}, blank.titleBlock), (x.titleBlock || {}));
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
    out.projectSponsor = Object.assign(Object.assign({}, blank.projectSponsor), (x.projectSponsor || {}));
    out.projectManagerOwner = Object.assign(Object.assign({}, blank.projectManagerOwner), (x.projectManagerOwner || {}));
    // All strings
    out.executiveSummary = String(out.executiveSummary || '');
    out.problemStatement = String(out.problemStatement || '');
    out.businessCaseExpectedValue = String(out.businessCaseExpectedValue || '');
    out.timelineOverview = String(out.timelineOverview || '');
    out.notesBackground = String(out.notesBackground || '');
    return out;
}
async function postJson(url, body, timeoutMs = 45000, existingController) {
    var _a;
    const controller = existingController !== null && existingController !== void 0 ? existingController : new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Timeout'), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!res.ok) {
            const t = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
        }
        return (await res.json());
    }
    catch (e) {
        const reason = (_a = controller === null || controller === void 0 ? void 0 : controller.signal) === null || _a === void 0 ? void 0 : _a.reason;
        // Distinguish user-initiated cancels from real timeouts.
        if (reason === 'UserCancel') {
            const cancelErr = new Error('USER_CANCELLED');
            cancelErr.code = 'USER_CANCELLED';
            throw cancelErr;
        }
        // Normalize aborts and timeouts into a clear, user-friendly timeout message.
        if ((e === null || e === void 0 ? void 0 : e.name) === 'AbortError' || e === 'Timeout' || (typeof (e === null || e === void 0 ? void 0 : e.message) === 'string' && /Timeout/i.test(e.message))) {
            throw new Error('Request timed out. The server may be busy or your document may be very large. Please try again or use a smaller, more structured PID.');
        }
        throw e;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
export const usePidLogic = () => {
    const [pid, setPid] = useState(null);
    const setPidData = setPid; // alias to avoid ReferenceError in assistant flow
    const [generalNotes, setGeneralNotes] = useState('');
    const [aiAssistantHistory, setAiAssistantHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [lastAssistantCreatedAt, setLastAssistantCreatedAt] = useState(null);
    // Track in-flight parse so the UI can cancel it (Reset, Load Demo, etc.).
    const parseAbortRef = useRef(null);
    useEffect(() => {
        // Keep pid = null on first load so the center panel can show the welcome schema.
    }, []);
    const clearAll = useCallback(() => {
        setPid(null);
        setGeneralNotes('');
        setAiAssistantHistory([]);
        setWarnings([]);
        setError(null);
        setLastAssistantCreatedAt(null);
        requestAnimationFrame(scrollColumnsTop);
    }, []);
    const loadDemoData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setWarnings([]);
        setAiAssistantHistory([]);
        try {
            // Small delay so spinners show consistently
            await new Promise((r) => setTimeout(r, 80));
            startTransition(() => {
                setPid(demoData);
                setGeneralNotes('RoadRunner is the internal codename. Use this space to capture high-level notes.');
                setAiAssistantHistory([
                    { role: 'assistant', content: 'Demo data loaded. Ask me to add a risk, refine an objective, or adjust dates.' },
                ]);
            });
            requestAnimationFrame(scrollColumnsTop);
        }
        catch (e) {
            setError('Failed to load demo data. Please try again.');
            setWarnings(['Demo data could not be loaded.']);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    // --- Section A: Parse pipeline (AI-backed, matches runtime JS behavior) ---
    const parseDocument = useCallback(async (text, model) => {
        const start = performance.now();
        setIsLoading(true);
        setError(null);
        setWarnings([]);
        try {
            // Cancel any previous in-flight parse before starting a new one.
            if (parseAbortRef.current) {
                try {
                    parseAbortRef.current.abort('UserCancel');
                }
                catch (_a) {
                    // ignore
                }
            }
            const controller = new AbortController();
            parseAbortRef.current = controller;
            if (!text || !text.trim()) {
                throw new Error('Please paste or upload some content to parse.');
            }
            if (text.length > PARSE_HARD_MAX_CHARS) {
                throw new Error(`Text too long (max ${Math.round(PARSE_HARD_MAX_CHARS / 1000)}KB). Please shorten or split your document.`);
            }
            if (text.length > PARSE_SOFT_WARN_CHARS) {
                console.warn('[PIDLOGIC] parseDocument: above soft warn threshold', text.length);
            }
            const env = await postJson('/api/ai/parse', model ? { text, model } : { text }, 90000, controller);
            if (!env || typeof env !== 'object') {
                throw new Error('Parse API returned an unexpected response.');
            }
            if (env.ok !== true) {
                throw new Error(env.error || 'Parse failed.');
            }
            const merged = mergeWithEmptyPid(env.pid);
            startTransition(() => {
                setPidData(merged);
                setWarnings(Array.isArray(env.warnings) ? env.warnings : []);
                setError(null);
            });
            requestAnimationFrame(scrollColumnsTop);
            perfMonitor.logEvent('parse_document', performance.now() - start, {
                textLength: text.length,
            });
        }
        catch (e) {
            // Swallow explicit user cancellations so Reset/Load Demo can interrupt cleanly.
            if ((e === null || e === void 0 ? void 0 : e.message) === 'USER_CANCELLED' || (e === null || e === void 0 ? void 0 : e.code) === 'USER_CANCELLED') {
                return;
            }
            // Always surface a concrete, user-readable error message.
            let msg;
            if (e && typeof e.message === 'string' && e.message.trim()) {
                msg = e.message.trim();
            }
            else if (typeof e === 'string' && e.trim()) {
                msg = e.trim();
            }
            else {
                try {
                    msg = JSON.stringify(e);
                }
                catch (_b) {
                    msg = 'Parsing failed due to an unexpected error.';
                }
            }
            setError(msg);
            setWarnings([msg]);
            // Re-throw so callers like InputPanel can surface the error inline
            throw new Error(msg);
        }
        finally {
            setIsLoading(false);
            parseAbortRef.current = null;
        }
    }, []);
    const cancelParsing = useCallback(() => {
        if (parseAbortRef.current) {
            try {
                parseAbortRef.current.abort('UserCancel');
            }
            catch (_a) {
                // ignore
            }
            parseAbortRef.current = null;
        }
        setIsLoading(false);
    }, []);
    const askAssistant = useCallback(async (userText, model) => {
        if (!userText || !userText.trim()) {
            setError('Please type a question or instruction for the assistant.');
            return;
        }
        setIsLoading(true);
        setError(null);
        const trimmedQuestion = userText.trim();
        // Handle simple "what do you do" introductions entirely client-side
        const lowerQ = trimmedQuestion.toLowerCase();
        if (lowerQ === 'what do you do' || lowerQ === 'what do you do?' || lowerQ === 'what can you do' || lowerQ === 'what can you do?') {
            const introReply = {
                role: 'assistant',
                content: 'I am PMOMax, the AI copilot for PMO leaders and project managers. I can help you parse or create Project Initiation Documents (PIDs), suggest objectives, KPIs, risks, timelines, and governance structures, and refine any section before export. You can use me or the Create button when you want to start a brand-new PID.',
            };
            setAiAssistantHistory((prev) => [
                ...prev,
                { role: 'user', content: trimmedQuestion },
                introReply,
            ]);
            setIsLoading(false);
            return;
        }
        const newHistory = [
            ...aiAssistantHistory,
            { role: 'user', content: trimmedQuestion },
        ];
        const tryParseJsonObject = (s) => {
            const raw = String(s || '').trim();
            if (!raw)
                return null;
            // Extract JSON from fenced blocks or raw text.
            const candidates = [];
            const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (fence === null || fence === void 0 ? void 0 : fence[1])
                candidates.push(fence[1]);
            candidates.push(raw);
            for (const c of candidates) {
                const t = c.trim();
                if (!t)
                    continue;
                if (!(t.startsWith('{') || t.startsWith('[')))
                    continue;
                try {
                    const obj = JSON.parse(t);
                    return obj;
                }
                catch (_a) {
                    // ignore
                }
            }
            return null;
        };
        try {
            // If no PID, only send Q&A context (no pidData)
            const effectivePid = pid || undefined;
            const msgArr = newHistory.map((m) => {
                var _a;
                return ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: typeof (m === null || m === void 0 ? void 0 : m.content) === 'string' ? m.content : String((_a = m === null || m === void 0 ? void 0 : m.content) !== null && _a !== void 0 ? _a : ''),
                });
            });
            const reqBody = effectivePid
                ? (model ? { pidData: effectivePid, messages: msgArr, model } : { pidData: effectivePid, messages: msgArr })
                : (model ? { messages: msgArr, model } : { messages: msgArr });
            const res = await postJson('/api/ai/assistant', reqBody);
            if (!res || res.ok !== true) {
                throw new Error((res === null || res === void 0 ? void 0 : res.error) || 'Assistant returned an unexpected response.');
            }
            const hadPid = !!pid;
            let applied = false;
            if (pid) {
                if (res.pid && isPlainObject(res.pid)) {
                    setPidData(() => mergeWithEmptyPid(res.pid));
                    applied = true;
                }
                else if (res.pidData && isPlainObject(res.pidData)) {
                    setPidData(() => mergeWithEmptyPid(res.pidData));
                    applied = true;
                }
                else if (res.patch && isPlainObject(res.patch)) {
                    setPidData((prev) => {
                        const base = prev && isPlainObject(prev) ? prev : makeEmptyPid();
                        return mergeWithEmptyPid(Object.assign(Object.assign({}, base), res.patch));
                    });
                    applied = true;
                }
                else if (typeof res.reply === 'string') {
                    // Fallback: try to parse JSON from the reply (either {patch} or full pid)
                    const parsed = tryParseJsonObject(res.reply);
                    if (parsed && isPlainObject(parsed)) {
                        if (parsed.titleBlock || parsed.executiveSummary) {
                            setPidData(() => mergeWithEmptyPid(parsed));
                            applied = true;
                        }
                        else {
                            setPidData((prev) => {
                                const base = prev && isPlainObject(prev) ? prev : makeEmptyPid();
                                return mergeWithEmptyPid(Object.assign(Object.assign({}, base), parsed));
                            });
                            applied = true;
                        }
                    }
                }
            }
            else {
                // No existing PID: allow assistant to create a fresh PID when it returns one
                if (res.pid && isPlainObject(res.pid)) {
                    setPidData(() => mergeWithEmptyPid(res.pid));
                    applied = true;
                }
                else if (res.pidData && isPlainObject(res.pidData)) {
                    setPidData(() => mergeWithEmptyPid(res.pidData));
                    applied = true;
                }
                else if (res.patch && isPlainObject(res.patch)) {
                    setPidData(() => mergeWithEmptyPid(Object.assign(Object.assign({}, makeEmptyPid()), res.patch)));
                    applied = true;
                }
                else if (typeof res.reply === 'string') {
                    const parsed = tryParseJsonObject(res.reply);
                    if (parsed && isPlainObject(parsed)) {
                        setPidData(() => mergeWithEmptyPid(parsed));
                        applied = true;
                    }
                }
            }
            const replyText = typeof res.reply === 'string' ? res.reply : '';
            // When the assistant creates a brand-new PID from scratch, record the event
            if (applied && !hadPid) {
                setLastAssistantCreatedAt(Date.now());
            }
            const modelMsg = {
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
        }
        catch (e) {
            let msg = 'Assistant failed due to an unexpected error.';
            if ((e === null || e === void 0 ? void 0 : e.name) === 'AbortError') {
                msg = 'Request timed out. The server may be busy or unavailable.';
            }
            else if (typeof (e === null || e === void 0 ? void 0 : e.message) === 'string') {
                msg = e.message;
            }
            setError(msg);
            setWarnings([msg]);
        }
        finally {
            setIsLoading(false);
        }
    }, [aiAssistantHistory, pid, scrollColumnsTop]);
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
        askAssistant,
        loadDemoData,
        clearAll,
        lastAssistantCreatedAt,
    };
};
