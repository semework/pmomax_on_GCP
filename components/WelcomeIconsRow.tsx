import React from 'react';

/**
 * WelcomeIconsRow
 *
 * Middle-panel guide shown when no PID data is loaded.
 * Matches the six golden tiles layout in the PMOMax PID Architect design.
 * To get started, paste or upload your project text, then click <strong>Parse</strong> to extract structured fields. Use the AI assistant to refine or explore options.
 */
export const WelcomeIconsRow: React.FC = () => {
  // Smaller, right-aligned cards with more margin and color-matched titles
  const cardBase =
    'rounded-xl border-2 bg-brand-panel/80 px-3 py-2 flex flex-col gap-1 shadow-sm min-w-[220px] max-w-[260px] ml-auto mb-6';
  const headingBase =
    'flex items-center gap-2 text-xs font-bold tracking-wide';
  const pillBase =
    'inline-flex items-center justify-center rounded-full bg-brand-accent text-black text-[10px] font-bold px-2 py-0.5';
  const subText =
    'text-xs text-brand-text-secondary';
  // Color mapping for card titles to match left panel section borders
  const cardTitleColors = [
    'text-amber-400', // Objectives & KPIs (amber)
    'text-pink-400', // Scope & Assumptions (pink)
    'text-emerald-400', // Stakeholders & Team (emerald)
    'text-cyan-400', // Gantt & Timeline (cyan)
    'text-blue-400', // Budget & Resources (blue)
    'text-rose-400', // Risks & Mitigations (rose)
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2 mb-8 justify-end items-start">
      {/* 1. Objectives & KPIs */}
      <article className={cardBase}>
        <div className={headingBase}>
          <span className={pillBase}>1</span>
          <span className={cardTitleColors[0]}>Objectives &amp; KPIs</span>
        </div>
        <p className={subText}>Define goals and how you&apos;ll measure success.</p>
        <ul className="mt-1 space-y-0.5 text-xs text-brand-text-secondary">
          <li>• <span className="font-semibold text-brand-text">Summary:</span> 1–3 lines on what this delivers.</li>
          <li>• <span className="font-semibold text-brand-text">Objectives:</span> SMART goals the team owns.</li>
          <li>• <span className="font-semibold text-brand-text">KPIs:</span> Baseline → target success measures.</li>
        </ul>
      </article>

      {/* 2. Scope & Assumptions */}
      <article className={cardBase}>
        <div className={headingBase}>
          <span className={pillBase}>2</span>
          <span className={cardTitleColors[1]}>Scope &amp; Assumptions</span>
        </div>
        <p className={subText}>What&apos;s in/out and what you&apos;re assuming.</p>
        <ul className="mt-1 space-y-0.5 text-xs text-brand-text-secondary">
          <li>• <span className="font-semibold text-brand-text">Scope-in:</span> Included features/teams.</li>
          <li>• <span className="font-semibold text-brand-text">Scope-out:</span> Explicitly excluded items.</li>
          <li>• <span className="font-semibold text-brand-text">Assumptions:</span> Things expected to hold true.</li>
          <li>• <span className="font-semibold text-brand-text">Constraints:</span> Budget/time/compliance/tech limits.</li>
        </ul>
      </article>

      {/* 3. Stakeholders & Team */}
      <article className={cardBase}>
        <div className={headingBase}>
          <span className={pillBase}>3</span>
          <span className={cardTitleColors[2]}>Stakeholders &amp; Team</span>
        </div>
        <p className={subText}>Map everyone involved and how they show up.</p>
        <ul className="mt-1 space-y-0.5 text-xs text-brand-text-secondary">
          <li>• <span className="font-semibold text-brand-text">Stakeholders:</span> People with influence or impact.</li>
          <li>• <span className="font-semibold text-brand-text">Sponsor:</span> Exec accountable for outcome.</li>
          <li>• <span className="font-semibold text-brand-text">Manager:</span> Project owner / day-to-day lead.</li>
          <li>• <span className="font-semibold text-brand-text">Team:</span> Core members + roles.</li>
        </ul>
      </article>

      {/* 4. Gantt & Timeline */}
      <article className={cardBase}>
        <div className={headingBase}>
          <span className={pillBase}>4</span>
          <span className={cardTitleColors[3]}>Gantt &amp; Timeline</span>
        </div>
        <p className={subText}>Deliverables and dependencies at a glance.</p>
        <ul className="mt-1 space-y-0.5 text-xs text-brand-text-secondary">
          <li>• <span className="font-semibold text-brand-text">Timeline:</span> Phase dates and key gates.</li>
          <li>• <span className="font-semibold text-brand-text">Deliverables:</span> Outputs + acceptance criteria.</li>
          <li>• <span className="font-semibold text-brand-text">Work:</span> Tasks feeding the Gantt.</li>
          <li>• <span className="font-semibold text-brand-text">Deps:</span> Cross-team/system blockers.</li>
        </ul>
      </article>

      {/* 5. Budget & Resources */}
      <article className={cardBase}>
        <div className={headingBase}>
          <span className={pillBase}>5</span>
          <span className={cardTitleColors[4]}>Budget &amp; Resources</span>
        </div>
        <p className={subText}>Costs, people, tools, and systems.</p>
        <ul className="mt-1 space-y-0.5 text-xs text-brand-text-secondary">
          <li>• <span className="font-semibold text-brand-text">Budget:</span> Summary and major line items.</li>
          <li>• <span className="font-semibold text-brand-text">Resources:</span> People, licenses, systems.</li>
        </ul>
      </article>

      {/* 6. Risks & Mitigations */}
      <article className={cardBase}>
        <div className={headingBase}>
          <span className={pillBase}>6</span>
          <span className={cardTitleColors[5]}>Risks &amp; Mitigations</span>
        </div>
        <p className={subText}>Issues, impacts, and how you respond.</p>
        <ul className="mt-1 space-y-0.5 text-xs text-brand-text-secondary">
          <li>• <span className="font-semibold text-brand-text">Risks:</span> Probability × impact with owners.</li>
          <li>• <span className="font-semibold text-brand-text">Mitigations:</span> Pre-agreed responses.</li>
          <li>• <span className="font-semibold text-brand-text">Issues:</span> Active problems to resolve.</li>
          <li>• <span className="font-semibold text-brand-text">Questions:</span> Open decisions and unknowns.</li>
        </ul>
      </article>
    </div>
  );
};
