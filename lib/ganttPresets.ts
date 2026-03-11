// Color palettes for Gantt chart styles
const PRISM_COLORS = [
  '#3b6cff', '#ff9800', '#a259ff', '#00cfc8', '#ff69b4', '#e10600', '#00eaff', '#ffd600', '#7ecbff', '#43aa8b'
];
const PASTEL_COLORS = [
  '#2ec4b6', '#ffb703', '#8ecae6', '#f9f7cf', '#f7d6e0', '#b5ead7', '#f7cac9', '#b5ead7', '#c7ceea', '#f9f7cf'
];
const METRO_COLORS = [
  '#0078d4', '#e81123', '#ffb900', '#107c10', '#6b69d6', '#00b7c3', '#d83b01', '#b4009e', '#f7630c', '#498205'
];
/* ===========================================
   PMOMAX+ Gantt Style Presets (FINAL)
   TEN PRACTICAL DECISION-MODEL STYLES
   Geometry changes by style — Scheme recolors only
=========================================== */

export type GanttPreset = {
  name: string;
  ticks: 'auto' | 'weekly' | '2-week' | 'monthly' | 'quarterly';
  labels: 'on' | 'off';
  theme: 'light' | 'dark';
  box: {
    type: 'rounded' | 'sharp' | 'pill' | 'striped' | 'gradient' | 'outline' |
          'bevel' | 'bracket' | 'minimal' | 'split';
    height: number;
    radius: number;
  };
  scheme: 'prism' | 'pastel' | 'metro';
  colorby: 'Owner' | 'Kind' | 'Program' | 'Team' | 'Phase' | 'Workstream' | 'None';
  connector: 'straight' | 'elbow' | 'curve';
  connectorWidth: number;
  options: string[];
  xTickFormat: string;
};

/* ===========================================================
   10 Canonical Styles — PMOMax Gantt System (v4.5+)
   Geometry is defined here; scheme only recolors.
=========================================================== */

export const STYLE_PRESETS: (GanttPreset & { colors: string[] })[] = [
  // 1 — Executive Brief (High-Level Presentation)
  {
    name: 'Executive Brief',
    ticks: 'monthly',
    xTickFormat: "%b '%y",
    labels: 'off',
    theme: 'dark',
    box: { type: 'outline', height: 20, radius: 0 },
    scheme: 'pastel',
    colorby: 'Phase',
    connector: 'straight',
    connectorWidth: 2,
    options: ['grid', 'critical-path'],
    colors: PASTEL_COLORS,
  },

  // 2 — Sprint / Iteration Plan (Agile)
  {
    name: 'Sprint / Iteration',
    ticks: 'weekly',
    xTickFormat: '%a %d %b',
    labels: 'on',
    theme: 'dark',
    box: { type: 'pill', height: 22, radius: 10 },
    scheme: 'prism',
    colorby: 'Team',
    connector: 'elbow',
    connectorWidth: 3,
    options: ['grid', 'today', 'critical-path'],
    colors: PRISM_COLORS,
  },

  // 3 — Engineering Build & Gates
  {
    name: 'Engineering Build & Gates',
    ticks: 'weekly',
    xTickFormat: '%d %b',
    labels: 'on',
    theme: 'dark',
    box: { type: 'bevel', height: 24, radius: 4 },
    scheme: 'metro',
    colorby: 'Kind',
    connector: 'straight',
    connectorWidth: 3,
    options: ['grid', 'today', 'weekends', 'critical-path'],
    colors: METRO_COLORS,
  },

  // 4 — Outcome / Milestone-Centric
  {
    name: 'Outcome / Milestone-Centric',
    ticks: 'auto',
    xTickFormat: '%b %d',
    labels: 'on',
    theme: 'dark',
    box: { type: 'bracket', height: 18, radius: 0 },
    scheme: 'prism',
    colorby: 'Program',
    connector: 'straight',
    connectorWidth: 2,
    options: ['grid', 'critical-path'],
    colors: PRISM_COLORS,
  },

  // 5 — Risk & Mitigation
  {
    name: 'Risk & Mitigation',
    ticks: 'weekly',
    xTickFormat: '%b %d',
    labels: 'on',
    theme: 'dark',
    box: { type: 'sharp', height: 22, radius: 0 },
    scheme: 'metro',
    colorby: 'Owner',
    connector: 'straight',
    connectorWidth: 3,
    options: ['grid', 'today', 'critical-path'],
    colors: METRO_COLORS,
  },

  // 6 — Critical Chain + Buffers
  {
    name: 'Critical Chain + Buffers',
    ticks: '2-week',
    xTickFormat: '%d %b',
    labels: 'off',
    theme: 'dark',
    box: { type: 'minimal', height: 8, radius: 0 },
    scheme: 'prism',
    colorby: 'Phase',
    connector: 'straight',
    connectorWidth: 4,
    options: ['grid', 'critical-path'],
    colors: PRISM_COLORS,
  },

  // 7 — Dependency-Dense (Architecture)
  {
    name: 'Dependency-Dense (Architecture)',
    ticks: 'weekly',
    xTickFormat: '%a %d',
    labels: 'on',
    theme: 'dark',
    box: { type: 'split', height: 20, radius: 4 },
    scheme: 'prism',
    colorby: 'Workstream',
    connector: 'curve',
    connectorWidth: 2,
    options: ['grid', 'today', 'arrows', 'critical-path'],
    colors: PRISM_COLORS,
  },

  // 8 — Resource / Capacity Load
  {
    name: 'Resource / Capacity Load',
    ticks: 'weekly',
    xTickFormat: '%b %d',
    labels: 'on',
    theme: 'dark',
    box: { type: 'rounded', height: 24, radius: 6 },
    scheme: 'metro',
    colorby: 'Owner',
    connector: 'elbow',
    connectorWidth: 2,
    options: ['grid', 'today', 'critical-path'],
    colors: METRO_COLORS,
  },

  // 9 — Baseline vs Forecast (Variance)
  {
    name: 'Baseline vs Forecast',
    ticks: 'weekly',
    xTickFormat: '%b %d',
    labels: 'on',
    theme: 'dark',
    box: { type: 'gradient', height: 22, radius: 4 },
    scheme: 'prism',
    colorby: 'Phase',
    connector: 'straight',
    connectorWidth: 2,
    options: ['grid', 'today', 'critical-path'],
    colors: PRISM_COLORS,
  },

  // 10 — Industrial / Ops Schedule
  {
    name: 'Industrial / Ops Schedule',
    ticks: 'weekly',
    xTickFormat: '%a %d %b',
    labels: 'on',
    theme: 'dark',
    box: { type: 'sharp', height: 26, radius: 0 },
    scheme: 'metro',
    colorby: 'Workstream',
    connector: 'straight',
    connectorWidth: 3,
    options: ['grid', 'weekends', 'critical-path'],
    colors: METRO_COLORS,
  },
];
