import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PMOMaxIcon } from './Icons';
import { safeErrorMessage } from '../lib/safeError';
import { errorToString } from '../lib/errorToString';
import { fileToText, processInChunks } from '../lib/fileToText';
import type { ChatMessage, PIDData } from '../types';

interface ConversationalAssistantProps {
  /**
   * Sends a question to the server assistant. The parent owns history updates.
   */
  onAskAssistant?: (question: string) => Promise<void>;

  /**
   * Full chat history from the parent/hook.
   */
  aiAssistantHistory: ChatMessage[];

  /** Optional: if you still want to apply patches locally in the future */
  onPopulateFields?: (data: Partial<PIDData>) => void;
  currentData?: PIDData;

  onHelp?: (context?: string) => void;
}

export const ConversationalAssistant: React.FC<ConversationalAssistantProps> = ({
  onAskAssistant,
  aiAssistantHistory,
  onHelp,
}) => {
  const [question, setQuestion] = useState('');
  const [localBusy, setLocalBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const uploadedTextRef = useRef<string | null>(null);
  const uploadedPreviewRef = useRef<string | null>(null);

  const MAX_PREVIEW_CHARS = 20000;

  // Reverse chat order so most recent is on top
  const messages = useMemo(() => (aiAssistantHistory ?? []).slice().reverse(), [aiAssistantHistory]);

  useEffect(() => {
    // Scroll to top to show most recent message (since order is reversed)
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [messages.length]);

  const canSend = useMemo(() => {
    return !localBusy && typeof onAskAssistant === 'function' && question.trim().length > 0;
  }, [localBusy, onAskAssistant, question]);

  const handleSend = async () => {
    const q = question.trim();
    if (!q || !onAskAssistant) return;
    const useFullUpload =
      uploadedTextRef.current &&
      uploadedPreviewRef.current &&
      q === uploadedPreviewRef.current;
    const payload = useFullUpload ? uploadedTextRef.current! : q;
    setLocalBusy(true);
    setLastError(null);
    try {
      await onAskAssistant(payload);
      setQuestion('');
      uploadedTextRef.current = null;
      uploadedPreviewRef.current = null;
    } catch (err: any) {
      setLastError(safeErrorMessage(err) || 'Failed to send message.');
    } finally {
      setLocalBusy(false);
    }
  };

  // File upload handler (for AI parse)
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLastError(null);
    setIsParsing(true);
    try {
      const result = await fileToText(file);
      let text = result.text;
      if (!text || !text.trim()) {
        const fallback = await processInChunks(file);
        text = fallback.text;
      }
      if (text.length > MAX_PREVIEW_CHARS) {
        const preview = `${text.slice(0, MAX_PREVIEW_CHARS)}\n\n[Preview truncated for display. Full content will be sent when you click Send.]`;
        uploadedTextRef.current = text;
        uploadedPreviewRef.current = preview;
        setQuestion(preview);
      } else {
        uploadedTextRef.current = null;
        uploadedPreviewRef.current = null;
        setQuestion(text);
      }
    } catch (e: any) {
      setLastError(safeErrorMessage(e) || 'Could not read that file.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
        <div className="text-base sm:text-lg font-semibold text-brand-text drop-shadow-sm">AI Assistant</div>
        {onHelp && (
          <button
            type="button"
            onClick={() => onHelp('assistant')}
            className="rounded-full bg-brand-panel border border-brand-border px-3 py-1.5 text-sm font-medium text-brand-text hover:bg-brand-border/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            aria-label="Help"
          >
            ? Help
          </button>
        )}
      </div>

      {/* Feedback overlays for parsing/upload */}
      {(isParsing || localBusy) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 bg-opacity-90 rounded-2xl group" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ pointerEvents: 'none' }}>
            <PMOMaxIcon alt="PMOMax" style={{ width: 120, height: 120, boxShadow: '0 0 24px rgba(15,23,42,0.9)' }} />
          </div>
          <div className="text-brand-text font-semibold text-center" style={{ fontSize: '1.6rem', lineHeight: '1.2', cursor: 'default' }} title="AI is working…">
            AI is working…
          </div>
        </div>
      )}
      {lastError && (
        <div className="mb-2 p-3 rounded-xl bg-red-900/80 text-red-200 font-bold border border-red-400 text-base shadow">
          {lastError}
        </div>
      )}

      <div ref={scrollerRef} className="overflow-y-auto max-h-96 mb-2 flex flex-col gap-2 rounded-xl border border-brand-border bg-black/20 p-2 scroll-smooth" style={{ minHeight: 60, maxHeight: '500px' }}>
        {messages.length === 0 ? (
          <div className="text-sm text-brand-text-secondary">Ask questions to refine wording, validate scope, or generate risks, milestones, and KPIs.</div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={
                m.role === 'user'
                  ? 'self-end max-w-[92%] rounded-xl bg-brand-panel border border-brand-border p-2 text-brand-text shadow-sm'
                  : 'self-start max-w-[92%] rounded-xl bg-black/40 border border-brand-border p-2 text-brand-text-secondary shadow-sm'
              }
              style={{ wordBreak: 'break-word', fontSize: 15, lineHeight: 1.5 }}
            >
              <div className="text-xs font-semibold text-brand-text-secondary mb-1">{m.role === 'user' ? 'You' : 'PMOMax'}</div>
              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          ))
        )}
      </div>

      <form className="flex flex-col sm:flex-row items-stretch gap-2 mt-2" onSubmit={e => { e.preventDefault(); if (canSend) void handleSend(); }} role="search">
        <input
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setLastError(null);
            uploadedTextRef.current = null;
            uploadedPreviewRef.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) void handleSend();
            }
          }}
          placeholder={onAskAssistant ? 'Ask: rewrite objectives, suggest risks, check scope...' : 'AI assistant is not configured'}
          className="flex-1 rounded-xl border border-brand-border bg-brand-surface/80 px-3 py-2 text-sm sm:text-base font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
          style={{ minWidth: 0 }}
          aria-label="Ask the assistant"
        />
        <label className="rounded-xl px-3 py-2 text-sm font-medium bg-brand-panel text-brand-text border border-brand-border shadow-sm cursor-pointer flex items-center gap-2 mb-0 transition-transform duration-100 active:scale-95 hover:bg-brand-border/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40">
          <span>Upload file</span>
          <input
            type="file"
            accept=".pdf,.txt,.docx,.xls,.xlsx,.csv,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/msword"
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
        </label>
        <button
          type="submit"
          disabled={!canSend || isParsing}
          className={
            !canSend || isParsing
              ? 'rounded-xl px-3 py-2 text-sm font-semibold bg-brand-panel text-brand-muted border border-brand-border cursor-not-allowed'
              : 'rounded-xl px-3 py-2 text-sm font-semibold bg-amber-400/90 text-black hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300'
          }
          aria-label="Send message"
        >
          {localBusy || isParsing ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ConversationalAssistant;
