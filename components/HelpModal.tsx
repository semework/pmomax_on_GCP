// components/HelpModal.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string | null;
}

function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);
}

function normalizeKey(context?: string | null) {
  const raw = (typeof context === 'string' ? context : '').trim().toLowerCase();
  const compact = raw.replace(/[^a-z0-9]+/g, '');
  // normalize a few common aliases
  if (!compact) return 'main';
  if (compact === 'nav' || compact === 'navigation') return 'navigation';
  if (compact === 'projecttitle' || compact === 'projectinfo') return 'projectinfo';
  if (compact === 'objectives' || compact === 'objectivessmart') return 'objectives';
  if (compact === 'kpis' || compact === 'kpisuccessmetrics') return 'kpis';
  if (compact === 'scopeinout' || compact === 'scope') return 'scope';
  if (compact === 'risksmitigations') return 'risks';
  if (compact === 'issuesdecisions') return 'issues';
  if (compact === 'workbreakdown' || compact === 'tasks') return 'tasks';
  if (compact === 'governance' || compact === 'approvals') return 'governance';
  if (compact === 'compliance' || compact === 'security') return 'compliance';
  return compact;
}

type HelpEntry = {
  title: string;
  bullets: string[];
};

const SECTION_HELP: Record<string, HelpEntry> = {
  // intro and createmode removed (duplicate keys)

  // Left panel
  input: {
    title: 'Input Panel',
    bullets: [
      'Paste PID text or upload a PDF/DOCX/TXT file.',
      'Uploads auto-parse; use Parse for pasted text.',
      'Use Load Demo to see a complete example end-to-end.',
      'If parsing looks off, try a cleaner paste (remove headers/footers) and re-parse.',
    ],
  },
  assistant: {
    title: 'AI Assistant',
    bullets: [
      'Use the AI Assistant to rewrite, expand, or generate missing sections—specify tone and format for best results.',
      'Preview suggestions and use “Apply” to commit changes directly into your PID or copy them into General Notes.',
      'For targeted edits, reference the section name (e.g., “Rewrite Risks” or “Draft Objectives with KPIs”).',
      'Use the **Risk** and **Compliance** buttons in the left panel to run specialized agents. Their findings appear in the AI Assistant as replies and can be applied to the PID or merged into the Risks / Compliance sections.',
    ],
  },
  export: {
    title: 'Export',
    bullets: [
      'Export Word generates a formatted PID document.',
      'If the Gantt is available, export options may include the chart image.',
      'Export buttons may be disabled until a PID is loaded.',
    ],
  },
  notes: {
    title: 'General Notes',
    bullets: [
      'Use notes for meeting capture, assumptions, decisions, and follow-ups.',
      'Notes are saved alongside your PID so they can be exported later.',
    ],
  },
  navigation: {
    title: 'Navigation',
    bullets: [
      'Use the Navigation panel to jump to any PID section.',
      'Sections highlight based on availability; fill missing sections as needed.',
      'Use Reset/Clear to return to the welcome view when you want to start over.',
    ],
  },

  // Main content sections (right/middle)
  projectinfo: {
    title: 'Project Info',
    bullets: [
      'Confirm the project title, ID, subtitle, and generated date.',
      'These fields appear on the cover page of exports.',
    ],
  },
  executivesummary: {
    title: 'Executive Summary',
    bullets: [
      'One-page overview: what you are doing, why now, and what success looks like.',
      'Keep it scannable—leaders should get the full story in 60 seconds.',
    ],
  },
  problemstatement: {
    title: 'Problem Statement / Context',
    bullets: [
      'Describe the current pain, root causes, and who is impacted.',
      'Include evidence (metrics, incidents, customer feedback) when possible.',
    ],
  },
  businesscase: {
    title: 'Business Case & Expected Value',
    bullets: [
      'Explain value: cost, revenue, risk reduction, compliance, or customer impact.',
      'Call out the baseline and how you will measure improvement.',
    ],
  },
  objectives: {
    title: 'Objectives (SMART)',
    bullets: [
      'Define 3–6 specific objectives with measurable success criteria.',
      'Avoid vague language—include dates, targets, and owners where possible.',
    ],
  },
  kpis: {
    title: 'KPIs / Success Metrics',
    bullets: [
      'Track outcomes that prove the project worked (not just activity metrics).',
      'Include baseline + target; align each KPI to an objective.',
    ],
  },
  scope: {
    title: 'Scope (In / Out)',
    bullets: [
      'List what is in-scope and explicitly what is out-of-scope.',
      'Use this section to prevent feature creep and clarify boundaries.',
    ],
  },
  assumptions: {
    title: 'Assumptions',
    bullets: [
      'Document what must be true for the plan to hold.',
      'Turn risky assumptions into validations or early tasks where possible.',
    ],
  },
  constraints: {
    title: 'Constraints',
    bullets: [
      'Capture non-negotiables: deadlines, budget caps, systems, policies, resourcing limits.',
      'Constraints should inform your timeline and trade-offs.',
    ],
  },
  dependencies: {
    title: 'Dependencies',
    bullets: [
      'List external teams/systems you rely on, plus status and owners.',
      'Track dates/hand-offs so the schedule stays realistic.',
    ],
  },
  stakeholders: {
    title: 'Stakeholders',
    bullets: [
      'Who is impacted, who must approve, and who needs updates.',
      'Add roles and contacts when available.',
    ],
  },
  sponsor: {
    title: 'Sponsor',
    bullets: [
      'The accountable executive who provides funding and removes blockers.',
      'Confirm how and when the sponsor wants to be engaged.',
    ],
  },
  manager: {
    title: 'Project Manager / Owner',
    bullets: [
      'The accountable delivery owner who runs day-to-day execution.',
      'Confirm responsibilities and escalation paths.',
    ],
  },
  team: {
    title: 'Team & RACI',
    bullets: [
      'Assign responsibilities (R/A/C/I) for key workstreams.',
      'Clarity here prevents missed handoffs and ambiguity during delivery.',
    ],
  },
  timeline: {
    title: 'Timeline Overview',
    bullets: [
      'High-level phases and dates—use it to frame the detailed Gantt.',
      'If dates are unknown, define the sequencing and revisit after discovery.',
    ],
  },
  milestones: {
    title: 'Milestones',
    bullets: [
      'Key checkpoints and gate reviews with clear “done” criteria.',
      'Milestones should align to approvals, launches, and readiness decisions.',
    ],
  },
  tasks: {
    title: 'Work Breakdown / Tasks',
    bullets: [
      'Break work into tasks with start/end, owners, dependencies, and status.',
      'This section powers the Gantt; include dates and dependencies when possible.',
    ],
  },
  budget: {
    title: 'Budget',
    bullets: [
      'Capture cost categories, estimates, and assumptions.',
      'Track contingency and who approves spend changes.',
    ],
  },
  resources: {
    title: 'Resources & Tools',
    bullets: [
      'List tools, environments, vendors, or equipment required.',
      'Include access needs and lead times for provisioning.',
    ],
  },
  risks: {
    title: 'Risks & Mitigations',
    bullets: [
      'Use the Risk Agent to auto-scan the PID, surface candidate risks, and prioritize by likelihood × impact.',
      'Assign owners and convert key mitigations into tasks with triggers and review dates.',
      'Focus triage on high-impact risks first and add escalation triggers where appropriate.',
    ],
  },
  mitigations: {
    title: 'Mitigations & Contingencies',
    bullets: [
      'Define what you will do to prevent a risk—and what you will do if it happens.',
      'Pair each mitigation with a clear owner and trigger condition.',
    ],
  },
  issues: {
    title: 'Issues & Decisions Log',
    bullets: [
      'Capture open issues and key decisions with dates and owners.',
      'This becomes the audit trail during delivery.',
    ],
  },
  communication: {
    title: 'Communication Plan',
    bullets: [
      'Define audience, cadence, channel, and what gets communicated.',
      'Keep the plan lightweight but consistent—this reduces surprises.',
    ],
  },
  governance: {
    title: 'Governance & Approvals',
    bullets: [
      'Document gate reviews, approvers, and sign-off criteria.',
      'Make escalation paths explicit for fast decisions.',
    ],
  },
  compliance: {
    title: 'Compliance / Security / Privacy',
    bullets: [
      'Run the Compliance Agent to generate checklist items for privacy, security, and legal reviews.',
      'Capture required controls, reviewers, and evidence; map checklist items to milestones or owners.',
      'If specific regulations apply, attach policy references and evidence links in General Notes.',
    ],
  },
  openquestions: {
    title: 'Open Questions / Next Steps',
    bullets: [
      'Track unknowns and the next action to resolve each one.',
      'Convert these into tasks so they are owned and scheduled.',
    ],
  },
  notesbackground: {
    title: 'Notes / Background',
    bullets: [
      'Add supporting context that doesn’t fit cleanly elsewhere.',
      'Use this for history, constraints rationale, and references.',
    ],
  },
};

const MAIN_HELP_MARKDOWN = `PMOMax turns a Project Initiation Document (PID) into a consistent, export-ready plan.

---

## 🔑 Quick start

1. **Load Demo** (recommended) to see a fully-populated PID end-to-end.
2. Paste or upload your PID in the **Input** panel on the left.
3. Click **Parse** for pasted text (uploads auto-parse after you choose a file).
4. Use the **AI Assistant** to refine wording, fill gaps, or generate new sections.
5. Use **Export** to download **Word**, **PDF**, or **JSON** (with General Notes included).

> Need a fresh start? Use **Create** in the left panel to draft a brand-new PID.

---

## 🧭 Where things live

- **Left Sidebar**
  - Input (paste / upload / parse / create / demo)
  - Export (Word / PDF / JSON / ZIP when available)
  - AI Assistant
  - General Notes
- **Middle Panel**
  - Your structured PID sections
  - The Gantt chart (when there is enough schedule data)
- **Right Navigation**
  - Section index that appears **only after** a PID is populated
  - Click any item to jump to that section

---

## 💡 Tips

- If a section is missing after parsing, ask the AI:
  - “Draft the missing **Executive Summary**.”
  - “Rewrite **Risks** in a more formal tone.”
- Add notes in **General Notes** for assumptions, decisions, and meeting capture; they are included in exports.
- For complex PIDs, you can paste and parse section-by-section (e.g., _Scope_, then _Risks_) to keep things focused.

---

## 📚 Learn more

- Open the in-app **User Guide** from the top-right help menu.
- Review the **Accessibility** and **Privacy** notes in the footer of pmomax.ai.
- For product or support questions, email **andrewi@katalyststreet.com**.
`;

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  context,
}) => {
  useEscapeToClose(isOpen, onClose);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Focus trap-lite: focus modal container on open
  useEffect(() => {
    if (!isOpen) return;
    modalRef.current?.focus?.();
  }, [isOpen]);

  const key = useMemo(() => normalizeKey(context), [context]);
  const sectionHelp = SECTION_HELP[key];

  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div
        ref={modalRef}
        tabIndex={-1}
          className="w-full max-w-3xl rounded-2xl border border-brand-border bg-brand-panel shadow-2xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Help"
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-brand-border">
          <div>
            <div className="text-lg font-extrabold text-brand-text">
              Help{context ? ` — ${context}` : ''}
            </div>
            <div className="text-xs text-brand-muted">
              Press Esc to close
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-brand-border bg-black/20 px-3 py-1.5 text-sm text-brand-text hover:bg-black/30"
          >
            Close
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {sectionHelp ? (
            <div className="rounded-2xl border border-brand-border bg-black/20 p-4">
              <div className="text-base md:text-lg font-extrabold text-amber-300 mb-3">
                {sectionHelp.title}
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-brand-muted">
                {sectionHelp.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-amber-300 font-extrabold mb-3">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-amber-300 font-extrabold mt-4 mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-amber-300 font-extrabold mt-3 mb-2">{children}</h3>
                  ),
                }}
              >
                {MAIN_HELP_MARKDOWN}
              </ReactMarkdown>
            </div>
          )}

          <div className="mt-4 text-xs text-amber-300">
            Need more help? Contact <span className="font-semibold text-amber-300">andrewi@katalyststreet.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
