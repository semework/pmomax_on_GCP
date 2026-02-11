// App.tsx
import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import NavPanel from './components/NavPanel';
import MainContent from './components/MainContent';
import LeftSidebar from './components/LeftSidebar';
import { Header } from './components/Header';
import { HelpModal } from './components/HelpModal';
import { UserGuideModal } from './components/UserGuideModal';
import { usePidLogic, makeEmptyPid } from './hooks/usePidLogic';
import { exportToJson, exportToPdf, exportToWord } from './lib/export';
import { toGanttDataURL } from './lib/exportUtils';
import { exportWordAndGanttZip } from './lib/exportZip';

// Lazy-load CreateMode to keep initial bundle light
const CreateMode = lazy(() => import('./components/CreateMode'));

// Simple color contrast checker widget for dev/QA accessibility
function ContrastChecker() {
  const [fg, setFg] = React.useState('#ffffff');
  const [bg, setBg] = React.useState('#000000');

  function luminance(hex: string) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const rgb = [0, 1, 2].map((i) => parseInt(c.substr(i * 2, 2), 16) / 255);
    const lum = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    // Return the luminance value (should be a number)
    return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
  }

  function contrastRatio(fgColor: string, bgColor: string) {
    const l1 = Number(luminance(fgColor));
    const l2 = Number(luminance(bgColor));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  const ratio = contrastRatio(fg, bg);
  const pass = ratio >= 4.5;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 10000,
        background: '#222',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 2px 8px #0008',
        fontSize: 13,
      }}
    >
      <div style={{ marginBottom: 4, fontWeight: 'bold' }}>Contrast Checker</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>
          FG{' '}
          <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} aria-label="Foreground color" />
        </label>
        <label>
          BG{' '}
          <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} aria-label="Background color" />
        </label>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            background: pass ? '#2563EB' : '#b91c1c',
            color: '#fff',
          }}
        >
          {ratio.toFixed(2)} {pass ? 'PASS' : 'FAIL'}
        </span>
      </div>
      <div style={{ marginTop: 6, padding: 4, borderRadius: 4, background: bg, color: fg }}>Aa Sample Text</div>
    </div>
  );
}

// NOTE:
// Avoid declaring ImportMetaEnv/ImportMeta here.
// In Vite projects, types can be provided via `vite/client` (typically via vite-env.d.ts).
// This file does not rely on import.meta.env.

// --- Intro sections used by IntroPage ---
const introSections = [
  { icon: '🡸', title: 'Input', color: '#38BDF8', desc: 'Paste, upload, or create a PID.' },
  { icon: '⚡', title: 'AI Assistant', color: '#EC4899', desc: 'Refine, ask, and generate planning artifacts.' },
  { icon: '📊', title: 'Gantt', color: '#38BDF8', desc: 'Visualize your schedule and dependencies.' },
  { icon: '⬇️', title: 'Export', color: '#F59E0B', desc: 'Export Word, PDF, JSON—with notes.' },
  { icon: '📝', title: 'General Notes', color: '#A855F7', desc: 'Add comments, instructions, and context.' },
];

function IntroPage() {
  // Data
  const howTo = [
    { label: 'Paste or upload', desc: 'your PID in the left Input panel.', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)' },
    { label: 'Parsing is automatic', desc: 'for all supported formats.', color: '#F97316', bg: 'rgba(249,115,22,0.18)' },
    { label: 'Use AI Assistant', desc: 'to refine, ask, and explore.', color: '#EC4899', bg: 'rgba(236,72,153,0.16)' },
    { label: 'Click Create', desc: 'to start a new blank PID or use an example.', color: '#F59E0B', bg: 'rgba(245,158,11,0.16)' },
    { label: 'Load Demo', desc: 'to see a fully-populated PID, then try your own.', color: '#A855F7', bg: 'rgba(168,85,247,0.18)' },
  ];
  const sections = [
    { section: 'Objectives', desc: 'SMART goals, KPIs, success.' },
    { section: 'Scope', desc: 'Inclusions, exclusions, constraints.' },
    { section: 'Schedule', desc: 'Milestones, Gantt, dependencies.' },
    { section: 'Risks', desc: 'Risks, mitigations, issues.' },
    { section: 'Governance', desc: 'Stakeholders, RACI, comms.' },
    { section: 'Budget', desc: 'Costs, resources, tools.' },
    { section: 'Notes', desc: 'Background, open questions.' },
  ];

  // Strict layout: outer container
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: 0,
      }}
    >
      {/* Main content area, fixed max width, with more breathing room */}
      <div
        style={{
          maxWidth: 1440,
          width: '100%',
          margin: '0 auto',
          padding: '48px 24px 40px 24px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Centered heading and subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 56 }}>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: '#f7b84b',
              letterSpacing: '-0.03em',
              margin: 0,
              padding: 0,
              lineHeight: 1.08,
              textAlign: 'center',
            }}
          >
            PMOMax — Bring your project notes to life
          </h1>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#E5E7EB', marginTop: 18, marginBottom: 10, textAlign: 'center' }}>
            The AI Copilot for PMO Leaders &amp; Project Managers
          </div>
          <div style={{ fontSize: 19, fontWeight: 500, color: '#E5E7EB', maxWidth: 1000, textAlign: 'center', lineHeight: 1.4 }}>
            Bring your meeting notes, project briefs, and scattered planning docs into one place. PMOMax turns them into a structured, evidence-based PID and planning artifacts that help teams align faster, surface bottlenecks earlier, and spend less time assembling status.
          </div>
        </div>

        {/* Row: left arrow and main cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
            position: 'relative',
            minHeight: 360,
            flexWrap: 'wrap',
            columnGap: 48,
            rowGap: 40,
          }}
        >
          {/* Large left arrow, vertically aligned with cards */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minWidth: 60, marginTop: 0, marginLeft: -28, zIndex: 2 }}>
            <svg width="56" height="140" viewBox="0 0 48 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M44 60H10M10 60L28 40M10 60L28 80"
                stroke="#f7b84b"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Two cards side by side, equal height, centered */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: 40,
              maxWidth: 920,
              width: 'auto',
            }}
          >
            {/* How to get started card */}
            <div
              style={{
                flex: 1,
                background: '#0b1220',
                border: '1px solid #374151',
                borderRadius: 24,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minWidth: 0,
                maxWidth: 420,
                minHeight: 260,
                boxSizing: 'border-box',
                margin: 0,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f7b84b', marginBottom: 6, letterSpacing: '-0.01em' }}>
                How to get started
              </div>
              <div
                style={{
                  marginTop: 4,
                  borderRadius: 18,
                  border: '1px solid #1f2937',
                  background: '#020617',
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                  display: 'inline-block',
                  maxWidth: '100%',
                }}
              >
                <ul style={{ fontSize: 16, color: '#fff', padding: 0, margin: 0, listStyle: 'none' }}>
                  {howTo.map((row, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: row.color,
                          background: row.bg,
                          borderRadius: 8,
                          padding: '2px 8px',
                          fontSize: 15,
                          whiteSpace: 'nowrap',
                          marginRight: 4,
                        }}
                      >
                        {row.label}:
                      </span>
                      <span style={{ color: '#fff', fontWeight: 400, fontSize: 15 }}>{row.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Structured Sections card */}
            <div
              style={{
                flex: 1,
                background: '#0b1220',
                border: '1px solid #374151',
                borderRadius: 24,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minWidth: 0,
                maxWidth: 420,
                minHeight: 260,
                boxSizing: 'border-box',
                margin: 0,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f7b84b', marginBottom: 6, letterSpacing: '-0.01em' }}>
                Structured Sections
              </div>
              <div
                style={{
                  marginTop: 4,
                  borderRadius: 18,
                  border: '1px solid #1f2937',
                  background: '#020617',
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                  display: 'inline-block',
                  maxWidth: '100%',
                }}
              >
                <table
                  style={{
                    width: 'auto',
                    fontSize: 14,
                    color: '#fff',
                    borderCollapse: 'separate',
                    borderSpacing: '0 2px',
                    margin: '0 auto',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ color: '#FFE066', fontWeight: 700, textAlign: 'left', padding: '2px 4px' }}>Section</th>
                      <th style={{ color: '#FFE066', fontWeight: 700, textAlign: 'left', padding: '2px 4px' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((row) => (
                      <tr key={row.section}>
                        <td style={{ fontWeight: 700, color: '#fff', padding: '2px 4px', whiteSpace: 'nowrap' }}>{row.section}</td>
                        <td style={{ color: '#fff', fontWeight: 400, padding: '2px 4px' }}>{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary intro nav chips: centered horizontal stack below the cards */}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {introSections.map((s) => (
            <div
              key={s.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 150,
                background: '#0b1220',
                borderRadius: 16,
                border: '1px solid #1f2937',
                padding: '8px 14px',
                margin: 0,
                boxSizing: 'border-box',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 20, color: s.color }}>{s.icon}</span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: '#fff',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * App.tsx
 *
 * Contract (critical):
 *  - Navigation is NOT rendered until PID data exists.
 *  - Navigation renders on the RIGHT when pidData is present.
 *  - Left sidebar contains input/controls, assistant, and notes.
 *  - Middle panel owns its own vertical scroll (intro vs PID view).
 *  - No horizontal scroll in nav column.
 */

const App: React.FC = () => {
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);
  const [navOpen, setNavOpen] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const [aiModel] = useState<'gemini-2.5-flash' | 'gemini-pro-2.5'>('gemini-pro-2.5');

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpContext, setHelpContext] = useState<string | null>(null);
  const [userGuideOpen, setUserGuideOpen] = useState(false);

  // Create-mode draft PID (used by CreateMode and for exports while in create mode)
  const [draftPid, setDraftPid] = useState<any>(null);

  // Cast to any to avoid build-time type errors if hook typings differ across branches.
  const pidLogic = usePidLogic() as any;

  const pidData = pidLogic.pidData ?? null;
  const setPidData = pidLogic.setPidData as ((v: any) => void) | undefined;

  const generalNotes = pidLogic.generalNotes ?? '';
  const setGeneralNotes = pidLogic.setGeneralNotes as ((v: any) => void) | undefined;

  const aiAssistantHistory = pidLogic.aiAssistantHistory ?? [];
  const isLoading = Boolean(pidLogic.isLoading);
  const error = pidLogic.error ?? null;
  const warnings = Array.isArray(pidLogic.warnings) ? pidLogic.warnings : [];

  const parseDocument = pidLogic.parseDocument as
    ((text: string, model?: 'gemini-2.5-flash' | 'gemini-pro-2.5', initialWarnings?: string[]) => Promise<{ ok: boolean; error?: string }>) |
    undefined;

  // Fix: Define onParse and pass to LeftSidebar
  const onParse = async (source: any, options: any) => {
    // Accepts source ('upload', 'paste', etc.) and options { text, fileName, ... }
    const text = String(options?.text ?? '');
    const warnings = Array.isArray(options?.warnings) ? options.warnings : [];
    if (!parseDocument) throw new Error('Parse function not available');
    const result = await parseDocument(text, aiModel, warnings);
    if (!result?.ok) {
      const msg = result?.error === 'USER_CANCELLED' ? 'Parsing was cancelled.' : (result?.error || '');
      if (result?.error !== 'USER_CANCELLED') throw new Error(msg);
    }
  };
  const loadDemoData = pidLogic.loadDemoData as (() => Promise<void>) | undefined;
  const clearAll = pidLogic.clearAll as (() => Promise<void> | void) | undefined;
  const cancelParsing = pidLogic.cancelParsing as (() => void) | undefined;

  const runRiskAgent = pidLogic.runRiskAgent as (() => Promise<void>) | undefined;
  const runComplianceAgent = pidLogic.runComplianceAgent as (() => Promise<void>) | undefined;

  const handleClearAll = async () => {
	// Always reset local UI state even if a hook-level clearAll fails.
	try {
    if (typeof clearAll === 'function') await clearAll();
  } catch (e) {
		console.warn('ClearAll failed:', e);
	}
  setPidData?.(null);
	setGeneralNotes?.('');
	setDraftPid(null);
	setIsCreateMode(false);
	setNavOpen(false);
	setHelpOpen(false);
	setUserGuideOpen(false);
	setHelpContext(null);
	setResetNonce((n) => n + 1);
};


  const askAssistant = pidLogic.askAssistant as ((q: string, model?: string) => Promise<void>) | undefined;
  const lastAssistantCreatedAt = pidLogic.lastAssistantCreatedAt as (number | null | undefined);

  const centerPid = useMemo(
    () => (isCreateMode ? (draftPid ? draftPid : pidData) : pidData),
    [isCreateMode, draftPid, pidData]
  );
  // Refs to track initialization and previous values for controlled auto-scroll
  const initializedRef = React.useRef<boolean>(false);
  const prevCenterRef = React.useRef<any>(null);
  const prevCreateRef = React.useRef<boolean>(false);
  const mainContentRef = React.useRef<HTMLElement | null>(null);
  const [lastSeenAssistantCreatedAt, setLastSeenAssistantCreatedAt] = useState<number | null>(null);

  // When no PID is present (intro mode), let the left panel expand further
  // to visually meet the left arrow beside the intro "How to" table.
  // Once a PID is visible or in create mode, use the tighter app layout width.
  const isIntro = !isCreateMode && !centerPid;
  const leftSidebarWidth = isIntro ? 440 : 360;

  const SHOW_CONTRAST_CHECKER = false;

  const handleHelpOpen = (context?: string) => {
    setHelpContext(context ?? null);
    setHelpOpen(true);
  };

  const handleHelpClose = () => {
    setHelpOpen(false);
    setHelpContext(null);
  };

  const handleUserGuideOpen = () => setUserGuideOpen(true);
  const handleUserGuideClose = () => setUserGuideOpen(false);


  const onLoadDemo = async () => {
    // Treat Load Demo like a full reset, then apply demo PID
    if (typeof handleClearAll === 'function') {
      await handleClearAll();
    }
    await loadDemoData?.();
    setIsCreateMode(false);
    setNavOpen(false);
  };


  const onCreateMode = async () => {
    // Create should also start from a clean slate
    if (typeof handleClearAll === 'function') {
      await handleClearAll();
    }
    console.log('[App] onCreateMode: entering Create mode');
    setIsCreateMode(true);
    setNavOpen(false);
  };

  // Classify parse/AI errors so the banner can explain the source clearly.
  const errorText = typeof error === 'string' && error.trim() ? error.trim() : null;
  const isAiConfigError = !!errorText && /missing GOOGLE_API_KEY|AI parsing is not configured/i.test(errorText);
  const isAiUnavailable = !!errorText && /AI parsing is not available right now|Request timed out|server may be busy/i.test(errorText);

  // When the assistant creates a brand-new PID from scratch, show it in Create mode
  React.useEffect(() => {
    if (!lastAssistantCreatedAt || !pidData) return;
    if (lastSeenAssistantCreatedAt === lastAssistantCreatedAt) return;
    setLastSeenAssistantCreatedAt(lastAssistantCreatedAt);
    setIsCreateMode(true);
    setDraftPid(pidData);
    setNavOpen(false);
  }, [lastAssistantCreatedAt, lastSeenAssistantCreatedAt, pidData]);

  // Export handlers: keep build-safe even if export wiring differs in your branch.

  // Stable callbacks for Create mode to prevent effect loops / flicker
  const handleDraftChange = useCallback(
    (pid: any) => {
      setDraftPid(pid);
      setPidData?.(pid);
    },
    [setPidData]
  );

  const handleCreateCancel = useCallback(() => {
    setIsCreateMode(false);
    setPidData?.(null);
    setDraftPid(null);
  }, [setPidData]);

  const handleApplyExample = useCallback(
    (pid: any) => {
      // Apply example into the draft and keep Create mode active so the
      // top Create assistant + Examples area remains visible.
      setPidData?.(pid);
      setDraftPid(pid);
      setNavOpen(false);
    },
    [setPidData]
  );

  // Safe wrappers: some branches may omit these handlers from the hook,
  // but the UI expects stable functions.
  const safeSetPidData = useCallback((v: any) => setPidData?.(v), [setPidData]);
  const safeSetGeneralNotes = useCallback((v: string) => setGeneralNotes?.(v), [setGeneralNotes]);
  const safeAskAssistant = useCallback(
    async (q: string) => {
      if (typeof askAssistant === 'function') {
        await askAssistant(q, aiModel);
      }
    },
    [askAssistant, aiModel]
  );

  // Export handlers accept an optional PID override (used by CreateMode/examples)
  const onExportPdf = async (pidOverride?: any) => {
    const exportPid = pidOverride || (isCreateMode ? draftPid : pidData);
    if (!exportPid) return;
    await exportToPdf(exportPid, generalNotes || '');
  };

  const onExportWord = async (pidOverride?: any) => {
    const exportPid = pidOverride || (isCreateMode ? draftPid : pidData);
    if (!exportPid) return;
    await exportToWord(exportPid, generalNotes || '');
  };

  const onExportJson = async (pidOverride?: any) => {
    const exportPid = pidOverride || (isCreateMode ? draftPid : pidData);
    if (!exportPid) return;
    await exportToJson(exportPid, generalNotes || '');
  };

  const onExportZip = async (pidOverride?: any) => {
    const exportPid = pidOverride || (isCreateMode ? draftPid : pidData);
    if (!exportPid) return;
    const wordBlob = await exportToWord(exportPid, generalNotes || '');
    const ganttDataUrl = await toGanttDataURL('png', 2.5);
    if (!ganttDataUrl) {
      alert('Gantt chart not available for export.');
      return;
    }
    await exportWordAndGanttZip(
      wordBlob,
      ganttDataUrl,
      (exportPid?.titleBlock?.projectTitle as string) || 'PMOMax_PID'
    );
  };

  // On small screens, only auto-scroll when we *transition* to Create mode or
  // when a PID first becomes available. Skip on initial mount and on resets so
  // the intro page doesn't jump unexpectedly.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1024) return; // only for small screens

    const main = document.getElementById('main-content');
    if (!main) return;

    // Track previous values so we only act on transitions
    const prevCenter = (prevCenterRef.current ?? null) as any;
    const prevCreate = prevCreateRef.current ?? false;

    // If this is the initial mount, don't scroll — just mark initialized.
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevCenterRef.current = centerPid;
      prevCreateRef.current = isCreateMode;
      return;
    }

    const becameCreate = !prevCreate && isCreateMode;
    const becameCentered = !prevCenter && !!centerPid;
    const becameIntro = prevCenter && !centerPid; // Switched to intro page

    if (becameCreate || becameCentered) {
      try {
        main.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {}
    }

    // Scroll to top when switching to intro page
    if (becameIntro) {
      try {
        // Scroll the main content wrapper
        const introWrapper = main.querySelector('[class*=\"overflow-auto\"]') as HTMLElement;
        if (introWrapper) {
          introWrapper.scrollTo({ top: 0, behavior: 'smooth' });
        }
        main.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    }

    prevCenterRef.current = centerPid;
    prevCreateRef.current = isCreateMode;
  }, [centerPid, isCreateMode]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-brand-dark text-brand-text" style={{ minHeight: '100dvh', height: '100dvh', overflow: 'hidden' }}>
      {/* DEV: visible debug badge for isCreateMode / centerPid state */}
      {import.meta.env.DEV && (
        <div style={{ position: 'fixed', right: 12, top: 12, zIndex: 9999 }}>
          <div className="px-2 py-1 rounded-md text-xs font-semibold text-white" style={{ background: 'rgba(0,0,0,0.6)', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            CreateMode: {String(isCreateMode)} • centerPid: {centerPid ? 'yes' : 'no'}
          </div>
        </div>
      )}
      <Header onNavToggle={() => setNavOpen((v) => !v)} onHelp={handleHelpOpen} onUserGuide={handleUserGuideOpen} />

      {/* App body: Left sidebar • Main • Right navigation */}
      {/* When a PID is focused/loaded we slightly shrink the left sidebar so the main content becomes wider. */}
      <div className="flex flex-1 min-h-0">
        {/** compute a responsive class to reduce max-width by ~30% when a PID is present */}
        {
          /* eslint-disable @typescript-eslint/no-unused-vars */
        }
        {/* leftAsideClass toggles responsive max-widths for a subtle 25-30% shrink */}
        {(() => {})()}
        <aside
          className={(() => {
            const base = 'w-full max-w-xs flex-shrink-0 h-full overflow-y-auto border-r border-brand-border transition-all duration-200';
            // When a center PID exists, use slightly smaller breakpoints so main gains horizontal space
            if (centerPid) {
              return base + ' md:max-w-xs xl:max-w-sm';
            }
            return base + ' md:max-w-sm xl:max-w-md';
          })()}
        >
          <LeftSidebar
            onParse={onParse}
            onClearAll={handleClearAll}
            onAskAssistant={safeAskAssistant}
            aiAssistantHistory={aiAssistantHistory}
            pidData={pidData}
            setPidData={safeSetPidData}
            generalNotes={generalNotes}
            setGeneralNotes={safeSetGeneralNotes}
            isLoading={isLoading}
            error={error}
            onHelp={handleHelpOpen}
            onExportPdf={onExportPdf}
            onExportWord={onExportWord}
            onExportJson={onExportJson}
            onExportZip={onExportZip}
            onCreateMode={onCreateMode}
            onLoadDemo={onLoadDemo}
            setIsCreateMode={setIsCreateMode}
            onRunRiskAgent={runRiskAgent ?? (async () => {})}
            onRunComplianceAgent={runComplianceAgent ?? (async () => {})}
            resetNonce={resetNonce}
          />
        </aside>

        <main 
          id="main-content" 
          ref={mainContentRef}
          className="flex-1 min-w-0 min-h-0 flex flex-col"
        >
          {isCreateMode ? (
            <Suspense fallback={<div className="p-8 text-center">Loading create panel…</div>}>
              <CreateMode
                initialData={null}
                onDraftChange={handleDraftChange}
                onCancel={handleCreateCancel}
                onApplyExample={handleApplyExample}
                onHelp={handleHelpOpen}
                onShowNav={() => setNavOpen(true)}
                aiModel={aiModel}
                onExportPdf={onExportPdf}
                onExportWord={onExportWord}
                onExportJson={onExportJson}
                onExportZip={onExportZip}
              />
            </Suspense>
          ) : centerPid ? (
            <div className="flex-1 min-h-0 overflow-auto">
              <MainContent pidData={centerPid as any} onReset={handleClearAll} onHelp={handleHelpOpen} onLoadDemo={onLoadDemo} warnings={warnings} />
            </div>
          ) : (
            // Use MainContent's built-in intro so the landing experience is consistent
            // (hero + how-to + structured sections + agent cards + right-side nav chips).
            <div 
              className="flex-1 min-h-0 overflow-auto"
              ref={(el) => {
                if (el) {
                  // Force scroll to top when intro loads
                  requestAnimationFrame(() => {
                    el.scrollTop = 0;
                  });
                }
              }}
            >
              <MainContent pidData={null as any} onReset={handleClearAll} onHelp={handleHelpOpen} onLoadDemo={onLoadDemo} warnings={warnings} />
            </div>
          )}
        </main>

        {!isCreateMode &&
          centerPid &&
          ((centerPid as any).titleBlock?.projectTitle || (centerPid as any).projectTitleAndId?.title) && (
            <aside className="w-56 shrink-0 border-l border-brand-border h-full overflow-y-auto overflow-x-hidden hidden lg:block sticky top-0 z-30">
              <NavPanel pidData={centerPid as any} />
            </aside>
          )}
      </div>

      {/* Mobile navigation overlay */}
      {centerPid &&
        ((centerPid as any).titleBlock?.projectTitle || (centerPid as any).projectTitleAndId?.title) &&
        navOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-64 bg-brand-panel border-l border-brand-border h-full overflow-y-auto">
              <NavPanel pidData={centerPid as any} />
            </div>
          </div>
        )}

      <HelpModal isOpen={helpOpen} onClose={handleHelpClose} context={helpContext} />
      <UserGuideModal isOpen={userGuideOpen} onClose={handleUserGuideClose} />
    </div>
  );
};

export default App;
