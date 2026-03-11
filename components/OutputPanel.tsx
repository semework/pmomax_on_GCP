
import React from 'react';


interface OutputPanelProps {
 onExportPdf: () => void;
 onExportWord: () => void;
 isLoading: boolean;
 onHelp: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = React.memo(({ onExportPdf, onExportWord, isLoading, onHelp }) => {
	return (
		<div id="output-section" className="bg-brand-panel rounded-2xl border border-brand-border p-4 shadow-xl">
 <div className="flex items-center justify-between mb-2">
 <h2 className="text-lg font-bold text-pink-400">Export Document</h2>
 <button
 onClick={onHelp}
 className="text-xs h-5 w-5 flex items-center justify-center rounded-full border border-brand-border text-brand-text-secondary hover:bg-brand-border hover:text-brand-text"
 title="Help with Exporting"
 aria-label="Help with Exporting"
 >
 ?
 </button>
 </div>
 <div className="flex items-center gap-3">
 <button 
 onClick={onExportPdf}
 disabled={isLoading}
 className="flex-1 flex items-center justify-center gap-2 pmomax-gold-button text-sm"
 aria-label="Export as PDF"
 >
 PDF
 </button>
 <button 
 onClick={onExportWord}
 disabled={isLoading}
 className="flex-1 flex items-center justify-center gap-2 pmomax-gold-button text-sm"
 aria-label="Export as Word and Gantt"
 >
 Word + Gantt
 </button>
 </div>
 </div>
 );
});
