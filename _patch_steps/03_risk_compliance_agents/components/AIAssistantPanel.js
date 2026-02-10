import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/AIAssistantPanel.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
function normalizeText(x) {
    if (typeof x === 'string')
        return x;
    if (x == null)
        return '';
    return String(x);
}
// Enhanced AI Assistant Panel: fast, context-aware, robust error handling, recent chat on top
export const AIAssistantPanel = ({ history, onAskAssistant, pidData, isLoading = false, error = null, onHelp, aiConfig, onToggleAI, title = 'PMOMax AI Project Assistant', subtitle = 'Ask questions, refine content, and fill missing PID sections (2026 compliant).', }) => {
    const [input, setInput] = useState('');
    const scrollerRef = useRef(null);
    const isAssistantDisabled = aiConfig ? aiConfig.enabled === false : false;
    // Always show newest messages on top
    const ordered = useMemo(() => (Array.isArray(history) ? [...history].reverse() : []), [history]);
    useEffect(() => {
        const el = scrollerRef.current;
        if (el)
            el.scrollTop = 0;
    }, [ordered.length]);
    const [isBusy, setIsBusy] = useState(false);
    // Fast, robust async/await for assistant input
    // Prevent the assistant from triggering PID loading or navigation
    // Only allow Q&A, never update PID or title from chat input
    const onSubmit = async (e) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isAssistantDisabled || isBusy)
            return;
        setIsBusy(true);
        try {
            // Only allow Q&A, never update PID or title from chat input
            await onAskAssistant(trimmed);
            setInput('');
        }
        catch (err) {
            // Robust error handling: show error in UI
            // (Handled by parent error prop)
        }
        finally {
            setIsBusy(false);
        }
    };
    const runQuickAgent = async (kind) => {
        const prompts = {
            risk: "Act as a Risk & Mitigation agent. Audit the current PID and propose a concise set of high-impact risks. Then update ONLY the risks + mitigations section via a JSON patch. Do not change unrelated fields.",
            compliance: "Act as a Security & Compliance agent. Review the PID for security/compliance gaps (privacy, data handling, access control, auditability). Then update ONLY the compliance/security section via a JSON patch.",
            fill: "Act as a PID completion agent. Identify missing/weak sections and propose targeted improvements. Then apply a JSON patch that fills ONLY clearly missing fields (do not rewrite everything).",
            summary: "Summarize the PID in 8-12 bullets for an executive reader. Do not modify the PID; respond with text only.",
        };
        const q = prompts[kind];
        setQuestion(q);
        await onAskAssistant(q);
    };
    return (_jsxs("section", { className: "rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-3 shadow-inner shadow-slate-900/60 flex flex-col flex-1 min-h-0", children: [_jsxs("header", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xs font-semibold tracking-wide uppercase text-amber-300", "aria-label": title, children: title }), subtitle && _jsx("p", { className: "text-xs text-slate-300", children: subtitle })] }), _jsx("div", { className: "flex items-center gap-2", children: typeof onToggleAI === 'function' && aiConfig && (_jsxs("label", { className: "flex items-center gap-1 text-xs text-slate-200", children: [_jsx("input", { type: "checkbox", checked: aiConfig.enabled !== false, onChange: (e) => onToggleAI(e.target.checked) }), "AI"] })) })] }), _jsx("div", { ref: scrollerRef, className: "flex-1 min-h-0 max-h-64 md:max-h-80 overflow-y-auto rounded-md border border-slate-800 bg-black/40 p-2", style: { minHeight: 120 }, children: ordered.length === 0 ? (_jsx("div", { className: "text-xs text-slate-300", children: "No messages yet. Ask a question like \u201CSummarize risks\u201D, \u201CDraft objectives\u201D, or \u201CCheck this PID for gaps before export\u201D." })) : (_jsx("div", { className: "flex flex-col gap-2", children: ordered.map((m, idx) => {
                        var _a, _b;
                        const role = ((m === null || m === void 0 ? void 0 : m.role) === 'assistant' || (m === null || m === void 0 ? void 0 : m.role) === 'model') ? 'assistant' : 'user';
                        return (_jsxs("div", { className: role === 'assistant'
                                ? 'rounded-md border border-amber-500/30 bg-amber-500/10 p-2'
                                : 'rounded-md border border-slate-700 bg-slate-900/40 p-2', children: [_jsx("div", { className: "text-[10px] uppercase tracking-wide text-slate-300 mb-1", children: role === 'assistant' ? title : 'You' }), _jsx("pre", { className: "whitespace-pre-wrap text-[12px] text-slate-100", children: normalizeText((_b = (_a = m === null || m === void 0 ? void 0 : m.content) !== null && _a !== void 0 ? _a : m === null || m === void 0 ? void 0 : m.text) !== null && _b !== void 0 ? _b : '') })] }, idx));
                    }) })) }), error ? (_jsx("div", { className: "mt-2 text-xs text-red-300", children: error })) : null, _jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [_jsx("button", { type: "button", onClick: () => runQuickAgent('risk'), disabled: isLoading || isAssistantDisabled || isBusy, className: "rounded-xl border border-amber-400/50 bg-black/30 px-3 py-1 text-xs text-amber-100 hover:bg-black/50 disabled:opacity-50", children: "Risk agent" }), _jsx("button", { type: "button", onClick: () => runQuickAgent('compliance'), disabled: isLoading || isAssistantDisabled || isBusy, className: "rounded-xl border border-amber-400/50 bg-black/30 px-3 py-1 text-xs text-amber-100 hover:bg-black/50 disabled:opacity-50", children: "Compliance agent" }), _jsx("button", { type: "button", onClick: () => runQuickAgent('fill'), disabled: isLoading || isAssistantDisabled || isBusy, className: "rounded-xl border border-amber-400/50 bg-black/30 px-3 py-1 text-xs text-amber-100 hover:bg-black/50 disabled:opacity-50", children: "Fill missing" }), _jsx("button", { type: "button", onClick: () => runQuickAgent('summary'), disabled: isLoading || isAssistantDisabled || isBusy, className: "rounded-xl border border-amber-400/50 bg-black/30 px-3 py-1 text-xs text-amber-100 hover:bg-black/50 disabled:opacity-50", children: "Executive summary" })] }), _jsxs("form", { className: "flex flex-col gap-2 mt-2", onSubmit: onSubmit, children: [_jsx("input", { type: "text", className: "flex-1 px-3 py-2 rounded-xl border-2 border-amber-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/70 font-semibold placeholder:text-amber-200 text-amber-200 text-base bg-black/90", placeholder: isAssistantDisabled ? 'AI is disabled' : 'Ask the PMOMax AI assistant…', value: input, onChange: (e) => setInput(e.target.value), disabled: isLoading || isAssistantDisabled || isBusy, "aria-label": "Ask the PMOMax AI assistant", style: {
                            boxShadow: '0 0 0 1px rgba(247,184,75,0.45)',
                            color: '#f7b84b',
                            background: '#111827',
                            fontSize: '1rem',
                            borderColor: '#f7b84b',
                            fontWeight: 500,
                            letterSpacing: '0.01em',
                        } }), _jsx("button", { type: "submit", className: "w-full py-3 text-lg rounded-xl bg-amber-400 text-black font-extrabold hover:bg-amber-300 border border-amber-700 shadow-lg disabled:opacity-50 transition-all duration-150", style: { letterSpacing: '0.04em', marginTop: 2 }, disabled: isLoading || isAssistantDisabled || !input.trim() || isBusy, children: isBusy ? '...' : 'Send' })] })] }));
};
