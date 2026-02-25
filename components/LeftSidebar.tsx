// components/LeftSidebar.tsx

import React, { useState, useEffect, useRef } from 'react';
import { InputPanel } from './InputPanel';
import { AIAssistantPanel } from './AIAssistantPanel';
import { GeneralNotesPanel } from './GeneralNotesPanel';
import type { ChatMessage, PIDData } from '../types';

interface LeftSidebarProps {
  onParse: (source: any, options: any) => Promise<void>;
  onClearAll: () => void;

  // kept for compatibility (even if not used directly here)
  onAskAssistant: (question: string) => Promise<void>;
  onAppendAssistantMessage?: (message: ChatMessage) => void;
  aiAssistantHistory: ChatMessage[];

  pidData?: PIDData | null;
  setPidData?: (data: any) => void;

  generalNotes: string;
  setGeneralNotes: (notes: string) => void;

  isLoading: boolean;
  error?: string | null;

  onHelp?: (context?: string) => void;

  onExportPdf?: () => void;
  onExportWord?: () => void;
  onExportJson?: () => void;
  onExportZip?: () => void;

  onCreateMode?: () => void;
  onLoadDemo?: () => Promise<void> | void;
  setIsCreateMode?: (flag: boolean) => void;
  resetNonce?: number;
  onRunRiskAgent?: () => Promise<void> | void;
  onRunComplianceAgent?: () => Promise<void> | void;
  isIntro?: boolean;
}

type ParseSource = "text" | "file" | "demo" | "create" | string;
type ParseOptions = {
  text?: string;
  file?: File;
  strict?: boolean;
  [key: string]: any;
};


export const LeftSidebar: React.FC<LeftSidebarProps> = (props) => {
  const {
    onParse,
    onClearAll,
    onAskAssistant,
    onAppendAssistantMessage,
    aiAssistantHistory,
    pidData,
    setPidData,
    generalNotes,
    setGeneralNotes,
    isLoading,
    error,
    onHelp,
    onExportPdf,
    onExportWord,
    onExportJson,
    onExportZip,
    onCreateMode,
    onLoadDemo,
    setIsCreateMode,
    isIntro,
  } = props;

  // Listen for triggerLeftAIAssistant events from CreateMode
  React.useEffect(() => {
    const handler = (e: any) => {
      if (e && e.detail && e.detail.message) {
        if (typeof onAskAssistant === 'function') {
          onAskAssistant(e.detail.message);
        }
        // Optionally scroll to the section in the sidebar if needed
		if (e.detail.section === 'risks') {
			const el = document.getElementById('risks');
			if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else if (e.detail.section === 'compliance') {
			// Compliance content is rendered under the Governance section.
			const el = document.getElementById('governance');
			if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
      }
    };
    window.addEventListener('triggerLeftAIAssistant', handler);
    return () => window.removeEventListener('triggerLeftAIAssistant', handler);
  }, [onAskAssistant]);
  // pidData should be PMOMaxPID, not PIDData
  const hasPid = !!pidData && (pidData as any).titleBlock && !!(pidData as any).titleBlock.projectTitle?.trim();

  const scrollToSection = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    } catch {
      return false;
    }
  };

  // Defensive: warn in dev if setPidData is missing (guarded)
  if (process.env.NODE_ENV !== 'production' && typeof setPidData !== 'function') {
    console.warn('[LeftSidebar] setPidData is not defined or not a function. Some features will be disabled.');
  }

  const generalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resetInitRef = useRef<boolean>(false);

  // On initial load or when there's no PID, scroll the sidebar so the top of
  // NOTE: removed automatic scroll-on-reset behavior. Left sidebar will no
  // longer auto-scroll when `resetNonce` changes (for example when entering
  // Create mode). This prevents unexpected page jumps; users can scroll the
  // left panel manually as needed.

  // Ensure the left sidebar starts at the top on initial mount
  useEffect(() => {
    try {
      const c = containerRef.current;
      if (!c || !(c instanceof HTMLElement)) return;
      const reset = () => {
        try {
          c.scrollTop = 0;
        } catch {}
      };
      reset();
      const raf = requestAnimationFrame(() => reset());
      const t = setTimeout(() => reset(), 80);
      const t2 = setTimeout(() => reset(), 250);
      const t3 = setTimeout(() => reset(), 600);
      return () => {
        try {
          cancelAnimationFrame(raf);
        } catch {}
        clearTimeout(t);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } catch {}
  }, []);

  const containerOverflow = isIntro ? 'visible' : 'auto';
  const containerHeight = isIntro ? 'auto' : '100%';

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-2 md:gap-3 p-2 md:p-3"
      style={{ width: '100%', overflowY: containerOverflow, height: containerHeight }}
    >
      {/* PROJECT CONTROLS */}
      <section id="input-panel" className="mb-1 md:mb-2 p-2 rounded-lg border bg-brand-panel shadow-md flex flex-col gap-1 md:gap-1.5 relative" style={{ borderColor: 'rgba(56,189,248,0.8)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm md:text-base font-semibold tracking-wide text-amber-300">Project Initiation Controls</h2>
          {onHelp && (
            <button
              type="button"
              onClick={() => onHelp('input')}
              className="pmomax-gold-button h-7 w-7 p-0 flex items-center justify-center text-[12px] font-extrabold rounded-full"
              title="Project Initiation Controls Help"
              aria-label="Help for Project Initiation Controls"
            >
              ?
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-2">
          <div className="text-xs text-slate-300/80">
            <strong>Click <span style={{color:'#f7b84b'}}>Create</span> to start a new blank PID or use an example.</strong>
          </div>
        </div>

        <InputPanel
          onParse={onParse}
          onHelp={onHelp ? () => onHelp('input') : undefined}
          isLoading={isLoading}
          onLoadDemo={onLoadDemo}
          onCreateMode={onCreateMode}
          onClearAll={onClearAll}
        />
      </section>

      {/* EXPORT */}
      <section id="export-panel" className="mb-1 md:mb-2 p-2 rounded-lg border bg-brand-panel text-brand-text flex flex-col gap-1 md:gap-1.5 relative" style={{ borderColor: 'rgba(245,158,11,0.85)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold tracking-wide text-amber-300">Export Document</h2>
          {onHelp && (
            <button
              type="button"
              onClick={() => onHelp('export')}
              className="pmomax-gold-button text-[13px] px-2 py-1 rounded-full"
              title="Export Document Help"
              aria-label="Help for Export Document"
            >
              ?
            </button>
          )}
        </div>

        <p className="text-xs text-slate-100 leading-snug">
          Export the current PID as a Word, PDF, or JSON document. If a Gantt chart is plotted, it will be embedded automatically.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => (hasPid && typeof onExportPdf === 'function' ? onExportPdf() : void 0)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-100 ${
                hasPid && typeof onExportPdf === 'function'
                  ? 'bg-white text-black border border-slate-300'
                  : 'bg-white text-black opacity-50 border border-slate-200 cursor-not-allowed'
              }`}
              disabled={!hasPid || typeof onExportPdf !== 'function'}
              aria-label="Export PDF"
            >
              PDF
            </button>

            <button
              type="button"
              onClick={() => (hasPid && typeof onExportWord === 'function' ? onExportWord() : void 0)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-100 ${
                hasPid && typeof onExportWord === 'function'
                  ? 'bg-white text-black border border-slate-300'
                  : 'bg-white text-black opacity-50 border border-slate-200 cursor-not-allowed'
              }`}
              disabled={!hasPid || typeof onExportWord !== 'function'}
              aria-label="Export Word"
            >
              Word
            </button>

            <button
              type="button"
              onClick={() => (hasPid && typeof onExportZip === 'function' ? onExportZip() : void 0)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-100 ${
                hasPid && typeof onExportZip === 'function'
                  ? 'bg-white text-black border border-slate-300'
                  : 'bg-white text-black opacity-50 border border-slate-200 cursor-not-allowed'
              }`}
              disabled={!hasPid || typeof onExportZip !== 'function'}
              aria-label="Export ZIP"
            >
              Zip (Word+Gantt)
            </button>

            <button
              type="button"
              onClick={() => (hasPid && typeof onExportJson === 'function' ? onExportJson() : void 0)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-100 ${
                hasPid && typeof onExportJson === 'function'
                  ? 'bg-white text-black border border-slate-300'
                  : 'bg-white text-black opacity-50 border border-slate-200 cursor-not-allowed'
              }`}
              disabled={!hasPid || typeof onExportJson !== 'function'}
              aria-label="Export JSON"
            >
              JSON
            </button>
          </div>

          {/* Gantt exports are shown in the main Gantt panel; removed duplicate group from sidebar. */}
        </div>

        {error && <p className="mt-1 text-xs text-rose-400" aria-live="polite">{error}</p>}
      </section>

      {/* AI ASSISTANT (Minimal, clean) */}
      <section id="assistant-panel" className="mb-1 md:mb-2 p-2 rounded-lg border bg-brand-panel flex flex-col gap-1 md:gap-1.5 relative" style={{ borderColor: 'rgba(236,72,153,0.85)' }}>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-sm font-semibold tracking-wide text-amber-300">AI Assistant</h2>
	      <button
	        type="button"
	        className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold border shadow-sm transition-all ${
	          hasPid
	            ? 'border-pink-500 text-pink-50 hover:border-pink-300 hover:bg-pink-700/40'
	            : 'border-pink-500/40 text-pink-50/50 opacity-60 cursor-not-allowed'
	        }`}
	        style={{ background: 'rgba(139, 0, 46, 0.42)', touchAction: 'manipulation' as any }}
	        onClick={() => {
	          if (!hasPid) return;
	          scrollToSection('risks');
	          // Print accurate summary via the main assistant (deterministic, no network)
	          if (typeof onAskAssistant === 'function') onAskAssistant('Summarize risks.');
	        }}
	        title={hasPid ? 'Go to Risks and summarize' : 'Load a PID to enable'}
	        disabled={!hasPid}
	        aria-disabled={!hasPid}
	      >
	        <span aria-hidden>⚠️</span>
	        <span>Risk</span>
	      </button>
	      <button
	        type="button"
	        className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold border shadow-sm transition-all ${
	          hasPid
	            ? 'border-teal-500 text-teal-50 hover:border-teal-300 hover:bg-teal-700/30'
	            : 'border-teal-500/40 text-teal-50/50 opacity-60 cursor-not-allowed'
	        }`}
	        style={{ background: 'rgba(4, 78, 68, 0.40)', touchAction: 'manipulation' as any }}
	        onClick={() => {
	          if (!hasPid) return;
	          // Compliance content is under Governance in MainContent
	          scrollToSection('governance');
	          if (typeof onAskAssistant === 'function') onAskAssistant('Summarize compliance gaps.');
	        }}
	        title={hasPid ? 'Go to Governance and summarize compliance' : 'Load a PID to enable'}
	        disabled={!hasPid}
	        aria-disabled={!hasPid}
	      >
	        <span aria-hidden>🔒</span>
	        <span>Compliance</span>
	      </button>
        </div>
        <AIAssistantPanel
          history={aiAssistantHistory && aiAssistantHistory.length === 0 ? [] : aiAssistantHistory}
          onAskAssistant={onAskAssistant}
          onAppendMessage={onAppendAssistantMessage}
          pidData={pidData}
          isLoading={isLoading}
          error={error ?? null}
          onHelp={onHelp}
          resetNonce={props.resetNonce}
        />
      </section>

      {/* GENERAL NOTES */}
      <section ref={generalRef} className="mb-1 md:mb-2 p-2 rounded-lg border bg-brand-panel flex flex-col gap-1 md:gap-1.5 relative" style={{ borderColor: 'rgba(168,85,247,0.85)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold tracking-wide text-amber-300">General Notes</h2>
          {onHelp && (
            <button
              type="button"
              onClick={() => onHelp('notes')}
              className="pmomax-gold-button text-[13px] px-2 py-1 rounded-full"
              title="General Notes Help"
              aria-label="Help for General Notes"
            >
              ?
            </button>
          )}
        </div>

        <GeneralNotesPanel
          value={generalNotes}
          onChange={setGeneralNotes}
          onHelp={onHelp ? () => onHelp('notes') : undefined}
        />
      </section>
    </div>
  );
};

export default LeftSidebar;
