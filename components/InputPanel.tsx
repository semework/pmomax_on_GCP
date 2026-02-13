// components/InputPanel.tsx
import React, { useRef, useState } from 'react';
import { PMOMaxIcon } from './Icons';
import { fileToText, processInChunks } from '../lib/fileToText';
import { safeErrorMessage } from '../lib/safeError';
import { INPUT_ACCEPT, SUPPORTED_LABEL, MAX_PAGES } from '../lib/supportedFormats';

interface InputPanelProps {
  onParse: (source: any, options: any) => Promise<void>;
  isLoading: boolean;
  onLoadDemo?: () => Promise<void> | void;
  setIsCreateMode?: (flag: boolean) => void;
  onCreateMode?: () => void;
  onClearAll: () => void;
  // Optional help callback (wired from LeftSidebar)
  onHelp?: (context?: string) => void;
  // Export-related props
  onExportPdf?: () => Promise<void> | void;
  onExportWord?: () => Promise<void> | void;
  onExportZip?: () => Promise<void> | void;
  onExportJson?: () => Promise<void> | void;
  isExporting?: boolean;
  exportError?: string | null;
  hasParsedPid?: boolean;
}

type LastSource = 'paste' | 'upload' | null;

export const InputPanel: React.FC<InputPanelProps> = ({
  onParse,
  isLoading,
  onLoadDemo,
  setIsCreateMode,
  onCreateMode,
  onClearAll,
  onHelp,
}) => {
  const [inputText, setInputText] = useState('');
  const [lastSource, setLastSource] = useState<LastSource>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // AbortController for canceling in-flight actions
  const abortControllerRef = useRef<AbortController | null>(null);
  const formatErr = (e: any) => safeErrorMessage(e);
  const looksBinary = (text: string): boolean => {
    const s = (text || '').slice(0, 4000);
    if (!s) return true;
    let np = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c === 0) return true;
      if (c < 9 || (c > 13 && c < 32)) np++;
    }
    return np / Math.max(1, s.length) > 0.15;
  };

  const isGibberish = (text: string): boolean => {
    const t = (text || '').trim();
    if (!t || looksBinary(t)) return true;
    const s = t.slice(0, 5000);
    const letters = (s.match(/[A-Za-z]/g) || []).length;
    const spaces = (s.match(/\s/g) || []).length;
    return letters < 10 && spaces < 10;
  };
  // Behavior:
  // - Uploaded files auto-parse inside handleFileChange.
  // - Pasted text only parses when the user clicks the Parse button.

  const handleReset = () => {
    // Abort any in-flight fetches or parsing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setInputText('');
    setLastSource(null);
    setLastError(null);
    setIsParsing(false);
    // Always trigger full app reset
    if (typeof onClearAll === 'function') {
      onClearAll();
    }
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    handleReset();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    // IMPORTANT: Do NOT require the user to press Reset before a new task.
    // Uploads should immediately parse and replace the current PID state.
    setLastError(null);
    if (setIsCreateMode) setIsCreateMode(false);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'doc') {
      setLastError('Legacy .doc files are not supported. Please upload DOCX, PDF, TXT, or CSV.');
      return;
    }
    setIsParsing(true);
    abortControllerRef.current = new AbortController();
    let text = '';
    let parseWarnings: string[] = [];
    try {
      try {
        const result = await fileToText(file);
        text = result.text;
        parseWarnings = result.warnings || [];
      } catch (e: any) {
        if (abortControllerRef.current?.signal.aborted) return;
        setLastError(formatErr(e) || 'Could not read that file.');
        return;
      }
      // Require only that some readable text was extracted; allow structured/table uploads
      if (!text || !text.trim()) {
        const fallback = await processInChunks(file);
        text = fallback.text;
        parseWarnings = [...parseWarnings, ...(fallback.warnings || [])];
      }
      // Always clear previous data and show new content
      setInputText(''); // Do not show file text in paste area
      setLastSource('upload');
      setIsParsing(true);
      try {
        await onParse('upload', { fileName: file.name, text, warnings: parseWarnings, signal: abortControllerRef.current?.signal });
      } catch (parseErr: any) {
        if (abortControllerRef.current?.signal.aborted) return;
        // Handle 429 error
        if (parseErr?.message && parseErr.message.includes('429')) {
          setLastError('Too many requests. Please wait a moment and try again.');
        } else {
          setLastError(formatErr(parseErr) || 'Failed to parse document.');
        }
      } finally {
        setIsParsing(false);
      }
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      abortControllerRef.current = null;
    }
  };

  const handleDroppedFiles = async (files: FileList | null) => {
    handleReset();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      setIsParsing(true);
      setLastError(null);
      abortControllerRef.current = new AbortController();
      if (setIsCreateMode) setIsCreateMode(false);
      const result = await fileToText(file);
      const extractedText = result.text;
      setInputText(''); // Do not show dropped file text in paste area
      setLastSource('upload');
      await onParse('upload', { fileName: file.name, text: extractedText, warnings: result.warnings || [], signal: abortControllerRef.current.signal });
    } catch (err: any) {
      if (abortControllerRef.current?.signal.aborted) return;
      setLastError(formatErr(err) || '');
    } finally {
      setIsParsing(false);
      setIsDragOver(false);
      abortControllerRef.current = null;
    }
  };

  const handleCreate = async () => {
    handleReset();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Only open create mode, do not reset state here
    setLastError(null);
    try {
      abortControllerRef.current = new AbortController();
      console.log('[InputPanel] Create button clicked');
      if (setIsCreateMode) {
        try {
          setIsCreateMode(true);
        } catch (e) {
          // defensive: ignore if setter throws for some reason
          console.error('setIsCreateMode failed', e);
        }
      }
      if (onCreateMode) {
        // Allow onCreateMode to be async and catch errors
        console.log('[InputPanel] calling onCreateMode');
        await Promise.resolve(onCreateMode());
      }
    } catch (err: any) {
      console.error('onCreateMode failed', err);
      setLastError(formatErr(err) || 'Failed to enter Create mode.');
    }
  };

  const canParse = !!inputText.trim();

  // Helper for parse button (pasted text)
  const handleParse = async () => {
    setLastError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLastError(null);
    if (!inputText.trim()) {
      setLastError('Please paste or upload some text to parse.');
      return;
    }
    if (isGibberish(inputText)) {
      setLastError('That text does not look readable. Please paste plain text or upload a supported file.');
      return;
    }
    setIsParsing(true);
    abortControllerRef.current = new AbortController();
    try {
      await onParse(lastSource || 'paste', { text: inputText, signal: abortControllerRef.current.signal });
    } catch (err: any) {
      if (abortControllerRef.current?.signal.aborted) return;
      // Handle 429 error
      if (err?.message && err.message.includes('429')) {
        setLastError('Too many requests. Please wait a moment and try again.');
      } else {
        setLastError(formatErr(err) || 'Failed to parse document.');
      }
    } finally {
      setIsParsing(false);
      abortControllerRef.current = null;
    }
  };
  return (
    <div className="rounded-2xl border border-amber-300/70 bg-black/80 p-3 shadow-lg flex flex-col gap-2" style={{ boxShadow: '0 0 0 1px rgba(251,191,36,0.55), 0 2px 12px #0006', position: 'relative' }}>
      {(isParsing || isLoading) && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
        >
          <div
            className="mb-4 animate-bounce"
            style={{ pointerEvents: 'none' }}
          >
            <PMOMaxIcon
              alt="PMOMax"
              style={{ width: 120, height: 120, boxShadow: '0 0 24px #fbbf24' }}
            />
          </div>
          <div
            className="text-amber-300 font-extrabold animate-pulse text-center"
            style={{ fontSize: '2.2rem', lineHeight: '1.1', textShadow: '0 2px 18px #fbbf24, 0 0 2px #000' }}
          >
            AI is architecting…
          </div>
        </div>
      )}
      {lastError && (
        <div className="mb-2 p-3 rounded-xl bg-red-900/80 text-red-200 font-bold border border-red-400 text-base shadow">
          {lastError}
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg font-bold text-amber-300 tracking-wide">INPUT</span>
      </div>
      <label className="block text-base font-semibold text-white mb-1" htmlFor="input-panel-textarea">
        Paste, drop, upload, or create a Project Initiation Document (PID)
      </label>
      <div className="text-xs text-amber-200 mb-1">
        <strong>Supported:</strong> DOCX, PDF, TXT, MD, CSV, XLS/XLSX. <strong>Options:</strong> Paste, drop, upload, create, or load example. <strong>Tip:</strong> Recommended ≤20 pages (hard limit {MAX_PAGES}).
      </div>
      <textarea
        id="input-panel-textarea"
        rows={3}
        className={`w-full min-h-[72px] rounded-xl border-2 border-dashed border-white/70 bg-black px-3 py-2 text-base text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-amber-400/70 ${isDragOver ? 'ring-2 ring-amber-400/80' : ''}`}
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          setLastSource('paste');
          setLastError(null); // Clear error on new input
        }}
        placeholder="Paste PID text, drop a file, upload (DOCX, PDF, TXT, MD, CSV, XLS/XLSX), create from scratch, or load an example."
        aria-label="Paste, drop, upload, or create a PID document"
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDragOver) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          handleDroppedFiles(e.dataTransfer?.files || null);
        }}
      />
      {/* Action buttons: wrap (no horizontal scroll) so all controls stay visible */}
      <div className="flex flex-col md:flex-row flex-wrap gap-2 mt-1 items-center justify-start">
          {/* Parse */}
        <button
          type="button"
          onClick={handleParse}
          className="pmomax-gold-button px-5 py-2 text-base font-semibold shadow-md transition-transform duration-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed md:whitespace-nowrap w-full md:w-auto"
          disabled={isParsing || isLoading || !canParse}
        >
          {isParsing || isLoading ? 'Parsing…' : 'Parse'}
        </button>
        {/* Clear */}
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl px-5 py-2 text-base font-medium bg-red-600 text-white border border-red-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400/70 md:whitespace-nowrap w-full md:w-auto"
        >
          Reset
        </button>
        {/* Create */}
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-xl px-5 py-2 text-base font-medium bg-amber-600 text-white border border-amber-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-amber-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/70 md:whitespace-nowrap w-full md:w-auto"
          disabled={isParsing || isLoading}
        >
          Create
        </button>
        {/* Upload */}
        <label className="rounded-xl px-5 py-2 text-base font-medium bg-sky-600 text-white border border-sky-400 shadow-sm cursor-pointer flex items-center gap-2 mb-0 transition-transform duration-100 active:scale-95 hover:bg-sky-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/70 md:whitespace-nowrap w-full md:w-auto">
          <span>Upload file</span>
          <input
            type="file"
            accept={INPUT_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
        </label>
        {/* Uploaded files auto-parse; pasted text parses only when you click Parse */}
        {/* Load Demo */}
        {onLoadDemo && (
          <button
            type="button"
            onClick={async () => {
              if (isLoading || isParsing) return;
              try {
                setLastError(null);
                setIsParsing(true);
                await onLoadDemo();
              } finally {
                setIsParsing(false);
              }
            }}
            disabled={isLoading || isParsing}
            className="rounded-xl px-5 py-2 text-base font-medium bg-violet-600 text-white border border-violet-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-violet-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/70 disabled:opacity-50 disabled:cursor-not-allowed md:whitespace-nowrap w-full md:w-auto"
            title="Load a complete example PID (demo)"
            aria-label="Load Demo PID"
          >
            {isLoading || isParsing ? 'Loading…' : 'Load Demo'}
          </button>
        )}
      </div>
    </div>
  );
};

export default InputPanel;
