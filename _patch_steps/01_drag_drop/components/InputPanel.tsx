// components/InputPanel.tsx
import React, { useRef, useState } from 'react';
import { fileToText } from '../lib/fileToText';

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
    setInputText('');
    setLastSource(null);
    setLastError(null);
    // Always trigger full app reset
    if (typeof onClearAll === 'function') {
      onClearAll();
    }
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Make uploads behave like "Reset + Upload" so state is always clean.
    handleReset();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'doc') {
      setLastError('Legacy .doc files are not supported. Please upload DOCX, PDF, TXT, or CSV.');
      return;
    }
    setIsParsing(true);
    let text = '';
    try {
      try {
        text = await fileToText(file);
      } catch (e: any) {
        setLastError(e?.message || 'Could not read that file.');
        return;
      }
      // Require only that some readable text was extracted; allow structured/table uploads
      if (!text || !text.trim()) {
        setLastError('Could not extract readable text from that file. Try a different format or paste plain text.');
        return;
      }
      // Always clear previous data and show new content
      setInputText(text);
      setLastSource('upload');
      setIsParsing(true);
      try {
        await onParse('upload', { fileName: file.name, text });
      } catch (parseErr: any) {
        setLastError(parseErr?.message || 'Failed to parse document.');
      } finally {
        setIsParsing(false);
      }
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDroppedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      setIsParsing(true);
      setLastError(null);
      const extractedText = await fileToText(file);
      setInputText(extractedText);
      setLastSource('file');
      await onParse({ type: 'text', text: extractedText }, { source: 'file', filename: file.name });
    } catch (err: any) {
      console.error(err);
      setLastError(err?.message || 'Failed to parse file.');
    } finally {
      setIsParsing(false);
      setIsDragOver(false);
    }
  };

  const handleCreate = () => {
    // Only open create mode, do not reset state here
    if (setIsCreateMode) {
      setIsCreateMode(true);
    }
    if (onCreateMode) {
      onCreateMode();
    }
  };

  const canParse = !!inputText.trim();

  return (
		<div className="rounded-2xl border border-amber-300/70 bg-black/80 p-4 shadow-lg flex flex-col gap-3" style={{ boxShadow: '0 0 0 1px rgba(251,191,36,0.55), 0 2px 12px #0006', position: 'relative' }}>
      {(isParsing || isLoading) && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
        >
          <div
            className="mb-4 animate-bounce"
            style={{ pointerEvents: 'none' }}
          >
            <img
              src="/logos/pmomax_logo.png"
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-amber-300 tracking-wide">INPUT</span>
      </div>
      <label className="block text-base font-semibold text-white mb-1" htmlFor="input-panel-textarea">Paste PID text or upload a document (word, pdf, text, markdown, spreadsheet)</label>
      <textarea
        id="input-panel-textarea"
        className={`w-full min-h-[96px] rounded-xl border-2 border-dashed border-white/70 bg-black px-3 py-2 text-base text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-amber-400/70 ${isDragOver ? 'ring-2 ring-amber-400/80' : ''}`}
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          setLastSource('paste');
          setLastError(null); // Clear error on new input
        }}
        placeholder="Paste here, drop a file, or click Upload File (below)..."
        aria-label="Paste PID or requirements document"
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
      <div className="flex flex-wrap gap-3 mt-2 items-center justify-start">
        {/* Parse */}
        <button
          type="button"
          onClick={async () => {
            setLastError(null);
            if (!inputText.trim()) {
              setLastError('Please paste or upload some text to parse.');
              return;
            }
            if (isGibberish(inputText)) {
              setLastError('That text does not look readable. Please paste plain text or upload a supported file.');
              return;
            }
            // Always clear previous data and show new content
            setIsParsing(true);
            try {
              await onParse(lastSource || 'paste', { text: inputText });
            } catch (err: any) {
              setLastError(err?.message || 'Failed to parse document.');
            } finally {
              setIsParsing(false);
            }
          }}
          className="pmomax-gold-button px-5 py-2 text-base font-semibold shadow-md transition-transform duration-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isParsing || isLoading || !canParse}
        >
          {isParsing || isLoading ? 'Parsing…' : 'Parse'}
        </button>
        {/* Clear */}
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl px-5 py-2 text-base font-medium bg-red-600 text-white border border-red-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400/70"
        >
          Reset
        </button>
        {/* Create */}
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-xl px-5 py-2 text-base font-medium bg-amber-600 text-white border border-amber-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-amber-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/70"
        >
          Create
        </button>
        {/* Upload */}
        <label className="rounded-xl px-5 py-2 text-base font-medium bg-sky-600 text-white border border-sky-400 shadow-sm cursor-pointer flex items-center gap-2 mb-0 transition-transform duration-100 active:scale-95 hover:bg-sky-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/70">
          <span>Upload file</span>
          <input
            type="file"
            accept=".pdf,.txt,.docx,.xls,.xlsx,.csv,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/msword"
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
                setIsParsing(true);
                await onLoadDemo();
              } finally {
                setIsParsing(false);
              }
            }}
            disabled={isLoading || isParsing}
            className="rounded-xl px-5 py-2 text-base font-medium bg-violet-600 text-white border border-violet-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-violet-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/70 disabled:opacity-50 disabled:cursor-not-allowed"
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
