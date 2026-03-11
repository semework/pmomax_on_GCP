// components/WelcomePanel.tsx
import React from 'react';
import { PMOMaxIcon } from './Icons';

export default function WelcomePanel() {
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 text-brand-text">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 shadow-soft flex flex-col items-center" style={{margin: '0 auto', boxSizing: 'border-box'}}>
          <div className="flex flex-col items-center w-full" style={{margin: '0 auto'}}>
            <div className="flex items-center gap-3 mb-2 w-full justify-center">
              <PMOMaxIcon alt="PMOMax Logo" className="w-10 h-10" aria-label="PMOMax Logo" />
              <h1 className="text-2xl md:text-3xl font-extrabold text-brand-accent tracking-wide text-center" aria-label="Welcome to PMOMax PID Architect">
                Welcome to PMOMax PID Architect
              </h1>
            </div>
            <div className="text-lg md:text-xl font-semibold text-brand-accent text-center mb-2">
              The AI Copilot for PMO Leaders &amp; Project Managers (2026 Edition)
            </div>
            <div className="text-base md:text-lg text-brand-muted text-center mb-4 max-w-3xl">
              PMOMax (Project Management Optimizer—maximize value from your ideas) transforms your Project Initiation Document (PID) into clear, structured plans—covering objectives, scope, schedule, risks, and governance. Fully compliant with Google Cloud Marketplace and 2026 PMO standards.
            </div>
            <p className="text-sm md:text-base text-brand-muted leading-relaxed text-center max-w-2xl mx-auto">
              Use the left panel to paste or upload a PID and click <span className="font-bold text-brand-accent">Parse</span>. The middle panel will organize your PID into canonical sections and render the Gantt chart once enough tasks are present. All exports (PDF, Word, JSON, ZIP) are fully compliant and ready for audit.
            </p>
          </div>
          {/* IMPORTANT: No action buttons are shown in the main/middle panel by design. */}
        </div>
      </div>
    </main>
  );
}
