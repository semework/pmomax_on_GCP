// Cleaned and restyled NavPanel with black background, gold border, and active highlight
import React, { useMemo, useState } from 'react';
import type { PMOMaxPID } from '../types';

type NavItem = { id: string; label: string };

function hasValue(v: any): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

function buildNavItems(pid: PMOMaxPID | null): NavItem[] {
  // These ids MUST match section ids in MainContent.tsx
  const allSections: NavItem[] = [
    { id: 'project-title', label: '01 — Project Info' },
    { id: 'executive-summary', label: '02 — Overview & Rationale' },
    { id: 'objectives', label: '03 — Objectives & KPIs' },
    { id: 'scope', label: '04 — Scope & Deliverables' },
    { id: 'assumptions', label: '05 — Assumptions & Dependencies' },
    { id: 'gantt', label: '06 — Schedule & Gantt' },
    { id: 'people', label: '07 — People & Budget' },
    { id: 'risks', label: '08 — Risks & Comms' },
    { id: 'governance', label: '09 — Governance & Open Questions' },
  ];

  if (!pid) return [];

  const fieldMap: Record<string, string[]> = {
    'project-title': ['titleBlock.projectTitle', 'titleBlock.projectId'],
    'executive-summary': ['executiveSummary', 'problemStatement', 'businessCaseExpectedValue'],
    objectives: ['objectivesSmart', 'kpis'],
    scope: ['scopeInclusions', 'scopeExclusions'],
    assumptions: ['assumptions', 'constraints', 'dependencies'],
    gantt: ['workBreakdownTasks', 'timelineOverview'],
    people: ['stakeholders', 'projectSponsor', 'projectManagerOwner', 'teamRaci', 'budgetCostBreakdown', 'resourcesTools'],
    risks: ['risks', 'mitigationsContingencies', 'issuesDecisionsLog', 'communicationPlan', 'complianceSecurityPrivacy'],
    governance: ['governanceApprovals', 'openQuestionsNextSteps', 'notesBackground'],
  };

  function getValueByPath(obj: any, path: string): any {
    return path
      .split('.')
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  return allSections.filter((section) => {
    const fields = fieldMap[section.id] || [];
    return fields.some((f) => {
      const v = getValueByPath(pid as any, f);
      return hasValue(v);
    });
  });
}

export function NavPanel({
  pidData,
  onHelp,
}: {
  pidData: PMOMaxPID | null;
  onHelp?: (context?: string) => void;
}) {
  const items = useMemo(() => buildNavItems(pidData), [pidData]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveId(id);
  };

  return (
    <div className="sticky top-16 bg-black border border-amber-400/70 p-2 md:p-3 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-5rem)] overscroll-contain shadow-lg">
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h3 className="text-sm md:text-base font-extrabold text-white tracking-widest">
          NAVIGATION
        </h3>
        {onHelp && (
          <button
            type="button"
            onClick={() => onHelp('Navigation')}
            className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-300 text-black font-extrabold flex items-center justify-center border border-amber-500 shadow-sm"
            aria-label="Help"
            title="Help"
          >
            ?
          </button>
        )}
      </div>

      {!pidData ? (
        <p className="text-xs md:text-sm text-white">
          Load or parse a PID to enable navigation.
        </p>
      ) : items.length === 0 ? (
        <p className="text-xs md:text-sm text-white">No sections detected yet.</p>
      ) : (
        <ul className="space-y-1 md:space-y-1.5">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => scrollTo(it.id)}
                className={`w-full text-left px-2 py-1 rounded-md border font-semibold transition-all duration-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/70 ${
                  activeId === it.id
                    ? 'bg-black text-amber-200 border-amber-400 shadow-sm'
                    : 'bg-black text-white border-amber-500/60 hover:bg-amber-300/70 hover:text-black hover:border-amber-300'
                }`}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NavPanel;
