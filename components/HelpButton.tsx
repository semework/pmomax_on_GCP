import React from 'react';

interface HelpButtonProps {
  context?: string;
  onHelp: (context?: string) => void;
  className?: string;
}

/** Small round gold "?" help button */
export function HelpButton({ context, onHelp, className }: HelpButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onHelp(context)}
      className={
        className ??
        'inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-panel text-amber-200 font-semibold border border-brand-border shadow-sm hover:bg-brand-border/70 hover:text-white'
      }
      aria-label="Help"
      title="Help"
    >
      ?
    </button>
  );
}

interface ToolTipProps {
  text: string;
  className?: string;
}

export function ToolTip({ text, className }: ToolTipProps) {
  return (
    <div
      className={
        className ??
        'absolute z-50 mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-white shadow-lg'
      }
      role="tooltip"
    >
      {text}
    </div>
  );
}
