// MainContent_fixed2.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PMOMaxPID } from '../types';
import { Section } from './Section';
import { Field, hasContent } from './Field';
import GanttChart from './GanttChart';
import { STYLE_PRESETS } from '../lib/ganttPresets';
import { demoData } from '../data/demoData';
import { safeErrorMessage } from '../lib/safeError';
import { VirtualizedList } from './VirtualizedList';
import { computeDeterministicBudget } from '../lib/budgetDeterministic';

interface MainContentProps {
  pidData: PMOMaxPID | null;
  onReset?: () => void;
  onHelp?: (context?: string) => void;
  onLoadDemo?: () => Promise<void> | void;
  showAllSections?: boolean;
  warnings?: string[];
}

const MainContent: React.FC<MainContentProps> = ({
  pidData,
  onHelp,
  onLoadDemo,
  showAllSections,
  warnings,
}) => {
  // -------- Defensive pid handling (NO setState during render) --------
  const safePidData = useMemo<PMOMaxPID | null>(() => {
    try {
      if (pidData && typeof pidData === 'object') return pidData as PMOMaxPID;
      return null;
    } catch {
      return null;
    }
  }, [pidData]);

  const [fatalUiError, setFatalUiError] = useState<string | null>(null);

  useEffect(() => {
    // If pidData is non-null but invalid, show a safe error.
    if (pidData && !safePidData) {
      setFatalUiError('Malformed PID data. Unable to render project content.');
    } else {
      setFatalUiError(null);
    }
  }, [pidData, safePidData]);

  // ---- Gantt chart controls and state (canonical wiring) ----
  const [ganttStyleIdx, setGanttStyleIdx] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem('pid.gantt.style');
    const idx = STYLE_PRESETS.findIndex((p) => p.name === saved);
    return idx >= 0 ? idx : 0;
  });

  const [ganttScheme, setGanttScheme] = useState<'prism' | 'pastel' | 'metro'>('prism');
  const [ganttLabels, setGanttLabels] = useState(true);
  const [ganttGrid, setGanttGrid] = useState(true);
  const [ganttToday, setGanttToday] = useState(true);
  const [ganttArrows, setGanttArrows] = useState(true);
  const [ganttWeekends, setGanttWeekends] = useState(true);
  const [ganttCriticalPath, setGanttCriticalPath] = useState(true);

  const initialHeight = STYLE_PRESETS[ganttStyleIdx]?.box?.height ?? 22;
  const [ganttBarHeightUi, setGanttBarHeightUi] = useState<number>(initialHeight);
  const [ganttBarHeight, setGanttBarHeight] = useState<number>(initialHeight);

  // Background mode: 'dark' | 'light' | 'custom'
  const [ganttBg, setGanttBg] = useState<'dark' | 'light' | 'custom'>('dark');
  const [ganttBgCustom, setGanttBgCustom] = useState<string>('#0A0A0A');

  const [exportError, setExportError] = useState<string | null>(null);

  // Owner filter
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);

  // Agent results (risk & compliance)
  const [agentRisks, setAgentRisks] = useState<any[] | null>(null);
  const [agentCompliance, setAgentCompliance] = useState<any[] | null>(null);
  const [agentLoading, setAgentLoading] = useState<{ risk?: boolean; compliance?: boolean }>({});

  // ---- Sync bar height + saved style name when preset changes ----
  useEffect(() => {
    const preset = STYLE_PRESETS[ganttStyleIdx];
    if (!preset) return;
    const h = preset.box?.height ?? 22;
    setGanttBarHeightUi(h);
    setGanttBarHeight(h);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pid.gantt.style', preset.name);
    }
  }, [ganttStyleIdx]);

  // ---- Debounce slider UI height into the actual chart height ----
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = window.setTimeout(() => setGanttBarHeight(ganttBarHeightUi), 80);
    return () => window.clearTimeout(t);
  }, [ganttBarHeightUi]);

  // ---- Initialize background mode from pid.gantt.bg ----
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

  // ---- Persist background mode whenever it changes ----
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const value = ganttBg === 'custom' ? ganttBgCustom : ganttBg;
    window.localStorage.setItem('pid.gantt.bg', value);
  }, [ganttBg, ganttBgCustom]);

  // --- Intro hover/highlight helpers for connector SVGs ---
  const highlightTarget = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) el.classList.add('intro-highlight');
    } catch {}
  };

  const clearHighlight = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) el.classList.remove('intro-highlight');
    } catch {}
  };

  // Memoize unique owners for owner filter dropdown
  const uniqueOwners = useMemo(() => {
    if (!safePidData || !Array.isArray((safePidData as any).workBreakdownTasks)) return [];
    const owners = (safePidData as any).workBreakdownTasks.map((t: any) => t?.owner).filter(Boolean);
    return Array.from(new Set(owners));
  }, [safePidData]);

  // Memoize ganttTasks for GanttChart (respect owner filter)
  const ganttTasks = useMemo(() => {
    if (!safePidData || !Array.isArray((safePidData as any).workBreakdownTasks)) return [];
    let tasks = (safePidData as any).workBreakdownTasks as any[];
    if (ownerFilter.length > 0) {
      tasks = tasks.filter((t: any) => ownerFilter.includes(t?.owner));
    }
    return tasks;
  }, [safePidData, ownerFilter]);

  // --- Landing view connector lines (map left sidebar panels -> intro rows) ---
  const mainContentRef = useRef<HTMLElement | null>(null);
  const introInputRowRef = useRef<HTMLDivElement | null>(null);
  const introAssistantRowRef = useRef<HTMLDivElement | null>(null);
  const introRiskRowRef = useRef<HTMLDivElement | null>(null);
  const introComplianceRowRef = useRef<HTMLDivElement | null>(null);
  const introExportRowRef = useRef<HTMLDivElement | null>(null);
  const introNotesRowRef = useRef<HTMLDivElement | null>(null);

  const [introPanelLines, setIntroPanelLines] = useState<
    | null
    | {
        w: number;
        h: number;
        paths: Array<{ d: string; stroke: string; marker?: boolean }>;
      }
  >(null);

  useEffect(() => {
    // Only render connector geometry on landing page (no PID)
    if (safePidData) {
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
      const riskRow = introRiskRowRef.current;
      const complianceRow = introComplianceRowRef.current;
      const exportRow = introExportRowRef.current;
      const notesRow = introNotesRowRef.current;

      const paths: Array<{ d: string; stroke: string; marker?: boolean }> = [];

      // Standard single-line connectors for Input, Export, and Notes
      const simplePairs: Array<{ src: Element | null; dst: Element | null; stroke: string }> = [
        { src: inputPanel, dst: inputRow, stroke: 'rgba(96,165,250,0.85)' }, // blue
        { src: exportPanel, dst: exportRow, stroke: 'rgba(167,139,250,0.85)' }, // purple
        { src: notesPanel, dst: notesRow, stroke: 'rgba(34,211,238,0.85)' }, // cyan
      ];

      for (const p of simplePairs) {
        if (!p.src || !p.dst) continue;
        const sr = (p.src as HTMLElement).getBoundingClientRect();
        const dr = (p.dst as HTMLElement).getBoundingClientRect();

        const x1 = Math.max(0, Math.min(w, Math.round(dr.left)));
        const y1 = Math.max(0, Math.min(h, Math.round(dr.top + dr.height / 2)));
        const x2 = Math.max(0, Math.min(w, Math.round(sr.right)));
        const y2 = Math.max(0, Math.min(h, Math.round(sr.top + sr.height / 2)));

        const dx = Math.max(80, Math.abs(x1 - x2));
        const c1x = x1 - dx * 0.35;
        const c2x = x2 + dx * 0.35;

        const d = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
        paths.push({ d, stroke: p.stroke, marker: true });
      }

      // Parenthesis-like connection for AI Assist, Risk, and Compliance (all connect to assistant panel)
      if (assistantPanel && assistantRow && riskRow && complianceRow) {
        const sr = (assistantPanel as HTMLElement).getBoundingClientRect();
        const ar = (assistantRow as HTMLElement).getBoundingClientRect();
        const rr = (riskRow as HTMLElement).getBoundingClientRect();
        const cr = (complianceRow as HTMLElement).getBoundingClientRect();

        const topY = Math.max(0, Math.min(h, Math.round(ar.top + ar.height / 2)));
        const midY = Math.max(0, Math.min(h, Math.round(rr.top + rr.height / 2)));
        const botY = Math.max(0, Math.min(h, Math.round(cr.top + cr.height / 2)));
        const centerY = (topY + botY) / 2;

        const x2 = Math.max(0, Math.min(w, Math.round(sr.right)));
        const y2 = Math.max(0, Math.min(h, Math.round(sr.top + sr.height / 2)));

        const x1Base = Math.max(0, Math.min(w, Math.round(ar.left - 40)));
        const stroke = 'rgba(245,158,11,0.85)'; // amber

        const verticalLine = `M ${x1Base} ${topY} L ${x1Base} ${botY}`;
        paths.push({ d: verticalLine, stroke, marker: false });

        const horzTop = `M ${x1Base} ${topY} L ${Math.round(ar.left)} ${topY}`;
        const horzMid = `M ${x1Base} ${midY} L ${Math.round(rr.left)} ${midY}`;
        const horzBot = `M ${x1Base} ${botY} L ${Math.round(cr.left)} ${botY}`;
        paths.push({ d: horzTop, stroke, marker: false });
        paths.push({ d: horzMid, stroke, marker: false });
        paths.push({ d: horzBot, stroke, marker: false });

        const dx = Math.max(80, Math.abs(x1Base - x2));
        const c1x = x1Base - dx * 0.35;
        const c2x = x2 + dx * 0.35;
        const mainCurve = `M ${x1Base} ${centerY} C ${c1x} ${centerY}, ${c2x} ${y2}, ${x2} ${y2}`;
        paths.push({ d: mainCurve, stroke, marker: true });
      }

      setIntroPanelLines(paths.length ? { w, h, paths } : null);
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    window.addEventListener('resize', schedule);
    document.addEventListener('scroll', schedule, true);

    const ro = new ResizeObserver(schedule);
    try {
      const els = [
        document.getElementById('input-panel'),
        document.getElementById('assistant-panel'),
        document.getElementById('export-panel'),
        document.getElementById('notes-panel'),
        introInputRowRef.current,
        introAssistantRowRef.current,
        introRiskRowRef.current,
        introComplianceRowRef.current,
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
  }, [safePidData]);

  // Merge agent results with PID-provided entries for display (avoid duplicates by JSON)
  const displayedRisks = useMemo(() => {
    const base = Array.isArray((safePidData as any)?.risks) ? ((safePidData as any).risks as any[]) : [];
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
  }, [safePidData, agentRisks]);

  const displayedCompliance = useMemo(() => {
    const base = Array.isArray((safePidData as any)?.complianceSecurityPrivacy)
      ? ((safePidData as any).complianceSecurityPrivacy as any[])
      : [];
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
  }, [safePidData, agentCompliance]);

  // Scroll main content to top when intro page loads (pidData is null)
  useEffect(() => {
    if (!safePidData && mainContentRef.current) {
      try {
        mainContentRef.current.scrollTop = 0;
      } catch {}
    }
  }, [safePidData]);

  // Whenever a PID is generated/loaded, proactively run Risk & Compliance agents
  useEffect(() => {
    const ac = new AbortController();

    const runAgents = async () => {
      if (!safePidData) return;
      try {
        setAgentLoading({ risk: true, compliance: true });

        // Risk agent
        try {
          const r = await fetch('/api/ai/risk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pidData: safePidData }),
            signal: ac.signal,
          });
          const jr = await r.json();
          if (jr && jr.ok && Array.isArray(jr.risks)) setAgentRisks(jr.risks);
        } catch {
          // ignore
        } finally {
          setAgentLoading((s) => ({ ...s, risk: false }));
        }

        // Compliance agent
        try {
          const c = await fetch('/api/ai/compliance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pidData: safePidData }),
            signal: ac.signal,
          });
          const jc = await c.json();
          if (jc && jc.ok && Array.isArray(jc.checklist)) setAgentCompliance(jc.checklist);
        } catch {
          // ignore
        } finally {
          setAgentLoading((s) => ({ ...s, compliance: false }));
        }
      } catch {
        // ignore
      }
    };

    runAgents();
    return () => ac.abort();
  }, [safePidData]);

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
        ganttBg === 'dark' ? '#000000' : ganttBg === 'light' ? '#FFFFFF' : ganttBgCustom || '#000000';

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
      setExportError('Export failed: ' + safeErrorMessage(e));
    }
  };

  const handleOwnerClick = (owner: string) => {
    setOwnerFilter((prev) => {
      if (prev.includes(owner)) {
        return prev.length === 1 ? [] : prev.filter((o) => o !== owner);
      }
      return [...prev, owner];
    });
  };

  // --------- Landing page (no PID) ----------
  if (!safePidData) {
    // --- Pixel-perfect landing/intro section ---
    const INTRO_FIELD_KEYS = [
      { section: 'Objectives', description: 'SMART goals, KPIs, success.' },
      { section: 'Scope', description: 'Inclusions, exclusions, constraints.' },
      { section: 'Schedule', description: 'Milestones, Gantt, dependencies.' },
      { section: 'Risks', description: 'Risks, mitigations, issues.' },
      { section: 'Governance', description: 'Stakeholders, RACI, comms.' },
      { section: 'Budget', description: 'Costs, resources, tools.' },
      { section: 'Notes', description: 'Background, open questions.' },
    ];
    return (
      <main
        ref={mainContentRef as any}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-0 md:p-0 text-white bg-[#181e2a]"
        style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}
      >
        <div className="flex flex-col items-center w-full pt-12 pb-6">
          <div className="text-5xl font-extrabold text-amber-300 mb-3 text-center drop-shadow-lg">PMOMax — Bring your project notes to life</div>
          <div className="text-2xl font-bold text-amber-200 mb-2 text-center">The AI Copilot for PMO Leaders & Project Managers</div>
          <div className="text-lg text-slate-200 mb-8 text-center max-w-3xl">
            Bring your meeting notes, project briefs, and scattered docs into one place. PMOMax turns them into structured, evidence-based PIDs and planning artifacts, helping teams align faster, spot bottlenecks earlier, and spend less time on status updates.
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-10 px-8 pb-10 w-full max-w-[1500px] mx-auto items-stretch">
          {/* Left panel (Getting Started) */}
          <div className="flex-1 min-w-[360px] max-w-[520px] bg-[#20263a] rounded-3xl border border-amber-300/40 p-8 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="text-3xl font-bold text-amber-300 mb-4 tracking-tight">Getting Started</div>
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                <span className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-semibold text-lg shadow">Paste</span>
                <span className="bg-amber-400 text-black px-4 py-1.5 rounded-full font-semibold text-lg shadow">Upload</span>
                <span className="bg-emerald-400 text-black px-4 py-1.5 rounded-full font-semibold text-lg shadow">Drop</span>
                <span className="text-white/90 text-lg ml-3">: your PID into the Input panel — parsing and structure extraction happen automatically.</span>
              </div>
              <div className="mb-3 flex items-center">
                <span className="bg-violet-600 text-white px-4 py-1.5 rounded-full font-semibold text-lg mr-3 shadow">Export & Share:</span>
                <span className="text-white/90 text-lg">Export Word / PDF / JSON with Gantt and notes included.</span>
              </div>
              <div className="mb-3 flex items-center">
                <span className="bg-amber-700 text-white px-4 py-1.5 rounded-full font-semibold text-lg mr-3 shadow">AI Assist & Drafting:</span>
                <span className="text-white/90 text-lg">Refine language, fill gaps, and generate a complete PID draft.</span>
              </div>
              <div className="mb-3 flex items-center">
                <span className="bg-pink-900 text-white px-4 py-1.5 rounded-full font-semibold text-lg mr-3 shadow">Risk Agent:</span>
                <span className="text-white/90 text-lg">Auto-scans the PID and surfaces key risks and mitigations.</span>
              </div>
              <div className="mb-3 flex items-center">
                <span className="bg-teal-900 text-white px-4 py-1.5 rounded-full font-semibold text-lg mr-3 shadow">Compliance Agent:</span>
                <span className="text-white/90 text-lg">Checks privacy, auditability, and policy gaps and creates checklist items.</span>
              </div>
              <div className="mb-6 flex items-center">
                <span className="bg-cyan-900 text-white px-4 py-1.5 rounded-full font-semibold text-lg mr-3 shadow">General Notes:</span>
                <span className="text-white/90 text-lg">Track decisions, open questions, and meeting notes across the project lifecycle.</span>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <div className="flex-1 bg-pink-900/95 rounded-xl p-4 text-center shadow-lg">
                <div className="text-xl font-bold text-white mb-1">Risk Agent</div>
                <div className="text-white/90 text-base">Surface top project risks with mitigations.</div>
              </div>
              <div className="flex-1 bg-teal-900/95 rounded-xl p-4 text-center shadow-lg">
                <div className="text-xl font-bold text-white mb-1">Compliance Agent</div>
                <div className="text-white/90 text-base">Generate compliance and policy checklists.</div>
              </div>
              <div className="flex-1 bg-amber-400/95 rounded-xl p-4 text-center shadow-lg">
                <div className="text-xl font-bold text-black mb-1">AI Assistant</div>
                <div className="text-black/90 text-base">Refine and complete your PID with AI.</div>
              </div>
            </div>
          </div>
          {/* Right panel (What PMOMax extracts for you) */}
          <div className="flex-1 min-w-[360px] max-w-[540px] bg-[#20263a] rounded-3xl border border-amber-300/40 p-8 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="text-3xl font-bold text-amber-300 mb-4 tracking-tight">What PMOMax extracts for you</div>
              <table className="w-full text-left border-collapse mt-2 mb-6">
                <thead>
                  <tr>
                    <th className="text-amber-200 text-xl font-semibold pb-3">Section</th>
                    <th className="text-amber-200 text-xl font-semibold pb-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {INTRO_FIELD_KEYS.map((row) => (
                    <tr key={row.section} className="border-t border-slate-700/60">
                      <td className="py-3 pr-6 text-white/90 font-semibold text-lg">{row.section}</td>
                      <td className="py-3 text-slate-200 text-lg">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Bottom feature bar */}
        <div className="flex flex-wrap gap-4 justify-center px-8 pb-10 mt-6 w-full max-w-[1500px] mx-auto">
          <div className="flex-1 min-w-[200px] max-w-[220px] bg-pink-900/95 rounded-xl p-4 text-center shadow-lg">
            <div className="text-lg font-bold text-white mb-1">Risk Agent</div>
            <div className="text-white/90 text-base">Surface top project risks with mitigations.</div>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[220px] bg-teal-900/95 rounded-xl p-4 text-center shadow-lg">
            <div className="text-lg font-bold text-white mb-1">Compliance Agent</div>
            <div className="text-white/90 text-base">Generate compliance and policy checklists.</div>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[220px] bg-amber-400/95 rounded-xl p-4 text-center shadow-lg">
            <div className="text-lg font-bold text-black mb-1">AI Assistant</div>
            <div className="text-black/90 text-base">Refine and complete your PID with AI.</div>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[220px] bg-blue-500/95 rounded-xl p-4 text-center shadow-lg">
            <div className="text-lg font-bold text-white mb-1">Input</div>
            <div className="text-white/90 text-base">Paste, upload, or drop a PID</div>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[220px] bg-amber-700/95 rounded-xl p-4 text-center shadow-lg">
            <div className="text-lg font-bold text-white mb-1">AI Assistant</div>
            <div className="text-white/90 text-base">Refine, iterate, and ask questions</div>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[220px] bg-green-700/95 rounded-xl p-4 text-center shadow-lg">
            <div className="text-lg font-bold text-white mb-1">Gantt</div>
            <div className="text-white/90 text-base">Visualize schedule & dependencies</div>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[220px] bg-violet-600/95 rounded-xl p-4 text-center shadow-lg">
            <div className="text-lg font-bold text-white mb-1">Export</div>
            <div className="text-white/90 text-base">Word / PDF / JSON exports</div>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[220px] bg-cyan-900/95 rounded-xl p-4 text-center shadow-lg">
            <div className="text-lg font-bold text-white mb-1">Notes</div>
            <div className="text-white/90 text-base">Capture decisions & context</div>
          </div>
        </div>
      </main>
    );
  }

  // --------- PID Render ----------
  const {
    titleBlock = { projectTitle: '', subtitle: '', generatedOn: '' } as any,
    projectSponsor = { name: '', role: '' } as any,
    projectManagerOwner = { name: '', role: '' } as any,
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
    budgetSummary = null,
    resourcesTools = [],
    risks = [],
    mitigationsContingencies = [],
    issuesDecisionsLog = [],
    communicationPlan = [],
    governanceApprovals = [],
    complianceSecurityPrivacy = [],
    openQuestionsNextSteps = [],
    notesBackground = '',
  } = safePidData as any;

  const budgetRows = Array.isArray(budgetCostBreakdown) ? budgetCostBreakdown : [];
  const derivedBudgetRows = (() => {
    if (budgetRows.length > 0) return budgetRows;
    try {
      return (computeDeterministicBudget(safePidData || {}) as any)?.items || [];
    } catch {
      return [];
    }
  })();

  const budgetIsEstimated = budgetRows.length === 0 && derivedBudgetRows.length > 0;
  const workBreakdownRows = Array.isArray(workBreakdownTasks) ? workBreakdownTasks : [];

  const useVirtualBudget = derivedBudgetRows.length > 60;
  const useVirtualWorkBreakdown = workBreakdownRows.length > 80;

  const budgetCurrency = (budgetSummary as any)?.currency || 'USD';
  const budgetTotal =
    typeof (budgetSummary as any)?.totalCostUsd === 'number'
      ? (budgetSummary as any).totalCostUsd
      : derivedBudgetRows.reduce((sum: number, r: any) => sum + (Number(r?.totalCostUsd) || 0), 0);

  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const formatCurrency = (value: number) => (Number.isFinite(value) ? usd.format(value) : '—');

  const formatHours = (hours: any) => {
    if (typeof hours === 'number' && Number.isFinite(hours)) return hours.toLocaleString();
    return hours || '—';
  };

  const formatRate = (row: any) => {
    const rate = row?.rateUsdPerHour ?? row?.hourlyRate ?? row?.rate;
    if (typeof rate === 'number' && Number.isFinite(rate)) return formatCurrency(rate);
    return rate || '—';
  };

  const formatMultiplier = (multiplier: any) => {
    if (typeof multiplier === 'number' && Number.isFinite(multiplier)) {
      const val = multiplier % 1 === 0 ? multiplier.toFixed(0) : multiplier.toFixed(2);
      return `×${val}`;
    }
    return multiplier || '—';
  };

  const formatJustification = (row: any) => {
    const j = String(row?.justification || '').trim();
    return j || 'AI justification pending — using deterministic baseline.';
  };

  // Section-level visibility aligned with navigation logic
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

  const showPeopleSection = true;

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
    <main
      ref={mainContentRef as any}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6 text-white"
    >
      {fatalUiError && (
        <div className="rounded border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
          {fatalUiError}
        </div>
      )}

      {Array.isArray(warnings) && warnings.length > 0 && (
        <div className="rounded border border-amber-400/30 bg-amber-950/20 p-3 text-sm text-amber-200">
          <div className="font-semibold mb-1">Warnings</div>
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {visibleProjectInfo && (
        <Section id="project-title" title="01 — Project Info" onHelp={onHelp} helpContext="projectInfo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-white">
            {titleBlock?.projectTitle && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-0.5">Project Title</div>
                <div>{titleBlock.projectTitle}</div>
              </div>
            )}
            {titleBlock?.subtitle && (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-0.5">Subtitle</div>
                <div>{titleBlock.subtitle}</div>
              </div>
            )}
            {titleBlock?.generatedOn && (
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
                    {obj?.successMeasure ? (
                      <span className="text-xs text-amber-300">({obj.successMeasure})</span>
                    ) : null}
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
        <Section
          id="assumptions"
          title="05 — Assumptions, Constraints, Dependencies"
          onHelp={onHelp}
          helpContext="assumptions"
        >
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
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-[var(--color-bg-panel)]'
                }`}
                onClick={() => setGanttLabels((v) => !v)}
              >
                Labels
              </button>

              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttGrid
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-[var(--color-bg-panel)]'
                }`}
                onClick={() => setGanttGrid((v) => !v)}
              >
                Grid
              </button>

              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttToday
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-[var(--color-bg-panel)]'
                }`}
                onClick={() => setGanttToday((v) => !v)}
              >
                Today
              </button>

              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttArrows
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-[var(--color-bg-panel)]'
                }`}
                onClick={() => setGanttArrows((v) => !v)}
              >
                Arrows
              </button>

              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttWeekends
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-[var(--color-bg-panel)]'
                }`}
                onClick={() => setGanttWeekends((v) => !v)}
              >
                Weekends
              </button>

              <button
                className={`px-2 py-1 text-sm border rounded transition-colors ${
                  ganttCriticalPath
                    ? 'bg-amber-400 border-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-slate-900 border-brand-border text-slate-100 hover:bg-[var(--color-bg-panel)]'
                }`}
                onClick={() => setGanttCriticalPath((v) => !v)}
              >
                Critical Path
              </button>

              <div
                className="rounded-lg p-2 inline-flex items-center gap-3"
                style={{
                  background: 'rgba(14,165,233,0.06)',
                  border: '1px solid rgba(14,165,233,0.12)',
                }}
              >
                <div className="text-sm font-semibold text-slate-200">Export Gantt</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 text-sm font-semibold border rounded shadow bg-sky-600 border-sky-500 text-white"
                    onClick={() => handleExport('png')}
                    type="button"
                  >
                    PNG
                  </button>
                  <button
                    className="px-3 py-1 text-sm font-semibold border rounded shadow bg-sky-600 border-sky-500 text-white"
                    onClick={() => handleExport('jpeg')}
                    type="button"
                  >
                    JPEG
                  </button>
                  <button
                    className="px-3 py-1 text-sm font-semibold border rounded shadow bg-sky-600 border-sky-500 text-white"
                    onClick={() => handleExport('svg')}
                    type="button"
                  >
                    SVG
                  </button>
                </div>
              </div>

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

            <div className="mt-2 rounded border border-[var(--color-border)] bg-slate-950 p-2">
              <span className="text-xs text-slate-400">Preview: {STYLE_PRESETS[ganttStyleIdx]?.name}</span>

              <GanttChart
                tasks={ganttTasks as any}
                stylePreset={
                  {
                    ...STYLE_PRESETS[ganttStyleIdx],
                    box: { ...STYLE_PRESETS[ganttStyleIdx].box, height: ganttBarHeight },
                  } as any
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
                      className="px-3 py-1.5 rounded-full font-semibold shadow border border-amber-500 bg-[var(--color-bg-panel)] text-amber-100 hover:bg-amber-200 hover:text-black transition-all"
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
            {Array.isArray(milestones) && milestones.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {milestones.map((m: any, idx: number) => (
                  <li key={idx}>
                    {typeof m === 'string'
                      ? m
                      : `${m?.milestone || m?.name || 'Milestone'}${m?.date ? ` — ${m.date}` : ''}`}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-slate-300">No milestones available.</div>
            )}
          </Field>

          <Field title="Work Breakdown">
            {workBreakdownRows.length > 0 ? (
              useVirtualWorkBreakdown ? (
                <VirtualizedList
                  items={workBreakdownRows}
                  height={320}
                  rowHeight={26}
                  className="rounded border border-brand-border/60 bg-[var(--color-bg-panel)]/40"
                  renderRow={(task: any) => (
                    <div className="px-2 text-xs text-white whitespace-nowrap overflow-hidden text-ellipsis">
                      {task?.name || task?.task || 'Task'} — {task?.owner || 'Owner'}{' '}
                      {task?.start ? `(${task.start}` : ''}
                      {task?.end ? `–${task.end})` : task?.start ? ')' : ''}
                    </div>
                  )}
                />
              ) : (
                <ul className="list-disc list-inside text-xs text-white space-y-0.5">
                  {workBreakdownRows.map((task: any, idx: number) => (
                    <li key={idx}>
                      {task?.name || task?.task || 'Task'} — {task?.owner || 'Owner'}{' '}
                      {task?.start ? `(${task.start}` : ''}
                      {task?.end ? `–${task.end})` : task?.start ? ')' : ''}
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="text-xs text-slate-300">No work breakdown tasks available.</div>
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

          <Field title="Budget & Cost Breakdown">
            {budgetIsEstimated && (
              <div className="mb-2 text-xs text-amber-200/90">
                Estimated budget (deterministic baseline). Update with actuals when available.
              </div>
            )}

            <div className="mb-2 text-xs text-brand-muted">Currency: {String(budgetCurrency).toUpperCase()}</div>

            {useVirtualBudget ? (
              <div className="rounded border border-brand-border/60 overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_2fr] text-left text-brand-muted bg-[var(--color-bg-panel)] text-sm">
                  <div className="py-2 px-3 font-semibold">Task</div>
                  <div className="py-2 px-3 font-semibold">Persona</div>
                  <div className="py-2 px-3 font-semibold">Hours</div>
                  <div className="py-2 px-3 font-semibold">B</div>
                  <div className="py-2 px-3 font-semibold">M</div>
                  <div className="py-2 px-3 font-semibold text-right">Total</div>
                  <div className="py-2 px-3 font-semibold">Justification</div>
                </div>
                <VirtualizedList
                  items={derivedBudgetRows}
                  height={320}
                  rowHeight={40}
                  className="bg-slate-950/40"
                  renderRow={(row: any, idx: number) => (
                    <div
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_2fr] text-sm text-white border-t border-brand-border/60 ${
                        idx % 2 === 0 ? 'bg-white/5' : 'bg-transparent'
                      }`}
                    >
                      <div className="py-2 px-3 truncate">{row?.task || 'Task'}</div>
                      <div className="py-2 px-3 truncate">{row?.role || 'Persona'}</div>
                      <div className="py-2 px-3 truncate">{formatHours(row?.estimatedHours)}</div>
                      <div className="py-2 px-3 truncate">{formatRate(row)}</div>
                      <div className="py-2 px-3 truncate">{formatMultiplier(row?.complexityMultiplier)}</div>
                      <div className="py-2 px-3 text-right whitespace-nowrap">{formatCurrency(row?.totalCostUsd)}</div>
                      <div className="py-2 px-3 truncate" title={formatJustification(row)}>
                        {formatJustification(row)}
                      </div>
                    </div>
                  )}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-white border border-brand-border/60 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="text-left text-brand-muted bg-[var(--color-bg-panel)]">
                      <th className="py-2 px-3 font-semibold">Task</th>
                      <th className="py-2 px-3 font-semibold">Persona</th>
                      <th className="py-2 px-3 font-semibold">Hours</th>
                      <th className="py-2 px-3 font-semibold">B</th>
                      <th className="py-2 px-3 font-semibold">M</th>
                      <th className="py-2 px-3 font-semibold text-right">Total</th>
                      <th className="py-2 px-3 font-semibold">Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derivedBudgetRows.map((row: any, idx: number) => (
                      <tr
                        key={idx}
                        className={`border-t border-brand-border/60 ${
                          idx % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-900/10'
                        }`}
                      >
                        <td className="py-2 px-3 align-top">{row?.task || 'Task'}</td>
                        <td className="py-2 px-3 align-top">{row?.role || 'Persona'}</td>
                        <td className="py-2 px-3 align-top">{formatHours(row?.estimatedHours)}</td>
                        <td className="py-2 px-3 align-top">{formatRate(row)}</td>
                        <td className="py-2 px-3 align-top">{formatMultiplier(row?.complexityMultiplier)}</td>
                        <td className="py-2 px-3 align-top text-right whitespace-nowrap">
                          {formatCurrency(row?.totalCostUsd)}
                        </td>
                        <td className="py-2 px-3 align-top" title={formatJustification(row)}>
                          {formatJustification(row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-2 text-xs text-brand-muted">
              {Number.isFinite(budgetTotal) && budgetTotal > 0
                ? `Total: ${formatCurrency(budgetTotal)} from pid.budgetSummary.totalCostUsd`
                : 'Total: —'}
            </div>
          </Field>

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
          <div className="mb-2 text-xs text-slate-400">
            {(agentLoading?.risk || agentLoading?.compliance) && 'Running agents… '}
            {agentLoading?.risk ? 'Risk ' : ''}
            {agentLoading?.compliance ? 'Compliance ' : ''}
          </div>

          {Array.isArray(displayedRisks) && displayedRisks.length > 0 && (
            <Field title="Key Risks">
              <ul className="list-disc list-inside text-sm text-white space-y-1">
                {displayedRisks.map((r: any, idx: number) => (
                  <li key={idx}>
                    {typeof r === 'string'
                      ? r
                      : `${r?.risk || 'Risk'}${r?.probability ? ` — P:${r.probability}` : ''}${
                          r?.impact ? ` / I:${r.impact}` : ''
                        }`}
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
                      : `${it?.issue || 'Issue'} — ${it?.decision || 'Decision'}${it?.owner ? ` — ${it.owner}` : ''}${
                          it?.date ? ` — ${it.date}` : ''
                        }`}
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
                    {typeof c === 'string'
                      ? c
                      : `${c?.audience || 'Audience'} — ${c?.cadence || 'Cadence'} — ${c?.channel || 'Channel'}`}
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </Section>
      )}

      {visibleGovernanceSection && (
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
                  <li key={idx}>
                    {typeof c === 'string' ? c : `${c?.requirement || 'Requirement'} — ${c?.notes || '—'}`}
                  </li>
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