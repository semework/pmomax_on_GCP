

import React from 'react';
import {
  Target, Layers, Users, GanttChart as GanttIcon, DollarSign, AlertTriangle,
  FileText, CheckSquare, Link2, Users2, Calendar, ListTodo, Briefcase,
  Banknote, Wrench, ShieldAlert, MessageSquare, GitPullRequest, ShieldCheck, HelpCircle,
  Clock
} from "lucide-react";
import { PMOMaxIcon } from './Icons';

interface PidSchemaViewProps {
  onHelp: () => void;
  onLoadDemo?: () => void;
}

const categories = [
  {
    icon: Briefcase,
    title: "PROJECT OVERVIEW",
    desc: "Snapshot of purpose, context, and outcomes.",
    points: [
      "Name the project clearly.",
      "State the problem and why now.",
      "Highlight intended business outcomes."
    ]
  },
  {
    icon: Layers,
    title: "SCOPE & DELIVERABLES",
    desc: "What is in/out and what gets produced.",
    points: [
      "Clarify what is in scope.",
      "Call out what is excluded.",
      "List major deliverables and criteria."
    ]
  },
  {
    icon: Clock,
    title: "SCHEDULE & MILESTONES",
    desc: "Key dates, gates, and decision points.",
    points: [
      "Define start, end, and key phases.",
      "Capture milestones with clear owners.",
      "Align Gantt with milestone dates."
    ]
  },
  {
    icon: Users,
    title: "RESOURCES & BUDGET",
    desc: "Who does the work and how it is funded.",
    points: [
      "List core teams and roles.",
      "Note critical tools and systems.",
      "Outline budget and key cost lines."
    ]
  },
  {
    icon: AlertTriangle,
    title: "RISK MANAGEMENT",
    desc: "What could go wrong and how you respond.",
    points: [
      "Capture top project risks.",
      "Rate impact and probability.",
      "Assign owners and responses."
    ]
  },
  {
    icon: MessageSquare,
    title: "COMMUNICATION PLAN",
    desc: "Who hears what, how often, and through which channel.",
    points: [
      "Define core audiences and needs.",
      "Choose channels and cadence.",
      "Align updates with governance gates."
    ]
  }
];

export const PidSchemaView: React.FC<PidSchemaViewProps> = ({ onHelp, onLoadDemo }) => {

  // Color mapping for card titles to match left panel section borders
  const cardTitleColors = [
    'text-amber-400', // Project Overview (amber)
    'text-pink-400', // Scope & Deliverables (pink)
    'text-cyan-400', // Schedule & Milestones (cyan)
    'text-blue-400', // Resources & Budget (blue)
    'text-rose-400', // Risk Management (rose)
    'text-emerald-400', // Communication Plan (emerald)
  ];
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111827] p-4 md:p-8 shadow-2xl">
      <header className="mb-10 text-left border-b border-zinc-800 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <PMOMaxIcon className="h-8 w-8 text-[#FBBF24]" />
          <h2 className="text-2xl font-bold text-[#FBBF24] tracking-wide uppercase">⭐ The AI Copilot for PMO Leaders &amp; Project Managers</h2>
        </div>
        <p className="text-base text-white max-w-3xl leading-relaxed mb-6 font-semibold">
          Evidence-based guidance for planning, alignment, and execution.
        </p>
        <div className="mb-4 text-zinc-100">
          <strong className="text-lg block mb-1">What is a PID?</strong>
          <span className="text-base">A <b>PID</b> (Project Initiation Document) is a structured document that defines a project's objectives, scope, stakeholders, schedule, risks, and resources. It serves as the single source of truth for project planning and alignment.</span>
        </div>
        <div className="mb-4 text-zinc-100">
          <strong className="text-lg block mb-1">What is PMOMax?</strong>
          <span className="text-base">PMOMax = Project Management Office Maximum — a gold-themed <b>PID</b> (Project Initiation Document) builder and smart assistant for project professionals. It extracts, organizes, and improves your objectives, scope, schedule, risks, and timeline automatically.</span>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-middle drop-shadow-lg">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">How to Start</h3>
          <ol className="list-decimal list-inside space-y-2 text-zinc-100">
            <li>Paste or upload project text in the left panel — or press <b className="text-[#f7b84b] text-lg">Create</b> to begin fresh.</li>
            <li>Click <b className="text-[#f7b84b] text-lg">Parse</b> to extract key sections (uploads parse automatically).</li>
            <li>Use the <b className="text-[#f7b84b] text-lg">AI Assistant</b> to refine text, ask questions, and generate missing content.</li>
            <li>The middle panel displays your PID across seven structured <span className="text-[#f7b84b] text-lg font-bold">gold groups</span>, and schedules appear in a Gantt visualization when detected.</li>
          </ol>
        </div>
        <div className="mt-6 text-base text-zinc-200 font-semibold">
          <span className="block mb-1">PMO in One Line</span>
          <span className="block text-base font-normal text-zinc-100">A PMO defines and improves how projects run —<br/>PMOMax delivers the fastest way to generate and manage a complete PID.</span>
        </div>
        {/* LOAD DEMO - horizontal div, restored text */}
        {onLoadDemo && (
          <div className="flex flex-col gap-2 px-6 py-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-900/15 to-amber-800/15 hover:border-amber-500/60 transition-all">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Try the RoadRunner demo project to explore PMOMax features and see how objectives, schedules, risks, and Gantt charts are extracted.
              </p>
              <button
                onClick={onLoadDemo}
                className="px-6 py-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 shadow-md hover:shadow-lg transition-all flex-shrink-0"
              >
                Load Demo
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2 mb-8 justify-end items-start">
        {categories.map(({ icon: Icon, title, desc, points }, idx) => (
          <div key={title} className="flex flex-col rounded-xl border-2 bg-[#1F2937]/70 p-3 min-w-[220px] max-w-[260px] ml-auto mb-6 shadow group">
            <div className="mb-2 flex items-center gap-3">
              <div className="p-2 rounded-full border border-[#FBBF24] text-[#FBBF24] bg-transparent group-hover:bg-[#FBBF24]/10 transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`text-xs font-bold tracking-wider uppercase ${cardTitleColors[idx]}`}>{title}</h3>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 mb-3 leading-relaxed min-h-[2.5em]">
              {desc}
            </p>
            <ul className="mt-auto space-y-2">
              {points.map((point, pidx) => (
                <li key={pidx} className="flex items-start gap-2 text-[10px] text-zinc-300">
                  <div className="mt-1 h-1 w-1 rounded-full border border-[#FBBF24] flex-shrink-0"></div>
                  <span className="leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
