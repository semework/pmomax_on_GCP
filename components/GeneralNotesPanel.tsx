// components/GeneralNotesPanel.tsx — compact, non-intrusive border

import React from "react";
import clsx from "clsx";

interface GeneralNotesPanelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

// Help UI for this panel is rendered by the container/sidebar header.
// Keeping a single help button prevents duplicate "?" buttons.
export function GeneralNotesPanel({ className, value, onChange }: any) {
  return (
    <div id="notes-panel" className={clsx("flex flex-col gap-2 w-full min-h-0", className)}>
      <textarea
		className="w-full flex-1 min-h-[180px] rounded-lg border border-slate-600 bg-slate-950/90 text-slate-100 placeholder:text-slate-400 p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/70"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Add notes, comments, or instructions here. These will be saved and exported."
      />
    </div>
  );
}
