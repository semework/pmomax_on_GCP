// components/AIAssistantPanel.tsx
import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, PIDData } from '../types';

interface AIAssistantPanelProps {
  history: ChatMessage[];
  onAskAssistant: (input: string) => Promise<any> | void;
  pidData?: PIDData | null;
  setPidData?: (data: any) => void;
  isLoading?: boolean;
  error?: string | null;
  onHelp?: (section?: string) => void;
  onToggleAI?: (enabled: boolean) => void;
  resetNonce?: number;
}

function normalizeText(x: any): string {
  if (typeof x === 'string') return x;
  if (x == null) return '';
  return String(x);
}


// Enhanced AI Assistant Panel: fast, context-aware, robust error handling, recent chat on top

export const AIAssistantPanel: React.FC<AIAssistantPanelProps & { title?: string; subtitle?: string }> = ({
  history,
  onAskAssistant,
  pidData,
  isLoading = false,
  error = null,
  onHelp,
  onToggleAI,
  title = 'PMOMax AI Project Assistant',
  subtitle = 'Ask questions, refine content, and fill missing PID sections (2026 compliant).',
  resetNonce,
}) => {
  const [input, setInput] = useState('');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isAssistantDisabled = false;
  // Show messages in natural order (newest at bottom)
  const ordered = useMemo(() => (Array.isArray(history) ? [...history] : []), [history]);
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ordered.length]);
  const [isBusy, setIsBusy] = useState(false);
  // Controller for quick agent fetches (risk/compliance endpoints) so they can be aborted on reset
  const quickAgentControllerRef = useRef<AbortController | null>(null);
  // Controller for main ask/submit
  const askControllerRef = useRef<AbortController | null>(null);
  // No expand/collapse logic or button in assistant panel
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (askControllerRef.current) {
      askControllerRef.current.abort();
      askControllerRef.current = null;
    }
    const trimmed = input.trim();
    if (!trimmed || isAssistantDisabled || isBusy) return;
    setIsBusy(true);
    askControllerRef.current = new AbortController();
    try {
      await onAskAssistant(trimmed, { signal: askControllerRef.current.signal });
      setInput('');
    } catch (err: any) {
      if (askControllerRef.current?.signal.aborted) return;
      if (err?.message && err.message.includes('429')) {
        await onAskAssistant('Too many requests. Please wait a moment and try again.');
      } else {
        await onAskAssistant('Error: ' + (err?.message || 'Failed to contact AI assistant.'));
      }
    } finally {
      setIsBusy(false);
      askControllerRef.current = null;
    }
  };


  // Wire up agent buttons to backend endpoints
  const runQuickAgent = async (kind: 'risk' | 'compliance' | 'fill' | 'summary') => {
    if (quickAgentControllerRef.current) {
      quickAgentControllerRef.current.abort();
      quickAgentControllerRef.current = null;
    }
    setIsBusy(true);
    try {
      let endpoint = '';
      if (kind === 'risk') endpoint = '/api/ai/risk';
      else if (kind === 'compliance') endpoint = '/api/ai/compliance';
      if (endpoint && pidData) {
        const controller = new AbortController();
        quickAgentControllerRef.current = controller;
        let data;
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pidData }),
            signal: controller.signal,
          });
          data = await res.json();
        } catch (err: any) {
          if (controller.signal.aborted) return;
          if (err?.message && err.message.includes('429')) {
            await onAskAssistant('Too many requests. Please wait a moment and try again.');
            return;
          } else {
            await onAskAssistant('Error: Failed to contact agent endpoint.');
            return;
          }
        }
        if (data.ok && data.reply) {
          await onAskAssistant(data.reply);
        } else if (data.reply) {
          await onAskAssistant(data.reply);
        } else if (data.error) {
          await onAskAssistant(`Error: ${data.error}`);
        } else {
          await onAskAssistant('No response from agent.');
        }
        setInput('');
        return;
      }
      // fallback to old prompt-based for fill/summary
      const prompts: Record<'risk' | 'compliance' | 'fill' | 'summary', string> = {
        risk:
          "Act as a Risk & Mitigation agent. Audit the current PID and propose a concise set of high-impact risks. Then update ONLY the risks + mitigations section via a JSON patch. Do not change unrelated fields.",
        compliance:
          "Act as a Security & Compliance agent. Review the PID for security/compliance gaps (privacy, data handling, access control, auditability). Then update ONLY the compliance/security section via a JSON patch.",
        fill:
          "Act as a PID completion agent. Identify missing/weak sections and propose targeted improvements. Then apply a JSON patch that fills ONLY clearly missing fields (do not rewrite everything).",
        summary:
          "Summarize the PID in 8-12 bullets for an executive reader. Do not modify the PID; respond with text only.",
      };
      const q = prompts[kind];
      setInput(q);
      await onAskAssistant(q);
    } catch (err: any) {
      if (quickAgentControllerRef.current?.signal.aborted) return;
      if (err?.message && err.message.includes('429')) {
        await onAskAssistant('Too many requests. Please wait a moment and try again.');
      } else {
        await onAskAssistant('Error: Failed to contact agent endpoint.');
      }
    } finally {
      quickAgentControllerRef.current = null;
      setIsBusy(false);
    }
  };

  // Abort quick agent requests when resetNonce changes (parent requested reset)
  useEffect(() => {
    if (typeof resetNonce !== 'number') return;
    try { quickAgentControllerRef.current?.abort(); } catch {}
    quickAgentControllerRef.current = null;
    try { askControllerRef.current?.abort(); } catch {}
    askControllerRef.current = null;
    setIsBusy(false);
  }, [resetNonce]);

  useEffect(() => () => {
    try { quickAgentControllerRef.current?.abort(); } catch {}
    try { askControllerRef.current?.abort(); } catch {}
  }, []);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 shadow-inner shadow-slate-900/60 flex flex-col flex-1 min-h-0">
      <header className="flex items-start justify-between mb-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-amber-300" aria-label={title}>{title}</h2>
            {/* Risk/Compliance quick actions are surfaced in the sidebar header; removed duplicate icons here. */}
          </div>
          {subtitle && <p className="text-xs text-slate-300 mt-0">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {typeof onToggleAI === 'function' && (
            <label className="flex items-center gap-1 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={true}
                onChange={(e) => onToggleAI(e.target.checked)}
              />
              AI
            </label>
          )}
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 max-h-96 overflow-y-auto rounded-md border border-slate-800 bg-black/40 p-2 scroll-smooth"
        style={{ 
          minHeight: 56, 
          maxHeight: '400px', 
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {ordered.length === 0 ? (
          <div className="text-xs text-slate-300 leading-tight py-1">
            No messages yet — try “Summarize risks”, “Draft objectives”, or “Check this PID for gaps”.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ordered.map((m, idx) => {
              const role = (m?.role === 'assistant') ? 'assistant' : 'user';
              const content = typeof m?.content === 'string' ? m.content.replace(/\n{2,}/g, '\n\n') : normalizeText(m?.content ?? '');
              return (
                <div
                  key={`${role}-${idx}-${ordered.length}`}
                  className={
                    role === 'assistant'
                      ? 'rounded-md border border-amber-500/30 bg-amber-500/10 p-2 shadow-sm'
                      : 'rounded-md border border-slate-700 bg-[var(--color-bg-panel-2)]/40 p-2'
                  }
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 font-bold">
                    {role === 'assistant' ? '🤖 AI Assistant' : '👤 You'}
                  </div>
                  <div 
                    className="whitespace-pre-wrap text-[12px] sm:text-[13px] text-slate-100 leading-relaxed"
                    style={{fontFamily: 'inherit'}}
                    dangerouslySetInnerHTML={{
                      __html: content
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-amber-200">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/•/g, '&bull;')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      {/* Quick agents moved to header to save vertical space */}

      {/* Send button below input field */}
      <form className="flex flex-col gap-2 mt-2" onSubmit={onSubmit}>
        <input
          type="text"
          className="flex-1 px-3 py-2 rounded-xl border-2 border-amber-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/70 font-semibold placeholder:text-amber-200/60 text-amber-200 text-sm sm:text-base bg-black/90"
          placeholder={isAssistantDisabled ? 'AI is disabled' : 'Ask the AI assistant…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading || isAssistantDisabled || isBusy}
          aria-label="Ask the PMOMax AI assistant"
          style={{
            boxShadow: '0 0 0 1px rgba(247,184,75,0.45)',
            color: '#f7b84b',
            background: '#111827',
            fontSize: 'inherit',
            borderColor: '#f7b84b',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        />
        <button
          type="submit"
          className="w-full py-2 sm:py-3 text-base sm:text-lg rounded-xl bg-amber-400 text-black font-extrabold hover:bg-amber-300 active:bg-amber-500 border border-amber-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          style={{ letterSpacing: '0.04em', marginTop: 2 }}
          disabled={isLoading || isAssistantDisabled || !input.trim() || isBusy}
          aria-label="Send message to AI assistant"
        >
          {isBusy || isLoading ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </section>
  );
};
