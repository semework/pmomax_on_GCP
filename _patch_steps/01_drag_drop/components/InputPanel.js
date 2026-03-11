import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/InputPanel.tsx
import { useRef, useState } from 'react';
import { fileToText } from '../lib/fileToText';
export const InputPanel = ({ onParse, isLoading, onLoadDemo, setIsCreateMode, onCreateMode, onClearAll, onHelp, }) => {
    const [inputText, setInputText] = useState('');
    const [lastSource, setLastSource] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [lastError, setLastError] = useState(null);
    const fileInputRef = useRef(null);
    const looksBinary = (text) => {
        const s = (text || '').slice(0, 4000);
        if (!s)
            return true;
        let np = 0;
        for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i);
            if (c === 0)
                return true;
            if (c < 9 || (c > 13 && c < 32))
                np++;
        }
        return np / Math.max(1, s.length) > 0.15;
    };
    const isGibberish = (text) => {
        const t = (text || '').trim();
        if (!t || looksBinary(t))
            return true;
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
    const handleFileChange = async (event) => {
        var _a, _b;
        const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        // Make uploads behave like "Reset + Upload" so state is always clean.
        handleReset();
        const ext = ((_b = file.name.split('.').pop()) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
        if (ext === 'doc') {
            setLastError('Legacy .doc files are not supported. Please upload DOCX, PDF, TXT, or CSV.');
            return;
        }
        setIsParsing(true);
        let text = '';
        try {
            try {
                text = await fileToText(file);
            }
            catch (e) {
                setLastError((e === null || e === void 0 ? void 0 : e.message) || 'Could not read that file.');
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
            }
            catch (parseErr) {
                setLastError((parseErr === null || parseErr === void 0 ? void 0 : parseErr.message) || 'Failed to parse document.');
            }
            finally {
                setIsParsing(false);
            }
        }
        finally {
            setIsParsing(false);
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
    };
    const handleDroppedFiles = async (files) => {
        if (!files || files.length === 0)
            return;
        const file = files[0];
        try {
            setIsParsing(true);
            setLastError(null);
            const extractedText = await fileToText(file);
            setInputText(extractedText);
            setLastSource('file');
            await onParse({ type: 'text', text: extractedText }, { source: 'file', filename: file.name });
        }
        catch (err) {
            console.error(err);
            setLastError((err === null || err === void 0 ? void 0 : err.message) || 'Failed to parse file.');
        }
        finally {
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
    return (_jsxs("div", { className: "rounded-2xl border border-amber-300/70 bg-black/80 p-4 shadow-lg flex flex-col gap-3", style: { boxShadow: '0 0 0 1px rgba(251,191,36,0.55), 0 2px 12px #0006', position: 'relative' }, children: [(isParsing || isLoading) && (_jsxs("div", { className: "fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none", children: [_jsx("div", { className: "mb-4 animate-bounce", style: { pointerEvents: 'none' }, children: _jsx("img", { src: "/logos/pmomax_logo.png", alt: "PMOMax", style: { width: 120, height: 120, boxShadow: '0 0 24px #fbbf24' } }) }), _jsx("div", { className: "text-amber-300 font-extrabold animate-pulse text-center", style: { fontSize: '2.2rem', lineHeight: '1.1', textShadow: '0 2px 18px #fbbf24, 0 0 2px #000' }, children: "AI is architecting\u2026" })] })), lastError && (_jsx("div", { className: "mb-2 p-3 rounded-xl bg-red-900/80 text-red-200 font-bold border border-red-400 text-base shadow", children: lastError })), _jsx("div", { className: "flex items-center justify-between mb-2", children: _jsx("span", { className: "text-lg font-bold text-amber-300 tracking-wide", children: "INPUT" }) }), _jsx("label", { className: "block text-base font-semibold text-white mb-1", htmlFor: "input-panel-textarea", children: "Paste PID text or upload a document (word, pdf, text, markdown, spreadsheet)" }), _jsx("textarea", { id: "input-panel-textarea", className: `w-full min-h-[96px] rounded-xl border-2 border-dashed border-white/70 bg-black px-3 py-2 text-base text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-amber-400/70 ${isDragOver ? 'ring-2 ring-amber-400/80' : ''}`, value: inputText, onChange: (e) => {
                    setInputText(e.target.value);
                    setLastSource('paste');
                    setLastError(null); // Clear error on new input
                }, placeholder: "Paste here, drop a file, or click Upload File (below)...", "aria-label": "Paste PID or requirements document", onDragOver: (e) => {
                    e.preventDefault();
                    if (!isDragOver)
                        setIsDragOver(true);
                }, onDragLeave: () => setIsDragOver(false), onDrop: (e) => {
                    var _a;
                    e.preventDefault();
                    handleDroppedFiles(((_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files) || null);
                } }), _jsxs("div", { className: "flex flex-wrap gap-3 mt-2 items-center justify-start", children: [_jsx("button", { type: "button", onClick: async () => {
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
                            }
                            catch (err) {
                                setLastError((err === null || err === void 0 ? void 0 : err.message) || 'Failed to parse document.');
                            }
                            finally {
                                setIsParsing(false);
                            }
                        }, className: "pmomax-gold-button px-5 py-2 text-base font-semibold shadow-md transition-transform duration-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed", disabled: isParsing || isLoading || !canParse, children: isParsing || isLoading ? 'Parsing…' : 'Parse' }), _jsx("button", { type: "button", onClick: handleReset, className: "rounded-xl px-5 py-2 text-base font-medium bg-red-600 text-white border border-red-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400/70", children: "Reset" }), _jsx("button", { type: "button", onClick: handleCreate, className: "rounded-xl px-5 py-2 text-base font-medium bg-amber-600 text-white border border-amber-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-amber-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/70", children: "Create" }), _jsxs("label", { className: "rounded-xl px-5 py-2 text-base font-medium bg-sky-600 text-white border border-sky-400 shadow-sm cursor-pointer flex items-center gap-2 mb-0 transition-transform duration-100 active:scale-95 hover:bg-sky-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/70", children: [_jsx("span", { children: "Upload file" }), _jsx("input", { type: "file", accept: ".pdf,.txt,.docx,.xls,.xlsx,.csv,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/msword", className: "hidden", onChange: handleFileChange, ref: fileInputRef })] }), onLoadDemo && (_jsx("button", { type: "button", onClick: async () => {
                            if (isLoading || isParsing)
                                return;
                            try {
                                setIsParsing(true);
                                await onLoadDemo();
                            }
                            finally {
                                setIsParsing(false);
                            }
                        }, disabled: isLoading || isParsing, className: "rounded-xl px-5 py-2 text-base font-medium bg-violet-600 text-white border border-violet-400 shadow-sm transition-transform duration-100 active:scale-95 hover:bg-violet-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/70 disabled:opacity-50 disabled:cursor-not-allowed", title: "Load a complete example PID (demo)", "aria-label": "Load Demo PID", children: isLoading || isParsing ? 'Loading…' : 'Load Demo' }))] })] }));
};
export default InputPanel;
