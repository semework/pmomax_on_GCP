// lib/wordToText.ts
import { safeErrorMessage } from './safeError';

declare const process: any;

type MammothModule = {
  extractRawText: (arg: { arrayBuffer?: ArrayBuffer; buffer?: any }) => Promise<{ value?: string } & Record<string, any>>;
};

function isNodeRuntime(): boolean {
  // Safe in Vite/browser where `process` may be undefined.
  return typeof process !== 'undefined' && !!(process as any)?.versions?.node;
}

async function loadMammoth(): Promise<MammothModule> {
  // Prefer browser build when not in Node.
  if (!isNodeRuntime()) {
    try {
      const mod = (await import('mammoth/mammoth.browser')) as any;
      return (mod?.default ?? mod) as MammothModule;
    } catch {
      // fall through to generic import
    }
  }

  const mod = (await import('mammoth')) as any;
  return (mod?.default ?? mod) as MammothModule;
}

function byteLengthOf(input: any): number {
  try {
    if (!input) return 0;
    if (typeof input === 'string') return input.length;
    if (typeof input === 'object') {
      if (typeof input.byteLength === 'number') return input.byteLength;
      if (typeof input.length === 'number') return input.length;
    }
    return 0;
  } catch {
    return 0;
  }
}

function toArrayBuffer(input: ArrayBuffer | Uint8Array | any): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input;

  // Covers Uint8Array and Node Buffer (Buffer is a Uint8Array subclass)
  if (input instanceof Uint8Array) {
    // Respect byteOffset/byteLength so we don't leak a larger underlying buffer.
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }

  // Buffer-like objects with .buffer (rare)
  if (input && typeof input === 'object' && input.buffer instanceof ArrayBuffer) {
    const ab = input.buffer as ArrayBuffer;
    const off = typeof input.byteOffset === 'number' ? input.byteOffset : 0;
    const len = typeof input.byteLength === 'number' ? input.byteLength : ab.byteLength;
    return ab.slice(off, off + len);
  }

  throw new Error('Unsupported DOCX input type (expected ArrayBuffer | Uint8Array | Buffer).');
}

/**
 * Extract text from a .docx Word file using mammoth.
 * Accepts: ArrayBuffer | Uint8Array | Buffer (Node) | Buffer-like.
 * Returns: plain text (trimmed). Never throws unless something truly unexpected happens.
 */
export async function wordToText(input: ArrayBuffer | Uint8Array | any): Promise<string> {
  try {
    const size = byteLengthOf(input);
    if (size && size > 25_000_000) {
      // Keep as warning only — do not fail.
      // eslint-disable-next-line no-console
      console.warn('[wordToText] Large DOCX detected; parsing may take longer.');
    }

    const mammoth = await loadMammoth();

    // Node path: if Buffer is available and input is Buffer, prefer { buffer }
    // (Mammoth Node build supports Buffer directly.)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (isNodeRuntime() && typeof Buffer !== 'undefined' && Buffer?.isBuffer?.(input)) {
      const res = await mammoth.extractRawText({ buffer: input });
      return String(res?.value || '').trim();
    }

    // Browser or non-Buffer: use ArrayBuffer
    const ab = toArrayBuffer(input);
    const res = await mammoth.extractRawText({ arrayBuffer: ab });
    return String(res?.value || '').trim();
  } catch (err: any) {
    // Defensive fallback: return a safe string instead of throwing
    return `[No extractable text]\n\n${safeErrorMessage(err)}`;
  }
}

export default wordToText;