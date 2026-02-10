// lib/pdfToText.ts
// Only imported dynamically in the browser
import { MAX_PAGES, INTERNAL_MAX_PAGES } from './supportedFormats';
import { safeErrorMessage } from './safeError';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const MAX_PDF_CHARS = 3_000_000;
const MAX_CLIENT_MS = 45_000;

if (typeof window !== 'undefined') {
  // Configure worker once at module load to avoid fake worker warning
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([
    p.finally(() => {
      if (t) clearTimeout(t);
    }),
    timeout,
  ]);
}

async function yieldToBrowser() {
  if (typeof window === 'undefined') return;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export async function pdfToText(input: File | ArrayBuffer | Uint8Array): Promise<string> {
  try {
    const arrayBuffer = input instanceof File
      ? await input.arrayBuffer()
      : input instanceof Uint8Array
      ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
      : input;
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    const start = Date.now();
    const pdf = await withTimeout(
      (pdfjsLib as any).getDocument({
        data: arrayBuffer,
        verbosity: 0,
        disableFontFace: true,
        useSystemFonts: true,
        stopAtErrors: true,
        disableWorker: !isBrowser,
      }).promise,
      30_000,
      'PDF load',
    );
    const totalPages = Math.min(pdf.numPages || 0, INTERNAL_MAX_PAGES);
    if (!totalPages) return '';

    const pages: string[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (Date.now() - start > MAX_CLIENT_MS) {
        throw new Error(`PDF parsing exceeded ${Math.round(MAX_CLIENT_MS / 1000)}s. Will fallback to server parsing.`);
      }
      const page = await withTimeout(pdf.getPage(i), 10_000, `PDF page ${i}`);
      const content = await withTimeout(page.getTextContent(), 12_000, `PDF text ${i}`);
      const strings = (content.items as any[])
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      pages.push(strings.join(' ').replace(/\s+/g, ' ').trim());
      await yieldToBrowser();
    }

    let joined = pages.join('\n\n').trim();
    if (joined.length > MAX_PDF_CHARS) {
      joined = joined.slice(0, MAX_PDF_CHARS).trim();
    }
    // No truncation notes or warnings in output
    return joined;
  } catch (err) {
    // Defensive fallback: return a safe placeholder string instead of throwing
    const fallback = '[No extractable text] PDF file. If this document is scanned or image-based, run OCR and try again.';
    console.error('[pdfToText] Extraction error:', safeErrorMessage(err));
    return fallback;
  }
}
