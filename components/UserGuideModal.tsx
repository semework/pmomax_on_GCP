// components/UserGuideModal.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
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

function childrenToText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  if (typeof children === 'object' && 'props' in children) {
    return childrenToText((children as any).props?.children);
  }
  return '';
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const SafeMarkdown = (props: any) => {
  const { className, ...rest } = props || {};
  return <ReactMarkdown {...rest} />;
};

const USER_MANUAL_MARKDOWN = `# PMOMax User Guide

PMOMax turns your **Project Initiation Document (PID)** into a structured plan you can **navigate, refine, visualize (Gantt), and export**.

If you get stuck, email **andrewi@katalyststreet.com**.

---

## Introduction

PMOMax is organized around three flows:

- **Parse**: Extract structured fields from your PID text or files.
- **Refine**: Use the editor and AI Assistant to improve clarity, completeness, and consistency.
- **Export**: Produce shareable documents (Word / images) and keep an audit trail.

---

## Features

### 1) Input Panel (Left)
- Paste your PID text or **upload** a PDF/DOCX/TXT.
- Click **Parse** (uploads may auto-parse depending on your build).
- Use **Load Demo** to see a complete, realistic PID end-to-end.
- Use **Create** when you want to start from examples and build a PID manually.

### 2) Navigation
- Jump to any section instantly.
- Use it as a checklist: empty sections stand out so you can fill gaps.

### 3) AI Assistant
Use the assistant to:
- Rewrite for clarity (“make this executive-friendly”).
- Fill missing pieces (“suggest KPIs for these objectives”).
- Run what-ifs (“if the pilot slips 2 weeks, what changes?”).

### 4) Gantt
When tasks include dates, PMOMax renders a Gantt.
- Keep tasks small and sequenced with dependencies.
- Prefer real dates when possible.

### 5) Export
- Export to **Word** for stakeholder sharing.
- If enabled, export can include the **Gantt image**.

### 6) Risk & Compliance Agents
- Use the **Risk** agent to auto-scan your PID and surface candidate risks, with suggested likelihood, impact, and mitigations.
- Use the **Compliance** agent to generate a checklist of security, privacy, and regulatory items relevant to your project.
- Click the Risk or Compliance buttons in the left panel; agent results will appear in the AI Assistant and can be applied to the PID.


---

## How to Use

### Quick start
1. Click **Load Demo** to see a complete example.
2. Paste or upload your PID in the left **Input** panel.
3. Click **Parse**.
4. Use **Navigation** to review every section.
5. Use the **AI Assistant** to refine wording and fill gaps.
6. Export when ready.

### Tips for best parsing
- Remove repeated headers/footers before pasting.
- Keep tables as simple rows/columns when possible.
- Put dates in ISO format (e.g., 2026-02-17) for best Gantt results.

### Create mode
Use Create when you want to start from a template:
- Pick an example, adjust title/ID, then **Apply to Workspace**.
- Continue editing in the main workspace and export.

---

## FAQ

**Why are Export buttons disabled?**  
Export typically requires a PID to be loaded. Load Demo or Parse your PID first.

**Why is the Gantt empty?**  
Tasks need start/end dates (and ideally dependencies). Add dates in the Work Breakdown section.

**The help button didn’t answer my question.**  
Section help is intentionally scoped to the current panel. Open this User Guide for the full workflow.

---

## Contact

Support: **andrewi@katalyststreet.com**
`;

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEscapeToClose(isOpen, onClose);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    modalRef.current?.focus?.();
  }, [isOpen]);

  const mdComponents = useMemo(() => {
    const Heading =
      (Tag: any) =>
      (props: any) => {
        const text = childrenToText(props.children);
        const id = slugify(text);
        return (
          <Tag id={id} className={props.className}>
            {props.children}
          </Tag>
        );
      };

    // Gold headers and improved spacing
    return {
      h1: (props: any) => (
        <h1 id={slugify(childrenToText(props.children))} className="text-4xl font-extrabold text-amber-400 mb-6 mt-2 tracking-tight">
          {props.children}
        </h1>
      ),
      h2: (props: any) => (
        <h2 id={slugify(childrenToText(props.children))} className="text-3xl font-bold text-amber-300 mb-4 mt-8 border-b border-amber-400 pb-1">
          {props.children}
        </h2>
      ),
      h3: (props: any) => (
        <h3 id={slugify(childrenToText(props.children))} className="text-2xl font-semibold text-amber-200 mb-3 mt-6">
          {props.children}
        </h3>
      ),
      h4: (props: any) => (
        <h4 id={slugify(childrenToText(props.children))} className="text-xl font-semibold text-amber-100 mb-2 mt-4">
          {props.children}
        </h4>
      ),
      h5: (props: any) => (
        <h5 id={slugify(childrenToText(props.children))} className="text-lg font-semibold text-amber-100 mb-2 mt-4">
          {props.children}
        </h5>
      ),
      h6: (props: any) => (
        <h6 id={slugify(childrenToText(props.children))} className="text-base font-semibold text-amber-100 mb-2 mt-4">
          {props.children}
        </h6>
      ),
      ul: (props: any) => <ul className="list-disc pl-6 mb-4 space-y-1">{props.children}</ul>,
      ol: (props: any) => <ol className="list-decimal pl-6 mb-4 space-y-1">{props.children}</ol>,
      p: (props: any) => <p className="mb-3 leading-relaxed text-brand-text-secondary">{props.children}</p>,
      a: ({ href, children, title }: any) => <a href={href} title={title} className="text-amber-300 underline hover:text-amber-200">{children}</a>,
      strong: (props: any) => <strong className="text-amber-200 font-bold">{props.children}</strong>,
      code: (props: any) => <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200 text-sm">{props.children}</code>,
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-6xl rounded-2xl border border-amber-400 bg-[#18181c] shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="PMOMax User Guide"
        style={{ minHeight: '70vh', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-amber-400 bg-black/40 rounded-t-2xl">
          <div className="text-2xl font-extrabold text-amber-400 tracking-tight">PMOMax User Guide</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-amber-400 bg-black/30 px-4 py-2 text-base text-amber-200 hover:bg-black/50 font-bold"
          >
            Close
          </button>
        </div>
        {/* Main content with always-visible TOC and scrollable info */}
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden flex-col md:flex-row">
          {/* TOC (stacked on mobile, side-by-side on md+) */}
          <nav className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-amber-400 bg-black/30 p-4 md:p-5 flex flex-col gap-2 overflow-y-auto" style={{ minHeight: '0' }}>
            <div className="text-xs font-bold text-amber-300 tracking-wide mb-2">QUICK LINKS</div>
            <a className="text-amber-300 hover:underline" href="#introduction">Introduction</a>
            <a className="text-amber-300 hover:underline" href="#features">Features</a>
            <a className="text-amber-300 hover:underline" href="#how-to-use">How to Use</a>
            <a className="text-amber-300 hover:underline" href="#faq">FAQ</a>
            <a className="text-amber-300 hover:underline" href="#contact">Contact</a>
          </nav>
          {/* Info content (scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-transparent" style={{ minHeight: 0 }}>
            <div className="prose prose-invert max-w-none">
              <SafeMarkdown components={mdComponents as any}>
                {USER_MANUAL_MARKDOWN}
              </SafeMarkdown>
            </div>
          </div>
        </div>
        {/* Bottom close button */}
        <div className="flex justify-end p-4 border-t border-amber-400 bg-black/40 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-amber-400 bg-black/30 px-6 py-2 text-base text-amber-200 hover:bg-black/50 font-bold"
          >
            Close
          </button>
        </div>
        <div className="px-4 pb-2 text-xs text-brand-muted text-center">
          Tip: Use <span className="font-semibold text-amber-200">Load Demo</span> to see a fully-populated PID and working navigation instantly.
        </div>
      </div>
    </div>
  );
};

export default UserGuideModal;
