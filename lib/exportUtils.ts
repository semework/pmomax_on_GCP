import { PMOMaxPID } from '../types';

// Canonical section order for PMOMaxPID exports (PDF/DOCX). Keep stable.
export const SECTION_ORDER: (keyof PMOMaxPID)[] = [
  'titleBlock',
  'executiveSummary',
  'problemStatement',
  'businessCaseExpectedValue',
  'objectivesSmart',
  'kpis',
  'scopeInclusions',
  'scopeExclusions',
  'assumptions',
  'constraints',
  'dependencies',
  'stakeholders',
  'projectSponsor',
  'projectManagerOwner',
  'teamRaci',
  'timelineOverview',
  'milestones',
  'workBreakdownTasks',
  'budgetCostBreakdown',
  'budgetSummary',
  'resourcesTools',
  'risks',
  'mitigationsContingencies',
  'issuesDecisionsLog',
  'communicationPlan',
  'governanceApprovals',
  'complianceSecurityPrivacy',
  'openQuestionsNextSteps',
  'notesBackground',
];

// Human titles for export headers
export const SECTION_TITLES: Partial<Record<keyof PMOMaxPID, string>> = {
  titleBlock: 'Project Info',
  executiveSummary: 'Executive Summary',
  problemStatement: 'Problem Statement / Context',
  businessCaseExpectedValue: 'Business Case & Expected Value',
  objectivesSmart: 'Objectives (SMART)',
  kpis: 'KPIs / Success Metrics',
  scopeInclusions: 'Scope Inclusions',
  scopeExclusions: 'Scope Exclusions',
  assumptions: 'Assumptions',
  constraints: 'Constraints',
  dependencies: 'Dependencies',
  stakeholders: 'Stakeholders',
  projectSponsor: 'Project Sponsor',
  projectManagerOwner: 'Project Manager / Owner',
  teamRaci: 'Team & RACI',
  timelineOverview: 'Timeline Overview',
  milestones: 'Milestones',
  workBreakdownTasks: 'Work Breakdown & Gantt',
  budgetCostBreakdown: 'Budget & Cost Breakdown',
  budgetSummary: 'Budget Summary',
  resourcesTools: 'Resources & Tools',
  risks: 'Risks',
  mitigationsContingencies: 'Mitigations & Contingencies',
  issuesDecisionsLog: 'Issues & Decisions Log',
  communicationPlan: 'Communication Plan',
  governanceApprovals: 'Governance & Approvals',
  complianceSecurityPrivacy: 'Compliance, Security & Privacy',
  openQuestionsNextSteps: 'Open Questions & Next Steps',
  notesBackground: 'Notes & Background',
};

// Minimal "is populated" checker used by export rendering
export function isPopulated(value: any): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.some((v) => isPopulated(v));
  if (typeof value === 'object') return Object.values(value).some((v) => isPopulated(v));
  return true;
}

// Table headers for array sections.
// Keys: fieldKey -> { objectKey -> ColumnLabel }
export const TABLE_HEADERS: Record<string, Record<string, string>> = {
  objectivesSmart: { objective: 'Objective', successMeasure: 'Success Measure' },
  kpis: { kpi: 'KPI', baseline: 'Baseline', target: 'Target' },
  dependencies: { dependency: 'Dependency', teamOrSystem: 'Team / System', status: 'Status' },
  stakeholders: { name: 'Name', role: 'Role', contact: 'Contact' },
  teamRaci: { teamMember: 'Team Member', role: 'Role', r: 'R', a: 'A', c: 'C', i: 'I' },
  milestones: { milestone: 'Milestone', targetDate: 'Target Date' },
  workBreakdownTasks: { name: 'Task', start: 'Start', end: 'End', owner: 'Owner', status: 'Status', priority: 'Priority', kind: 'Kind', deps: 'Deps' },
  budgetCostBreakdown: {
    task: 'Task',
    role: 'Role',
    estimatedHours: 'Estimated Hours',
    rateUsdPerHour: 'Rate (USD/hr)',
    complexityMultiplier: 'Complexity ×',
    totalCostUsd: 'Total Cost (USD)',
    justification: 'Justification',
  },
  resourcesTools: { resource: 'Resource/Tool', purpose: 'Purpose' },
  risks: { risk: 'Risk', probability: 'Probability', impact: 'Impact' },
  mitigationsContingencies: { mitigation: 'Mitigation', contingency: 'Contingency' },
  issuesDecisionsLog: { issue: 'Issue', decision: 'Decision', owner: 'Owner', date: 'Date' },
  communicationPlan: { audience: 'Audience', cadence: 'Cadence', channel: 'Channel' },
  governanceApprovals: { gate: 'Gate', signOffRequirement: 'Sign-off Requirement' },
  complianceSecurityPrivacy: { requirement: 'Requirement', notes: 'Notes' },
  openQuestionsNextSteps: { question: 'Question', nextStep: 'Next Step' },
};


export async function toGanttDataURL(
  format: 'png' | 'jpeg' | 'svg' = 'png',
  scale = 2
): Promise<string | null> {
  /**
   * Robust Gantt capture:
   * - Works if the chart is a raw SVG (custom renderer) OR a Plotly chart.
   * - We try Plotly.toImage first when a Plotly container is present because it preserves
   *   styling exactly as shown in the app (paper_bgcolor, fonts, traces, etc.).
   * - Fallback: serialize an SVG and rasterize via canvas.
   *
   * Expected DOM (any of these):
   * - <svg id="gantt-fig" ... />
   * - <div id="gantt-fig"> ... <div class="js-plotly-plot"> ... </div> ... </div>
   * - Any element with id="gantt-fig" / "gantt-root" / "gantt" containing a Plotly chart
   */
  const byId = (id: string) => document.getElementById(id);

  const root =
    byId('gantt-fig') ||
    byId('gantt-root') ||
    byId('gantt') ||
    // last resort: pick the first plotly chart on the page
    (document.querySelector('.js-plotly-plot') as HTMLElement | null);

  if (!root) return null;

  // If the root itself is an SVG, export it directly
  const svgDirect =
    root instanceof SVGSVGElement ? root : (root.querySelector('svg') as SVGSVGElement | null);

  // Try Plotly export when possible (best fidelity)
  const plotDiv = (root.classList?.contains('js-plotly-plot')
    ? root
    : (root.querySelector('.js-plotly-plot') as any)) as any;

  const Plotly = (window as any)?.Plotly;

  if (Plotly && plotDiv && typeof Plotly.toImage === 'function') {
    try {
      // Plotly.toImage returns a data URL (png/jpeg/svg) matching the figure.
      const dataUrl = await Plotly.toImage(plotDiv, { format, scale });
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) return dataUrl;
      // SVG export sometimes returns data:image/svg+xml
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) return dataUrl;
    } catch {
      // Fall through to SVG serialization below.
    }
  }

  // Fallback: serialize SVG and rasterize
  const svg = svgDirect;
  if (!svg) return null;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!clone.getAttribute('xmlns:xlink')) clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  if (!clone.getAttribute('width')) clone.setAttribute('width', String(width));
  if (!clone.getAttribute('height')) clone.setAttribute('height', String(height));

  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(clone);

  if (format === 'svg') {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;

  return await new Promise<string | null>((resolve) => {
    const img = new Image();
    // Helps when SVG references external assets (fonts/images).
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        // Match your "export should be professional" constraint:
        // Use white background for consistent print output.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        resolve(canvas.toDataURL(mime));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = svgDataUrl;
  });
}

export async function downloadImage(format: 'png' | 'jpeg' | 'svg'): Promise<void> {
 // Use scale 2 for direct downloads for a reasonable file size, capturing the on-screen dark theme.
 const dataUrl = await toGanttDataURL(format, 2);

 if (!dataUrl) {
 throw new Error('Failed to generate chart image.');
 }
 const a = document.createElement('a');
 a.href = dataUrl;
 a.download = `PMOMax_Gantt.${format}`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 // data URLs do not need URL.revokeObjectURL
}
