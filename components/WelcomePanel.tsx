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
              AI-Assisted Project Initiation for PMO Leaders &amp; Project Managers
            </div>
            <div className="text-base md:text-lg text-brand-muted text-center mb-4 max-w-3xl">
              PMOMax helps turn project inputs into clear, structured Project Initiation Documents covering objectives, scope, schedule, risks, governance, and compliance review. It is designed for customer-controlled Google Cloud deployment with traceable AI-assisted outputs.
            </div>
            <p className="text-sm md:text-base text-brand-muted leading-relaxed text-center max-w-2xl mx-auto">
              Use the left panel to paste or upload project material and click <span className="font-bold text-brand-accent">Parse</span>. The middle panel organizes the PID into canonical sections and renders the Gantt chart when enough schedule data is present. Review AI-assisted content before approval or distribution.
            </p>
          </div>
          {/* IMPORTANT: No action buttons are shown in the main/middle panel by design. */}
        </div>
      </div>
    </main>
  );
}
