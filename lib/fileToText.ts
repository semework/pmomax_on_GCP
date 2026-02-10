// lib/fileToText.ts
// Utility to extract readable text from various file types (txt, md, csv, docx, pdf, xls/xlsx)
import * as XLSX from 'xlsx';
import { MAX_WORDS, MAX_PAGES, INTERNAL_MAX_PAGES, INTERNAL_MAX_WORDS } from './supportedFormats';
import { safeErrorMessage } from './safeError';
import { normalizeError } from './errorTools';

export type FileTextResult = { text: string; warnings: string[]; truncated: boolean };

function looksBinary(text: string): boolean {
  const s = (text || '').slice(0, 4000);
  if (!s) return true;
  let np = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0) return true;
    if (c < 9 || (c > 13 && c < 32)) np++;
  }
  return np / Math.max(1, s.length) > 0.15;
}

function normalizeExtractedText(text: string): string {
  const raw = String(text || '');
  if (!raw) return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[-–—_]{3,}/g, ' ')
    .replace(/[|•·]{3,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNearEmptyText(text: string): boolean {
  const cleaned = normalizeExtractedText(text);
  if (!cleaned) return true;
  const alphaNum = (cleaned.match(/[A-Za-z0-9]/g) || []).length;
  if (cleaned.length >= 200 && alphaNum >= 60) return false;
  if (cleaned.length < 80) return true;
  if (cleaned.length < 200 && alphaNum < 60) return true;
  return false;
}

function decodeTextBuffer(buffer: ArrayBuffer): string {
  // Canonical decode for text buffers (matches server)
  if (!buffer) return '';
  try {
    const arr = new Uint8Array(buffer);
    if (arr.length >= 2) {
      const b0 = arr[0];
      const b1 = arr[1];
      if (b0 === 0xff && b1 === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
      if (b0 === 0xfe && b1 === 0xff) {
        // Swap bytes for utf-16be
        const swapped = new Uint8Array(arr.length);
        for (let i = 0; i < arr.length - 1; i += 2) {
          swapped[i] = arr[i + 1];
          swapped[i + 1] = arr[i];
        }
        return new TextDecoder('utf-16le').decode(swapped);
      }
      if (arr.length >= 3 && b0 === 0xef && b1 === 0xbb && arr[2] === 0xbf) {
        return new TextDecoder('utf-8').decode(buffer);
      }
    }
    return new TextDecoder('utf-8').decode(buffer);
  } catch {
    return '';
  }
}

function capWords(text: string, maxWords: number): { text: string; truncated: boolean } {
  const safe = String(text ?? '');
  const words = safe.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text: safe, truncated: false };
  const capped = words.slice(0, maxWords).join(' ');
  return {
    text: capped,
    truncated: true,
  };
}

function withWordCap(text: string): FileTextResult {
  // Use internal cap for all formats
  const capped = capWords(text, INTERNAL_MAX_WORDS);
  // No truncation warnings or notes in output
  return { text: capped.text, warnings: [], truncated: capped.truncated };
}

async function docxToTextServer(file: File): Promise<FileTextResult> {
  const formData = new FormData();
  formData.append('file', file);
  let response: Response;
  try {
    response = await fetch('/api/parse-docx', { method: 'POST', body: formData });
  } catch {
    throw new Error('DOCX upload failed. Please try again.');
  }
  if (!response.ok) {
    let detail = '';
    try {
      const data: any = await response.json();
      if (data && typeof data === 'object') {
        if (typeof data.error === 'string') detail = data.error;
        else if (data.error && typeof data.error.message === 'string') detail = data.error.message;
        else if (typeof data.errorMessage === 'string') detail = data.errorMessage;
        else detail = JSON.stringify(data);
      }
    } catch {
      detail = await response.text().catch(() => '');
    }
    const suffix = detail ? `: ${String(detail).slice(0, 300)}` : '';
    throw new Error(`Failed to parse DOCX${suffix}`);
  }
  const out = await response.text();
  if (!out || looksBinary(out)) throw new Error('Failed to parse DOCX');
  return withWordCap(out);
}

async function ensureNonEmpty(result: FileTextResult, file: File): Promise<FileTextResult> {
  const safeText = String(result?.text ?? '');
  if (!isNearEmptyText(safeText)) return { ...result, text: safeText };
  if (typeof window !== 'undefined') {
    try {
      const server = await parseViaServer(file);
      const serverText = String(server?.text ?? '');
      if (!isNearEmptyText(serverText)) return { ...server, text: serverText };
    } catch {
      // fall through to error
    }
  }
  const fallbackText = `[No extractable text] ${file?.name || 'Unsupported file'}\n\nIf this document is scanned, run OCR and try again.`;
  const fallbackWarning = 'Text extraction returned empty content; continuing with a placeholder.';
  return {
    text: fallbackText,
    warnings: [...(result?.warnings || []), fallbackWarning],
    truncated: Boolean(result?.truncated),
  };
}

async function parseViaServer(file: File): Promise<FileTextResult> {
  const formData = new FormData();
  formData.append('file', file);
  let response: Response;
  try {
    response = await fetch('/api/extract/start', { method: 'POST', body: formData });
  } catch (err) {
    throw new Error(normalizeError(err).message || 'Server parse failed');
  }
  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    const preview = text ? ` ${String(text).slice(0, 200)}` : '';
    throw new Error(`Server Error: Malformed Response.${preview}`);
  }
  try {
    data = await response.json();
  } catch {
    throw new Error('Server Error: Malformed Response.');
  }
  if (!response.ok || !data?.ok) {
    const msg = data?.error?.message || data?.errorMessage || response.statusText || 'Server parse failed';
    throw new Error(msg);
  }
  const jobId = String(data?.jobId || '').trim();
  if (!jobId) throw new Error('Server parse failed: missing job id.');

  const pollIntervalMs = 2000;
  const maxWaitMs = 5 * 60 * 1000;
  const startMs = Date.now();
  let statusData: any = null;

  while (Date.now() - startMs < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    let statusRes: Response;
    try {
      statusRes = await fetch(`/api/extract/status/${encodeURIComponent(jobId)}`);
    } catch (err) {
      throw new Error(normalizeError(err).message || 'Server status check failed');
    }
    const statusContentType = statusRes.headers.get('content-type') || '';
    if (!statusContentType.includes('application/json')) {
      const text = await statusRes.text().catch(() => '');
      const preview = text ? ` ${String(text).slice(0, 200)}` : '';
      throw new Error(`Server Error: Malformed Response.${preview}`);
    }
    try {
      statusData = await statusRes.json();
    } catch {
      throw new Error('Server Error: Malformed Response.');
    }
    if (!statusRes.ok || !statusData?.ok) {
      const msg = statusData?.error?.message || statusData?.errorMessage || statusRes.statusText || 'Server parse failed';
      throw new Error(msg);
    }
    if (statusData?.status === 'failed') {
      const msg = statusData?.error || 'Server parse failed';
      throw new Error(msg);
    }
    if (statusData?.status === 'completed') break;
  }

  if (!statusData || statusData?.status !== 'completed') {
    throw new Error('Server parse timed out. Please try again.');
  }
  const baseText = String(statusData?.text || '').trim();
  const warnings = Array.isArray(statusData?.warnings)
    ? statusData.warnings.map((w: any) => String(w)).filter(Boolean)
    : [];
  const truncated = Boolean(statusData?.truncated);
  const capped = withWordCap(baseText);
  return {
    text: capped.text,
    warnings: [...warnings, ...capped.warnings],
    truncated: truncated || capped.truncated,
  };
}

export async function processInChunks(file: File): Promise<FileTextResult> {
  try {
    const server = await parseViaServer(file);
    return await ensureNonEmpty(server, file);
  } catch {
    return await ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);
  }
}

async function docxToTextClient(file: File): Promise<FileTextResult> {
  // Mammoth browser build (only if installed); fallback if server endpoint is unavailable.
  const buf = await file.arrayBuffer();
  // Try local lib wordToText first (keeps logic consistent with other lib helpers)
  try {
    const mod: any = await import('./wordToText');
    const fn = mod?.wordToText || mod?.default || mod;
    if (typeof fn === 'function') {
      const text = await fn(new Uint8Array(buf));
      const out = (text || '').trim();
      if (!out || looksBinary(out)) throw new Error('Failed to parse DOCX');
      return withWordCap(out);
    }
  } catch (e) {
    // ignore and fallback to browser mammoth
  }

  let mammoth: any = null;
  try {
    const mod: any = await import('mammoth/mammoth.browser.js');
    mammoth = mod?.default ?? mod;
  } catch {
    const mod: any = await import('mammoth/mammoth.browser');
    mammoth = mod?.default ?? mod;
  }
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  const out = (value || '').trim();
  if (!out || looksBinary(out)) throw new Error('Failed to parse DOCX');
  return withWordCap(out);
}

export async function fileToText(file: File): Promise<FileTextResult> {
  try {
    const name = file?.name || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    const supportedExts = new Set(['pdf', 'docx', 'txt', 'md', 'csv', 'xls', 'xlsx']);

    if (!file || typeof file.size !== 'number') {
      return { text: `[Empty file] ${name || 'Unnamed file'}`.trim(), warnings: [], truncated: false };
    }

    if (file.size === 0) {
      return { text: `[Empty file] ${name || 'Unnamed file'}`.trim(), warnings: [], truncated: false };
    }

    const SERVER_FALLBACK_BYTES = 900_000;
    const SOFT_WARN_BYTES = 250_000;

    if (file && typeof file.size === 'number' && file.size > 25_000_000) {
      console.warn('[fileToText] Large file detected; parsing may take longer.');
    }

    // DOCX: prefer server (more consistent), then fallback to browser mammoth
    if (ext === 'docx') {
      let lastErr: any = null;
      try {
        const result = isBrowser ? await docxToTextServer(file) : { text: '', warnings: [], truncated: false };
        if (!result.text || looksBinary(result.text)) throw new Error('DOCX parse returned empty or binary.');
        return await ensureNonEmpty(result, file);
      } catch (e) {
        lastErr = e;
        try {
          if (isBrowser && file.size > SERVER_FALLBACK_BYTES) {
            return await ensureNonEmpty(await parseViaServer(file), file);
          }
          const result = isBrowser
            ? await docxToTextClient(file)
            : withWordCap(await (await import('./wordToText')).wordToText(await file.arrayBuffer()));
          if (!result.text || looksBinary(result.text)) throw new Error('DOCX parse (client) returned empty or binary.');
          return await ensureNonEmpty(result, file);
        } catch (err) {
          lastErr = err;
          if (supportedExts.has(ext)) {
            return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);
          }
          // Defensive fallback: return a safe placeholder string instead of throwing
          const fallback = `[No extractable text] DOCX file. If this document is scanned or image-based, run OCR and try again.`;
          console.error('[fileToText] DOCX extraction error:', normalizeError(lastErr).message);
          return ensureNonEmpty({ text: fallback, warnings: ['DOCX extraction failed; using placeholder.'], truncated: false }, file);
        }
      }
    }

    // PDF
    if (ext === 'pdf') {
      try {
        if (isBrowser) {
          try {
            return await ensureNonEmpty(await parseViaServer(file), file);
          } catch (serverErr) {
            const tooLargeForClient = file.size > SOFT_WARN_BYTES;
            if (tooLargeForClient) {
              return ensureNonEmpty({ text: '', warnings: ['PDF parsing fell back to placeholder.'], truncated: false }, file);
            }
            console.warn('[fileToText] PDF server parse failed, falling back to client parser.', serverErr);
          }
        }

        let pdfToText;
        try {
          pdfToText = (await import('./pdfToText')).pdfToText;
        } catch (importErr) {
          if (!isBrowser) {
            return { text: `[PDF parse skipped: unavailable in this environment] ${name || 'Unnamed file'}`.trim(), warnings: [], truncated: false };
          }
          throw new Error('PDF parsing is not available in this environment. Please ensure pdfjs-dist is installed and supported.');
        }
        if (isBrowser && file.size > SERVER_FALLBACK_BYTES) {
          return await ensureNonEmpty(await parseViaServer(file), file);
        }
        const out = await pdfToText(file);
        if (!out || looksBinary(out)) throw new Error('PDF parse returned empty or binary.');
        return await ensureNonEmpty(withWordCap(out), file);
      } catch (err) {
        const msg = normalizeError(err).message || 'Failed to parse PDF.';
        if (isBrowser && (msg.toLowerCase().includes('fallback to server') || file.size > SOFT_WARN_BYTES)) {
          return await ensureNonEmpty(await parseViaServer(file), file);
        }
        if (supportedExts.has(ext)) {
          return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);
        }
        // Defensive fallback: return a safe placeholder string instead of throwing
        const fallback = `[No extractable text] PDF file. If this document is scanned or image-based, run OCR and try again.`;
        console.error('[fileToText] PDF extraction error:', msg);
        return ensureNonEmpty({ text: fallback, warnings: ['PDF extraction failed; using placeholder.'], truncated: false }, file);
      }
    }

    // CSV parsing
    if (ext === 'csv') {
      // Prefer client-side reading for CSV to avoid server-side false negatives.
      // (Server parsing is still used as a fallback for unusual encodings.)
      try {
        const raw = await file.text();
        const text = String(raw || '').trim();
        if (text.length > 0) {
          const truncated = text.length > MAX_CHARS;
          const clipped = truncated ? text.slice(0, MAX_CHARS) : text;
          return ensureNonEmpty(
            {
              text: withWordCap(clipped),
              warnings: truncated ? ['CSV text was truncated for client preview.'] : [],
              truncated,
            },
            file,
          );
        }
      } catch {
        // fall through to server
      }

      if (isBrowser) {
        try {
          return await ensureNonEmpty(await parseViaServer(file), file);
        } catch (serverErr) {
          console.warn('CSV server parse failed, falling back to empty text:', serverErr);
          return ensureNonEmpty({ text: '', warnings: ['CSV parsing failed.'], truncated: false }, file);
        }
      }

      return ensureNonEmpty({ text: '', warnings: ['CSV parsing not available in this environment.'], truncated: false }, file);
    }

    // Spreadsheet (XLS/XLSX) -> CSV text
    if (ext === 'xls' || ext === 'xlsx') {
      if (file.size === 0) return { text: 'Spreadsheet is empty.', warnings: [], truncated: false };
      let lastErr: any = null;
      try {
        if (isBrowser) {
          try {
            return await ensureNonEmpty(await parseViaServer(file), file);
          } catch (serverErr) {
            if (file.size > SOFT_WARN_BYTES) {
              return ensureNonEmpty({ text: '', warnings: ['Spreadsheet parsing fell back to placeholder.'], truncated: false }, file);
            }
            console.warn('[fileToText] Spreadsheet server parse failed, falling back to client parser.', serverErr);
          }
        }
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let text = '';
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          text += XLSX.utils.sheet_to_csv(sheet) + '\n';
        });
        if (text.trim() && !looksBinary(text)) return await ensureNonEmpty(withWordCap(text), file);
      } catch (err) {
        lastErr = err;
      }
      // Fallback: try reading as plain text
      try {
        const t = await file.text();
        if (t.trim() && !looksBinary(t)) return await ensureNonEmpty(withWordCap(t), file);
      } catch (err2) {
        lastErr = err2;
      }
      // If both fail, throw a clear, user-friendly error so callers can surface it
      if (supportedExts.has(ext)) {
        return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);
      }
      // Defensive fallback: return a safe placeholder string instead of throwing
      const fallback = `[No extractable text] Spreadsheet file. If this document is corrupt or binary, check the file contents.`;
      console.error('[fileToText] Spreadsheet extraction error:', normalizeError(lastErr).message);
      return ensureNonEmpty({ text: fallback, warnings: ['Spreadsheet extraction failed; using placeholder.'], truncated: false }, file);
    }

    // TXT, MD, fallback: read as text
    try {
      if (isBrowser && file.size > SERVER_FALLBACK_BYTES) {
        return await ensureNonEmpty(await parseViaServer(file), file);
      }
      const buf = await file.arrayBuffer();
      const t = normalizeExtractedText(decodeTextBuffer(buf));
      if (!t.trim()) return { text: `[Empty file] ${name || 'Unnamed file'}`.trim(), warnings: [], truncated: false };
      if (looksBinary(t)) throw new Error('File appears to be binary, corrupt, or empty.');
      return await ensureNonEmpty(withWordCap(t), file);
    } catch (err) {
      if (supportedExts.has(ext)) {
        return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);
      }
      // Defensive fallback: return a safe placeholder string instead of throwing
      const fallback = `[No extractable text] Text file. If this document is corrupt or binary, check the file contents.`;
      console.error('[fileToText] TXT/MD extraction error:', normalizeError(err).message);
      return ensureNonEmpty({ text: fallback, warnings: ['TXT/MD extraction failed; using placeholder.'], truncated: false }, file);
    }
  } catch (fatalErr) {
    // Defensive fallback: return a safe placeholder string instead of throwing
    const fallback = `[No extractable text] Unknown file type or fatal error. If this document is corrupt or binary, check the file contents.`;
    console.error('[fileToText] Fatal extraction error:', normalizeError(fatalErr).message);
    return { text: fallback, warnings: ['Fatal extraction failed; using placeholder.'], truncated: false };
  }
}
