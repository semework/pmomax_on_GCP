// server/docxParse.js
// DOCX -> text helper used by the /api/parse-docx endpoint.
//
// Server-side mammoth (Node.js) ONLY.
// IMPORTANT:
// - Do not use a static/bare ESM import of "mammoth" at top-level.
// - Use dynamic import so bundlers/browsers won't try to resolve "mammoth".

function toArrayBuffer(input) {
  if (!input) return new ArrayBuffer(0);

  // Node.js Buffer
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }

  // ArrayBuffer
  if (input instanceof ArrayBuffer) return input;

  // TypedArray / DataView
  if (ArrayBuffer.isView?.(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }

  // Fallback: return as-is (mammoth may throw; that’s fine)
  return input;
}

async function getMammoth() {
  // Node.js: load lazily (won't break server startup if dependency missing)
  try {
    const mod = await import('mammoth');
    return mod?.default ?? mod;
  } catch (err) {
    const msg =
      err && typeof err === 'object' && 'message' in err ? err.message : String(err);
    throw new Error(
      `DOCX parsing requires the "mammoth" dependency in Node.js. Install it (npm i mammoth). Original error: ${msg}`
    );
  }
}

export async function docxToText(filePathOrBuffer) {
  let source = filePathOrBuffer;

  // If a path is provided, read it from disk (Node.js only)
  if (typeof filePathOrBuffer === 'string') {
    const fs = await import('node:fs/promises');
    source = await fs.readFile(filePathOrBuffer);
  }

  const mammoth = await getMammoth();
  const arrayBuffer = toArrayBuffer(source);

  const { value } = await mammoth.extractRawText({ arrayBuffer });
  const text = value || '';
  // Enforce conservative word-count-based page limit on server-side too
  const WORDS_PER_PAGE = 500;
  const MAX_PAGES = 50;
  const MAX_WORDS = WORDS_PER_PAGE * MAX_PAGES;
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  if (words > MAX_WORDS) {
    const err = new Error('File exceeds the 50-page maximum limit.');
    err.code = 'TOO_MANY_PAGES';
    throw err;
  }
  return text;
}
