// lib/fileToText.ts
// Robust client-side file -> text extraction with server-first fallbacks for heavy formats.
// This module is intentionally defensive: it always returns a FileTextResult (never throws)
// unless a caller explicitly chooses to throw.

import * as XLSX from 'xlsx';

export type FileTextResult = {
  text: string;
  warnings: string[];
  truncated: boolean;
};

// Internal caps (keep aligned with server limits as closely as practical)
const INTERNAL_MAX_WORDS = 50_000; // hard word cap (matches server)
const MAX_CHARS = 3_500_000; // hard char cap for preview text (prevents UI lockups)

/** Best-effort error normalizer (keeps this file buildable without importing shared helpers). */
function normalizeError(err: any): { message: string } {
  if (!err) return { message: '' };
  if (typeof err === 'string') return { message: err };
  if (typeof err?.message === 'string') return { message: err.message };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

/** Basic binary-ish detection for decoded strings. */
function looksBinary(text: string): boolean {
  const s = String(text ?? '');
  if (!s) return false;
  // If it contains NULs, it's almost certainly binary.
  const nulCount = (s.match(/\u0000/g) || []).length;
  if (nulCount > 0) return true;

  // Heuristic: too many non-printable characters.
  let nonPrintable = 0;
  const len = Math.min(s.length, 50_000);
  for (let i = 0; i < len; i++) {
    const c = s.charCodeAt(i);
    const isPrintable =
      c === 9 || // tab
      c === 10 || // lf
      c === 13 || // cr
      (c >= 32 && c <= 126) || // ascii printable
      c >= 160; // allow unicode
    if (!isPrintable) nonPrintable++;
  }
  return nonPrintable / Math.max(1, len) > 0.06;
}

/** Normalize extracted text (remove NULs, collapse whitespace). */
function normalizeExtractedText(text: string): string {
  const s = String(text ?? '');
  if (!s) return '';
  // Remove NULs and other common junk
  const noNul = s.replace(/\u0000/g, '');
  // Normalize newlines
  const nl = noNul.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Collapse excessive whitespace while preserving paragraph boundaries
  return nl.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function capWords(text: string, maxWords: number): { text: string; truncated: boolean } {
  const safe = String(text ?? '');
  const words = safe.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text: safe, truncated: false };
  const capped = words.slice(0, maxWords).join(' ');
  return { text: capped, truncated: true };
}

function withWordCap(text: string): FileTextResult {
  const capped = capWords(text, INTERNAL_MAX_WORDS);
  return { text: capped.text, warnings: [], truncated: capped.truncated };
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
  if (!buffer) return '';
  try {
    const arr = new Uint8Array(buffer);
    if (arr.length >= 2) {
      const b0 = arr[0];
      const b1 = arr[1];
      if (b0 === 0xff && b1 === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
      if (b0 === 0xfe && b1 === 0xff) {
        // Swap bytes for utf-16be then decode as utf-16le.
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

/**
 * Server-side DOCX parse endpoint (preferred for consistency).
 * Returns raw text; then applies internal caps.
 */
async function docxToTextServer(file: File): Promise<FileTextResult> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch('/api/parse-docx', { method: 'POST', body: formData });
  } catch {
    throw new Error('Sorry, the DOCX upload failed. Please try again or use a different file.');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const data: any = await response.json();
      if (data && typeof data === 'object') {
        if (typeof data.error === 'string') detail = data.error;
        else if (data.error && typeof data.error.message === 'string') detail = data.error.message;
        else if (typeof data.errorMessage === 'string') detail = data.errorMessage;
        if (detail && detail.startsWith('{')) {
          try {
            const parsed = JSON.parse(detail);
            if (parsed && parsed.error) detail = parsed.error;
          } catch {}
        }
        else detail = JSON.stringify(data);
      }
    } catch {
      detail = await response.text().catch(() => '');
    }
    const suffix = detail ? `: ${String(detail).slice(0, 300)}` : '';
    throw new Error(`Sorry, failed to parse the DOCX file${suffix}. Please check the file and try again.`);
  }

  const out = normalizeExtractedText(await response.text());
  if (!out || looksBinary(out)) throw new Error('Sorry, failed to extract text from the DOCX file.');
  return withWordCap(out);
}

/**
 * General server extraction pipeline (chunked / async job).
 * Requires endpoints:
 *  - POST /api/extract/start  -> { ok: true, jobId }
 *  - GET  /api/extract/status/:jobId -> { ok: true, status: "completed", text, warnings?, truncated? }
 */
async function parseViaServer(file: File): Promise<FileTextResult> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch('/api/extract/start', { method: 'POST', body: formData });
  } catch (err) {
    throw new Error(normalizeError(err).message || 'Sorry, the server could not parse your file.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    const preview = text ? ` ${String(text).slice(0, 200)}` : '';
    throw new Error(`Sorry, the server returned a malformed response.${preview}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error('Sorry, the server returned a malformed response.');
  }

  if (!response.ok || !data?.ok) {
    let msg = data?.error?.message || data?.errorMessage || response.statusText || 'Sorry, the server could not parse your file.';
    if (msg && msg.startsWith('{')) {
      try {
        const parsed = JSON.parse(msg);
        if (parsed && parsed.error) msg = parsed.error;
      } catch {}
    }
    throw new Error(msg);
  }

  const jobId = String(data?.jobId || '').trim();
  if (!jobId) throw new Error('Sorry, the server could not start the parse job. Please try again.');

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
      throw new Error(normalizeError(err).message || 'Sorry, the server could not check the parse job status.');
    }

    const statusContentType = statusRes.headers.get('content-type') || '';
    if (!statusContentType.includes('application/json')) {
      const text = await statusRes.text().catch(() => '');
      const preview = text ? ` ${String(text).slice(0, 200)}` : '';
      throw new Error(`Sorry, the server returned a malformed response.${preview}`);
    }

    try {
      statusData = await statusRes.json();
    } catch {
      throw new Error('Sorry, the server returned a malformed response.');
    }

    if (!statusRes.ok || !statusData?.ok) {
      const msg =
        statusData?.error?.message || statusData?.errorMessage || statusRes.statusText || 'Server parse failed';
      if (msg && msg.startsWith('{')) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed && parsed.error) msg = parsed.error;
        } catch {}
      }
      throw new Error(msg);
    }

    if (statusData?.status === 'failed') {
      let msg = statusData?.error || 'Sorry, the server could not complete the parse job.';
      if (msg && msg.startsWith('{')) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed && parsed.error) msg = parsed.error;
        } catch {}
      }
      throw new Error(msg);
    }

    if (statusData?.status === 'completed') break;
  }

  if (!statusData || statusData?.status !== 'completed') {
    throw new Error('Sorry, the server took too long to parse your file. Please try again.');
  }

  const baseText = normalizeExtractedText(String(statusData?.text || ''));
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

/** Ensure we don't proceed with truly empty extraction; server fallback then placeholder. */
async function ensureNonEmpty(result: FileTextResult, file: File): Promise<FileTextResult> {
  const safeText = String(result?.text ?? '');
  if (!isNearEmptyText(safeText)) return { ...result, text: safeText };

  // Browser/server fallback if possible
  if (typeof window !== 'undefined') {
    try {
      const server = await parseViaServer(file);
      const serverText = String(server?.text ?? '');
      if (!isNearEmptyText(serverText)) return { ...server, text: serverText };
    } catch {
      // fall through
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

export async function processInChunks(file: File): Promise<FileTextResult> {
  try {
    const server = await parseViaServer(file);
    return await ensureNonEmpty(server, file);
  } catch {
    return await ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);
  }
}

async function docxToTextClient(file: File): Promise<FileTextResult> {
  const buf = await file.arrayBuffer();

  // Try local helper first (keeps logic consistent with other lib helpers)
  try {
    const mod: any = await import('./wordToText');
    const fn = mod?.wordToText || mod?.default || mod;
    if (typeof fn === 'function') {
      const text = await fn(new Uint8Array(buf));
      const out = normalizeExtractedText(text || '');
      if (!out || looksBinary(out)) throw new Error('Failed to parse DOCX');
      return withWordCap(out);
    }
  } catch {
    // ignore and fallback to mammoth
  }

  // Mammoth browser build
  let mammoth: any = null;
  try {
    const mod: any = await import('mammoth/mammoth.browser.js');
    mammoth = mod?.default ?? mod;
  } catch {
    const mod: any = await import('mammoth/mammoth.browser');
    mammoth = mod?.default ?? mod;
  }

  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  const out = normalizeExtractedText(value || '');
  if (!out || looksBinary(out)) throw new Error('Failed to parse DOCX');
  return withWordCap(out);
}

export async function fileToText(file: File): Promise<FileTextResult> {
  const name = file?.name || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const isBrowser = typeof window !== 'undefined' && typeof (window as any).document !== 'undefined';
  const supportedExts = new Set(['pdf', 'docx', 'txt', 'md', 'csv', 'xls', 'xlsx']);

  try {
    if (!file || typeof file.size !== 'number') {
      return { text: `[Empty file] ${name || 'Unnamed file'}`.trim(), warnings: [], truncated: false };
    }

    if (file.size === 0) {
      return { text: `[Empty file] ${name || 'Unnamed file'}`.trim(), warnings: [], truncated: false };
    }

    const SERVER_FALLBACK_BYTES = 900_000;
    const SOFT_WARN_BYTES = 250_000;

    // DOCX: prefer server, fallback to client mammoth/local helper
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
          const result = isBrowser ? await docxToTextClient(file) : { text: '', warnings: [], truncated: false };
          if (!result.text || looksBinary(result.text)) throw new Error('DOCX parse (client) returned empty or binary.');
          return await ensureNonEmpty(result, file);
        } catch (err) {
          lastErr = err;
          if (supportedExts.has(ext)) return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);
          const fallback = `[No extractable text] DOCX file. If this document is scanned or image-based, run OCR and try again.`;
          console.error('[fileToText] DOCX extraction error:', normalizeError(lastErr).message);
          return ensureNonEmpty(
            { text: fallback, warnings: ['DOCX extraction failed; using placeholder.'], truncated: false },
            file,
          );
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
              return ensureNonEmpty(
                { text: '', warnings: ['PDF parsing fell back to placeholder.'], truncated: false },
                file,
              );
            }
            console.warn('[fileToText] PDF server parse failed, falling back to client parser.', serverErr);
          }
        }

        let pdfToTextFn: any = null;
        try {
          const mod: any = await import('./pdfToText');
          pdfToTextFn = mod?.pdfToText || mod?.default;
        } catch (importErr) {
          if (!isBrowser) {
            return {
              text: `[PDF parse skipped: unavailable in this environment] ${name || 'Unnamed file'}`.trim(),
              warnings: [],
              truncated: false,
            };
          }
          throw new Error('PDF parsing is not available in this environment. Please install pdfjs-dist support.');
        }

        if (isBrowser && file.size > SERVER_FALLBACK_BYTES) {
          return await ensureNonEmpty(await parseViaServer(file), file);
        }

        const outRaw = await pdfToTextFn(file);
        const out = normalizeExtractedText(outRaw || '');
        if (!out || looksBinary(out)) throw new Error('PDF parse returned empty or binary.');
        return await ensureNonEmpty(withWordCap(out), file);
      } catch (err) {
        const msg = normalizeError(err).message || 'Failed to parse PDF.';
        if (isBrowser && file.size > SOFT_WARN_BYTES) {
          try {
            return await ensureNonEmpty(await parseViaServer(file), file);
          } catch {
            // fall through
          }
        }
        if (supportedExts.has(ext)) return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);

        const fallback = `[No extractable text] PDF file. If this document is scanned or image-based, run OCR and try again.`;
        console.error('[fileToText] PDF extraction error:', msg);
        return ensureNonEmpty(
          { text: fallback, warnings: ['PDF extraction failed; using placeholder.'], truncated: false },
          file,
        );
      }
    }

    // CSV
    if (ext === 'csv') {
      try {
        const raw = await file.text();
        const text = normalizeExtractedText(raw || '');
        if (text.length > 0) {
          const truncated = text.length > MAX_CHARS;
          const clipped = truncated ? text.slice(0, MAX_CHARS) : text;
          const capped = withWordCap(clipped);
          return ensureNonEmpty(
            {
              text: capped.text,
              warnings: truncated ? ['CSV text was truncated for client preview.'] : [],
              truncated: truncated || capped.truncated,
            },
            file,
          );
        }
      } catch {
        // fall through
      }

      if (isBrowser) {
        try {
          return await ensureNonEmpty(await parseViaServer(file), file);
        } catch (serverErr) {
          console.warn('[fileToText] CSV server parse failed, falling back to placeholder:', serverErr);
          return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);
        }
      }

      return ensureNonEmpty(
        { text: '', warnings: ['CSV parsing not available in this environment.'], truncated: false },
        file,
      );
    }

    // Spreadsheet (XLS/XLSX) -> CSV-ish text
    if (ext === 'xls' || ext === 'xlsx') {
      if (file.size === 0) return { text: 'Spreadsheet is empty.', warnings: [], truncated: false };

      let lastErr: any = null;
      try {
        if (isBrowser) {
          try {
            return await ensureNonEmpty(await parseViaServer(file), file);
          } catch (serverErr) {
            if (file.size > SOFT_WARN_BYTES) {
              return ensureNonEmpty(
                { text: '', warnings: ['Spreadsheet parsing fell back to placeholder.'], truncated: false },
                file,
              );
            }
            console.warn('[fileToText] Spreadsheet server parse failed, falling back to client parser.', serverErr);
          }
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let text = '';
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          text += `${sheetName}\n`;
          text += XLSX.utils.sheet_to_csv(sheet) + '\n';
        });

        const normalized = normalizeExtractedText(text);
        if (normalized.trim() && !looksBinary(normalized)) return await ensureNonEmpty(withWordCap(normalized), file);
      } catch (err) {
        lastErr = err;
      }

      // Fallback: try reading as plain text
      try {
        const t = normalizeExtractedText(await file.text());
        if (t.trim() && !looksBinary(t)) return await ensureNonEmpty(withWordCap(t), file);
      } catch (err2) {
        lastErr = err2;
      }

      if (supportedExts.has(ext)) return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);

      const fallback = `[No extractable text] Spreadsheet file. If this document is corrupt or binary, check the file contents.`;
      console.error('[fileToText] Spreadsheet extraction error:', normalizeError(lastErr).message);
      return ensureNonEmpty(
        { text: fallback, warnings: ['Spreadsheet extraction failed; using placeholder.'], truncated: false },
        file,
      );
    }

    // TXT / MD / unknown: read as text (server fallback if large)
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
      if (supportedExts.has(ext)) return ensureNonEmpty({ text: '', warnings: [], truncated: false }, file);

      const fallback = `[No extractable text] Text file. If this document is corrupt or binary, check the file contents.`;
      console.error('[fileToText] TXT/MD extraction error:', normalizeError(err).message);
      return ensureNonEmpty(
        { text: fallback, warnings: ['TXT/MD extraction failed; using placeholder.'], truncated: false },
        file,
      );
    }
  } catch (fatalErr) {
    const fallback = `[No extractable text] Unknown file type or fatal error. If this document is corrupt or binary, check the file contents.`;
    console.error('[fileToText] Fatal extraction error:', normalizeError(fatalErr).message);
    return { text: fallback, warnings: ['Fatal extraction failed; using placeholder.'], truncated: false };
  }
}
