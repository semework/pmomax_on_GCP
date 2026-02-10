import React from 'react';

interface SectionProps {
  id?: string;
  title: string;
  children: React.ReactNode;
  /**
   * Optional context key used by HelpModal to choose section-specific help
   * e.g. "executiveSummary", "scope", "risks", "gantt", "assistant"
   */
  helpContext?: string;
  onHelp?: (context?: string) => void;
}

export const Section: React.FC<SectionProps> = ({
  id,
  title,
  children,
  helpContext,
  onHelp,
}) => {
  const handleHelpClick = () => {
    if (!onHelp) return;
    const ctx = helpContext || id || title;
    onHelp(ctx);
  };

  return (
    <section
      id={id}
      className="mb-6 rounded-2xl border-2 border-amber-500/60 bg-black shadow-xl"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-amber-500/40 bg-black rounded-t-2xl">
        <h3 className="text-xs md:text-sm font-semibold tracking-wide text-amber-300 uppercase">
          {title}
        </h3>
        {onHelp && (
          <button
            type="button"
            onClick={handleHelpClick}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-black font-extrabold shadow hover:bg-amber-400"
            aria-label="Help"
            title="Help"
          >
            ?
          </button>
        )}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
};

export default Section;
