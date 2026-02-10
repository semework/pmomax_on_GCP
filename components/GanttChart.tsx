// Auto-select style preset based on PID content keywords
export function autoSelectGanttStyle(pid: any): string {
  const text = JSON.stringify(pid).toLowerCase();
  if (text.includes('audit') || text.includes('soc2') || text.includes('iso') || text.includes('compliance') || text.includes('regulatory')) return 'Compliance & Regulatory';
  if (text.includes('sprint') || text.includes('iteration') || text.includes('velocity')) return 'Sprint / Iteration Plan';
  if (text.includes('gate') || text.includes('build') || text.includes('qa') || text.includes('perf')) return 'Engineering Build & Gates';
  if (text.includes('construction') || text.includes('infrastructure') || text.includes('rollout')) return 'ConstructionHazard';
  if (text.includes('risk') || text.includes('contingency') || text.includes('slack')) return 'Risk-Focused / Contingency';
  if (text.includes('marketing') || text.includes('campaign') || text.includes('launch')) return 'Marketing / Campaign Timeline';
  if (text.includes('research') || text.includes('discovery') || text.includes('checkpoint')) return 'Research / Discovery';
  if (text.includes('operation') || text.includes('maintenance') || text.includes('support') || text.includes('cycle')) return 'Operations / Run-the-Business';
  if (text.includes('portfolio') || text.includes('program overview') || text.includes('alignment')) return 'Program / Portfolio Overview';
  if (text.includes('executive') || text.includes('brief') || text.includes('board')) return 'Executive Brief';
  return 'Executive Brief'; // fallback
}
// components/GanttChart.tsx
//
// PMOMax Canonical Gantt (v4.5+) — SVG renderer
// - Fixed geometry: bars map to actual start/end dates
// - Toolbar IDs handled upstream (#gantt-controls / #gantt-fig)
// - Supports: box types, schemes, connectors, critical path overlay, weekends shading, today line
// - Exports handled upstream by cloning #gantt-fig SVG
//
import React, { useMemo, useState, useCallback } from 'react';
import { useRenderStats } from './useRenderStats';
import { makeConnectedBracketPath } from '../lib/ganttUtils';
import { CriticalPathBox } from '../types';

// CRITICAL_RED is reserved strictly for critical path tasks only.
const CRITICAL_RED = '#D32F2F';
const HEADER_LANE_TOP_OFFSET = 6;
const HEADER_LANE_HEIGHT = 24;

type GanttTask = {
  id: string;
  name: string;
  start: string;
  end: string;
  owner?: string;
  status?: string;
  priority?: string;
  kind?: string;
  // Dependencies may come from multiple shapes:
  // - deps: string | string[]
  // - dependsOn: string | string[] | number | number[]
  // - dependencies: string[] (canonical PMOMaxPID workBreakdownTasks)
  deps?: string | string[];
  dependsOn?: string | string[] | number | number[] | null;
  dependencies?: string[];
  milestone?: boolean;
  baselineStart?: string;
  baselineEnd?: string;
};

type Props = {
  tasks?: GanttTask[];
  stylePreset: any;
  scheme?: string;
  labels?: boolean;
  grid?: boolean;
  today?: boolean;
  arrows?: boolean;
  weekends?: boolean;
  criticalPath?: boolean;
  barHeight?: number;
  backgroundMode?: string; // 'dark' | 'light' | '#RRGGBB'
  // Optional three-phase critical path overlay boxes (CP1/CP2/CP3)
  criticalPathBoxes?: CriticalPathBox[];
};

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (!isFinite(d.getTime())) return null;
  return d;
}

function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / ms);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + n);
  return out;
}

function fmtTick(d: Date, fmt: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const pad2 = (x: number) => String(x).padStart(2,'0');
  return fmt
    .replace(/%b/g, months[d.getMonth()])
    .replace(/%d/g, pad2(d.getDate()))
    .replace(/%a/g, days[d.getDay()])
    .replace(/%y/g, pad2(d.getFullYear() % 100));
}

function getBgColor(bg: string | undefined): string {
  const v = (bg || 'dark').trim();
  if (v.toLowerCase() === 'dark') return '#000000';
  if (v.toLowerCase() === 'light') return '#FFFFFF';
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
  return '#000000';
}

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#','');
  const full = hex.length === 3 ? hex.split('').map(c=>c+c).join('') : hex;
  const r = parseInt(full.slice(0,2),16);
  const g = parseInt(full.slice(2,4),16);
  const b = parseInt(full.slice(4,6),16);
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  return lum < 128 ? '#E5E7EB' : '#111827';
}

function palette(name: string) {
  if (name === 'pastel') return ['#A7F3D0','#BFDBFE','#FDE68A','#FBCFE8','#DDD6FE','#FED7AA','#C7D2FE'];
  if (name === 'metro') return ['#60A5FA','#F97316','#FBBF24','#F472B6','#A78BFA','#FB7185','#3B82F6'];
  return ['#22D3EE','#F97316','#F97316','#E879F9','#FACC15','#60A5FA','#FB7185'];
}

function stableHash(s: string): number {
  let h = 2166136261;
  for (let i=0;i<s.length;i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function normalizeTasks(tasks?: GanttTask[]) {
  return (tasks || []).map((t, i) => {
    const t0: any = t || {};
    // Normalize dependencies from any supported field into a de-duplicated string[]
    const rawDeps = t0.deps ?? t0.dependsOn ?? t0.dependencies ?? [];

    const depsArr: string[] = [];
    const seen = new Set<string>();

    function pushDep(v: unknown) {
      const s = String(v).trim();
      if (!s || seen.has(s)) return;
      seen.add(s);
      depsArr.push(s);
    }

    if (Array.isArray(rawDeps)) {
      rawDeps.forEach(pushDep);
    } else if (typeof rawDeps === 'string' || typeof rawDeps === 'number') {
      String(rawDeps)
        .split(',')
        .forEach(pushDep);
    }

      return { 
        // Ensure stable safe identifiers and canonical fields 
        id: String(t0.id ?? `d-${i+1}`), 
        name: t0.name ?? `Task ${i+1}`, 
        start: t0.start || '', 
        end: t0.end || '', 
        owner: t0.owner || '', 
        status: t0.status || '', 
        priority: t0.priority || '', 
        kind: t0.kind || '', 
        milestone: !!t0.milestone, 
        baselineStart: t0.baselineStart, 
        baselineEnd: t0.baselineEnd, 
        _depsArr: depsArr, 
        ...t0, 
      }; 
  });
}

type CPResult = { criticalIds: Set<string>; boxes?: CriticalPathBox[] };

function computeCriticalPath(tasks: any[]): CPResult {
  // Longest path in DAG by duration (days)
  // Support deps that reference either task.id or task.name
  const idToIdx = new Map<string, number>();
  tasks.forEach((t: any, i: number) => {
    const id = String(t.id || `d-${i+1}`);
    idToIdx.set(id, i);
    if (t.name) {
      const key = String(t.name);
      if (!idToIdx.has(key)) idToIdx.set(key, i);
    }
  });

  const dur = tasks.map((t: any) => {
    const a = parseDate(t.start) || new Date();
    const b = parseDate(t.end) || a;
    return Math.max(1, Math.abs(daysBetween(a, b)) + 1);
  });

  const preds: number[][] = tasks.map(() => []);
  tasks.forEach((t: any, i: number) => {
    const deps = (t._depsArr || []).map((id: string) => idToIdx.get(id)).filter((x: any) => typeof x === 'number');
    preds[i] = deps as number[];
  });

  const memo = new Array<number>(tasks.length).fill(-1);
  const parent = new Array<number>(tasks.length).fill(-1);

  function dp(i: number): number {
    if (memo[i] >= 0) return memo[i];
    let best = 0;
    let bestPred = -1;
    for (const p of preds[i]) {
      const v = dp(p);
      if (v > best) { best = v; bestPred = p; }
    }
    parent[i] = bestPred;
    memo[i] = best + dur[i];
    return memo[i];
  }

  let endIdx = 0;
  let best = 0;
  for (let i=0;i<tasks.length;i++) {
    const v = dp(i);
    if (v > best) { best = v; endIdx = i; }
  }

  const criticalIds = new Set<string>();
  let cur = endIdx;
  while (cur >= 0) {
    const tcur = tasks[cur];
    if (!tcur) break; // defensive: stop if index invalid
    criticalIds.add(String(tcur.id ?? `d-${cur+1}`));
    const next = parent[cur];
    if (typeof next !== 'number' || next < 0 || next >= tasks.length) break;
    cur = next;
  }

  return { criticalIds };
}

function hasCycle(tasks: any[]): boolean {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const byId = new Map<string, any>();
  tasks.forEach((t, i) => {
    const id = String(t.id || `d-${i+1}`);
    byId.set(id, t);
    if (t.name) {
      const key = String(t.name);
      if (!byId.has(key)) byId.set(key, t);
    }
  });

  function visit(id: string): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    const t = byId.get(id);
    for (const dep of (t?._depsArr || [])) {
      if (visit(dep)) return true;
    }
    stack.delete(id);
    return false;
  }

  return tasks.some(t => visit(t.id));
}

function colorsForPreset(preset: any, scheme?: string): string[] {
  // If a scheme override is provided ("prism", "pastel", "metro"),
  // prefer that over any hard-coded preset colors so the control is
  // visibly meaningful.
  if (scheme) {
    return palette(scheme as string);
  }

  if (Array.isArray(preset?.colors) && preset.colors.length) return preset.colors;
  return palette((preset?.scheme || 'prism') as string);
}

function colorForTask(t: any, preset: any, schemeOverride?: string): string {
  // Only critical path bars use CRITICAL_RED, all others never use it
  const colors = colorsForPreset(preset, schemeOverride);
  const colorby = preset?.colorby || 'Owner';

  // If this function is called for a critical path bar, the caller will override with CRITICAL_RED
  // So, we must ensure that CRITICAL_RED is never returned for non-critical bars
  const key =
    colorby === 'Owner' ? (t.owner || '') :
    colorby === 'Kind' ? (t.kind || '') :
    colorby === 'Status' ? (t.status || '') :
    colorby === 'Priority' ? (t.priority || '') :
    '';

  const idx = stableHash(key || t.name || t.id) % colors.length;
  // Defensive: never return CRITICAL_RED from color array
  const color = colors[idx] || colors[0];
  return color === CRITICAL_RED ? '#8884d8' : color;
}

// Distinct style presets for Gantt chart
// Strict critical path visual rules: only critical path bars use red, all critical connectors are thick curved red lines
const STYLE_PRESETS = {
  ArtDeco: {
    box: { type: 'bevel', height: 28, radius: 8 },
    colors: ['#F59E42', '#2D3142', '#BFC0C0', '#EF8354', '#4F5D75'],
    scheme: 'metro',
    options: ['grid', 'today', 'arrows'],
    ticks: 'weekly',
    xTickFormat: '%b %d',
    connector: 'curve', // enforce curved for critical path
  },
  Blueprint: {
    box: { type: 'outline', height: 24, radius: 0 },
    colors: ['#2563EB', '#60A5FA', '#DBEAFE', '#1E3A8A', '#3B82F6'],
    scheme: 'metro',
    options: ['grid', 'arrows'],
    ticks: '2-week',
    xTickFormat: '%b %d',
    connector: 'curve', // enforce curved for critical path
  },
  CandyStripe: {
    box: { type: 'striped', height: 22, radius: 6 },
    colors: ['#F472B6', '#FDE68A', '#A7F3D0', '#38BDF8', '#C7D2FE'],
    scheme: 'pastel',
    options: ['grid', 'today'],
    ticks: 'weekly',
    xTickFormat: '%b %d',
    connector: 'curve',
  },
  Brutalist: {
    box: { type: 'sharp', height: 26, radius: 0 },
    // Avoid pure red in the base palette so only critical-path bars are red.
    // Use warm amber/magenta accents instead; critical bars still use CRITICAL_RED.
    colors: ['#111827', '#F59E42', '#EC4899', '#F97316', '#FACC15'],
    scheme: 'prism',
    options: ['grid'],
    ticks: 'monthly',
    xTickFormat: '%b',
    connector: 'curve', // enforce curved for critical path
  },
  Futurist: {
    box: { type: 'gradient', height: 24, radius: 12 },
    colors: ['#818CF8', '#F472B6', '#38BDF8', '#FBBF24', '#A78BFA'],
    scheme: 'pastel',
    options: ['today', 'arrows'],
    ticks: 'auto',
    xTickFormat: '%b %d',
    connector: 'curve',
  },
  Minimalist: {
    box: { type: 'minimal', height: 14, radius: 0 },
    colors: ['#6B7280', '#D1D5DB', '#F3F4F6', '#9CA3AF'],
    scheme: 'prism',
    options: [],
    ticks: 'monthly',
    xTickFormat: '%b',
    connector: 'curve', // enforce curved for critical path
  },
  MonochromeMatrix: {
    box: { type: 'split', height: 18, radius: 0 },
    colors: ['#111827', '#6B7280', '#D1D5DB'],
    scheme: 'prism',
    options: ['grid'],
    ticks: 'monthly',
    xTickFormat: '%b',
    connector: 'curve', // enforce curved for critical path
  },
  ConstructionHazard: {
    box: { type: 'bracket', height: 26, radius: 0 },
    colors: ['#F59E42', '#FACC15', '#F97316', '#4F5D75'], // remove red from non-critical
    scheme: 'metro',
    options: ['grid', 'arrows'],
    ticks: 'weekly',
    xTickFormat: '%b %d',
    connector: 'curve', // enforce curved for critical path
  },
};

export default function GanttChart(props: Props) {
  useRenderStats('GanttChart', 8); // Warn if >8 renders/sec
  const {
    tasks,
    stylePreset,
    scheme,
    labels,
    grid,
    today,
    arrows,
    weekends,
    criticalPath,
    barHeight,
    backgroundMode,
  } = props;

  // Normalize once (keep hooks stable across renders)
  const normBase = useMemo(() => normalizeTasks(tasks), [tasks]);
  const hasTasks = normBase.length > 0;

  // Memoize truncated task array for performance
  const truncWarn = useMemo(() => normBase.length > 32 ? 'Truncated to 32 rows for performance.' : null, [normBase]);

  // Memoize normalized and sliced tasks
  const norm = useMemo(() => {
    const base = normBase.slice(0, 32);
    const fallback = new Date().toISOString().slice(0, 10);
    return base.map((t: any) => {
      const start = t.start || fallback;
      const end = t.end || start;
      return { ...t, start, end };
    });
  }, [normBase]);

  const hasInvalidDates = useMemo(() => {
    if (!hasTasks) return false;
    for (const t of norm) {
      if (!parseDate(t.start) || !parseDate(t.end)) return true;
    }
    return false;
  }, [hasTasks, norm]);

  const preset = stylePreset;
  const bgColor = useMemo(() => getBgColor(backgroundMode), [backgroundMode]);
  const textColor = useMemo(() => getTextColor(bgColor), [bgColor]);

	// Simple in-chart selection so clicked items get a gold border
	const [selectedId, setSelectedId] = useState<string | null>(null);

  const showLabels = labels ?? (preset?.labels === 'on');
  const showGrid = grid ?? (preset?.options || []).includes('grid');
  const showToday = today ?? (preset?.options || []).includes('today');
  const showArrows = arrows ?? (preset?.options || []).includes('arrows');
  const showWeekends = weekends ?? (preset?.options || []).includes('weekends');
  const showCritical = criticalPath ?? (preset?.options || []).includes('critical-path');
  const isDense = norm.length > 250;
  const showLabelsSafe = showLabels && !isDense;
  const showGridSafe = showGrid && !isDense;
  const showArrowsSafe = showArrows && !isDense;
  const showWeekendsSafe = showWeekends && !isDense;

  // Make task boxes visibly taller for readability while keeping
  // rows compact on smaller screens.
  const baseBar = barHeight ?? preset?.box?.height ?? 22;
  const rowH = clamp(Math.round(baseBar * 1.35), 12, 48);
  // Slightly larger row gap so labels never collide vertically
  const rowGap = 14;
  // Add one empty row worth of vertical space between x-axis tick labels and the first bar row
  const headerOffset = rowH + rowGap;
  // Set height to ~35% of viewport height, but never less than 340px, with extra space for top gap and bottom axis
  const dims = {
    width: 1200,
    height: Math.max(
      (typeof window !== 'undefined' ? window.innerHeight * 0.35 : 480),
      340,
      160 + headerOffset + norm.length * (rowH + rowGap),
    ),
  };
  // Extra top padding creates a dedicated header band for legend,
  // project markers, and phase labels, above the main plot area.
  const pad = { left: 240, right: 40, top: 90, bottom: 60 };
  const firstRowYBase = pad.top + headerOffset;

  // Define yAxisFont based on stylePreset and fallback values, but always adapt to background for contrast
  const yAxisFont = useMemo(() => {
    // Try to get font settings from preset, else fallback
    const presetFont = preset?.yAxisFont || {};
    // Adapt font size and color to style
    // Base font size scales with bar height but is always modest to avoid crowding
    let fontSize = clamp(Math.round(rowH * 0.55), 11, 14);
    let fill = '#222';
    let fontWeight = 600;
    if (preset?.name === 'Brutalist') {
      fontSize = 16;
      fill = '#111827';
      fontWeight = 800;
    } else if (preset?.name === 'Blueprint') {
      fontSize = 15;
      fill = '#2563EB';
      fontWeight = 700;
    } else if (preset?.name === 'ArtDeco') {
      fontSize = 15;
      fill = '#F59E42';
      fontWeight = 700;
    } else if (preset?.name === 'CandyStripe') {
      fontSize = 14;
      fill = '#F472B6';
      fontWeight = 700;
    } else if (preset?.name === 'Minimalist') {
      fontSize = 13;
      fill = '#6B7280';
      fontWeight = 500;
    }
    // Use global textColor to guarantee contrast on dark/light backgrounds
    const effectiveFill = textColor || fill;
    return {
      fontSize: presetFont.fontSize || fontSize,
      fill: presetFont.fill || effectiveFill,
      fontWeight: presetFont.fontWeight || fontWeight,
    };
  }, [preset, textColor, rowH]);

  // Time domain
  const domain = useMemo(() => {
    const dates: Date[] = [];
    for (const t of norm) {
      const s = parseDate(t.start);
      const e = parseDate(t.end);
      if (s) dates.push(s);
      if (e) dates.push(e);
    }
    if (dates.length === 0) {
      const now = new Date();
      return { min: addDays(now, -7), max: addDays(now, 30) };
    }
    let min = dates[0];
    let max = dates[0];
    for (const d of dates) {
      if (d < min) min = d;
      if (d > max) max = d;
    }
    return { min: addDays(min, -3), max: addDays(max, 7) };
  }, [norm]);

  const totalDays = Math.max(1, daysBetween(domain.min, domain.max));
  const scaleX = useCallback((d: Date) => {
    const x0 = pad.left;
    const x1 = dims.width - pad.right;
    const t = clamp(daysBetween(domain.min, d) / totalDays, 0, 1);
    return x0 + t * (x1 - x0);
  }, [pad.left, pad.right, dims.width, domain.min, totalDays]);

  // Ticks (day-based, with preset formatting)
  const ticks = useMemo(() => {
    // Determine tick interval based on preset.ticks
    let step = 1;
    switch (preset?.ticks) {
      case 'weekly': step = 7; break;
      case '2-week': step = 14; break;
      case 'monthly': step = 30; break;
      case 'quarterly': step = 90; break;
      case 'auto': step = Math.max(1, Math.round(totalDays / 8)); break;
      default: step = 7;
    }
    const dates: Date[] = [];
    for (let i = 0; i <= totalDays; i += step) {
      dates.push(addDays(domain.min, i));
    }
    const fmt = preset?.xTickFormat || '%b %d';
    return { dates, fmt, step };
  }, [domain.min, totalDays, preset]);

  // Weekend shading rects
  const weekendRects = useMemo(() => {
    if (!showWeekendsSafe) return [] as { x: number; w: number }[];
    const rects: { x: number; w: number }[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = addDays(domain.min, i);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) {
        const x0 = scaleX(d);
        const x1 = scaleX(addDays(d, 1));
        rects.push({ x: Math.min(x0, x1), w: Math.abs(x1 - x0) });
      }
    }
    return rects;
  }, [domain.min, totalDays, showWeekendsSafe, scaleX]);

  // Map both task.id and task.name to the canonical id for box/task lookups
  const taskKeyToId = useMemo(() => {
    const map = new Map<string, string>();
    norm.forEach((t: any) => {
      const id = String(t.id);
      map.set(id, id);
      if (t.name) {
        const key = String(t.name);
        if (!map.has(key)) map.set(key, id);
      }
    });
    return map;
  }, [norm]);

  // Critical path
  const cp = useMemo(() => {
    if (!showCritical) return { criticalIds: new Set<string>(), boxes: [] as CriticalPathBox[] };
    if (hasCycle(norm)) return { criticalIds: new Set<string>(), boxes: [] as CriticalPathBox[] };

    const base = computeCriticalPath(norm);

    // Prefer explicit criticalPathBoxes from data; otherwise derive three boxes
    const fromProps = Array.isArray(props.criticalPathBoxes)
      ? (props.criticalPathBoxes as CriticalPathBox[]).slice(0, 3)
      : [];

    const boxes: CriticalPathBox[] = [];
    const extraCriticalIds = new Set<string>();

    if (fromProps.length > 0) {
      fromProps.forEach((box, idx) => {
        const safeId: 'CP1' | 'CP2' | 'CP3' = (idx === 0 ? 'CP1' : idx === 1 ? 'CP2' : 'CP3');
        const taskIds: string[] = [];
        (box.taskIds || []).forEach((raw) => {
          const key = String(raw);
          const mapped = taskKeyToId.get(key);
          if (mapped) {
            taskIds.push(mapped);
            extraCriticalIds.add(mapped);
          }
        });
        boxes.push({ ...box, id: safeId, taskIds });
      });
    } else {
      // Derive exactly three boxes from the computed critical chain
      const baseCritical = base.criticalIds || new Set<string>();
      const criticalTasks = norm.filter((t: any) => baseCritical.has(t.id));
      if (criticalTasks.length > 0) {
        const sorted = [...criticalTasks].sort((a, b) => {
          const da = parseDate(a.start) || domain.min;
          const db = parseDate(b.start) || domain.min;
          return da.getTime() - db.getTime();
        });
        const labels = [
          'Governance & Measurement',
          'Build & Integration',
          'Readiness & Launch',
        ];
        const n = sorted.length;
        for (let i = 0; i < 3; i++) {
          const startIdx = Math.floor((n * i) / 3);
          const endIdx = i === 2 ? n - 1 : Math.floor((n * (i + 1)) / 3) - 1;
          if (startIdx > endIdx || startIdx >= n) continue;
          const segTasks = sorted.slice(startIdx, endIdx + 1);
          let minDate = parseDate(segTasks[0].start) || domain.min;
          let maxDate = parseDate(segTasks[0].end) || minDate;
          const segTaskIds: string[] = [];
          segTasks.forEach((t: any) => {
            const s = parseDate(t.start) || domain.min;
            const e = parseDate(t.end) || s;
            if (s < minDate) minDate = s;
            if (e > maxDate) maxDate = e;
            const id = String(t.id);
            segTaskIds.push(id);
            extraCriticalIds.add(id);
          });
          boxes.push({
            id: (i === 0 ? 'CP1' : i === 1 ? 'CP2' : 'CP3'),
            label: labels[i],
            startDate: minDate.toISOString().slice(0, 10),
            endDate: maxDate.toISOString().slice(0, 10),
            taskIds: segTaskIds,
          });
        }
      }
    }

    const criticalIds = new Set<string>(base.criticalIds || []);
    // Ensure all tasks explicitly included in boxes are treated as critical
    extraCriticalIds.forEach((id) => criticalIds.add(id));

    return { criticalIds, boxes };
  }, [norm, showCritical, taskKeyToId, domain.min, props.criticalPathBoxes]);

  const cycleDetected = showCritical && hasCycle(norm);

  // Geometry cache (for connectors)
  const idToPos = useMemo(() => {
    const map = new Map<string, { xStart: number; xEnd: number; y: number }>();
    norm.forEach((t, i) => {
      const s = parseDate(t.start) || domain.min;
      const e = parseDate(t.end) || s;
      const x0 = scaleX(s);
      const x1 = scaleX(e);
      const xStart = Math.min(x0, x1);
      const xEnd = Math.max(x0, x1);
      const y = firstRowYBase + i * (rowH + rowGap) + rowH / 2;
      map.set(t.id, { xStart, xEnd, y });
    });
    return map;
  }, [norm, domain.min, rowH, rowGap, scaleX, firstRowYBase]);

  // After all hooks are declared, it's safe to bail out without breaking hook order.
  if (!hasTasks || hasInvalidDates) {
    return null;
  }

  if (cycleDetected) {
    return (
      <div style={{ color: 'red', fontWeight: 600, padding: 16, background: '#fffbe9', border: '1px solid #fbbf24', borderRadius: 8 }}>
        Dependency cycle detected; cannot compute critical path.
      </div>
    );
  }

  function barGeometry(t: any, i: number) {
    const s = parseDate(t.start) || domain.min;
    const e = parseDate(t.end) || s;
    const x0 = scaleX(s);
    const x1 = scaleX(e);
    const y = firstRowYBase + i * (rowH + rowGap);
    const w = Math.max(2, Math.abs(x1 - x0) || 2);
    const x = Math.min(x0, x1);
    return { x, w, y };
  }

  function renderBar(t: any, i: number) {
    const g = barGeometry(t, i);
    const safeW = Math.max(0, g.w);
    const safeRowH = Math.max(0, rowH);
    const base = colorForTask(t, preset, scheme);
    const isCritical = showCritical && cp.criticalIds.has(t.id);
    // Only critical path bars use CRITICAL_RED, all others never use it
    const fill = isCritical ? CRITICAL_RED : (base === CRITICAL_RED ? '#8884d8' : base);
    // Outline stroke is red only for critical, otherwise never red
    const stroke = isCritical ? CRITICAL_RED : (preset?.box?.type === 'outline' ? (base === CRITICAL_RED ? '#8884d8' : base) : 'rgba(17,24,39,0.95)');
    const strokeWidth = isCritical ? 3.5 : (preset?.box?.type === 'outline' ? 3 : 1.25);
    const isSelected = selectedId === t.id;

    const boxType = preset?.box?.type || 'rounded';
    const ry = boxType === 'pill' ? Math.max(8, rowH / 2) : (boxType === 'rounded' ? Math.max(4, preset?.box?.radius || 4) : (boxType === 'sharp' ? 0 : (preset?.box?.radius || 4)));

    // Minimal: thin line
    if (boxType === 'minimal') {
      const yMid = g.y + rowH / 2;
      return (
        <line
          key={t.id}
          x1={g.x}
          x2={g.x + safeW}
          y1={yMid}
          y2={yMid}
          stroke={fill}
          strokeWidth={Math.max(4, Math.floor(rowH / 2))}
          strokeLinecap="round"
          onClick={() => setSelectedId(t.id)}
        />
      );
    }

    // Bracket: custom SVG path
    if (boxType === 'bracket') {
      const yCenter = g.y + rowH / 2;
      const path = makeConnectedBracketPath(g.x, g.x + safeW, yCenter);
      return <path key={t.id} d={path} fill="none" stroke={fill} strokeWidth={Math.max(2, strokeWidth)} />;
    }

    // Striped: diagonal pattern overlay
    if (boxType === 'striped') {
      const patternId = `stripe-${base.replace('#','')}`;
      return (
        <g key={t.id}>
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <rect x="0" y="0" width="8" height="8" fill={fill} />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#fff" strokeWidth="2" />
            </pattern>
          </defs>
          <rect
            x={g.x}
            y={g.y}
            width={safeW}
            height={safeRowH}
            rx={ry}
            ry={ry}
            fill={`url(#${patternId})`}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    }

    // Gradient: vertical gradient fill
    if (boxType === 'gradient') {
      const gradId = `grad-${base.replace('#','')}`;
      return (
        <g key={t.id}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity="0.85" />
              <stop offset="100%" stopColor={fill} stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <rect
            x={g.x}
            y={g.y}
            width={safeW}
            height={safeRowH}
            rx={ry}
            ry={ry}
            fill={`url(#${gradId})`}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    }

    // Bevel: chip effect (highlight + shadow)
    if (boxType === 'bevel') {
      const bevelWidth = Math.max(1, safeW - 2);
      const bevelHalfHeight = Math.max(1, safeRowH / 2);
      const bevelShadowHeight = Math.max(1, safeRowH / 2 - 1);
      return (
        <g key={t.id}>
          <rect
            x={g.x}
            y={g.y}
            width={safeW}
            height={safeRowH}
            rx={ry}
            ry={ry}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          {/* highlight */}
          <rect
            x={g.x + 1}
            y={g.y + 1}
            width={bevelWidth}
            height={bevelHalfHeight}
            rx={ry / 2}
            ry={ry / 2}
            fill="#fff"
            opacity={0.10}
          />
          {/* shadow */}
          <rect
            x={g.x + 1}
            y={g.y + safeRowH / 2}
            width={bevelWidth}
            height={bevelShadowHeight}
            rx={ry / 2}
            ry={ry / 2}
            fill="#000"
            opacity={0.10}
          />
        </g>
      );
    }

    // Split: two-layer bar (e.g., baseline vs forecast)
    if (boxType === 'split') {
      // For demo: render a faint "baseline" below, then main bar
      return (
        <g key={t.id}>
          <rect
            x={g.x}
            y={g.y + safeRowH * 0.25}
            width={safeW}
            height={safeRowH * 0.5}
            rx={ry}
            ry={ry}
            fill="#e5e7eb"
            opacity={0.5}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <rect
            x={g.x}
            y={g.y}
            width={safeW}
            height={safeRowH * 0.5}
            rx={ry}
            ry={ry}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    }

    // Default: rounded, pill, sharp, outline
    if (isCritical) {
      // Jagged border: use a zigzag polyline overlay
      const jagCount = Math.max(8, Math.floor(safeW / 12));
      const jagStep = safeW / jagCount;
      const jagY0 = g.y;
      const jagY1 = g.y + rowH;
      let points: Array<[number, number]> = [];
      for (let j = 0; j <= jagCount; ++j) {
        const x = g.x + j * jagStep;
        points.push([x, j % 2 === 0 ? jagY0 : jagY0 - 5]);
      }
      for (let j = jagCount; j >= 0; --j) {
        const x = g.x + j * jagStep;
        points.push([x, j % 2 === 0 ? jagY1 : jagY1 + 5]);
      }
      const polyStr = points.map((p: [number, number]) => p.join(",")).join(" ");
      return (
        <g key={t.id}>
          {/* Main bar */}
          <rect
            x={g.x}
            y={g.y}
            width={safeW}
            height={safeRowH}
            rx={ry}
            ry={ry}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          {/* Double border */}
          <rect
            x={g.x + 2}
            y={g.y + 2}
            width={Math.max(1, safeW - 4)}
            height={Math.max(1, safeRowH - 4)}
            rx={Math.max(ry - 2, 0)}
            ry={Math.max(ry - 2, 0)}
            fill="none"
            stroke={CRITICAL_RED}
            strokeWidth={1.5}
            opacity={0.85}
          />
          {/* Jagged overlay */}
          <polyline
            points={polyStr}
            fill="none"
            stroke={CRITICAL_RED}
            strokeWidth={2.2}
            opacity={0.85}
          />
        </g>
      );
    }
    return (
      <g
        key={t.id}
        onClick={() => setSelectedId(t.id)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={g.x}
          y={g.y}
          width={safeW}
          height={safeRowH}
          rx={ry}
          ry={ry}
          fill={boxType === 'outline' ? 'transparent' : fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {isSelected && (
          <rect
            x={g.x - 2}
            y={g.y - 2}
            width={Math.max(0, safeW + 4)}
            height={Math.max(0, safeRowH + 4)}
            rx={ry + 2}
            ry={ry + 2}
            fill="none"
            stroke="#FBBF24"
            strokeWidth={3}
          />
        )}
      </g>
    );
  }

  function renderMilestone(t: any, i: number) {
    if (!t.milestone) return null;
    const s = parseDate(t.start) || domain.min;
    const x = scaleX(s);
    const y = firstRowYBase + i * (rowH + rowGap) + rowH / 2;
    const size = Math.max(10, Math.floor(rowH * 0.6));
    const isCritical = showCritical && cp.criticalIds.has(t.id);
    const base = colorForTask(t, preset, scheme);
    // CRITICAL_RED is reserved strictly for critical path tasks only.
    const fill = isCritical ? CRITICAL_RED : (base === CRITICAL_RED ? '#4B5563' : base);
    const pts = [
      [x, y - size],
      [x + size, y],
      [x, y + size],
      [x - size, y],
    ].map(p => p.join(",")).join(" ");
    return (
      <polygon
        key={`ms-${t.id}`}
        points={pts}
        fill={fill}
        stroke={selectedId === t.id ? '#FBBF24' : 'rgba(0,0,0,0.35)'}
        strokeWidth={selectedId === t.id ? 3 : 1.25}
        style={{ cursor: 'pointer' }}
        onClick={() => setSelectedId(t.id)}
      />
    );
  }

  // Project initiation and end diamond markers
  function renderProjectMarkers() {
    if (!norm.length) return null;
    const first = norm[0];
    const last = norm[norm.length - 1];
    const s1 = parseDate(first.start) || domain.min;
    const s2 = parseDate(last.end) || domain.max;
    const x1 = scaleX(s1);
    const x2 = scaleX(s2);
    // Place project markers in their own lane just below the
    // legend band but above the critical phase labels.
    const y = pad.top - (HEADER_LANE_HEIGHT / 2);
    const size = Math.max(12, Math.floor(rowH * 0.7));
    return (
      <g>
        {/* Start diamond */}
        <polygon points={[
          [x1, y - size],
          [x1 + size, y],
          [x1, y + size],
          [x1 - size, y],
        ].map(p => p.join(",")).join(" ")} fill="#2563EB" stroke="#1E3A8A" strokeWidth={2} />
        <text x={x1} y={y + size + 10} textAnchor="middle" fontSize={12} fill="#2563EB">Start</text>
        {/* End diamond */}
        <polygon points={[
          [x2, y - size],
          [x2 + size, y],
          [x2, y + size],
          [x2 - size, y],
        ].map(p => p.join(",")).join(" ")} fill="#F97316" stroke="#EA580C" strokeWidth={2} />
        <text x={x2} y={y + size + 10} textAnchor="middle" fontSize={12} fill="#F97316">End</text>
      </g>
    );
  }

  function renderLabels(t: any, i: number) {
    if (!showLabelsSafe) return null;
    const g = barGeometry(t, i);
    const x = g.x + 6;
    // Tie label typography to row height so that up to two lines
    // of text fit cleanly inside the bar without spilling above
    // or below the task box.
    const fontSize = clamp(Math.round(rowH * 0.45), 10, 14);
    const lineHeight = fontSize + 2;

    // Use task name, but wrap across up to two lines instead of
    // truncating with an ellipsis. This keeps labels readable
    // without "..." while avoiding very long single-line text.
    const fullLabel = String(t.name || '').trim();
    const MAX_PER_LINE = 24;
    let line1 = fullLabel;
    let line2 = '';
    if (fullLabel.length > MAX_PER_LINE) {
      const breakIdx = fullLabel.lastIndexOf(' ', MAX_PER_LINE);
      const cut = breakIdx > 8 ? breakIdx : MAX_PER_LINE;
      line1 = fullLabel.slice(0, cut).trim();
      const rest = fullLabel.slice(cut).trim();
      if (rest.length > 0) {
        if (rest.length <= MAX_PER_LINE) {
          line2 = rest;
        } else {
          const br2 = rest.lastIndexOf(' ', MAX_PER_LINE);
          const cut2 = br2 > 8 ? br2 : MAX_PER_LINE;
          line2 = rest.slice(0, cut2).trim();
        }
      }
    }

    const lines = line2 ? [line1, line2] : [line1];
    const numLines = lines.length;

    const maxChars = Math.max(...lines.map((s) => s.length), 1);
    const approxCharWidth = 6; // px, rough average for this font size
    const paddingX = 5;
    const rectWidth = maxChars * approxCharWidth + paddingX * 2;
    // Slightly shorter background so more of the bar color peeks
    // above and below the label block while keeping text readable.
    const rectHeight = numLines * lineHeight;
    const rectX = x - 3;
    // Vertically center the label background within the bar so it
    // never extends outside the task box, even for two lines.
    const rectY = g.y + (rowH - rectHeight) / 2;

    const firstLineBaseline = rectY + lineHeight;

    return (
      <g key={`lbl-${t.id}`}>
        <rect
          x={rectX}
          y={rectY}
          width={rectWidth}
          height={rectHeight}
          rx={3}
          ry={3}
          fill="rgba(15,23,42,0.7)"
        />
        {lines.map((textLabel, idx) => (
          <text
            key={`lbl-${t.id}-${idx}`}
            x={x}
            y={firstLineBaseline + idx * lineHeight}
            textAnchor="start"
            fontSize={fontSize}
            fill={yAxisFont.fill}
            opacity={0.97}
            fontWeight={yAxisFont.fontWeight || 600}
          >
            {textLabel}
          </text>
        ))}
      </g>
    );
  }
          const points: Array<[number, number]> = [];
  function pathForConnector(fromId: string, toId: string) {
    const a = idToPos.get(fromId);
    const b = idToPos.get(toId);
    if (!a || !b) return null;
    const x0 = a.xEnd;
    const y0 = a.y;
    const x1 = b.xStart;
    const y1 = b.y;

    const connector = preset?.connector || 'curve';
    if (connector === 'straight') return `M${x0},${y0} L${x1},${y1}`;
    if (connector === 'elbow') {
      const mx = (x0 + x1) / 2;
      return `M${x0},${y0} L${mx},${y0} L${mx},${y1} L${x1},${y1}`;
    }
    const mx = (x0 + x1) / 2;
    return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }

  function renderArrowDefs() {
    return (
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(229,231,235,0.65)" />
        </marker>
        <marker id="arrowhead-critical" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={CRITICAL_RED} />
        </marker>
      </defs>
    );
  }

  function renderDependencyConnectors() {
    const conns: React.ReactNode[] = [];
    norm.forEach((t: any) => {
      const deps = t._depsArr || [];
      deps.forEach((depId: string, j: number) => {
        const d = pathForConnector(depId, t.id);
        if (!d) return;
        const depIsCritical = showCritical && cp.criticalIds.has(depId) && cp.criticalIds.has(t.id);
        const color = depIsCritical ? CRITICAL_RED : 'rgba(229,231,235,0.85)';
        const width = depIsCritical ? 4 : 1.5;
        conns.push(
          <path
            key={`conn-${depId}-${t.id}-${j}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={width}
            markerEnd={depIsCritical ? undefined : (showArrowsSafe ? 'url(#arrowhead)' : undefined)}
            opacity={depIsCritical ? 0.98 : 0.9}
          />
        );
      });
    });
    if (conns.length === 0) return null;
    return <g>{conns}</g>;
  }

  // Highlighted connectors along the main critical path chain.
  function renderCriticalPhaseConnectors() {
    if (!showCritical) return null;

    // Take every critical-path bar (jagged red box) and connect
    // them in chronological order with a thick red S-curve so
    // the entire chain reads as one continuous spine.
    const criticalTasks = norm.filter((t: any) => cp.criticalIds.has(t.id));
    if (criticalTasks.length < 2) return null;

    const sorted = [...criticalTasks].sort((a: any, b: any) => {
      const sa = parseDate(a.start) || domain.min;
      const sb = parseDate(b.start) || domain.min;
      if (sa.getTime() !== sb.getTime()) return sa.getTime() - sb.getTime();
      const ea = parseDate(a.end) || sa;
      const eb = parseDate(b.end) || sb;
      if (ea.getTime() !== eb.getTime()) return ea.getTime() - eb.getTime();
      return String(a.id).localeCompare(String(b.id));
    });

    const paths: React.ReactNode[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const fromId = String(sorted[i].id);
      const toId = String(sorted[i + 1].id);
      const a = idToPos.get(fromId);
      const b = idToPos.get(toId);
      if (!a || !b) continue;

      const x0 = a.xEnd;
      const y0 = a.y;
      const x1 = b.xStart;
      const y1 = b.y;
      const mx = (x0 + x1) / 2;

      const d = `M${x0},${y0} C${mx},${y0 - 16} ${mx},${y1 + 16} ${x1},${y1}`;

      paths.push(
        <path
          key={`cp-phase-conn-${fromId}-${toId}`}
          d={d}
          fill="none"
          stroke={CRITICAL_RED}
          strokeWidth={5}
          opacity={0.98}
        />
      );
    }

    return paths.length ? <g>{paths}</g> : null;
  }

  // Thick curved connector that runs through the three Critical Path
  // header boxes themselves (CP1 → CP2 → CP3) in the header lane.
  function renderCriticalHeaderConnectors() {
    // Header connectors were visually overlapping the x-axis tick area.
    // To keep the chart calm and uncluttered, we no longer draw a
    // separate thick red line through the header labels; the main
    // critical spine along tasks remains as the primary visual.
    return null;
  }

  // Legend/header band geometry shared by legend and high-level
  // phase labels. This defines a single horizontal strip above the
  // Gantt boxes where all header text and legend markers live.
  const LEGEND_BAND_TOP = 16;
  const LEGEND_BAND_HEIGHT = 40;
  const legendY = LEGEND_BAND_TOP + 10; // baseline for legend row

  function renderCriticalBoxes() {
    if (!showCritical || !cp.boxes || cp.boxes.length === 0) return null;
    const plotLeft = pad.left;
    const plotWidth = dims.width - pad.left - pad.right;
    const segmentWidth = plotWidth / 3;
    const labelY = LEGEND_BAND_TOP + LEGEND_BAND_HEIGHT - 8;
    return (
      <g>
        {cp.boxes.slice(0, 3).map((box, idx) => {
          const labelX = plotLeft + segmentWidth * idx + segmentWidth / 2;
          return (
            <g key={box.id}>
              <text
                x={labelX}
                y={labelY}
                fontSize={12}
                fill={textColor}
                fontWeight={600}
                textAnchor="middle"
              >
                {box.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  const axisY = firstRowYBase + norm.length * (rowH + rowGap) - rowGap + 8;

  // X-axis tick label layout: adjust per style and rotate only when crowded
  const tickCount = ticks.dates.length;
  const presetName = String(preset?.name || '').toLowerCase();
  const tickMode = String(preset?.ticks || '').toLowerCase();

  // Style-specific thresholds: weekly/auto styles tolerate fewer visible ticks
  let denseThreshold = 8;
  if (tickMode === 'monthly') denseThreshold = 10;
  if (tickMode === 'quarterly') denseThreshold = 12;
  if (presetName === 'minimalist' || presetName === 'monochromematrix') {
    denseThreshold += 2; // minimalist styles rotate less aggressively
  }

  const shouldRotateTicks = tickCount > denseThreshold;

  // Style-specific rotation angles
  let tickAngle = 0;
  if (shouldRotateTicks) {
    if (presetName === 'artdeco' || presetName === 'blueprint' || presetName === 'constructionhazard') {
      tickAngle = -40;
    } else if (presetName === 'minimalist' || presetName === 'monochromematrix') {
      tickAngle = -28;
    } else {
      // Futurist, CandyStripe, Brutalist, etc.
      tickAngle = -35;
    }
  }

  // Place x-axis tick labels below the Gantt plot so they never
  // collide with header lanes, legends, or in-bar labels.
  const tickLabelY = axisY + (shouldRotateTicks ? 16 : 18);
  const tickFontSize = shouldRotateTicks ? 11 : 12;

  return (
    <div style={{ position: 'relative' }}>
      {truncWarn && (
        <div style={{ color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 13 }}>
          {truncWarn}
        </div>
      )}

      <svg
        id="gantt-fig"
        width="100%"
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        role="img"
        aria-label="PMOMax Gantt Chart"
        style={{ display: 'block' }}
      >
        {renderArrowDefs()}

        {/* Background */}
        <rect x={0} y={0} width={dims.width} height={dims.height} fill={bgColor} />

        {/* Y-axis tick labels (customized, short, style-aware) */}
        {norm.map((t, i) => {
          // Short label: use owner, kind, or first word of name, style-aware and length-limited
          let label = t.owner || t.kind || t.name.split(' ')[0] || t.name;
          if (preset?.name === 'Brutalist') label = label.toUpperCase();
          if (preset?.name === 'Blueprint') label = label.slice(0, 8);
          if (preset?.name === 'CandyStripe') label = label.slice(0, 6);
          if (preset?.name === 'Minimalist') label = label.slice(0, 5);
          // Global safeguard: keep y-tick labels compact to avoid horizontal clutter
          const MAX_LEN = 18;
          if (label.length > MAX_LEN) {
            label = label.slice(0, MAX_LEN - 1) + '…';
          }
          const y = firstRowYBase + i * (rowH + rowGap) + rowH / 2 + 4;
          return (
            <text
              key={`ytick-${t.id}`}
              x={pad.left - 18}
              y={y}
              textAnchor="end"
              fontSize={yAxisFont.fontSize}
              fill={yAxisFont.fill}
              fontWeight={yAxisFont.fontWeight || 600}
              opacity={0.92}
              style={{ pointerEvents: 'none' }}
            >
              {label}
            </text>
          );
        })}

        {/* Project start/end markers */}
        {renderProjectMarkers()}

        {/* Weekend shading */}
        {weekendRects.map((r, i) => (
          <rect
            key={`wk-${i}`}
            x={r.x}
            y={pad.top}
            width={r.w}
            height={Math.max(0, axisY - pad.top)}
            fill="rgba(148,163,184,0.10)"
          />
        ))}

        {/* X grid + ticks (kept fully within the main plot area) */}
        {ticks.dates.map((d, i) => {
          const x = scaleX(d);
          return (
            <g key={`tick-${i}`}>
              {showGridSafe && (
                <line
                  x1={x}
                  x2={x}
                  y1={pad.top}
                  y2={axisY}
                  stroke="rgba(148,163,184,0.18)"
                  strokeWidth={1}
                />
              )}
              {shouldRotateTicks ? (
                <g transform={`rotate(${tickAngle},${x},${tickLabelY})`}>
                  <text
                    x={x}
                    y={tickLabelY}
                    textAnchor="end"
                    fontSize={tickFontSize}
                    fill={textColor}
                    opacity={0.9}
                  >
                    {fmtTick(d, ticks.fmt)}
                  </text>
                </g>
              ) : (
                <text
                  x={x}
                  y={tickLabelY}
                  textAnchor="middle"
                  fontSize={tickFontSize}
                  fill={textColor}
                  opacity={0.9}
                >
                  {fmtTick(d, ticks.fmt)}
                </text>
              )}
            </g>
          );
        })}

        {/* Today line (kept below header band and clearly labeled) */}
        {showToday && (() => {
          const now = new Date();
          if (now < domain.min || now > domain.max) return null;
          const x = scaleX(now);
          const topY = pad.top;
          const labelY = pad.top + 24; // below header band and above first row
          return (
            <g>
              <line x1={x} x2={x} y1={topY} y2={axisY} stroke="#F59E0B" strokeWidth={2} />
              <text x={x + 6} y={labelY} fontSize={11} fill="#F59E0B">Today</text>
            </g>
          );
        })()}

        {/* Row separators */}
        {norm.map((_, i) => {
          const y = firstRowYBase + i * (rowH + rowGap) + rowH + rowGap / 2;
          return (
            <line
              key={`row-${i}`}
              x1={pad.left}
              x2={dims.width - pad.right}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.10)"
              strokeWidth={1}
            />
          );
        })}

        {/* Critical path phase boxes (CP1 / CP2 / CP3) */}
        {renderCriticalBoxes()}

        {/* Thick red connector between Critical Path header boxes */}
        {renderCriticalHeaderConnectors()}

        {/* Thick red spine along the main critical path tasks */}
        {renderCriticalPhaseConnectors()}

        {/* Dependency connectors (optional) */}
        {renderDependencyConnectors()}

        {/* Bars */}
        {norm.map((t, i) => renderBar(t, i))}

        {/* Milestones */}
        {norm.map((t, i) => renderMilestone(t, i))}

        {/* Labels */}
        {norm.map((t, i) => renderLabels(t, i))}

        {/* Axis baseline */}
        <line x1={pad.left} x2={dims.width - pad.right} y1={axisY} y2={axisY} stroke="rgba(148,163,184,0.35)" strokeWidth={1} />

        {/* Legend + phase header band across the main plot width */}
        <rect
          x={pad.left - 16}
          y={LEGEND_BAND_TOP}
          width={Math.max(1, dims.width - pad.left - pad.right + 32)}
          height={LEGEND_BAND_HEIGHT}
          rx={0}
          ry={0}
          fill={bgColor === '#000000' ? 'rgba(15,23,42,0.96)' : 'rgba(15,23,42,0.94)'}
          stroke="rgba(148,163,184,0.45)"
          strokeWidth={1}
        />

        <g transform={`translate(${pad.left},${legendY})`}>
          {/* Critical path legend */}
          <g>
            <rect x={0} y={0} width={22} height={16} fill={CRITICAL_RED} stroke={CRITICAL_RED} strokeWidth={2} />
            <polyline points="0,0 22,0 22,16 0,16 0,0" fill="none" stroke={CRITICAL_RED} strokeWidth={2.2} opacity={0.85} />
            <rect x={3} y={3} width={16} height={10} fill="none" stroke={CRITICAL_RED} strokeWidth={1.5} opacity={0.85} />
            <text x={28} y={13} fontSize={13} fill={textColor}>Critical path</text>
          </g>
          {/* Critical connector legend */}
          <g transform="translate(170,0)">
            <line x1={0} x2={26} y1={8} y2={8} stroke={CRITICAL_RED} strokeWidth={5} />
            <text x={32} y={13} fontSize={13} fill={textColor}>Critical connector</text>
          </g>
          {/* Start diamond legend */}
          <g transform="translate(360,0)">
            <polygon points="0,8 10,-2 20,8 10,18" fill="#2563EB" stroke="#1E3A8A" strokeWidth={2} />
            <text x={28} y={13} fontSize={13} fill="#2563EB">Project Start</text>
          </g>
          {/* End diamond legend */}
          <g transform="translate(560,0)">
            <polygon points="0,8 10,-2 20,8 10,18" fill="#F97316" stroke="#EA580C" strokeWidth={2} />
            <text x={28} y={13} fontSize={13} fill="#F97316">Project End</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
