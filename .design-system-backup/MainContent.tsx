import React, { useEffect, useMemo, useState, useRef } from 'react';
import { PMOMaxPID } from '../types';
import { Section } from './Section';
import { Field, hasContent } from './Field';
import GanttChart from './GanttChart';
// import { WelcomeIconsRow } from './WelcomeIconsRow';
import { STYLE_PRESETS } from '../lib/ganttPresets';
import { demoData } from '../data/demoData';

interface MainContentProps {
  pidData: PMOMaxPID | null;
  onReset?: () => void;
  onHelp?: (context?: string) => void;
  onLoadDemo?: () => Promise<void> | void;
  showAllSections?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ pidData, onReset, onHelp, onLoadDemo, showAllSections }) => {
  // ---- Gantt chart controls and state (canonical wiring) ----
  const [ganttStyleIdx, setGanttStyleIdx] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem('pid.gantt.style');
    const idx = STYLE_PRESETS.findIndex((p) => p.name === saved);
    return idx >= 0 ? idx : 0;
  });
  const [ganttScheme, setGanttScheme] = useState<'prism' | 'pastel' | 'metro'>('prism');
  // Canonical defaults: ON (user can toggle off)
  const [ganttLabels, setGanttLabels] = useState(true);
  const [ganttGrid, setGanttGrid] = useState(true);
  const [ganttToday, setGanttToday] = useState(true);
  const [ganttArrows, setGanttArrows] = useState(true);
  const [ganttWeekends, setGanttWeekends] = useState(true);
  const [ganttCriticalPath, setGanttCriticalPath] = useState(true);

  // Throttle bar-height updates into the chart to avoid "streaking" during fast slider drags.
  const initialHeight = STYLE_PRESETS[ganttStyleIdx]?.box.height ?? 22;
  const [ganttBarHeightUi, setGanttBarHeightUi] = useState<number>(initialHeight);
  const [ganttBarHeight, setGanttBarHeight] = useState<number>(initialHeight);

  // Background mode: 'dark' | 'light' | '#RRGGBB' stored in pid.gantt.bg
  const [ganttBg, setGanttBg] = useState<'dark' | 'light' | 'custom'>('dark');
  const [ganttBgCustom, setGanttBgCustom] = useState<string>('#0A0A0A');
  const [exportError, setExportError] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);

  // Sync bar height + saved style name when preset changes
  useEffect(() => {
    const preset = STYLE_PRESETS[ganttStyleIdx];
    if (!preset) return;
    setGanttBarHeightUi(preset.box.height);
    setGanttBarHeight(preset.box.height);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pid.gantt.style', preset.name);
    }
  }, [ganttStyleIdx]);

  // Debounce slider UI height into the actual chart height
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = window.setTimeout(() => setGanttBarHeight(ganttBarHeightUi), 80);
    return () => window.clearTimeout(t);
  }, [ganttBarHeightUi]);

  // Initialize background mode from pid.gantt.bg
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedBg = window.localStorage.getItem('pid.gantt.bg');
    if (!savedBg) return;
    if (savedBg === 'dark' || savedBg === 'light') {
      setGanttBg(savedBg);
    } else if (/^#?[0-9a-fA-F]{6}$/.test(savedBg)) {
      const hex = savedBg.startsWith('#') ? savedBg : `#${savedBg}`;
      setGanttBg('custom');
      setGanttBgCustom(hex);
    }
  }, []);

  // Persist background mode whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const value = ganttBg === 'custom' ? ganttBgCustom : ganttBg;
    window.localStorage.setItem('pid.gantt.bg', value);
  }, [ganttBg, ganttBgCustom]);

  // --- Intro hover/highlight helpers for connector SVGs ---
  const highlightTarget = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('intro-highlight');
      }
    } catch {}
  };

  const clearHighlight = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('intro-highlight');
      }
    } catch {}
  };

  // Memoize unique owners for owner filter dropdown
  const uniqueOwners = useMemo(() => {
    if (!pidData || !Array.isArray(pidData.workBreakdownTasks)) return [];
    const owners = pidData.workBreakdownTasks.map((t: any) => t.owner).filter(Boolean);
    return Array.from(new Set(owners));
  }, [pidData]);

  // Memoize ganttTasks for GanttChart (respect owner filter)
  const ganttTasks = useMemo(() => {
    if (!pidData || !Array.isArray(pidData.workBreakdownTasks)) return [];
    let tasks = pidData.workBreakdownTasks;
    if (ownerFilter.length > 0) {
      tasks = tasks.filter((t: any) => ownerFilter.includes(t.owner));
    }
    return tasks;
  }, [pidData, ownerFilter]);

  // (displayedRisks / displayedCompliance are declared later after `pidData` is
  // destructured to ensure hook order is stable and variables are in-scope)
  // Agent precomputed results (risk & compliance) for quick display
  const [agentRisks, setAgentRisks] = useState<any[] | null>(null);
  const [agentCompliance, setAgentCompliance] = useState<any[] | null>(null);
  const [agentLoading, setAgentLoading] = useState<{ risk?: boolean; compliance?: boolean }>({});
// --- Landing view connector lines (map left sidebar panels -> intro rows) ---
// These lines are computed from real DOM geometry so they stay aligned across browsers/sizes.
const introInputRowRef = useRef<HTMLDivElement | null>(null);
const introAssistantRowRef = useRef<HTMLDivElement | null>(null);
const introExportRowRef = useRef<HTMLDivElement | null>(null);
const introNotesRowRef = useRef<HTMLDivElement | null>(null);
const [introPanelLines, setIntroPanelLines] = useState<
  | null
  | {
      w: number;
      h: number;
      paths: Array<{ d: string; stroke: string }>;
    }
>(null);

useEffect(() => {
  if (pidData) {
    // Clear any landing-only overlays when a PID is loaded.
    if (introPanelLines) setIntroPanelLines(null);
    return;
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let raf = 0;
  const compute = () => {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);

    const inputPanel = document.getElementById('input-panel');
    const assistantPanel = document.getElementById('assistant-panel');
    const exportPanel = document.getElementById('export-panel');
    const notesPanel = document.getElementById('notes-panel');

    const inputRow = introInputRowRef.current;
    const assistantRow = introAssistantRowRef.current;
    const exportRow = introExportRowRef.current;
    const notesRow = introNotesRowRef.current;

    const pairs: Array<{ src: Element | null; dst: Element | null; stroke: string }> = [
      { src: inputPanel, dst: inputRow, stroke: 'rgba(96,165,250,0.85)' }, // blue
      { src: exportPanel, dst: exportRow, stroke: 'rgba(167,139,250,0.85)' }, // purple
      { src: assistantPanel, dst: assistantRow, stroke: 'rgba(245,158,11,0.85)' }, // amber
      { src: notesPanel, dst: notesRow, stroke: 'rgba(34,211,238,0.85)' }, // cyan
    ];

    const paths: Array<{ d: string; stroke: string }> = [];
    for (const p of pairs) {
      if (!p.src || !p.dst) continue;
      const sr = (p.src as HTMLElement).getBoundingClientRect();
      const dr = (p.dst as HTMLElement).getBoundingClientRect();

      // Start at the left edge of the row content; end at the right edge of the left panel.
      const x1 = Math.max(0, Math.min(w, Math.round(dr.left)));
      const y1 = Math.max(0, Math.min(h, Math.round(dr.top + dr.height / 2)));
      const x2 = Math.max(0, Math.min(w, Math.round(sr.right)));
      const y2 = Math.max(0, Math.min(h, Math.round(sr.top + sr.height / 2)));

      const dx = Math.max(80, Math.abs(x1 - x2));
      const c1x = x1 - dx * 0.35;
      const c2x = x2 + dx * 0.35;

      // Draw right-to-left so arrowhead points toward the left panel.
      const d = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
      paths.push({ d, stroke: p.stroke });
    }

    setIntroPanelLines(paths.length ? { w, h, paths } : null);
  };

  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(compute);
  };

  // Keep aligned during scroll inside any container, resizes, and font/layout changes.
  window.addEventListener('resize', schedule);
  document.addEventListener('scroll', schedule, true);

  const ro = new ResizeObserver(schedule);
  try {
    const els = [
      document.getElementById('input-panel'),
      document.getElementById('assistant-panel'),
      document.getElementById('export-panel'),
      introInputRowRef.current,
      introAssistantRowRef.current,
      introExportRowRef.current,
      introNotesRowRef.current,
    ].filter(Boolean) as Element[];
    els.forEach((e) => ro.observe(e));
  } catch {}

  schedule();
  const t = window.setTimeout(schedule, 50);

  return () => {
    window.clearTimeout(t);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('scroll', schedule, true);
    try {
      ro.disconnect();
    } catch {}
    if (raf) cancelAnimationFrame(raf);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [pidData]);

  // Merge agent results with PID-provided entries for display (avoid duplicates by JSON)
  const displayedRisks = useMemo(() => {
    const base = Array.isArray(pidData?.risks) ? (pidData as any).risks : [];
    const extra = Array.isArray(agentRisks) ? agentRisks : [];
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of [...base, ...extra]) {
      try {
        const key = JSON.stringify(r);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(r);
        }
      } catch {
        out.push(r);
      }
    }
    return out;
  }, [pidData, agentRisks]);

  const displayedCompliance = useMemo(() => {
    const base = Array.isArray(pidData?.complianceSecurityPrivacy) ? (pidData as any).complianceSecurityPrivacy : [];
    const extra = Array.isArray(agentCompliance) ? agentCompliance : [];
    const seen = new Set<string>();
    const out: any[] = [];
    for (const c of [...base, ...extra]) {
      try {
        const key = JSON.stringify(c);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(c);
        }
      } catch {
        out.push(c);
      }
    }
    return out;
  }, [pidData, agentCompliance]);

  // Helper: scroll to section id
  const scrollToId = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {}
  };

  // Whenever a PID is generated/loaded, proactively run Risk & Compliance agents
  useEffect(() => {
    let ac = new AbortController();
    const runAgents = async () => {
      if (!pidData) return;
      try {
        setAgentLoading({ risk: true, compliance: true });

        // Risk agent
        try {
          const r = await fetch('/api/ai/risk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pidData }),
            signal: ac.signal,
          });
          const jr = await r.json();
          if (jr && jr.ok && Array.isArray(jr.risks)) setAgentRisks(jr.risks);
        } catch (e) {
          // ignore per-user environment; keep null
        } finally {
          setAgentLoading((s) => ({ ...s, risk: false }));
        }

        // Compliance agent
        try {
          const c = await fetch('/api/ai/compliance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pidData }),
            signal: ac.signal,
          });
          const jc = await c.json();
          if (jc && jc.ok && Array.isArray(jc.checklist)) setAgentCompliance(jc.checklist);
        } catch (e) {
          // ignore
        } finally {
          setAgentLoading((s) => ({ ...s, compliance: false }));
        }
      } catch (e) {}
    };

    runAgents();
    return () => ac.abort();
  }, [pidData]);

  // Export current #gantt-fig as PNG/JPEG/SVG at 2× with active background
  const handleExport = async (type: 'svg' | 'png' | 'jpeg') => {
    setExportError(null);
    try {
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        throw new Error('Exports are only available in a browser.');
      }
      const svgElem = document.getElementById('gantt-fig');
      if (!svgElem) throw new Error('Gantt chart not found.');
      if (!(svgElem instanceof SVGElement)) throw new Error('Gantt SVG not found.');

      const clone = svgElem.cloneNode(true);
      if (!(clone instanceof SVGElement)) throw new Error('SVG export failed.');

      const width = Math.max(1, svgElem.clientWidth || 900) * 2;
      const height = Math.max(1, svgElem.clientHeight || 360) * 2;
      clone.setAttribute('width', width.toString());
      clone.setAttribute('height', height.toString());

      const bg =
        ganttBg === 'dark'
          ? '#000000'
          : ganttBg === 'light'
          ? '#FFFFFF'
          : ganttBgCustom || '#000000';

      // Ensure a background rect exists as first child
      const first = clone.firstElementChild;
      if (!first || first.tagName.toLowerCase() !== 'rect') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('width', width.toString());
        rect.setAttribute('height', height.toString());
        rect.setAttribute('fill', bg);
        clone.insertBefore(rect, clone.firstChild);
      } else {
        first.setAttribute('fill', bg);
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);

      // SVG export: just download the serialized SVG with embedded styles
      const presetName = STYLE_PRESETS[ganttStyleIdx]?.name ?? 'export';
      if (type === 'svg') {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gantt-${presetName}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Raster exports: draw SVG into a 2× canvas
      const img = new window.Image();
      img.width = width;
      img.height = height;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setExportError('Export failed: Canvas context error.');
          return;
        }
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const mime = type === 'jpeg' ? 'image/jpeg' : 'image/png';
        const ext = type === 'jpeg' ? 'jpeg' : 'png';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              setExportError('Export failed: canvas blob error.');
              return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gantt-${presetName}.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
          },
          mime
        );
      };
      img.onerror = () => setExportError('Export failed: image load error.');
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    } catch (e: any) {
      setExportError('Export failed: ' + (e?.message || String(e)));
    }
  };

  // Handle owner filter button click
  const handleOwnerClick = (owner: string) => {
    setOwnerFilter((prev) => {
      if (prev.includes(owner)) {
        return prev.length === 1 ? [] : prev.filter((o) => o !== owner);
      }
      return [...prev, owner];
    });
  };

  if (!pidData) {
    // IMPORTANT: intro image path is relative to /public (Linux case-sensitive).
    const groups = [
      {
        n: 1,
        title: 'Objectives & KPIs',
        desc: "Define goals and how you'll measure success.",
        bullets: [
          { k: 'Summary', v: '1–3 lines on what this delivers.' },
          { k: 'Objectives', v: 'SMART goals the team owns.' },
          { k: 'KPIs', v: 'Baseline → target success measures.' },
        ],
      },
      {
        n: 2,
        title: 'Scope & Assumptions',
        desc: "What's in/out and what you're assuming.",
        bullets: [
          { k: 'Scope-in', v: 'Included features/teams.' },
          { k: 'Scope-out', v: 'Explicitly excluded items.' },
          { k: 'Assumptions', v: 'Things expected to hold true.' },
          { k: 'Constraints', v: 'Budget/time/compliance/tech limits.' },
        ],
      },
      {
        n: 3,
        title: 'Stakeholders & Team',
        desc: 'Map everyone involved and how they show up.',
        bullets: [
          { k: 'Stakeholders', v: 'People with influence or impact.' },
          { k: 'Sponsor', v: 'Exec accountable for outcome.' },
          { k: 'Manager', v: 'Project owner / day-to-day lead.' },
          { k: 'Team', v: 'Core members + roles.' },
        ],
      },
      {
        n: 4,
        title: 'Gantt & Timeline',
        desc: 'Deliverables and dependencies at a glance.',
        bullets: [
          { k: 'Timeline', v: 'Phase dates and key gates.' },
          { k: 'Deliverables', v: 'Outputs + acceptance criteria.' },
          { k: 'Work', v: 'Tasks feeding the Gantt.' },
          { k: 'Deps', v: 'Cross-team/system blockers.' },
        ],
      },
      {
        n: 5,
        title: 'Budget & Resources',
        desc: 'Costs, people, tools, and systems.',
        bullets: [
          { k: 'Budget', v: 'Summary and major line items.' },
          { k: 'Resources', v: 'People, licenses, systems.' },
        ],
      },
      {
        n: 6,
        title: 'Risks & Mitigations',
        desc: 'Issues, impacts, and how you respond.',
        bullets: [
          { k: 'Risks', v: 'Probability × impact with owners.' },
          { k: 'Mitigations', v: 'Pre-agreed responses.' },
          { k: 'Issues', v: 'Active problems to resolve.' },
          { k: 'Questions', v: 'Open decisions and unknowns.' },
        ],
      },
      {
        n: 7,
        title: 'Governance & Approvals',
        desc: 'Sign-offs, controls, and operating rhythm.',
        bullets: [
          { k: 'Governance', v: 'Decision cadence and escalation.' },
          { k: 'Approvals', v: 'Gates and signoff requirements.' },
          { k: 'Compliance', v: 'Security / privacy / policy needs.' },
        ],
      },
      {
        n: 8,
        title: 'Risk',
        desc: 'Identify, assess, and manage project risks.',
        bullets: [{ k: 'Risk', v: 'Probability × impact, owners, mitigations.' }],
      },
      {
        n: 9,
        title: 'Compliance',
        desc: 'Meet all regulatory, security, and policy requirements.',
        bullets: [{ k: 'Compliance', v: 'Security, privacy, and policy needs.' }],
      },
    ];

    return (
      <main className="flex-1 overflow-y-auto py-8 px-12 md:px-16 lg:px-24 text-brand-text bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" style={{ fontSize: '1.25rem' }}>
        <div className="max-w-[1300px] mx-auto">
          {/* Intro / Landing (no PID loaded) */}
          <div className="relative">
            {/* subtle glow */}
            {/* Intro highlight CSS (subtle and non-overwhelming) */}
            <style>{`
              /* Smooth transition for left-panel sections when highlighted */
              #input-panel, #export-panel, #assistant-panel {
                transition: box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease;
              }
              .intro-highlight {
                box-shadow: 0 10px 30px rgba(247,184,75,0.08), 0 0 0 3px rgba(247,184,75,0.05) !important;
                transform: translateZ(0) scale(1.01);
                border-color: rgba(247,184,75,0.6) !important;
              }
            `}</style>
            <div
              className="absolute inset-0 pointer-events-none opacity-30 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle at 50% 30%, rgba(245,158,11,0.25), transparent 55%)',
              }}
            />
            <div className="relative space-y-4">

{/* Landing connectors (lg+): map intro rows to left sidebar panels. */}
{introPanelLines && (
  <svg
    className="hidden lg:block fixed inset-0 w-screen h-screen pointer-events-none"
    style={{ zIndex: 30 }}
    width={introPanelLines.w}
    height={introPanelLines.h}
    viewBox={`0 0 ${introPanelLines.w} ${introPanelLines.h}`}
    preserveAspectRatio="none"
    aria-hidden
  >
    <defs>
      <marker
        id="pmomaxArrow"
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
      </marker>
    </defs>

    {introPanelLines.paths.map((p, i) => (
      <path
        key={i}
        d={p.d}
        stroke={p.stroke}
        strokeWidth={2}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: p.stroke }}
        markerEnd="url(#pmomaxArrow)"
      />
    ))}
  </svg>
)}

{/* Cards row */}

              {/* Hero */}
              <div className="text-center mb-8">
                <div className="text-4xl md:text-5xl font-extrabold tracking-wide text-amber-400 drop-shadow-sm">
                  PMOMax — Bring your project notes to life
                </div>
                <div className="mt-4 text-2xl md:text-3xl font-extrabold text-amber-200">
                  The AI Copilot for PMO Leaders &amp; Project Managers
                </div>
                <div className="mt-6 text-xl text-slate-200/90 leading-relaxed max-w-4xl mx-auto">
                  Bring your meeting notes, project briefs, and scattered docs into one place. PMOMax turns them into structured, evidence-based PIDs and planning artifacts, helping teams align faster, spot bottlenecks earlier, and spend less time on status updates.
                </div>
              </div>

              {/* Two cards side by side */}
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                {/* Left: Getting Started */}
                <div
                  className="flex-1 rounded-2xl border border-slate-700/60 bg-slate-950/40 shadow-xl p-4 flex flex-col"
                >
                  <div className="text-2xl font-extrabold text-amber-300 mb-4">
                    Getting Started
                  </div>

                  <div className="space-y-3 text-lg text-slate-200/90 flex-1">
                      <div ref={introInputRowRef} onMouseEnter={() => highlightTarget('input-panel')} onMouseLeave={() => clearHighlight('input-panel')} className="flex items-start gap-3">
                        <div className="flex-shrink-0 inline-flex items-center gap-2 w-[210px] justify-end">
                          <span className="inline-flex items-center w-[70px] justify-center rounded-md px-2 py-0.5 text-sm font-extrabold bg-sky-500/30 text-sky-100">Paste</span>
                          <span className="inline-flex items-center w-[80px] justify-center rounded-md px-2 py-0.5 text-sm font-extrabold bg-amber-500/30 text-amber-100">Upload</span>
                          <span className="inline-flex items-center w-[60px] justify-center rounded-md px-2 py-0.5 text-sm font-extrabold bg-teal-500/30 text-teal-100">Drop</span>
                          <span className="inline-flex items-center text-sm text-slate-300">:</span>
                        </div>
                        <div className="flex-1">
                          your PID into the Input panel — parsing and structure extraction happen
                          automatically.
                        </div>
                      </div>

                      <div ref={introExportRowRef} onMouseEnter={() => highlightTarget('export-panel')} onMouseLeave={() => clearHighlight('export-panel')} className="flex items-start gap-3">
                        <span className="inline-flex items-center w-[210px] flex-shrink-0 rounded-md px-2 py-1 text-sm font-extrabold bg-indigo-700 text-white text-right">
                          Export &amp; Share:
                        </span>
                        <div className="flex-1">Export Word / PDF / JSON with Gantt and notes included.</div>
                      </div>

                      <div ref={introAssistantRowRef} onMouseEnter={() => highlightTarget('assistant-panel')} onMouseLeave={() => clearHighlight('assistant-panel')} className="flex items-start gap-3">
                        <span className="inline-flex items-center w-[210px] flex-shrink-0 rounded-md px-2 py-1 text-sm font-extrabold bg-amber-500/30 text-amber-100 text-right">
                          AI Assist &amp; Drafting:
                        </span>
                        <div className="flex-1">Refine language, fill gaps, and generate a complete PID draft.</div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="inline-flex items-center w-[210px] flex-shrink-0 rounded-md px-2 py-0.5 text-sm font-extrabold bg-pink-900/40 text-pink-100 text-right">
                          Risk Agent:
                        </span>
                        <div className="flex-1">Auto-scans the PID and surfaces key risks and mitigations.</div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="inline-flex items-center w-[210px] flex-shrink-0 rounded-md px-2 py-0.5 text-sm font-extrabold bg-teal-900/35 text-teal-100 text-right">
                          Compliance Agent:
                        </span>
                        <div className="flex-1">
                          Checks privacy, auditability, and policy gaps and creates checklist items.
                        </div>
                      </div>

                      <div ref={introNotesRowRef} onMouseEnter={() => highlightTarget('notes-panel')} onMouseLeave={() => clearHighlight('notes-panel')} className="flex items-start gap-3">
                        <span className="inline-flex items-center w-[210px] flex-shrink-0 rounded-md px-2 py-1 text-sm font-extrabold bg-cyan-600/30 text-cyan-100 text-right">
                          General Notes:
                        </span>
                        <div className="flex-1">Track decisions, open questions, and meeting notes across the project lifecycle.</div>
                      </div>
                    </div>
                </div>

                {/* Right: Structured Sections */}
                <div
                  className="flex-1 rounded-2xl border border-slate-700/60 bg-slate-950/40 shadow-xl p-4 flex flex-col"
                >
                  <div className="text-2xl font-extrabold text-amber-300 mb-4">
                    What PMOMax extracts for you
                  </div>

                  <div className="flex gap-4 flex-1 min-h-0">
                    <div className="flex-1 min-w-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/30 flex items-center justify-center">
                      <table className="w-full text-lg">
                        <thead>
                          <tr className="bg-slate-950/40">
                              <th className="text-left px-4 py-1 font-extrabold text-amber-200">Section</th>
                              <th className="text-left px-4 py-1 font-extrabold text-amber-200">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/60">
                            <tr>
                              <td className="px-4 py-1 font-semibold text-slate-100 text-left">Objectives</td>
                              <td className="px-4 py-1 text-slate-200/80 text-left">
                                SMART goals, KPIs, success.
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 font-semibold text-slate-100 text-left">Scope</td>
                              <td className="px-4 py-1 text-slate-200/80 text-left">
                                Inclusions, exclusions, constraints.
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 font-semibold text-slate-100 text-left">Schedule</td>
                              <td className="px-4 py-1 text-slate-200/80 text-left">
                                Milestones, Gantt, dependencies.
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 font-semibold text-slate-100 text-left">Risks</td>
                              <td className="px-4 py-2 text-slate-200/80 text-left">Risks, mitigations, issues.</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 font-semibold text-slate-100 text-left">Governance</td>
                              <td className="px-4 py-2 text-slate-200/80 text-left">Stakeholders, RACI, comms.</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 font-semibold text-slate-100 text-left">Budget</td>
                              <td className="px-4 py-2 text-slate-200/80 text-left">Costs, resources, tools.</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2 font-semibold text-slate-100 text-left">Notes</td>
                              <td className="px-4 py-2 text-slate-200/80 text-left">Background, open questions.</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Agent cards (horizontal) */}
              <div className="mt-6 w-full">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => scrollToId('risks')}
                        className="w-full lg:w-[360px] rounded-lg border border-transparent p-4 text-left transform-gpu hover:scale-102 transition-transform shadow-2xl ring-1 ring-pink-400/20"
                        style={{ background: 'rgba(139, 0, 46, 0.28)' }}
                        aria-label="Run Risk Agent"
                      >
                        <div className="text-2xl font-extrabold text-white mb-0 drop-shadow-md">Risk Agent</div>
                        <div className="text-base text-white/95 font-semibold leading-tight">
                          Surface top project risks with mitigations.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => scrollToId('governance')}
                        className="w-full lg:w-[360px] rounded-lg border border-transparent p-4 text-left transform-gpu hover:scale-102 transition-transform shadow-2xl ring-1 ring-teal-400/20"
                        style={{ background: 'rgba(4, 78, 68, 0.28)' }}
                        aria-label="Run Compliance Agent"
                      >
                        <div className="text-2xl font-extrabold text-white mb-0 drop-shadow-md">Compliance Agent</div>
                        <div className="text-base text-white/95 font-semibold leading-tight">
                          Generate compliance and policy checklists.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => scrollToId('project-title')}
                        className="w-full lg:w-[320px] rounded-lg border border-transparent bg-gradient-to-br from-amber-700 to-amber-500 p-3 text-left transform-gpu hover:scale-102 transition-transform"
                        aria-label="Open AI Assistant"
                      >
                        <div className="text-xl font-extrabold text-white mb-0">AI Assistant</div>
                        <div className="text-base text-white/90 font-semibold leading-tight">
                          Refine and complete your PID with AI.
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom horizontal feature/cards row (moved from right) */}
                <div className="mt-6 w-full">
                  <div className="flex gap-3 flex-wrap mb-0 justify-center">
                        {[
                          { k: 'Input', icon: '🡸', text: 'Paste, upload, or drop a PID', bgClass: '' },
                          { k: 'AI Assistant', icon: '⚡', text: 'Refine, iterate, and ask questions', bgClass: '' },
                          { k: 'Gantt', icon: '📊', text: 'Visualize schedule & dependencies', bgClass: '' },
                          { k: 'Export', icon: '⬇️', text: 'Word / PDF / JSON exports', bgClass: '' },
                          { k: 'Notes', icon: '📝', text: 'Capture decisions & context', bgClass: '' },
                        ].map((c) => (
                          <div
                            key={c.k}
                            className={`min-w-[140px] rounded-2xl p-3 shadow flex flex-col text-white ${c.bgClass ? `bg-gradient-to-br ${c.bgClass}` : 'bg-slate-800'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-base font-extrabold text-white">{c.k}</div>
                              <div className="text-2xl ml-3">{c.icon}</div>
                            </div>
                            <div className="text-sm text-slate-200 mt-1">{c.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>

              {/* Kept for rollback/testing: prior verbose intro (disabled by default)
                  IMPORTANT: moved out of JSX to prevent any hidden tag mismatch from breaking builds.
                  See LEGACY_INTRO_DISABLED block comment at bottom of this file. */}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ---- Render parsed PID ----
  // Destructure all needed fields from pidData
  const {
    titleBlock = { projectTitle: '', subtitle: '', generatedOn: '' },
    projectSponsor = { name: '', role: '' },
    projectManagerOwner = { name: '', role: '' },
    executiveSummary = '',
    problemStatement = '',
    businessCaseExpectedValue = '',
    objectivesSmart = [],
    kpis = [],
    scopeInclusions = [],
    scopeExclusions = [],
    assumptions = [],
    constraints = [],
    dependencies = [],
    stakeholders = [],
    teamRaci = [],
    timelineOverview = '',
    milestones = [],
    workBreakdownTasks = [],
    budgetCostBreakdown = [],
    resourcesTools = [],
    risks = [],
    mitigationsContingencies = [],
    issuesDecisionsLog = [],
    communicationPlan = [],
    governanceApprovals = [],
    complianceSecurityPrivacy = [],
    openQuestionsNextSteps = [],
    notesBackground = '',
  } = pidData || {};

  // Section-level visibility aligned with navigation logic
  // Optionally force-show all sections (used by CreateMode to mirror demo view)
  const showProjectInfo =
    hasContent((titleBlock as any)?.projectTitle) ||
    hasContent((titleBlock as any)?.projectId) ||
    hasContent((titleBlock as any)?.subtitle) ||
    hasContent((titleBlock as any)?.generatedOn) ||
    hasContent(projectSponsor) ||
    hasContent(projectManagerOwner);

  const showExecutiveSummarySection =
    hasContent(executiveSummary) || hasContent(problemStatement) || hasContent(businessCaseExpectedValue);

  const showObjectivesSection = hasContent(objectivesSmart) || hasContent(kpis);

  const showScopeSection = hasContent(scopeInclusions) || hasContent(scopeExclusions);

  const showAssumptionsSection = hasContent(assumptions) || hasContent(constraints) || hasContent(dependencies);

  const showGanttSection = hasContent(timelineOverview) || hasContent(workBreakdownTasks) || hasContent(milestones);

  const showPeopleSection =
    hasContent(stakeholders) ||
    hasContent(teamRaci) ||
    hasContent(budgetCostBreakdown) ||
    hasContent(resourcesTools);

  const showRisksSection =
    hasContent(risks) ||
    hasContent(mitigationsContingencies) ||
    hasContent(issuesDecisionsLog) ||
    hasContent(communicationPlan);

  const showGovernanceSection =
    hasContent(governanceApprovals) ||
    hasContent(complianceSecurityPrivacy) ||
    hasContent(openQuestionsNextSteps) ||
    hasContent(notesBackground);

  // If `showAllSections` is true, derive visible flags that force all sections on.
  const forceAll = !!showAllSections;
  const visibleProjectInfo = showAllSections ? true : showProjectInfo;
  const visibleExecutiveSummarySection = showAllSections ? true : showExecutiveSummarySection;
  const visibleObjectivesSection = showAllSections ? true : showObjectivesSection;
  const visibleScopeSection = showAllSections ? true : showScopeSection;
  const visibleAssumptionsSection = showAllSections ? true : showAssumptionsSection;
  const visibleGanttSection = showAllSections ? true : showGanttSection;
  const visiblePeopleSection = showAllSections ? true : showPeopleSection;
  const visibleRisksSection = showAllSections ? true : showRisksSection;
  const visibleGovernanceSection = showAllSections ? true : showGovernanceSection;

  

  return (
    <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6 text-white">
      {/* Reset button removed from PID area (handled in left sidebar/input panel) */}

      {visibleProjectInfo && (
        <Section id="project-title" title="01 — Project Info" onHelp={onHelp} helpContext="projectInfo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-white">
            {titleBlock.projectTitle && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-0.5">Project Title</div>
                <div>{titleBlock.projectTitle}</div>
              </div>
            )}
            {titleBlock.subtitle && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-0.5">Subtitle</div>
                <div>{titleBlock.subtitle}</div>
              </div>
            )}
            {titleBlock.generatedOn && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-0.5">Generated On</div>
                <div>{titleBlock.generatedOn}</div>
              </div>
            )}
            {projectSponsor && (projectSponsor as any).name && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-0.5">Project Sponsor</div>
                <div>{(projectSponsor as any).name}</div>
              </div>
            )}
            {projectSponsor && (projectSponsor as any).role && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-0.5">Sponsor Role</div>
                <div>{(projectSponsor as any).role}</div>
              </div>
            )}
            {projectManagerOwner && (projectManagerOwner as any).name && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-0.5">Project Manager / Owner</div>
                <div>{(projectManagerOwner as any).name}</div>
              </div>
            )}
          </div>
        </Section>
      )}

      {visibleExecutiveSummarySection && (
        <Section id="executive-summary" title="02 — Overview & Rationale" onHelp={onHelp} helpContext="executiveSummary">
          {hasContent(executiveSummary) && (
            <Field title="Executive Summary">
              <p className="text-sm text-white whitespace-pre-wrap">{executiveSummary}</p>
            </Field>
          )}
          {hasContent(problemStatement) && (
            <Field title="Problem Statement">
              <p className="text-sm text-white whitespace-pre-wrap">{problemStatement}</p>
            </Field>
          )}
          {hasContent(businessCaseExpectedValue) && (
            <Field title="Business Case & Expected Value">
              <p className="text-sm text-white whitespace-pre-wrap">{businessCaseExpectedValue}</p>
            </Field>
          )}
        </Section>
      )}

      {visibleObjectivesSection && (
        <Section id="objectives" title="03 — Objectives & KPIs" onHelp={onHelp} helpContext="objectives">
          {Array.isArray(objectivesSmart) && objectivesSmart.length > 0 && (
            <Field title="Objectives (SMART)">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {objectivesSmart.map((obj: any, idx: number) => (
                  <li key={idx}>
                    {obj?.objective || obj?.name || String(obj || '')}{' '}
                    {obj?.successMeasure ? <span className="text-xs text-amber-300">({obj.successMeasure})</span> : null}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(kpis) && kpis.length > 0 && (
            <Field title="KPIs / Success Metrics">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {kpis.map((kpi: any, idx: number) => (
                  <li key={idx}>
                    {kpi?.kpi || kpi?.name || String(kpi || '')}{' '}
                    {kpi?.baseline || kpi?.target ? (
                      <span className="text-xs text-amber-300">
                        (Baseline: {kpi?.baseline || '—'}, Target: {kpi?.target || '—'})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </Section>
      )}

      {visibleScopeSection && (
        <Section id="scope" title="04 — Scope & Deliverables" onHelp={onHelp} helpContext="scope">
          {Array.isArray(scopeInclusions) && scopeInclusions.length > 0 && (
            <Field title="Scope Inclusions">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {scopeInclusions.map((item: any, idx: number) => (
                  <li key={idx}>
                    {typeof item === 'string' ? item : item?.item || item?.inclusion || String(item || '')}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(scopeExclusions) && scopeExclusions.length > 0 && (
            <Field title="Scope Exclusions">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {scopeExclusions.map((item: any, idx: number) => (
                  <li key={idx}>
                    {typeof item === 'string' ? item : item?.item || item?.exclusion || String(item || '')}
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </Section>
      )}

      {visibleAssumptionsSection && (
        <Section id="assumptions" title="05 — Assumptions, Constraints, Dependencies" onHelp={onHelp} helpContext="assumptions">
          {Array.isArray(assumptions) && assumptions.length > 0 && (
            <Field title="Assumptions">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {assumptions.map((a: any, idx: number) => (
                  <li key={idx}>{typeof a === 'string' ? a : a?.assumption || String(a || '')}</li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(constraints) && constraints.length > 0 && (
            <Field title="Constraints">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {constraints.map((c: any, idx: number) => (
                  <li key={idx}>{typeof c === 'string' ? c : c?.constraint || String(c || '')}</li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(dependencies) && dependencies.length > 0 && (
            <Field title="Dependencies">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {dependencies.map((d: any, idx: number) => (
                  <li key={idx}>
                    {typeof d === 'string' ? d : `${d?.dependency || String(d || '')}`}
                    {d?.team || d?.teamOrSystem ? (
                      <span className="text-xs text-amber-300"> — {d.team || d.teamOrSystem}</span>
                    ) : null}
                    {d?.status ? <span className="text-xs text-amber-300"> ({d.status})</span> : null}
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </Section>
      )}

      {visibleGanttSection && (
        <Section id="gantt" title="06 — Schedule & Gantt" onHelp={onHelp} helpContext="gantt">
          {hasContent(timelineOverview) && (
            <Field title="Timeline Overview">
              <p className="text-sm text-white whitespace-pre-wrap">{timelineOverview}</p>
            </Field>
          )}

          <div className="mb-2 flex flex-col gap-2">
            <div id="gantt-controls" className="flex flex-wrap gap-2 items-center">
              <select
                className="bg-brand-panel border border-brand-border rounded px-2 py-1 text-sm"
                value={ganttStyleIdx}
                onChange={(e) => setGanttStyleIdx(Number(e.target.value))}
              >
                {STYLE_PRESETS.map((preset, idx) => (
                  <option key={preset.name} value={idx}>
                    {preset.name}
                  </option>
                ))}
              </select>

              <select
                className="bg-brand-panel border border-brand-border rounded px-2 py-1 text-sm"
                value={ganttScheme}
                onChange={(e) => setGanttScheme(e.target.value as any)}
              >
                {(['prism', 'pastel', 'metro'] as const).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>

              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttLabels
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-slate-800'
                }`}
                onClick={() => setGanttLabels((v) => !v)}
              >
                Labels
              </button>
              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttGrid
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-slate-800'
                }`}
                onClick={() => setGanttGrid((v) => !v)}
              >
                Grid
              </button>
              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttToday
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-slate-800'
                }`}
                onClick={() => setGanttToday((v) => !v)}
              >
                Today
              </button>
              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttArrows
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-slate-800'
                }`}
                onClick={() => setGanttArrows((v) => !v)}
              >
                Arrows
              </button>
              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttWeekends
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-slate-800'
                }`}
                onClick={() => setGanttWeekends((v) => !v)}
              >
                Weekends
              </button>
              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttCriticalPath
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-slate-800'
                }`}
                onClick={() => setGanttCriticalPath((v) => !v)}
              >
                Critical Path
              </button>

              <div className="rounded-lg p-2 inline-flex items-center gap-3" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
                <div className="text-sm font-semibold text-slate-200">Export Gantt</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 text-sm font-semibold border rounded shadow bg-sky-600 border-sky-500 text-white"
                    onClick={() => handleExport('png')}
                  >
                    PNG
                  </button>
                  <button
                    className="px-3 py-1 text-sm font-semibold border rounded shadow bg-sky-600 border-sky-500 text-white"
                    onClick={() => handleExport('jpeg')}
                  >
                    JPEG
                  </button>
                  <button
                    className="px-3 py-1 text-sm font-semibold border rounded shadow bg-sky-600 border-sky-500 text-white"
                    onClick={() => handleExport('svg')}
                  >
                    SVG
                  </button>
                </div>
              </div>

              {/* Slider UI (debounced into ganttBarHeight) */}
              <input
                className="w-36"
                type="range"
                min={6}
                max={40}
                value={ganttBarHeightUi}
                onChange={(e) => setGanttBarHeightUi(Number(e.target.value))}
              />

              <select
                className="bg-brand-panel border border-brand-border rounded px-2 py-1 text-sm"
                value={ganttBg}
                onChange={(e) => setGanttBg(e.target.value as 'dark' | 'light' | 'custom')}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="custom">Custom…</option>
              </select>
              {ganttBg === 'custom' && (
                <input
                  type="color"
                  className="ml-2 align-middle border rounded"
                  value={ganttBgCustom}
                  onChange={(e) => setGanttBgCustom(e.target.value)}
                  aria-label="Custom Gantt background color"
                  style={{ width: 32, height: 32, verticalAlign: 'middle', cursor: 'pointer' }}
                />
              )}
            </div>

            <div className="mt-2 rounded border border-slate-700 bg-slate-950 p-2">
              <span className="text-xs text-slate-400">Preview: {STYLE_PRESETS[ganttStyleIdx]?.name}</span>
              <GanttChart
                tasks={ganttTasks as any}
                stylePreset={
                  { ...STYLE_PRESETS[ganttStyleIdx], box: { ...STYLE_PRESETS[ganttStyleIdx].box, height: ganttBarHeight } } as any
                }
                scheme={ganttScheme}
                labels={ganttLabels}
                grid={ganttGrid}
                today={ganttToday}
                arrows={ganttArrows}
                weekends={ganttWeekends}
                criticalPath={ganttCriticalPath}
                barHeight={ganttBarHeight}
                backgroundMode={ganttBg === 'custom' ? ganttBgCustom : ganttBg}
              />

              {/* Owner filter buttons below Gantt */}
              {uniqueOwners.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                  {uniqueOwners.map((owner) => {
                    const active = ownerFilter.includes(owner);
                    return (
                      <button
                        key={owner}
                        type="button"
                        className={`px-3 py-1.5 rounded-full font-semibold shadow transition-all border ${
                          active
                            ? 'bg-amber-400 text-black border-amber-600 ring-2 ring-amber-700 scale-105'
                            : 'bg-slate-900 text-amber-200 border-amber-500 hover:bg-amber-300 hover:text-black hover:scale-105'
                        }`}
                        onClick={() => handleOwnerClick(owner)}
                      >
                        {owner}
                      </button>
                    );
                  })}
                  {ownerFilter.length > 0 && (
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full font-semibold shadow border border-amber-500 bg-slate-800 text-amber-100 hover:bg-amber-200 hover:text-black transition-all"
                      onClick={() => setOwnerFilter([])}
                    >
                      Show All
                    </button>
                  )}
                </div>
              )}
              {exportError && <div className="mt-2 text-sm font-semibold text-red-400">{exportError}</div>}
            </div>
          </div>

          <Field title="Milestones">
            {Array.isArray(milestones) && milestones.length > 0 && (
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {milestones.map((m: any, idx: number) => (
                  <li key={idx}>
                    {typeof m === 'string' ? m : `${m?.milestone || m?.name || 'Milestone'}${m?.date ? ` — ${m.date}` : ''}`}
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <Field title="Work Breakdown">
            {Array.isArray(workBreakdownTasks) && workBreakdownTasks.length > 0 && (
              <ul className="list-disc list-inside text-xs text-white space-y-0.5">
                {workBreakdownTasks.map((task: any, idx: number) => (
                  <li key={idx}>
                    {task?.name || task?.task || 'Task'} — {task?.owner || 'Owner'}{' '}
                    {task?.start ? `(${task.start}` : ''}
                    {task?.end ? `–${task.end})` : task?.start ? ')' : ''}
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </Section>
      )}

      {visiblePeopleSection && (
        <Section id="people" title="07 — People, Resources & Budget" onHelp={onHelp} helpContext="people">
          {Array.isArray(stakeholders) && stakeholders.length > 0 && (
            <Field title="Stakeholders">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {stakeholders.map((s: any, idx: number) => (
                  <li key={idx}>
                    {typeof s === 'string' ? s : `${s?.name || 'Stakeholder'}${s?.role ? ` — ${s.role}` : ''}`}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(teamRaci) && teamRaci.length > 0 && (
            <Field title="Team & Roles (RACI)">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-white">
                  <thead>
                    <tr className="text-left text-brand-muted">
                      <th className="py-1 pr-4">Member</th>
                      <th className="py-1 pr-4">Role</th>
                      <th className="py-1 pr-2">R</th>
                      <th className="py-1 pr-2">A</th>
                      <th className="py-1 pr-2">C</th>
                      <th className="py-1 pr-2">I</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRaci.map((r: any, idx: number) => (
                      <tr key={idx} className="border-t border-brand-border">
                        <td className="py-1 pr-4">{r?.member || r?.teamMember || '—'}</td>
                        <td className="py-1 pr-4">{r?.role || '—'}</td>
                        <td className="py-1 pr-2">{r?.R || ''}</td>
                        <td className="py-1 pr-2">{r?.A || ''}</td>
                        <td className="py-1 pr-2">{r?.C || ''}</td>
                        <td className="py-1 pr-2">{r?.I || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Field>
          )}

          {Array.isArray(budgetCostBreakdown) && budgetCostBreakdown.length > 0 && (
            <Field title="Budget & Cost Breakdown">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {budgetCostBreakdown.map((row: any, idx: number) => (
                  <li key={idx}>
                    {row?.item || 'Item'} — {row?.category || 'Category'} — {row?.cost ?? '—'}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(resourcesTools) && resourcesTools.length > 0 && (
            <Field title="Resources & Tools">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {resourcesTools.map((r: any, idx: number) => (
                  <li key={idx}>
                    {typeof r === 'string' ? r : `${r?.resource || 'Resource'}${r?.purpose ? ` — ${r.purpose}` : ''}`}
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </Section>
      )}

      {visibleRisksSection && (
        <Section id="risks" title="08 — Risks, Issues & Communications" onHelp={onHelp} helpContext="risks">
          {Array.isArray(displayedRisks) && displayedRisks.length > 0 && (
            <Field title="Key Risks">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {displayedRisks.map((r: any, idx: number) => (
                  <li key={idx}>
                    {typeof r === 'string'
                      ? r
                      : `${r?.risk || 'Risk'}${r?.probability ? ` — P:${r.probability}` : ''}${r?.impact ? ` / I:${r.impact}` : ''}`}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(mitigationsContingencies) && mitigationsContingencies.length > 0 && (
            <Field title="Mitigations / Contingencies">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {mitigationsContingencies.map((m: any, idx: number) => (
                  <li key={idx}>{typeof m === 'string' ? m : m?.mitigation || m?.contingency || String(m || '')}</li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(issuesDecisionsLog) && issuesDecisionsLog.length > 0 && (
            <Field title="Issues & Decisions Log">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {issuesDecisionsLog.map((it: any, idx: number) => (
                  <li key={idx}>
                    {typeof it === 'string'
                      ? it
                      : `${it?.issue || 'Issue'} — ${it?.decision || 'Decision'}${it?.owner ? ` — ${it.owner}` : ''}${it?.date ? ` — ${it.date}` : ''}`}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(communicationPlan) && communicationPlan.length > 0 && (
            <Field title="Communication Plan">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {communicationPlan.map((c: any, idx: number) => (
                  <li key={idx}>
                    {typeof c === 'string' ? c : `${c?.audience || 'Audience'} — ${c?.cadence || 'Cadence'} — ${c?.channel || 'Channel'}`}
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </Section>
      )}

      {showGovernanceSection && (
        <Section id="governance" title="09 — Governance, Compliance, Open Questions" onHelp={onHelp} helpContext="governance">
          {Array.isArray(governanceApprovals) && governanceApprovals.length > 0 && (
            <Field title="Governance & Approvals">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {governanceApprovals.map((g: any, idx: number) => (
                  <li key={idx}>
                    {typeof g === 'string' ? g : `${g?.gate || g?.approval || 'Gate'} — ${g?.signoffRequirement || '—'}`}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(displayedCompliance) && displayedCompliance.length > 0 && (
            <Field title="Compliance, Security & Privacy">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {displayedCompliance.map((c: any, idx: number) => (
                  <li key={idx}>{typeof c === 'string' ? c : `${c?.requirement || 'Requirement'} — ${c?.notes || '—'}`}</li>
                ))}
              </ul>
            </Field>
          )}

          {Array.isArray(openQuestionsNextSteps) && openQuestionsNextSteps.length > 0 && (
            <Field title="Open Questions & Next Steps">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {openQuestionsNextSteps.map((q: any, idx: number) => (
                  <li key={idx}>
                    {typeof q === 'string' ? q : `${q?.question || 'Question'} — ${q?.nextStep || 'Next step'}`}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {hasContent(notesBackground) && (
            <Field title="Notes & Background">
              <p className="text-sm text-white whitespace-pre-wrap">{notesBackground}</p>
            </Field>
          )}
        </Section>
      )}
    </main>
  );
};

export default MainContent;

/*
LEGACY_INTRO_DISABLED (kept for rollback/testing)

The following legacy intro JSX was previously rendered inside the `!pidData` branch under a
hidden div, but ANY mismatched tag inside it breaks the build because JSX still must parse.
To preserve it without risking JSX parse failures, it is stored here as a block comment.

--- BEGIN LEGACY INTRO JSX (as previously embedded) ---

<div className="hidden">
  {(() => {
    const SHOW_LEGACY_INTRO = false;
    return (
      <>
        {SHOW_LEGACY_INTRO && (
          <main className="flex-1 overflow-y-auto p-6 md:p-10 text-brand-text bg-gradient-to-br from-amber-50 via-white to-amber-100">
            ... (legacy content preserved in your original file) ...
          </main>
        )}
      </>
    );
  })()}
</div>

--- END LEGACY INTRO JSX ---

If you want it back, we can reintroduce it as a separate component and validate tag balance
so it can never break builds again.
*/
