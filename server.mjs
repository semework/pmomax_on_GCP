// --- AI Job Queue (Parse + Budget) ---
const aiJobQueue = [];
const aiJobResults = new Map();
const AI_CONCURRENCY_LIMIT = 2;
let aiActiveJobs = 0;

function enqueueAiJob(type, payload) {
  const jobId = randomUUID();
  aiJobQueue.push({ jobId, type, payload });
  aiJobResults.set(jobId, { status: 'queued' });
  return jobId;
}
// Section E: Simple field validation/normalization after parse
function validatePidShape(pid) {
  if (!pid || typeof pid !== 'object') return;
  // Normalize title block so we never hard-fail purely on a missing title.
  if (!pid.titleBlock || typeof pid.titleBlock !== 'object') {
    pid.titleBlock = { projectTitle: '', subtitle: '', generatedOn: '' };
  }

  const tb = pid.titleBlock;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  if (!tb.projectTitle || typeof tb.projectTitle !== 'string') {
    // Fallback title so parsing still succeeds even if the source lacks a clear title.
    tb.projectTitle = 'Untitled Project';
  }
  if (!tb.subtitle || typeof tb.subtitle !== 'string') {
    tb.subtitle = 'Project Initiation Document';
  }
  if (!tb.generatedOn || typeof tb.generatedOn !== 'string') {
    tb.generatedOn = `${y}-${m}-${d}`;
  }
}
// server.mjs
// PMOMax backend API (Parse + Assistant) + SPA static hosting for Vite build
//
// Endpoints:
//   POST /api/ai/parse      { text } -> { ok: true, pid: PMOMaxPID, warnings?: [] } | { ok:false, error }
//   POST /api/ai/assistant  { pidData, messages } -> { ok:true, reply } | { ok:false, error }
//
// Static hosting:
//   - Serves /assets/* and other dist files
//   - Serves dist/index.html for "/" and all non-API GET routes (SPA fallback)
//
// Notes:
// - Gemini is optional: if GOOGLE_API_KEY is missing, assistant falls back safely.
// - Parse returns {ok:false} on failure (frontend should show the error gracefully).
//
import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import * as XLSX from 'xlsx';
import cors from 'cors';
// Removed express-rate-limit for /api/ai; replaced with job queue
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
// Canonical FIELD_KEYS for legacy field mapping (for completeness, not used for PID shape)
const FIELD_KEYS = [
  'fld-project-name',
  'fld-project-id',
  'fld-exec',
  'fld-problem',
  'fld-business-case',
  'fld-objectives',
  'fld-kpis',
  'fld-scope-inclusions',
  'fld-scope-exclusions',
  'fld-assumptions',
  'fld-constraints-notes',
  'fld-dependencies-notes',
  'fld-stakeholders-notes',
  'fld-sponsor-notes',
  'fld-project-manager-notes',
  'fld-raci-notes',
  'fld-timeline-overview',
  'fld-milestones',
  'fld-deliverables-notes',
  'fld-work-breakdown-notes',
  'fld-budget-notes',
  'fld-resources-notes',
  'fld-risks',
  'fld-mitigations',
  'fld-issues',
  'fld-comms-plan-notes',
  'fld-governance-approvals-notes',
  'fld-compliance-notes',
  'fld-open-questions',
  'notes-area',
];

dotenv.config();
// --- Crash-hardening: log unexpected errors instead of silent process death ---
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
});

// Optional Gemini SDK (only used if available + API key present)
let GoogleGenerativeAI = null;
try {
  const mod = await import('@google/generative-ai');
  GoogleGenerativeAI = mod.GoogleGenerativeAI;
} catch {
  // SDK not installed or not bundled; that's okay in demo mode.
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hard limits (must match client gates)
const MAX_PAGES = 50; // UI only
const WORDS_PER_PAGE = 450;
const INTERNAL_MAX_PAGES = 55;
const INTERNAL_MAX_WORDS = INTERNAL_MAX_PAGES * WORDS_PER_PAGE;
const MAX_WORDS = INTERNAL_MAX_WORDS;
const PARSE_HARD_MAX_CHARS = 400_000;

function countWords(text) {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function safeErrorMessage(err, fallback = 'Unexpected server error') {
  try {
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message || fallback;
    if (typeof err === 'object') {
      if (typeof err.message === 'string') return err.message;
      return JSON.stringify(err);
    }
    return String(err);
  } catch {
    return fallback;
  }
}

function sendJson(res, payload, status = 200) {
  let safePayload = payload;
  try {
    safePayload = JSON.parse(JSON.stringify(payload));
  } catch (err) {
    console.error('[server.mjs] Response serialization error:', err);
    safePayload = { ok: false, error: 'Failed to serialize response.' };
  }
  res.status(status);
  res.set('Content-Type', 'application/json; charset=utf-8');
  return res.send(JSON.stringify(safePayload));
}

// If you deploy as a single service (frontend+backend), your Vite build must be in ./dist
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: ['https://pmomax.ai', 'http://localhost:5173'],
  methods: ['POST', 'GET'],
}));
app.use(express.json({ limit: '5mb' }));

// Rate limiting for AI endpoints
// Removed aiLimiter setup; will use job queue for AI endpoints

// Multer for file uploads
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

const getFileExt = (file) => {
  const name = String(file?.originalname || '');
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};
const isDocxFile = (file) => {
  const ext = getFileExt(file);
  const mt = String(file?.mimetype || '').toLowerCase();
  return ext === 'docx' || mt.includes('word') || mt.includes('officedocument');
};
const isPdfFile = (file) => {
  const ext = getFileExt(file);
  const mt = String(file?.mimetype || '').toLowerCase();
  return ext === 'pdf' || mt.includes('pdf');
};
const isTextFile = (file) => {
  const ext = getFileExt(file);
  const mt = String(file?.mimetype || '').toLowerCase();
  return ['txt', 'md', 'csv'].includes(ext) || mt.includes('text') || mt.includes('csv');
};
const isSpreadsheetFile = (file) => {
  const ext = getFileExt(file);
  const mt = String(file?.mimetype || '').toLowerCase();
  return ['xls', 'xlsx'].includes(ext) || mt.includes('spreadsheet') || mt.includes('excel');
};
const clampText = (text) => {
  const raw = String(text || '');
  if (raw.length <= PARSE_HARD_MAX_CHARS) return { text: raw, truncated: false };
  return { text: raw.slice(0, PARSE_HARD_MAX_CHARS), truncated: true };
};
// Normalize extracted text so downstream heuristics are stable.
const normalizeText = (text) => {
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
};
const normalizeExtractedText = (text) => {
  const raw = String(text || '');
  if (!raw) return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[-–—_]{3,}/g, ' ')
    .replace(/[|•·]{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
const isNearEmptyText = (text) => {
  const cleaned = normalizeExtractedText(text);
  if (!cleaned) return true;
  const alphaNum = (cleaned.match(/[A-Za-z0-9]/g) || []).length;
  if (cleaned.length >= 200 && alphaNum >= 60) return false;
  if (cleaned.length < 80) return true;
  if (cleaned.length < 200 && alphaNum < 60) return true;
  return false;
};
function decodeTextBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return '';
  if (buffer.length >= 2) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    if (b0 === 0xff && b1 === 0xfe) return buffer.toString('utf16le');
    if (b0 === 0xfe && b1 === 0xff) {
      const swapped = Buffer.from(buffer);
      for (let i = 0; i < swapped.length - 1; i += 2) {
        const tmp = swapped[i];
        swapped[i] = swapped[i + 1];
        swapped[i + 1] = tmp;
      }
      return swapped.toString('utf16le');
    }
    if (buffer.length >= 3 && b0 === 0xef && b1 === 0xbb && buffer[2] === 0xbf) {
      return buffer.toString('utf8');
    }
  }
  const utf8 = buffer.toString('utf8');
  const nullCount = (utf8.match(/\u0000/g) || []).length;
  if (nullCount > 10) {
    return buffer.toString('utf16le');
  }
  return utf8;
}


async function docxBufferToText(buf) {
  // Robust DOCX extraction: try buffer first, then temp-path fallback for older mammoth builds.
  const mammothMod = await import("mammoth");
  const mammoth = mammothMod?.default ?? mammothMod;
  const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || []);
  try {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeText(result?.value || "");
  } catch (e) {
    const msg = safeErrorMessage(e, "");
    if (!msg.toLowerCase().includes("could not find file in options")) {
      throw e;
    }
    // Fallback: write to /tmp and pass path (Cloud Run/Node supports /tmp)
    const tmp = path.join("/tmp", `upload_${Date.now()}_${Math.random().toString(16).slice(2)}.docx`);
    await fsp.writeFile(tmp, buffer);
    try {
      const result2 = await mammoth.extractRawText({ path: tmp });
      return normalizeText(result2?.value || "");
    } finally {
      try { await fsp.unlink(tmp); } catch (_) {}
    }
  }
}

function enforceWordLimit(text) {
  const wc = countWords(text);
  return wc > MAX_WORDS;
}


let _pdfjsPromise = null;
async function getPdfJs() {
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = (async () => {
    const candidates = [
      "pdfjs-dist/legacy/build/pdf.mjs",
      "pdfjs-dist/legacy/build/pdf.js",
      "pdfjs-dist/build/pdf.mjs",
      "pdfjs-dist/build/pdf.js",
    ];
    let lastErr = null;
    for (const p of candidates) {
      try {
        const mod = await import(p);
        return mod?.default ?? mod;
      } catch (e) {
        lastErr = e;
      }
    }
    const hint = "pdfjs-dist build not found. Ensure pdfjs-dist is installed and includes legacy/build or build.";
    const err = new Error(hint);
    err.cause = lastErr;
    throw err;
  })();
  return _pdfjsPromise;
}


async function extractPdfTextInBatches(pdfBuffer, maxChars = 900000) {
  const pdfjs = await getPdfJs();
  const raw = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  const data = new Uint8Array(raw);
  const loadingTask = pdfjs.getDocument({ data, disableWorker: true });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages || 0;
  let out = [];
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = (content?.items || []).map(it => (it && typeof it.str === "string") ? it.str : "").filter(Boolean);
    const pageText = normalizeText(strings.join(" "));
    if (pageText) {
      out.push(pageText);
      totalChars += pageText.length;
      if (totalChars >= maxChars) break;
    }
  }

  return out.join("\n\n");
}


async function extractPdfTextAlternate(pdfBuffer) {
  // Alternate extraction: try pdfjs first (again), then pdf-parse if available.
  try {
    return await extractPdfTextInBatches(pdfBuffer, 900000);
  } catch (_) {}

  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(pdfBuffer);
  return normalizeText(data?.text || "");
}

async function runWithTimeout(promise, ms) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve({ ok: false, text: '', timedOut: true }), ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function geminiExtractFromFile(buffer, mimeType, filename) {
  if (!GoogleGenerativeAI) return '';
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return '';
  const genAI = new GoogleGenerativeAI(key);
  const modelName = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = `Attempt to extract any visible text or describe the document structure from this file.\nFilename: ${filename || 'unknown'}\nReturn plain text only.`;
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: buffer.toString('base64'), mimeType: mimeType || 'application/octet-stream' } },
        ],
      },
    ],
  });
  return result?.response?.text?.() || '';
}

async function processInChunks(buffer, mimeType, filename) {
  const attempt = geminiExtractFromFile(buffer, mimeType, filename)
    .then((text) => ({ ok: true, text: String(text || ''), timedOut: false }))
    .catch(() => ({ ok: false, text: '', timedOut: false }));
  return runWithTimeout(attempt, 25000);
}
// DOCX parsing endpoint
app.post('/api/parse-docx', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send('No file uploaded');
    console.log(`[DEBUG] DOCX Filename: ${file.originalname}`);
    console.log(`[DEBUG] DOCX MIME Type: ${file.mimetype}`);
    console.log(`[DEBUG] DOCX Buffer Size: ${file.buffer?.length || 0}`);
    if (!isDocxFile(file)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    try {
      const text = await docxBufferToText(file.buffer);
      res.type('text/plain').send(text);
    } catch (err) {
      const msg = safeErrorMessage(err, 'Failed to parse DOCX');
      return res.status(400).json({ ok: false, error: msg });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: safeErrorMessage(e, 'Failed to parse DOCX') });
  }
});

function buildEmptyFallbackText(filename) {
  return `[No extractable text] ${filename || 'Unsupported file'}\n\nIf this document is scanned, run OCR and try again.`;
}

async function buildAiFallbackResult(file, warnings = [], startMs = Date.now()) {
  const ai = await processInChunks(file.buffer, file.mimetype, file.originalname);
  const aiCapped = clampText(ai?.text || '');
  const aiWarning = 'Standard extraction failed; used AI-fallback. Some data may be missing.';
  const durationMs = Math.max(1, Date.now() - startMs);
  if (String(aiCapped.text || '').trim()) {
    return {
      ok: true,
      text: aiCapped.text,
      length: aiCapped.text.length,
      durationMs,
      truncated: true,
      warnings: [...warnings, aiWarning],
    };
  }
  const fallbackText = buildEmptyFallbackText(file?.originalname || '');
  return {
    ok: true,
    text: fallbackText,
    length: fallbackText.length,
    durationMs,
    truncated: true,
    warnings: [...warnings, 'Standard extraction failed; AI-fallback returned no content.'],
  };
}

async function respondWithAiFallback(res, file, warnings = [], startMs = Date.now()) {
  const result = await buildAiFallbackResult(file, warnings, startMs);
  return sendJson(res, result);
}

const extractJobs = new Map();

async function parseUploadedFile(file, startMs = Date.now()) {
  if (!file) return { ok: false, error: 'No file uploaded' };
  if (!file?.size) return { ok: false, error: 'File is empty.' };
  try {
    if (isDocxFile(file)) {
      const text = await docxBufferToText(file.buffer);
      const exceeded = enforceWordLimit(text);
      const capped = clampText(text);
      const warnings = capped.truncated ? ['Document truncated to server limit.'] : [];
      if (exceeded) warnings.push('Document exceeds the 50-page limit; truncated to the first 50 pages.');
      if (isNearEmptyText(capped.text)) {
        return buildAiFallbackResult(file, warnings, startMs);
      }
      const durationMs = Math.max(1, Date.now() - startMs);
      return { ok: true, text: String(capped.text), length: String(capped.text).length, durationMs, truncated: capped.truncated, warnings };
    }

    if (isPdfFile(file)) {
      let parsed = null;
      let warnings = [];
      let truncated = false;
      let finalText = '';
      try {
        parsed = await extractPdfTextInBatches(file.buffer, 900000);
        warnings = Array.isArray(parsed?.warnings) ? [...parsed.warnings] : [];
        finalText = String(parsed || '');
        const capped = clampText(finalText);
        finalText = capped.text;
        if (capped.truncated) {
          truncated = true;
          warnings.push('Document truncated to server limit.');
        }
        if (isNearEmptyText(finalText)) {
          const alt = await extractPdfTextAlternate(file.buffer);
          const altCapped = clampText(alt?.text || '');
          const altText = String(altCapped.text || '');
          if (!isNearEmptyText(altText) && altText.length > finalText.length + 200) {
            finalText = altText;
          }
        }
        if (isNearEmptyText(finalText)) {
          return buildAiFallbackResult(file, warnings, startMs);
        }
        const durationMs = Math.max(1, Date.now() - startMs);
        return { ok: true, text: String(finalText), length: String(finalText).length, durationMs, truncated, warnings };
      } catch (err) {
        warnings.push(safeErrorMessage(err, 'PDF extraction failed'));
        return { ok: false, error: safeErrorMessage(err, 'PDF extraction failed'), warnings };
      }
    }

    if (isSpreadsheetFile(file)) {
      try {
        const XLSXMod = await import('xlsx');
        const XLSX = XLSXMod?.default ?? XLSXMod;
        const raw = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
        let wb;
        try {
          wb = XLSX.read(raw, {
            type: 'buffer',
            cellDates: true,
            cellText: true,
            dense: true,
          });
        } catch (e) {
          return { ok: false, error: `XLSX_PARSE_FAILED: ${e?.message || String(e)}` };
        }
        const names = wb.SheetNames || [];
        if (!names.length) return { ok: true, text: '', warnings: ['Spreadsheet contains no sheets.'], truncated: false };
        let out = '';
        for (const name of names) {
          const sheet = wb.Sheets?.[name];
          if (!sheet) continue;
          const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: false,
            raw: false,
            defval: '',
          }) || [];
          out += `# Sheet: ${name}\n`;
          for (const row of rows) {
            out += (Array.isArray(row) ? row : []).map(v => String(v ?? '')).join('\t') + '\n';
          }
          out += '\n';
        }
        const normalized = normalizeText(out);
        const capped = clampText(normalized);
        return { ok: true, text: capped.text, length: capped.text.length, truncated: capped.truncated, warnings: [] };
      } catch (err) {
        return { ok: false, error: safeErrorMessage(err, 'XLSX extraction failed'), warnings: [] };
      }
    }

    if (isTextFile(file)) {
      const text = decodeTextBuffer(file.buffer);
      const exceeded = enforceWordLimit(text);
      const capped = clampText(normalizeText(text));
      const warnings = capped.truncated ? ['Document truncated to server limit.'] : [];
      if (exceeded) warnings.push('Document exceeds the 50-page limit; truncated to the first 50 pages.');
      if (!capped.text || !String(capped.text).trim()) {
        const fallbackText = buildEmptyFallbackText(file?.originalname || '');
        const durationMs = Math.max(1, Date.now() - startMs);
        return {
          ok: true,
          text: fallbackText,
          length: fallbackText.length,
          durationMs,
          truncated: capped.truncated,
          warnings: [...warnings, 'Text file contains no extractable content.'],
        };
      }
      const durationMs = Math.max(1, Date.now() - startMs);
      return { ok: true, text: String(capped.text), length: String(capped.text).length, durationMs, truncated: capped.truncated, warnings };
    }
    return { ok: false, error: 'Unsupported file type' };
  } catch (err) {
    return { ok: false, error: safeErrorMessage(err, 'Extraction failed'), warnings: [] };
  }
}

// Async extraction job start
app.post('/api/extract/start', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return sendJson(res, { ok: false, error: 'No file uploaded' }, 400);
  const jobId = randomUUID();
  const job = {
    id: jobId,
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  extractJobs.set(jobId, job);
  sendJson(res, { ok: true, jobId, status: 'queued' });

  const fileCopy = {
    buffer: Buffer.from(file.buffer),
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  };

  setImmediate(async () => {
    job.status = 'processing';
    job.updatedAt = Date.now();
    try {
      const result = await parseUploadedFile(fileCopy, Date.now());
      job.status = 'completed';
      job.result = result;
      job.updatedAt = Date.now();
    } catch (err) {
      job.status = 'failed';
      job.error = safeErrorMessage(err, 'Failed to parse file');
      job.updatedAt = Date.now();
    }
  });
});

// Async extraction job status
app.get('/api/extract/status/:jobId', (req, res) => {
  const job = extractJobs.get(req.params.jobId);
  if (!job) return sendJson(res, { ok: false, error: 'Job not found' }, 404);
  const base = {
    ok: true,
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
  if (job.status === 'completed' && job.result) {
    return sendJson(res, { ...base, ...job.result });
  }
  if (job.status === 'failed') {
    return sendJson(res, { ...base, error: job.error || 'Extraction failed.' });
  }
  return sendJson(res, base);
});

// Unified server parsing endpoint (PDF + DOCX)
app.post('/api/parse/file', upload.single('file'), async (req, res) => {
  try {
    const result = await parseUploadedFile(req.file, Date.now());
    return sendJson(res, result);
  } catch (err) {
    const msg = safeErrorMessage(err, 'Failed to parse file');
    const status = err?.code === 'TOO_MANY_PAGES' || err?.code === 'ENCRYPTED' ? 400 : 500;
    return sendJson(res, { ok: false, error: msg, truncated: true }, status);
  }
});

const PORT = process.env.PORT || 8080;

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

// Returns a fully canonical, complete PMOMaxPID object with all fields/groups (empty if not present)
function makeEmptyPid() {
  return {
    titleBlock: { projectTitle: '', subtitle: '', generatedOn: '', projectId: '' },
    executiveSummary: '',
    problemStatement: '',
    businessCaseExpectedValue: '',
    objectivesSmart: [],
    kpis: [],
    scopeInclusions: [],
    scopeExclusions: [],
    assumptions: [],
    constraints: [],
    dependencies: [],
    stakeholders: [],
    projectSponsor: { name: '', role: '' },
    projectManagerOwner: { name: '', role: '' },
    teamRaci: [],
    timelineOverview: '',
    milestones: [],
    workBreakdownTasks: [],
    criticalPathBoxes: [],
    budgetCostBreakdown: [],
    budgetSummary: { currency: 'USD', totalCostUsd: 0, subtotalByRoleUsd: {}, notes: [] },
    resourcesTools: [],
    risks: [],
    mitigationsContingencies: [],
    issuesDecisionsLog: [],
    communicationPlan: [],
    governanceApprovals: [],
    complianceSecurityPrivacy: [],
    openQuestionsNextSteps: [],
    notesBackground: '',
    deliverablesOutputs: [],
    resourcesPlan: '',
    communicationsPlan: '',
    raci: [],
    workBreakdownNotes: '',
    // Add any other canonical fields/groups from demoData.ts as needed
  };
}


function buildFallbackPidFromText(text) {
  const src = normalizeText(String(text || ""));
  const lines = src.split(/\r?\n/);
  const firstNonEmpty = lines.find(l => l.trim().length > 0) || "";
  const titleGuess = firstNonEmpty.slice(0, 120);

  const headingName = (l) => l
    .replace(/^#+\s*/, "")
    .replace(/[:\-–—]+\s*$/, "")
    .trim()
    .toLowerCase();

  const isHeading = (l) => {
    const t = l.trim();
    if (!t) return false;
    if (t.length > 90) return false;
    if (/^#+\s+/.test(t)) return true;
    if (/:$/.test(t) && t.length <= 60) return true;
    if (/^[A-Z][A-Za-z0-9 &/(),.'\-]{2,}$/.test(t) && !/^[-*•\d]/.test(t)) return true;
    return false;
  };

  const grabSection = (aliases) => {
    const aliasSet = new Set(aliases.map(a => a.toLowerCase()));
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue;
      if (isHeading(t) && aliasSet.has(headingName(t))) {
        start = i + 1;
        break;
      }
    }
    if (start === -1) return "";
    let out = [];
    for (let i = start; i < lines.length; i++) {
      const t = lines[i].trim();
      if (isHeading(t) && t.length <= 90) break;
      out.push(lines[i]);
    }
    return normalizeText(out.join("\n"));
  };

  const bullets = (sectionText) => {
    const arr = [];
    for (const raw of String(sectionText || "").split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      const m = t.match(/^([-*•]|\d+[.)])\s+(.*)$/);
      if (m) arr.push(m[2].trim());
    }
    return arr;
  };

  const execSummary = grabSection(["executive summary", "summary", "overview"]);
  const problem = grabSection(["problem statement", "problem", "challenge", "background"]);
  const businessCase = grabSection(["business case", "justification", "rationale", "value proposition"]);
  const objectivesTxt = grabSection(["objectives", "goals", "aims"]);
  const kpisTxt = grabSection(["kpis", "key performance indicators", "metrics", "success metrics"]);
  const scopeInTxt = grabSection(["in scope", "scope inclusions"]);
  const scopeOutTxt = grabSection(["out of scope", "scope exclusions"]);
  const assumptionsTxt = grabSection(["assumptions"]);
  const constraintsTxt = grabSection(["constraints"]);
  const depsTxt = grabSection(["dependencies"]);
  const stakeholdersTxt = grabSection(["stakeholders"]);
  const timelineTxt = grabSection(["timeline", "schedule", "roadmap"]);
  const milestonesTxt = grabSection(["milestones"]);
  const deliverablesTxt = grabSection(["deliverables", "outputs"]);
  const budgetTxt = grabSection(["budget", "cost", "budget summary"]);
  const resourcesTxt = grabSection(["resources", "staffing", "team"]);
  const risksTxt = grabSection(["risks", "risk register"]);
  const mitigationsTxt = grabSection(["mitigations", "contingencies"]);
  const issuesTxt = grabSection(["issues", "decisions", "log"]);
  const commsTxt = grabSection(["communication plan", "communications", "comms"]);
  const governanceTxt = grabSection(["governance", "approvals"]);
  const complianceTxt = grabSection(["compliance", "security", "privacy"]);
  const openQTxt = grabSection(["open questions", "next steps"]);
  const notesTxt = grabSection(["notes", "appendix"]);

  const objectives = bullets(objectivesTxt).map(o => ({ objective: o }));
  const kpis = bullets(kpisTxt).map(k => ({ name: k }));

  const pid = {
    titleBlock: { projectTitle: titleGuess },
    executiveSummary: execSummary,
    problemStatement: problem,
    businessCase,
    objectivesSmart: objectives,
    kpis,
    scopeInclusions: bullets(scopeInTxt),
    scopeExclusions: bullets(scopeOutTxt),
    assumptions: bullets(assumptionsTxt),
    constraints: bullets(constraintsTxt),
    dependencies: bullets(depsTxt),
    stakeholders: bullets(stakeholdersTxt).map(n => ({ name: n })),
    timelineOverview: timelineTxt,
    milestones: bullets(milestonesTxt).map(n => ({ name: n })),
    deliverablesOutputs: bullets(deliverablesTxt).map(n => ({ name: n })),
    budgetSummary: budgetTxt ? { notes: budgetTxt } : {},
    resourcesPlan: resourcesTxt,
    risks: bullets(risksTxt).map(n => ({ risk: n })),
    mitigationsContingencies: bullets(mitigationsTxt).map(n => ({ mitigation: n })),
    issuesDecisionsLog: bullets(issuesTxt).map(n => ({ item: n })),
    communicationsPlan: commsTxt,
    governanceApprovals: governanceTxt,
    complianceSecurityPrivacy: complianceTxt,
    openQuestionsNextSteps: openQTxt,
    notesBackground: notesTxt,
  };

  return pid;
}



function pidToLegacyFields(pid) {
  const p = pid || {};
  const tb = p.titleBlock || {};
  const joinLines = (v) => Array.isArray(v) ? v.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join("\n") : (typeof v === "string" ? v : (v ? JSON.stringify(v) : ""));
  const list = (arr, key1, key2) => (Array.isArray(arr) ? arr.map(o => (o && typeof o === "object") ? (o[key1] || o[key2] || JSON.stringify(o)) : String(o)) : []).filter(Boolean).join("\n");
  const f = {};

  // Project
  f["fld-project-name"] = String(tb.projectTitle || "");
  f["fld-project-id"] = String((tb.projectId || p.projectId || "").toString());

  // Core narrative
  f["fld-exec"] = String(p.executiveSummary || "");
  f["fld-problem"] = String(p.problemStatement || "");
  f["fld-business-case"] = String(p.businessCase || "");

  // Goals & success
  f["fld-objectives"] = list(p.objectivesSmart, "objective", "name");
  f["fld-kpis"] = list(p.kpis, "name", "metric");

  // Scope / assumptions / constraints / deps
  f["fld-scope-inclusions"] = joinLines(p.scopeInclusions);
  f["fld-scope-exclusions"] = joinLines(p.scopeExclusions);
  f["fld-assumptions"] = joinLines(p.assumptions);
  f["fld-constraints-notes"] = joinLines(p.constraints);
  f["fld-dependencies-notes"] = joinLines(p.dependencies);

  // People
  f["fld-stakeholders-notes"] = list(p.stakeholders, "name", "role");
  f["fld-sponsor-notes"] = String(p.sponsor || "");
  f["fld-project-manager-notes"] = String(p.projectManager || "");
  f["fld-raci-notes"] = joinLines(p.raci || p.raciMatrix);

  // Timeline / deliverables / work breakdown
  f["fld-timeline-overview"] = String(p.timelineOverview || "");
  f["fld-milestones"] = list(p.milestones, "name", "title");
  f["fld-deliverables-notes"] = list(p.deliverablesOutputs, "name", "deliverable");
  f["fld-work-breakdown-notes"] = joinLines(p.workBreakdownNotes || p.workBreakdown);

  // Budget / resources
  const bs = (p.budgetSummary && typeof p.budgetSummary === "object") ? p.budgetSummary : {};
  f["fld-budget-notes"] = String(bs.notes || (typeof p.budgetSummary === "string" ? p.budgetSummary : ""));
  f["fld-resources-notes"] = String(p.resourcesPlan || "");

  // Risks / mitigations / issues
  f["fld-risks"] = list(p.risks, "risk", "name");
  f["fld-mitigations"] = list(p.mitigationsContingencies, "mitigation", "name");
  f["fld-issues"] = list(p.issuesDecisionsLog, "item", "issue");

  // Plans / governance / compliance / questions
  f["fld-comms-plan-notes"] = String(p.communicationsPlan || "");
  f["fld-governance-approvals-notes"] = String(p.governanceApprovals || "");
  f["fld-compliance-notes"] = String(p.complianceSecurityPrivacy || "");
  f["fld-open-questions"] = String(p.openQuestionsNextSteps || "");
  f["notes-area"] = String(p.notesBackground || "");

  return f;
}

// Ensures the returned PID object always has all canonical fields/groups, never missing any
function mergeWithEmptyPid(parsed) {
  const base = makeEmptyPid();
  if (!parsed || !isPlainObject(parsed)) return base;
  const out = { ...base, ...parsed };
  // Deep merge for nested objects/arrays
  out.titleBlock = { ...base.titleBlock, ...(parsed.titleBlock || {}) };
  out.projectSponsor = { ...base.projectSponsor, ...(parsed.projectSponsor || {}) };
  out.projectManagerOwner = { ...base.projectManagerOwner, ...(parsed.projectManagerOwner || {}) };
  out.budgetSummary = { ...base.budgetSummary, ...(parsed.budgetSummary || {}) };
  out.criticalPathBoxes = Array.isArray(parsed.criticalPathBoxes) ? parsed.criticalPathBoxes : base.criticalPathBoxes;
  out.deliverablesOutputs = Array.isArray(parsed.deliverablesOutputs) ? parsed.deliverablesOutputs : base.deliverablesOutputs;
  out.resourcesTools = Array.isArray(parsed.resourcesTools) ? parsed.resourcesTools : base.resourcesTools;
  out.raci = Array.isArray(parsed.raci) ? parsed.raci : base.raci;
  out.teamRaci = Array.isArray(parsed.teamRaci) ? parsed.teamRaci : base.teamRaci;
  out.workBreakdownTasks = Array.isArray(parsed.workBreakdownTasks) ? parsed.workBreakdownTasks : base.workBreakdownTasks;
  out.mitigationsContingencies = Array.isArray(parsed.mitigationsContingencies) ? parsed.mitigationsContingencies : base.mitigationsContingencies;
  out.issuesDecisionsLog = Array.isArray(parsed.issuesDecisionsLog) ? parsed.issuesDecisionsLog : base.issuesDecisionsLog;
  out.communicationPlan = Array.isArray(parsed.communicationPlan) ? parsed.communicationPlan : base.communicationPlan;
  out.governanceApprovals = Array.isArray(parsed.governanceApprovals) ? parsed.governanceApprovals : base.governanceApprovals;
  out.complianceSecurityPrivacy = Array.isArray(parsed.complianceSecurityPrivacy) ? parsed.complianceSecurityPrivacy : base.complianceSecurityPrivacy;
  out.openQuestionsNextSteps = Array.isArray(parsed.openQuestionsNextSteps) ? parsed.openQuestionsNextSteps : base.openQuestionsNextSteps;
  out.risks = Array.isArray(parsed.risks) ? parsed.risks : base.risks;
  out.kpis = Array.isArray(parsed.kpis) ? parsed.kpis : base.kpis;
  out.objectivesSmart = Array.isArray(parsed.objectivesSmart) ? parsed.objectivesSmart : base.objectivesSmart;
  out.scopeInclusions = Array.isArray(parsed.scopeInclusions) ? parsed.scopeInclusions : base.scopeInclusions;
  out.scopeExclusions = Array.isArray(parsed.scopeExclusions) ? parsed.scopeExclusions : base.scopeExclusions;
  out.assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions : base.assumptions;
  out.constraints = Array.isArray(parsed.constraints) ? parsed.constraints : base.constraints;
  out.dependencies = Array.isArray(parsed.dependencies) ? parsed.dependencies : base.dependencies;
  out.stakeholders = Array.isArray(parsed.stakeholders) ? parsed.stakeholders : base.stakeholders;
  out.milestones = Array.isArray(parsed.milestones) ? parsed.milestones : base.milestones;
  out.budgetCostBreakdown = Array.isArray(parsed.budgetCostBreakdown) ? parsed.budgetCostBreakdown : base.budgetCostBreakdown;
  out.resourcesPlan = typeof parsed.resourcesPlan === 'string' ? parsed.resourcesPlan : base.resourcesPlan;
  out.communicationsPlan = typeof parsed.communicationsPlan === 'string' ? parsed.communicationsPlan : base.communicationsPlan;
  out.workBreakdownNotes = typeof parsed.workBreakdownNotes === 'string' ? parsed.workBreakdownNotes : base.workBreakdownNotes;
  out.notesBackground = typeof parsed.notesBackground === 'string' ? parsed.notesBackground : base.notesBackground;
  return out;
}

const DOMAIN_BASE_RATES = {
  software: 80,
  manufacturing: 45,
  default: 60,
};

function money(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function guessRole(taskName, roleHint) {
  const hint = String(roleHint || '').trim();
  if (hint) return hint;
  const name = String(taskName || '').toLowerCase();
  if (/design|ux|ui|prototype|wireframe/.test(name)) return 'Design';
  if (/qa|test|validation|verify/.test(name)) return 'QA';
  if (/data|analytics|etl|ml|ai/.test(name)) return 'Data';
  if (/ops|infra|deploy|release|runbook|sre/.test(name)) return 'Ops';
  if (/pm|project|planning|coordination|stakeholder/.test(name)) return 'PM';
  if (/tool|license|subscription|vendor/.test(name)) return 'Tools';
  return 'Engineering';
}

function estimateTaskHours(task) {
  const direct = Number(task?.estimatedHours ?? task?.hours);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const start = Date.parse(task?.start || '');
  const end = Date.parse(task?.end || '');
  if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
    const days = Math.max(1, Math.round((end - start) / 86400000));
    return Math.min(80, Math.max(6, days * 6));
  }
  return 16;
}

function collectContextText(pid, contextText = '') {
  const parts = [];
  if (contextText) parts.push(contextText);
  if (pid?.notesBackground) parts.push(String(pid.notesBackground));
  if (pid?.executiveSummary) parts.push(String(pid.executiveSummary));
  if (pid?.problemStatement) parts.push(String(pid.problemStatement));
  if (pid?.businessCaseExpectedValue) parts.push(String(pid.businessCaseExpectedValue));
  if (pid?.timelineOverview) parts.push(String(pid.timelineOverview));
  if (Array.isArray(pid?.workBreakdownTasks)) {
    try {
      parts.push(JSON.stringify(pid.workBreakdownTasks));
    } catch {
      // ignore
    }
  }
  return parts.join('\n');
}

function detectDomainBaseRate(text) {
  const src = String(text || '').toLowerCase();
  const hasManufacturing = /\b[\w.-]+\.(stl|step)\b/i.test(src);
  const hasSoftware = /\b[\w.-]+\.(py|js)\b/i.test(src);
  if (hasManufacturing) return { baseRate: DOMAIN_BASE_RATES.manufacturing, domain: 'manufacturing' };
  if (hasSoftware) return { baseRate: DOMAIN_BASE_RATES.software, domain: 'software' };
  return { baseRate: DOMAIN_BASE_RATES.default, domain: 'general' };
}

function detectComplexityMultiplier(text) {
  const src = String(text || '').toLowerCase();
  if (/(aerospace|medical|real-time)/i.test(src)) return { multiplier: 1.8, reason: 'High complexity keywords detected.' };
  if (/(security|iso|compliance)/i.test(src)) return { multiplier: 1.3, reason: 'Compliance/security keywords detected.' };
  return { multiplier: 1.0, reason: 'Standard complexity assumptions.' };
}

function computeDeterministicBudget(pid, contextText = '') {
  const tasks = Array.isArray(pid?.workBreakdown || pid?.workBreakdownTasks || pid?.tasks)
    ? (pid?.workBreakdown || pid?.workBreakdownTasks || pid?.tasks)
    : [];
  const hasTasks = tasks.length > 0;
  const context = collectContextText(pid, contextText);
  const { baseRate, domain } = detectDomainBaseRate(context);
  const { multiplier, reason } = detectComplexityMultiplier(context);
  const items = [];

  const addItem = (task, role, estimatedHours, rateUsdPerHour, complexityMultiplier, justification) => {
    const hours = Math.max(0, Number(estimatedHours) || 0);
    const rate = Math.max(0, Number(rateUsdPerHour) || 0);
    const complexity = Math.max(0.1, Number(complexityMultiplier) || 1);
    const totalCostUsd = money(hours * rate * complexity);
    items.push({
      task,
      role,
      estimatedHours: hours,
      rateUsdPerHour: rate,
      complexityMultiplier: complexity,
      totalCostUsd,
      justification: justification || 'Deterministic baseline estimate.',
      source: 'deterministic',
    });
  };

  if (hasTasks) {
    const byRole = {};
    for (const t of tasks) {
      const name = String(t?.task || t?.name || t?.title || '').trim() || 'Work item';
      const role = guessRole(name, t?.role || t?.ownerRole || t?.owner);
      const hours = estimateTaskHours(t);
      if (!byRole[role]) byRole[role] = { hours: 0, taskNames: [] };
      byRole[role].hours += hours;
      byRole[role].taskNames.push(name);
    }

    Object.entries(byRole).forEach(([role, info]) => {
      const taskCount = info.taskNames.length;
      const justification = `Derived from ${taskCount} work items (${info.taskNames.slice(0, 3).join(', ')}${taskCount > 3 ? ', …' : ''}). ${reason} Base rate ${baseRate}/hr (${domain}).`;
      addItem(`${role} delivery`, role, money(info.hours), baseRate, multiplier, justification);
    });
    addItem('Tools & licenses', 'Tools', 0, baseRate, multiplier, `Baseline tooling and subscriptions. ${reason} Base rate ${baseRate}/hr (${domain}).`);
  } else {
    addItem('Project management', 'PM', 80, baseRate, multiplier, `Baseline PM coordination. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('Engineering delivery', 'Engineering', 320, baseRate, multiplier, `Baseline engineering effort. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('Design & UX', 'Design', 80, baseRate, multiplier, `Baseline design and UX cycles. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('QA & validation', 'QA', 80, baseRate, multiplier, `Baseline QA planning and execution. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('Operations readiness', 'Ops', 60, baseRate, multiplier, `Baseline deployment and monitoring readiness. ${reason} Base rate ${baseRate}/hr (${domain}).`);
    addItem('Tools & licenses', 'Tools', 0, baseRate, multiplier, `Baseline tooling and subscriptions. ${reason} Base rate ${baseRate}/hr (${domain}).`);
  }

  const subtotalByRoleUsd = items.reduce((acc, row) => {
    acc[row.role] = money((acc[row.role] || 0) + (Number(row.totalCostUsd) || 0));
    return acc;
  }, {});
  const totalCostUsd = money(items.reduce((sum, row) => sum + (Number(row.totalCostUsd) || 0), 0));

  return {
    budgetCostBreakdown: items,
    budgetSummary: {
      currency: 'USD',
      totalCostUsd,
      subtotalByRoleUsd,
      notes: [`Base rate ${baseRate}/hr (${domain}) with complexity multiplier ${multiplier}×. ${reason}`],
    },
  };
}

function buildBudgetSummaryFromItems(items) {
  const subtotalByRoleUsd = (Array.isArray(items) ? items : []).reduce((acc, row) => {
    const role = row?.role || 'Unassigned';
    acc[role] = money((acc[role] || 0) + (Number(row?.totalCostUsd) || 0));
    return acc;
  }, {});
  const totalCostUsd = money(Object.values(subtotalByRoleUsd).reduce((sum, v) => sum + (Number(v) || 0), 0));
  return {
    currency: 'USD',
    totalCostUsd,
    subtotalByRoleUsd,
    notes: ['USD baseline generated deterministically; refine with actuals when available.'],
  };
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeBudgetItem(row, fallbackSource = 'deterministic') {
  if (!row || typeof row !== 'object') return null;
  const task = String(row.task || row.item || row.name || 'Work item').trim() || 'Work item';
  const role = String(row.role || row.category || row.owner || 'Engineering').trim() || 'Engineering';
  const estimatedHours = toNumber(row.estimatedHours ?? row.hours, 0);
  const rateUsdPerHour = toNumber(row.rateUsdPerHour ?? row.hourlyRate ?? row.rate, 0);
  const complexityMultiplier = toNumber(row.complexityMultiplier ?? row.multiplier, 1) || 1;
  const totalCostUsd = toNumber(row.totalCostUsd ?? row.cost, Math.max(0, estimatedHours * rateUsdPerHour * complexityMultiplier));
  const justification = String(row.justification || row.notes || '').trim();
  const source = row.source === 'ai' ? 'ai' : fallbackSource;
  return {
    task,
    role,
    estimatedHours: Math.max(0, estimatedHours),
    rateUsdPerHour: Math.max(0, rateUsdPerHour),
    complexityMultiplier: Math.max(0.1, complexityMultiplier),
    totalCostUsd: Math.max(0, totalCostUsd),
    justification: justification || 'AI justification pending — using deterministic baseline.',
    source,
  };
}

function normalizeBudgetItems(rows, fallbackSource) {
  return (Array.isArray(rows) ? rows : []).map((row) => normalizeBudgetItem(row, fallbackSource)).filter(Boolean);
}

function mergeBudgetItems(baseItems, aiItems) {
  const merged = [...baseItems];
  const index = new Map();
  merged.forEach((row, idx) => index.set(`${row.role}::${row.task}`, idx));

  aiItems.forEach((aiRow) => {
    const key = `${aiRow.role}::${aiRow.task}`;
    if (index.has(key)) {
      const idx = index.get(key);
      const base = merged[idx];
      const estimatedHours = aiRow.estimatedHours > 0 ? aiRow.estimatedHours : base.estimatedHours;
      const rateUsdPerHour = aiRow.rateUsdPerHour > 0 ? aiRow.rateUsdPerHour : base.rateUsdPerHour;
      const complexityMultiplier = aiRow.complexityMultiplier > 0 ? aiRow.complexityMultiplier : base.complexityMultiplier;
      const totalCostUsd = aiRow.totalCostUsd > 0
        ? aiRow.totalCostUsd
        : Math.max(0, estimatedHours * rateUsdPerHour * complexityMultiplier);
      merged[idx] = {
        ...base,
        estimatedHours,
        rateUsdPerHour,
        complexityMultiplier,
        totalCostUsd,
        justification: aiRow.justification || base.justification,
      };
    } else {
      merged.push({ ...aiRow, source: 'ai' });
    }
  });

  return merged;
}

function applyDeterministicBudget(pid, contextText = '') {
  const rows = Array.isArray(pid?.budgetCostBreakdown) ? pid.budgetCostBreakdown : [];
  const hasSummary = isPlainObject(pid?.budgetSummary);
  const baseline = computeDeterministicBudget(pid, contextText);
  const mergedRows = rows.length > 0 ? rows : baseline.budgetCostBreakdown;
  const summary = hasSummary ? pid.budgetSummary : buildBudgetSummaryFromItems(mergedRows);
  return {
    ...pid,
    budgetCostBreakdown: mergedRows,
    budgetSummary: summary,
  };
}

async function geminiJson(modelName, systemPrompt, userText) {
  if (!GoogleGenerativeAI) throw new Error('Gemini SDK not available.');
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not set.');
  const genAI = new GoogleGenerativeAI(key);

  const modelsToTry = [
    modelName,
    process.env.GEMINI_MODEL,
    process.env.GEMINI_FALLBACK_MODEL,
    'gemini-2.5-flash',
  ].filter((v, i, a) => typeof v === 'string' && v.trim() && a.indexOf(v) === i);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (base) => Math.round(base * (0.7 + Math.random() * 0.6));

  let lastErr = null;
  for (const name of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: name,
          systemInstruction: systemPrompt,
        });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        });
        return String(result?.response?.text?.() || '');
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message || '').toLowerCase();
        const isThrottle = msg.includes('429') || msg.includes('resource') || msg.includes('quota') || msg.includes('rate');
        if (isThrottle && attempt < 2) {
          await sleep(jitter(800 * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
    }
  }
  throw lastErr || new Error('Gemini call failed.');
}

function extractFirstJsonObject(text) {
  const s = String(text || '').trim();
  if (!s) throw new Error('Empty AI response');
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = String(fence?.[1] || s).trim();
  try { return JSON.parse(candidate); } catch { /* continue */ }

  let depth = 0;
  let start = -1;
  for (let i = 0; i < candidate.length; i++) {
    if (candidate[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (candidate[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = candidate.slice(start, i + 1);
        try { return JSON.parse(slice); } catch { /* ignore */ }
        start = -1;
      }
    }
  }
  throw new Error('No valid JSON object found');
}

const PARSE_SYSTEM_PROMPT = `
You are a strict JSON generator for a PMOMax Project Initiation Document.
Your output must be fully grounded in the INPUT text. You MUST NOT invent or infer any new facts, tasks,
objectives, KPIs, names, dates, or numbers that are not explicitly present in the INPUT. When something is
not clearly present in the input, leave the corresponding string empty ("") or the array empty ([]).

interface PMOMaxPID {
  titleBlock: { projectTitle: string; subtitle: string; generatedOn: string; };
  executiveSummary: string;
  problemStatement: string;
  businessCaseExpectedValue: string;
  objectivesSmart: { objective: string; successMeasure: string; }[];
  kpis: { kpi: string; baseline: string; target: string; }[];
  scopeInclusions: string[];
  scopeExclusions: string[];
  assumptions: { assumption: string; }[];
  constraints: { constraint: string; }[];
  dependencies: { dependency: string; teamOrSystem: string; status: string; }[];
  stakeholders: { name: string; role: string; contact: string; }[];
  projectSponsor: { name: string; role: string; };
  projectManagerOwner: { name: string; };
  teamRaci: { teamMember: string; role: string; responsible: string; accountable: string; consulted: string; informed: string; }[];
  timelineOverview: string;
  milestones: { milestone: string; targetDate: string; }[];
  workBreakdownTasks: { name: string; start: string; end: string; owner: string; status: string; priority: string; kind: string; dependencies: string[]; }[];
  budgetCostBreakdown: { item: string; category: string; cost: string; }[];
  resourcesTools: { resource: string; purpose: string; }[];
  risks: { risk: string; probability: string; impact: string; }[];
  mitigationsContingencies: { mitigation: string; contingency: string; }[];
  issuesDecisionsLog: { issue: string; decision: string; owner: string; date: string; }[];
  communicationPlan: { audience: string; cadence: string; channel: string; }[];
  governanceApprovals: { gate: string; signoffRequirement: string; }[];
  complianceSecurityPrivacy: { requirement: string; notes: string; }[];
  openQuestionsNextSteps: { question: string; nextStep: string; }[];
  notesBackground: string;
}

Rules:
- Only copy, normalize, or very lightly rephrase content that already exists in the input. Do NOT add new rows,
  bullets, or fields that are not clearly supported by the input.
- Never invent numbers, costs, or names that are not in the input. Prefer empty strings over placeholders when unknown.
  If the input explicitly uses "TBD", you may copy "TBD".
- Dates must be ISO YYYY-MM-DD when present.
- If a section is missing or cannot be derived from the input, output empty string or empty array.
`;

const PARSE_SUMMARY_PROMPT = `
You summarize long PID documents for extraction. Only include facts from the INPUT.
Do NOT invent details. Output concise plain text with headings.

Include sections when present:
- Title/Overview
- Objectives
- KPIs
- Scope Inclusions/Exclusions
- Assumptions/Constraints/Dependencies
- Stakeholders/Sponsor/PM
- Timeline/Milestones
- Work Breakdown
- Budget/Cost
- Resources/Tools
- Risks/Mitigations
- Issues/Decisions
- Communication/Governance/Compliance
- Notes/Background

Keep it short and factual. No JSON.
`;

function heuristicCondenseText(text) {
  const lines = String(text || '').split(/\r?\n/);
  const headerRe = /^(#{1,6}\s+|[A-Z][A-Z0-9\s\-:]{6,}|\d+\.\s+|[-*•]\s+)/;
  const keywordRe = /(objective|kpi|scope|assumption|constraint|dependency|stakeholder|timeline|milestone|work breakdown|wbs|budget|cost|resource|risk|mitigation|issue|decision|communication|governance|approval|compliance|privacy|security|background|summary)/i;
  const kept = [];
  let total = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (headerRe.test(line) || keywordRe.test(line)) {
      kept.push(line);
      total += line.length + 1;
      if (total > 120000) break;
    }
  }
  const joined = kept.join('\n');
  if (joined.length < 2000) {
    return String(text || '').slice(0, 120000);
  }
  return joined.slice(0, 120000);
}

async function prepareParseText(text, modelName) {
  const warnings = [];
  let parseText = text;
  if (text.length > 80000 || countWords(text) > 10000) {
    parseText = heuristicCondenseText(text);
    if (process.env.DEBUG_PARSE_WARNINGS === '1') warnings.push('Input was condensed to key lines for faster parsing.');
  }
  if (parseText.length > 60000 && GoogleGenerativeAI && process.env.GOOGLE_API_KEY) {
    try {
      const fastModel = process.env.GEMINI_SUMMARY_MODEL || 'gemini-2.5-flash';
      const summary = await geminiJson(fastModel, PARSE_SUMMARY_PROMPT, parseText);
      if (summary && typeof summary === 'string' && summary.trim().length > 200) {
        parseText = summary.trim();
        if (process.env.DEBUG_PARSE_WARNINGS === '1') warnings.push('Input was summarized with a fast model to avoid timeouts.');
      }
    } catch {
      if (process.env.DEBUG_PARSE_WARNINGS === '1') warnings.push('Fast summary step failed; used condensed input.');
    }
  }
  return { parseText, warnings };
}

const BUDGET_SYSTEM_PROMPT = `
You are a strict JSON generator for PMOMax budget data. You MUST return only the fields below.

Return a SINGLE JSON object and nothing else:
{
  "budgetCostBreakdown": [
    {
      "task": string,
      "role": string,
      "estimatedHours": number,
      "rateUsdPerHour": number,
      "complexityMultiplier": number,
      "totalCostUsd": number,
      "justification": string,
      "source": "ai"
    }
  ],
  "budgetSummary": {
    "currency": "USD",
    "totalCostUsd": number,
    "subtotalByRoleUsd": { "Engineering": number },
    "notes": string[]
  }
}

Rules:
- Ground all numbers in the provided input. If specific numbers are missing, use conservative numeric placeholders only when unavoidable.
- Keep the list short (3–12 line items).
- Use currency "USD".
- Do not remove or invalidate deterministic coverage.
`;

// --------------------
// Health endpoints
// --------------------
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Most deploy scripts / probes expect a simple 200 at one of these:
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/_healthz', (_req, res) => res.status(200).send('ok'));
app.get('/_ah/health', (_req, res) => res.status(200).send('ok'));

// --------------------
// API routes
// --------------------
// Risk Agent Endpoint
app.post('/api/ai/risk', async (req, res) => {
  try {
    const pidData = isPlainObject(req.body?.pidData) ? req.body.pidData : makeEmptyPid();

    const existing = Array.isArray(pidData.risks) ? pidData.risks : [];
    const suggestions = [];

    // Helper to normalize an entry
    const norm = (r, defaults = {}) => ({
      risk: r.risk || defaults.risk || '',
      probability: r.probability || defaults.probability || 'Medium',
      impact: r.impact || defaults.impact || 'Medium',
      suggestedMitigation: r.suggestedMitigation || r.mitigation || defaults.suggestedMitigation || '',
      suggestedContingency: r.suggestedContingency || r.contingency || defaults.suggestedContingency || '',
    });

    // Preserve & normalize user-provided risks
    for (const r of existing) {
      suggestions.push(norm(r));
    }

    // If there are no risks, propose common, project-generic risks based on PID content
    if (!suggestions.length) {
      suggestions.push(
        norm({ risk: 'Stakeholder availability delays decisions' }, { probability: 'Medium', impact: 'High', suggestedMitigation: 'Schedule recurring decision checkpoints; assign alternates', suggestedContingency: 'Elevate to sponsor if decisions stall' })
      );
      suggestions.push(
        norm({ risk: 'Security review extends timeline' }, { probability: 'Medium', impact: 'Medium', suggestedMitigation: 'Engage security early and pre-book reviews', suggestedContingency: 'Use phased rollout or temporary controls' })
      );
      suggestions.push(
        norm({ risk: 'Dependency slippage impacts critical path' }, { probability: 'Medium', impact: 'High', suggestedMitigation: 'Track dependencies with owners and dates', suggestedContingency: 'De-scope non-critical items to protect launch date' })
      );
    } else {
      // Add heuristic-based gaps: if no mitigation present, suggest one
      for (const s of suggestions) {
        if (!s.suggestedMitigation) s.suggestedMitigation = 'Define owner, action and due date for mitigation';
        if (!s.suggestedContingency) s.suggestedContingency = 'Prepare fallback plan and decide go/no-go criteria';
      }
    }

    const reply = `Risk analysis complete. Returned ${suggestions.length} items (including normalized user entries and suggested risks).`;
    return res.json({ ok: true, reply, risks: suggestions });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Risk agent failed.', details: safeErrorMessage(e) });
  }
});

// Compliance Agent Endpoint
app.post('/api/ai/compliance', async (req, res) => {
  try {
    const pidData = isPlainObject(req.body?.pidData) ? req.body.pidData : makeEmptyPid();

    const governance = Array.isArray(pidData.governanceApprovals) ? pidData.governanceApprovals : [];
    const compliance = Array.isArray(pidData.complianceSecurityPrivacy) ? pidData.complianceSecurityPrivacy : [];

    const defs = [
      { key: 'Access control', owner: 'Security', desc: 'Least privilege and access review' },
      { key: 'Data privacy', owner: 'Legal/Compliance', desc: 'PII handling and retention policy' },
      { key: 'Data retention', owner: 'Legal/Compliance', desc: 'Retention and deletion schedule for logs/data' },
      { key: 'Security checklist', owner: 'Security', desc: 'Threat model, pen test / checklist' },
      { key: 'Go-live approvals', owner: 'Sponsor/Ops', desc: 'Sponsor and Ops signoff for production release' },
    ];

    const checklist = defs.map((d) => {
      const presentInCompliance = compliance.some((c) => String(c.requirement || c.key || '').toLowerCase().includes(d.key.toLowerCase()));
      const presentInGovernance = governance.some((g) => String(g.gate || g.signoffRequirement || g.requirement || '').toLowerCase().includes(d.key.toLowerCase()));
      const status = presentInCompliance || presentInGovernance ? 'Present' : 'Missing';
      const found = presentInCompliance ? compliance.find((c) => String(c.requirement || c.key || '').toLowerCase().includes(d.key.toLowerCase())) : presentInGovernance ? governance.find((g) => String(g.gate || g.signoffRequirement || g.requirement || '').toLowerCase().includes(d.key.toLowerCase())) : null;
      const owner = (found && (found.owner || found.teamOrSystem || found.notes)) ? (found.owner || found.teamOrSystem || d.owner) : d.owner;
      return { requirement: d.key, status, suggestedOwner: owner, notes: found ? (found.notes || '') : d.desc };
    });

    const reply = `Compliance scan complete. ${checklist.filter((c) => c.status === 'Missing').length} items missing.`;
    return res.json({ ok: true, reply, checklist });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Compliance agent failed.', details: safeErrorMessage(e) });
  }
});
app.post('/api/ai/parse', async (req, res) => {
  try {
    const startMs = Date.now();
    const text = String(req.body?.text || '');
    if (!text.trim()) return sendJson(res, { ok: false, error: 'Missing text.' });
    const wc = countWords(text);
    if (wc > MAX_WORDS) {
      const msg = `Document too long (${wc.toLocaleString()} words).`;
      return sendJson(res, { ok: false, error: msg }, 400);
    }
    if (text.length > PARSE_HARD_MAX_CHARS) {
      const msg = 'Text too large. Please shorten and try again.';
      return sendJson(res, { ok: false, error: msg }, 400);
    }

    const modelName = process.env.GEMINI_MODEL || process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash-001';
    const prep = await prepareParseText(text, modelName);
    const parseText = prep.parseText;
    const prepWarnings = prep.warnings || [];

    // Try AI extraction first (best effort). Never let AI failure break parsing.
    // We attempt a primary model and (if different) a fallback model.
    let aiObj = {};
    let aiWarnings = [];
    let aiRaw = null;

    const fallbackModelName = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash-001';
    const modelTryOrder = [modelName, fallbackModelName].filter((m, i, a) => m && a.indexOf(m) === i);

    for (const m of modelTryOrder) {
      try {
        aiRaw = await geminiJson(m, PARSE_SYSTEM_PROMPT, parseText);
        const extracted = extractFirstJsonObject(aiRaw);
        if (extracted && typeof extracted === 'object' && Object.keys(extracted).length > 0) {
          aiObj = extracted;
          break;
        } else {
          aiWarnings.push(`AI parse returned no JSON object (model: ${m}).`);
        }
      } catch (e) {
        aiWarnings.push(`AI parse failed or returned invalid JSON (model: ${m}).`);
      }
    }

    // Deterministic parse (server-side heuristic; no external localParser dependency)
    const detPid = buildFallbackPidFromText(parseText);
    let detFields = pidToLegacyFields(detPid);

    // Collect AI legacy fields from either aiObj.fields or top-level fld-* keys
    const aiFields = {};
    if (aiObj && typeof aiObj === "object") {
      if (aiObj.fields && typeof aiObj.fields === "object") {
        Object.assign(aiFields, aiObj.fields);
      }
      for (const [k, v] of Object.entries(aiObj)) {
        if (k.startsWith("fld-") || k === "notes-area") aiFields[k] = v;
      }
    }

    // Merge fields: deterministic first, AI overrides
    const mergedFields = { ...detFields, ...aiFields };
    for (const k of FIELD_KEYS) {
      if (mergedFields[k] == null) mergedFields[k] = "";
    }

    // Merge tables (AI overrides)
    const mergedTables = {
      ...(detPid.tables && typeof detPid.tables === "object" ? detPid.tables : {}),
      ...(aiObj.tables && typeof aiObj.tables === "object" ? aiObj.tables : {}),
    };

    // Merge canonical PID content: deterministic base, AI overrides if it provided those keys
    const pidInput = { ...detPid, ...aiObj, fields: mergedFields, tables: mergedTables };
    const pid = applyDeterministicBudget(mergeWithEmptyPid(pidInput));
    try {
      validatePidShape(pid);
    } catch (err) {
      const fallback = applyDeterministicBudget(mergeWithEmptyPid(buildFallbackPidFromText(parseText)));
      const warnings = (process.env.DEBUG_PARSE_WARNINGS === '1')
        ? [...prepWarnings, ...aiWarnings, 'Parsed PID failed validation; returned a lightweight PID from extracted text.']
        : [...aiWarnings];
      const durationMs = Math.max(1, Date.now() - startMs);
      return sendJson(res, { ok: true, pid: fallback, warnings, durationMs, length: parseText.length });
    }

    const durationMs = Math.max(1, Date.now() - startMs);
    const userWarnings = (process.env.DEBUG_PARSE_WARNINGS === '1') ? [...prepWarnings, ...aiWarnings] : [...aiWarnings];
    return sendJson(res, { ok: true, pid, warnings: userWarnings, durationMs, length: parseText.length });
  } catch (e) {
    const msg = safeErrorMessage(e, 'Parse failed.');
    console.error('Unexpected /api/ai/parse error:', e);
    // Keep contract stable: ok:false on error
    return sendJson(res, { ok: false, error: msg, truncated: true });
  }
});

// Budget Agent Endpoint (deterministic baseline + optional AI enrichment)
app.post('/api/ai/budget', async (req, res) => {
  try {
    const pidData = isPlainObject(req.body?.pidData) ? req.body.pidData : makeEmptyPid();
    const contextText = String(req.body?.contextText || '');
    const basePid = applyDeterministicBudget(mergeWithEmptyPid(pidData), contextText);
    const baseItems = normalizeBudgetItems(basePid.budgetCostBreakdown, 'deterministic');
    const baseSummary = buildBudgetSummaryFromItems(baseItems);
    const baseResponsePid = {
      ...basePid,
      budgetCostBreakdown: baseItems,
      budgetSummary: baseSummary,
    };

    if (!GoogleGenerativeAI || !process.env.GOOGLE_API_KEY) {
      return sendJson(res, { ok: true, pid: baseResponsePid, warnings: ['AI budget not configured; deterministic baseline applied.'] });
    }

    const modelName = process.env.GEMINI_BUDGET_MODEL || process.env.GEMINI_MODEL || process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash-001';
    const sourceText = String(req.body?.text || '');

    const budgetInput = `PID JSON:\n${JSON.stringify(pidData).slice(0, 14000)}\n\nContext:\n${contextText.slice(0, 6000)}\n\nSource Text:\n${sourceText.slice(0, 6000)}`;

    let raw = '';
    try {
      raw = await geminiJson(modelName, BUDGET_SYSTEM_PROMPT, budgetInput);
    } catch (err) {
      const msg = typeof err?.message === 'string' ? err.message : '';
      const warn = msg ? `AI budget unavailable: ${msg}` : 'AI budget unavailable.';
      return sendJson(res, { ok: true, pid: baseResponsePid, warnings: [warn] });
    }

    let obj;
    try {
      obj = extractFirstJsonObject(raw);
    } catch (err) {
      return sendJson(res, { ok: true, pid: baseResponsePid, warnings: ['AI budget response invalid; deterministic baseline applied.'] });
    }

    const aiItems = normalizeBudgetItems(obj?.budgetCostBreakdown, 'ai');
    const mergedItems = mergeBudgetItems(baseItems, aiItems);
    const mergedSummary = buildBudgetSummaryFromItems(mergedItems);

    const next = {
      ...basePid,
      budgetCostBreakdown: mergedItems,
      budgetSummary: mergedSummary,
    };

    return sendJson(res, { ok: true, pid: next });
  } catch (e) {
    const msg = safeErrorMessage(e, 'Budget endpoint failed.');
    return sendJson(res, { ok: false, error: msg }, 500);
  }
});

app.post('/api/ai/assistant', async (req, res) => {
  try {
    const pidData = isPlainObject(req.body?.pidData) ? req.body.pidData : makeEmptyPid();
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const modelOverride = typeof req.body?.model === 'string' ? req.body.model : null;

    const safeText = (v) => {
      if (typeof v === 'string') return v;
      if (v === null || v === undefined) return '';
      try { return JSON.stringify(v); } catch { return String(v); }
    };

    const lastUserText = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if ((m?.role || '') === 'user') return safeText(m?.content ?? m?.text ?? '');
      }
      return '';
    })();

    const mmddyyyy = (d) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    const yyyymmdd = (d) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    };

    const addDays = (d, days) => {
      const x = new Date(d.getTime());
      x.setDate(x.getDate() + days);
      return x;
    };

    const mergeWithEmpty = (obj) => {
      const base = makeEmptyPid();
      if (!isPlainObject(obj)) return base;
      return { ...base, ...obj };
    };

    const looksLikeCreate = (text) =>
      /\b(create|draft|generate|build|write|new pid|start a project|project for|make a pid)\b/i.test(String(text || ''));

    const extractJsonObject = (raw) => {
      const s = String(raw || '').trim();
      if (!s) return null;
      // fence
      const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const candidates = [];
      if (fence?.[1]) candidates.push(fence[1]);
      candidates.push(s);

      for (const c of candidates) {
        const t = String(c || '').trim();
        if (!t) continue;
        const first = t.indexOf('{');
        const last = t.lastIndexOf('}');
        if (first === -1 || last === -1 || last <= first) continue;
        const slice = t.slice(first, last + 1);
        try { return JSON.parse(slice); } catch { /* ignore */ }
      }
      return null;
    };

    // Generate a canonical PID using the user's prompt as context for all fields
    const buildCanonicalPid = (requestText) => {
      const now = new Date();
      const today = yyyymmdd(now);
      const start = addDays(now, 1);
      const d = (days) => yyyymmdd(addDays(start, days));
      const raw = String(requestText || '').trim();
      const title = (raw.split(/\n/)[0] || '').trim() || 'Untitled Project';
      const pidId = `PID-${today.replace(/-/g, '')}-${Math.floor(now.getTime() / 1000)}`;

      return mergeWithEmpty({
        titleBlock: {
          projectTitle: title.slice(0, 90),
          subtitle: 'Project Initiation Document',
          generatedOn: today,
          projectId: pidId,
        },
        executiveSummary:
          `This PID defines the scope, schedule, risks, governance, and delivery plan for "${title}". ` +
          `It is designed to produce a clear baseline plan and measurable outcomes within the first release cycle.`,
        problemStatement:
          `Today, work related to "${title}" is fragmented, manual, and difficult to measure end-to-end. ` +
          `This creates delays, quality variance, and unclear ownership across teams.`,
        businessCaseExpectedValue:
          `Expected value: reduce cycle time and rework, improve predictability, and create reusable components. ` +
          `Target ROI: measurable efficiency and quality improvements within 1–2 quarters after launch.`,
        objectivesSmart: [
          { objective: 'Ship an MVP that supports core workflows', successMeasure: 'MVP live with usage telemetry and basic reporting' },
          { objective: 'Improve efficiency and throughput', successMeasure: '25% cycle-time reduction from baseline by end of quarter' },
          { objective: 'Increase quality and reliability', successMeasure: '30% reduction in defects/rework vs baseline' },
          { objective: 'Enable adoption', successMeasure: '≥70% of target users onboarded within 30 days of launch' },
        ],
        kpis: [
          { kpi: 'Cycle time (days)', baseline: 'TBD', target: '-25% vs baseline' },
          { kpi: 'Defect / rework rate', baseline: 'TBD', target: '-30% vs baseline' },
          { kpi: 'On-time delivery (%)', baseline: 'TBD', target: '≥90%' },
          { kpi: 'Adoption (%)', baseline: '0%', target: '≥70% in 30 days' },
        ],
        scopeInclusions: [
          'Requirements and success metrics definition',
          'Solution design and implementation',
          'Testing and validation',
          'Launch readiness and enablement',
          'Post-launch monitoring and iteration',
        ],
        scopeExclusions: [
          'Major legacy system re-architecture',
          'Full enterprise rollout beyond initial target group (post-MVP phase)',
          'Non-critical feature requests not required for MVP success',
        ],
        assumptions: [
          { assumption: 'Key stakeholders are available weekly for reviews and decisions.' },
          { assumption: 'Required environments/access are provisioned within 1 week of kickoff.' },
          { assumption: 'Dependencies can meet agreed timelines for integration and reviews.' },
        ],
        constraints: [
          { constraint: 'Fixed delivery window with limited engineering bandwidth.' },
          { constraint: 'Security/compliance review required before go-live.' },
          { constraint: 'Only incremental changes permitted to critical production systems during the project.' },
        ],
        dependencies: [
          { dependency: 'Identity/SSO configuration', teamOrSystem: 'IT', status: 'Planned' },
          { dependency: 'Data access approvals', teamOrSystem: 'Security', status: 'Planned' },
          { dependency: 'Provisioned environments', teamOrSystem: 'Platform', status: 'Planned' },
        ],
        stakeholders: [
          { name: 'Executive Sponsor (TBD)', role: 'Sponsor', contact: 'TBD' },
          { name: 'Operations Lead (TBD)', role: 'Process Owner', contact: 'TBD' },
          { name: 'Security (TBD)', role: 'Compliance Owner', contact: 'TBD' },
          { name: 'Engineering Team', role: 'Delivery', contact: 'TBD' },
        ],
        projectSponsor: { name: 'TBD', role: 'Executive Sponsor' },
        projectManagerOwner: { name: 'TBD', role: 'Project Manager' },
        teamRaci: [
          { teamMember: 'PM', role: 'Delivery Lead', responsible: 'X', accountable: 'X', consulted: '', informed: 'X' },
          { teamMember: 'Engineering', role: 'Implementation', responsible: 'X', accountable: '', consulted: 'X', informed: 'X' },
          { teamMember: 'QA', role: 'Validation', responsible: 'X', accountable: '', consulted: '', informed: 'X' },
          { teamMember: 'Security', role: 'Review', responsible: '', accountable: 'X', consulted: 'X', informed: 'X' },
        ],
        timelineOverview: `Discovery (${d(0)}–${d(7)}), Build (${d(7)}–${d(35)}), Launch (${d(35)}–${d(45)}), Stabilize (${d(45)}–${d(60)}).`,
        milestones: [
          { milestone: 'Kickoff complete', targetDate: d(2) },
          { milestone: 'Requirements signed-off', targetDate: d(7) },
          { milestone: 'MVP complete', targetDate: d(35) },
          { milestone: 'Go-live', targetDate: d(45) },
          { milestone: 'Stabilization complete', targetDate: d(60) },
        ],
        workBreakdownTasks: [
          { name: 'Kickoff & discovery', start: d(0), end: d(5), owner: 'PM', status: 'Planned', priority: 'High', kind: 'Task', dependencies: [] },
          { name: 'Requirements & success metrics', start: d(2), end: d(7), owner: 'PM', status: 'Planned', priority: 'High', kind: 'Task', dependencies: ['Kickoff & discovery'] },
          { name: 'Solution design', start: d(5), end: d(14), owner: 'Engineering', status: 'Planned', priority: 'High', kind: 'Task', dependencies: ['Requirements & success metrics'] },
          { name: 'Implementation', start: d(14), end: d(35), owner: 'Engineering', status: 'Planned', priority: 'High', kind: 'Task', dependencies: ['Solution design'] },
          { name: 'Security & privacy review', start: d(21), end: d(35), owner: 'Security', status: 'Planned', priority: 'High', kind: 'Task', dependencies: ['Solution design'] },
          { name: 'Testing & validation', start: d(28), end: d(40), owner: 'QA', status: 'Planned', priority: 'Medium', kind: 'Task', dependencies: ['Implementation'] },
          { name: 'Launch readiness & enablement', start: d(35), end: d(45), owner: 'PM', status: 'Planned', priority: 'High', kind: 'Milestone', dependencies: ['Testing & validation', 'Security & privacy review'] },
          { name: 'Post-launch monitoring', start: d(45), end: d(60), owner: 'Ops', status: 'Planned', priority: 'Low', kind: 'Task', dependencies: ['Launch readiness & enablement'] },
        ],
        budgetCostBreakdown: [
          { item: 'Engineering (6–8 wks)', category: 'Labor', cost: '$TBD' },
          { item: 'QA & UAT', category: 'Labor', cost: '$TBD' },
          { item: 'Cloud / tooling', category: 'Infrastructure', cost: '$TBD' },
          { item: 'Contingency', category: 'Buffer', cost: '$TBD' },
        ],
        resourcesTools: [
          { resource: 'Project workspace', purpose: 'Planning, documentation, decisions' },
          { resource: 'CI/CD pipeline', purpose: 'Build and deploy automation' },
          { resource: 'Monitoring/alerting', purpose: 'Stability and incident response' },
        ],
        risks: [
          { risk: 'Stakeholder availability delays decisions', probability: 'Medium', impact: 'High' },
          { risk: 'Security review extends timeline', probability: 'Medium', impact: 'Medium' },
          { risk: 'Dependency slippage impacts critical path', probability: 'Medium', impact: 'High' },
        ],
        mitigationsContingencies: [
          { mitigation: 'Weekly stakeholder reviews with decision log', contingency: 'Escalate blockers within 24 hours' },
          { mitigation: 'Pre-schedule security checkpoints', contingency: 'Use staged rollout if approvals slip' },
          { mitigation: 'Track dependencies with owners and dates', contingency: 'De-scope non-critical items to protect launch date' },
        ],
        issuesDecisionsLog: [
          { issue: 'Finalize success metrics baseline', decision: 'Run baseline measurement in week-1', owner: 'PM', date: today },
        ],
        communicationPlan: [
          { audience: 'Core team', cadence: 'Daily', channel: 'Standup' },
          { audience: 'Stakeholders', cadence: 'Weekly', channel: 'Status email' },
          { audience: 'Leadership', cadence: 'Biweekly', channel: 'Review meeting' },
        ],
        governanceApprovals: [
          { gate: 'Scope & timeline', signoffRequirement: 'Sponsor approval (email or ticket)' },
          { gate: 'Security checklist', signoffRequirement: 'Security approval (ticket)' },
          { gate: 'Go-live', signoffRequirement: 'Sponsor + Ops signoff' },
        ],
        complianceSecurityPrivacy: [
          { requirement: 'Access control', notes: 'Least privilege, reviewed before go-live' },
          { requirement: 'Data privacy', notes: 'Identify any PII and define retention/handling' },
        ],
        openQuestionsNextSteps: [
          { question: 'What is the baseline for cycle time / quality today?', nextStep: 'Collect baseline metrics in week-1 and confirm targets.' },
          { question: 'Who are the final approvers for go-live?', nextStep: 'Confirm governance gates and approvers during kickoff.' },
        ],
        notesBackground: raw || `Generated starter PID for "${title}". Update sections as new decisions are made.`,
      });
    };

    // --- Intent Classification ---
    const classifyIntent = (text) => {
      const t = String(text || '').trim();
      if (!t) return 'gibberish_or_invalid';

      // 1. Gibberish detection (enhanced)
      // Repeated single char: 'aaaa', 'gggg', '!!!!'
      if (/^(.)\1{2,}$/.test(t)) return 'gibberish_or_invalid';
      
      // Very short with no vowels and only letters: 'gggg', 'xyz', 'hmm'
      if (t.length <= 6 && /[a-z]/i.test(t) && !/[aeiou]/i.test(t)) return 'gibberish_or_invalid';
      
      // Mostly non-alphanumeric or no meaningful characters
      if (!/[A-Za-z0-9]/.test(t)) return 'gibberish_or_invalid';
      
      // Low character diversity (e.g., 'asdasdasd', 'abcabcabc')
      const uniqueChars = new Set(t.toLowerCase().replace(/\s/g, ''));
      if (t.length > 5 && uniqueChars.size < 4) return 'gibberish_or_invalid';

      // 2. Q&A / Informational detection
      const lowerText = t.toLowerCase();
      
      // Questions about the system itself
      const systemQuestions = [
        /\b(what do you do|what can you do|how do(?:es)? (?:this|pmomax) work|what is pmomax|what are you|who are you|help me)\b/i,
        /\b(explain|describe|tell me about) (?:pmomax|this|how)/i,
        /\bhow (?:to|do i|can i)\b/i,
      ];
      if (systemQuestions.some(re => re.test(lowerText))) return 'informational_qa';
      
      // Questions with question words or ending with '?'
      if (/\?$/.test(t) || /^\s*(what|how|why|when|who|where|which|can you|could you|should|is there)\b/i.test(t)) {
        // But check if it's a create intent disguised as a question
        const createKeywords = /\b(create|draft|generate|build|make|write|start) (?:a |an )?(?:pid|project|initiation|document|plan)\b/i;
        if (!createKeywords.test(lowerText)) {
          return 'informational_qa';
        }
      }

      // 3. Create PID detection
      const createPatterns = [
        /\b(create|draft|generate|build|write|make|start|new) (?:a |an )?(?:pid|project initiation|initiation document|project plan|project for)/i,
        /\bneed (?:a |an )?(?:pid|project plan)\b/i,
        /\b(?:pid|project) for (?:a |an |the )?(?:new|upcoming)/i,
      ];
      if (createPatterns.some(re => re.test(lowerText))) return 'create_pid';

      // 4. Edit/patch detection
      const editPatterns = [
        /\b(update|change|modify|edit|replace|add|remove|shorten|lengthen|improve|fix) (?:the )?(?:risk|milestone|scope|objective|summary|sponsor|budget|gantt|timeline|kpi)/i,
        /\badd (?:a |an )?(?:milestone|risk|task|objective|stakeholder)/i,
        /\breplace .+ with/i,
        /\bshorten (?:the )?(?:summary|executive summary)/i,
      ];
      if (editPatterns.some(re => re.test(lowerText))) return 'edit_existing_pid';

      // 5. Default: if text is long enough and has structure, assume informational Q&A
      // (prevents accidental PID creation from unclear input)
      if (t.length < 15) return 'informational_qa';
      
      // If user wrote a substantial prompt but no clear create intent, treat as Q&A
      return 'informational_qa';
    };

    const smartDemoAssistant = () => {
      const text = String(lastUserText || '').trim();
      const intent = classifyIntent(text);

      // Gibberish handling
      if (intent === 'gibberish_or_invalid') {
        return { ok: true, reply: "Sorry, that input doesn't look like a valid question or request." };
      }

      // Q&A / Informational handling
      if (intent === 'informational_qa') {
        const q = text.toLowerCase();
        
        // System questions
        if (/\b(what do you do|what can you do|help|what is pmomax|what are you)\b/.test(q)) {
          return {
            ok: true,
            reply: "I'm PMOMax, your AI assistant for project initiation documents. I can help you: (1) Parse and structure PIDs from text or documents, (2) Draft complete PIDs from scratch, (3) Edit and refine existing PIDs, (4) Answer questions about your project. Try saying 'create a PID for [project name]' or paste your project text to get started."
          };
        }

        // PID-specific questions (when PID exists)
        // PID-specific questions (when PID exists)
        if (pidData && isPlainObject(pidData) && pidData.titleBlock && pidData.titleBlock.projectTitle) {
          // Owner question
          if (/\bwho\b/.test(q) && /\b(owner|owns|sponsor|project sponsor|project owner|project manager)\b/.test(q)) {
            const sponsor = pidData?.projectSponsor?.name || '';
            const pm = pidData?.projectManagerOwner?.name || '';
            let reply = '';
            if (sponsor && pm) {
              reply = `Project sponsor: ${sponsor}. Project manager / owner: ${pm}.`;
            } else if (sponsor) {
              reply = `Project sponsor: ${sponsor}.`;
            } else if (pm) {
              reply = `Project manager / owner: ${pm}.`;
            } else {
              reply = `I don't see an explicit sponsor or project manager in the PID for "${pidData.titleBlock.projectTitle}".`;
            }
            return { ok: true, reply };
          }

          // General PID info
          const title = pidData.titleBlock.projectTitle;
          const summary = (pidData.executiveSummary || '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
          const riskCount = Array.isArray(pidData.risks) ? pidData.risks.length : 0;
          return { 
            ok: true, 
            reply: `Project: ${title}. Executive summary: ${summary || 'No executive summary yet.'} Risks identified: ${riskCount}. Ask me a specific field (e.g., "who is the sponsor?") or say "update [field]" to make changes.` 
          };
        }

        // No PID loaded
        return { 
          ok: true, 
          reply: "I don't have a PID loaded. If you'd like, paste your project text, upload a document, or say 'create a PID for [your project]' to draft one from scratch." 
        };
      }

      // Create PID intent
      if (intent === 'create_pid') {
        const pid = buildCanonicalPid(text);
        return {
          ok: true,
          reply: '✅ Drafted a new PID. Review the draft and say "apply" to replace the current PID, or ask for edits.',
          pid,
          apply: false,
        };
      }

      // Edit/patch intent
      if (intent === 'edit_existing_pid') {
        const patch = {};
        let reply = '';

        // Shorten executive summary (keep it conservative)
        if (/\bshorten\b/i.test(text) && /\bsummary\b/i.test(text)) {
          const src = String(pidData?.executiveSummary || '').trim();
          if (src) {
            const shortened = src.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
            patch.executiveSummary = shortened.length > 20 ? shortened : src.slice(0, 240);
            reply = '✅ Shortened the Executive Summary (kept concise — review for tone).';
          } else {
            reply = 'I could not find an Executive Summary to shorten. Would you like me to draft one?';
          }
        }

        // Add milestone
        const ms = text.match(/\badd\s+milestone\b[:\-]?\s*(.+)$/i);
        if (ms?.[1]) {
          const label = ms[1].trim();
          const arr = Array.isArray(pidData?.milestones) ? pidData.milestones : [];
          const now = new Date();
          const date = yyyymmdd(addDays(now, 21));
          patch.milestones = [...arr, { milestone: label, targetDate: date }];
          reply = reply || `✅ Added milestone: ${label}.`;
        }

        // Replace sponsor
        const rep = text.match(/\breplace\s+sponsor\s+with\s+(.+)$/i);
        if (rep?.[1]) {
          const name = rep[1].trim();
          patch.projectSponsor = { ...(pidData?.projectSponsor || {}), name };
          reply = reply || `✅ Updated Project Sponsor to ${name}.`;
        }

        // If no patch was generated, provide helpful guidance
        if (!Object.keys(patch).length) {
          reply = 'I did not detect a clear field edit. Examples: "shorten executive summary", "add milestone: Grand Opening", or "replace sponsor with John Smith". Or say "suggest edits" for recommended improvements.';
        }

        return { ok: true, reply, patch };
      }

      // Fallback for ambiguous text: treat as Q&A to avoid accidental PID creation
      return { 
        ok: true, 
        reply: 'I\'m not sure what you\'d like me to do. Try: "create a PID for [project]" to draft, "add milestone: [name]" to edit, or ask a question like "what are the risks?"' 
      };
    };

    // If Gemini is not available, run deterministic smart behavior instead of a dead demo response.
    if (!GoogleGenerativeAI || !process.env.GOOGLE_API_KEY) {
      return res.json(smartDemoAssistant());
    }

    // Always do intent detection BEFORE calling the model so we never accidentally create/patch a PID
    // for simple questions or invalid input.
    const topIntent = classifyIntent(lastUserText);

    if (topIntent === 'gibberish_or_invalid') {
      return res.json({ ok: true, reply: "Sorry, that input doesn't look like a valid question or request." });
    }

    // For informational Q&A, do NOT create or patch a PID. Answer normally, and suggest Create mode when helpful.
    if (topIntent === 'informational_qa') {
      const key = process.env.GOOGLE_API_KEY;
      const genAI = new GoogleGenerativeAI(key);
      const modelName =
        modelOverride ||
        process.env.GEMINI_ASSISTANT_QA_MODEL ||
        process.env.GEMINI_ASSISTANT_MODEL ||
        process.env.GEMINI_MODEL ||
        'gemini-2.0-flash-001';
      const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
      const qaModel = genAI.getGenerativeModel({ model: modelName });

      const recentQA = messages
        .slice(-12)
        .map((m) => {
          const t = safeText(m?.content ?? m?.text ?? '');
          return `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${t}`;
        })
        .join('\n');

      const qaPrompt = `
You are PMOMax, an AI copilot for project managers. The user is asking an INFORMATIONAL QUESTION.

Return a SINGLE JSON object and NOTHING else:
{ "reply": string }

Rules:
- Do NOT return "pid" or "patch" for informational questions.
- If the user seems to want a full PID drafted, direct them to use the Create mode / Create Agent (say: "Use the Create tab / Create Agent to draft a full PID").
- Be concise, helpful, and accurate. If unclear, ask a clarifying question in the reply (but do not create a PID).

Current PID snapshot (for context only; do not modify it):
${JSON.stringify(pidData).slice(0, 14000)}

Conversation:
${recentQA}
`;

      const runQA = async (m) => {
        const r = await m.generateContent(qaPrompt);
        const response = await r.response;
        return response.text();
      };

      let qaText = '';
      let qaParsed = null;
      try {
        qaText = await runQA(qaModel);
        qaParsed = extractJsonObject(qaText);
      } catch (e) {
        try {
          const fb = genAI.getGenerativeModel({ model: fallbackModel });
          qaText = await runQA(fb);
          qaParsed = extractJsonObject(qaText);
        } catch (e2) {
          // Hard fallback: deterministic answer to avoid breaking UX
          return res.json({
            ok: true,
            reply:
              "I can answer questions and help you draft or edit a PID. If you want a full PID, use the Create tab / Create Agent. What would you like to do?",
          });
        }
      }

      const qaReply =
        qaParsed && isPlainObject(qaParsed) && typeof qaParsed.reply === 'string' && qaParsed.reply.trim()
          ? qaParsed.reply.trim()
          : safeText(qaText).trim() || 'Done.';

      return res.json({ ok: true, reply: qaReply });
    }


    // --- Gemini Model Selection and Fallback for Assistant ---
    const modelName =
      modelOverride ||
      process.env.GEMINI_ASSISTANT_MODEL ||
      process.env.GEMINI_MODEL ||
      'gemini-2.0-flash-001';

    const key = process.env.GOOGLE_API_KEY;
    const genAI = new GoogleGenerativeAI(key);
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const recent = messages
      .slice(-12)
      .map((m) => {
        const t = safeText(m?.content ?? m?.text ?? '');
        return `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${t}`;
      })
      .join('\n');

    const assistantPrompt = `
You are PMOMax, an AI copilot for PMO leaders and project managers.

User intent classification: ${topIntent}

You MUST respond with a SINGLE JSON object and NOTHING else.

OUTPUT JSON SHAPE:
{
  "reply": string,
  "patch"?: object,   // Partial PMOMaxPID with ONLY the fields you want to change
  "pid"?: object      // Full PMOMaxPID (use ONLY when the user is creating/drafting a new PID)
}

RULES:
- The intent is authoritative: if intent is informational_qa, return only {"reply": ...} and do NOT include pid/patch.
- If intent is create_pid, return a full "pid".
- If intent is edit_existing_pid, return only "patch" with changes.
- If the user is asking to create/draft/generate a new project PID, return "pid" (a complete PMOMaxPID with ALL fields present).
- Otherwise return "patch" with only changed fields.
- Always keep correct data types (arrays as arrays, objects as objects).
- When modifying a list/table, return the FULL updated array for that field.
- Avoid placeholders like "[Name]" or "[Date]" - choose realistic values.

+- For "workBreakdownTasks" in CREATE/DRAFT flows:
+  - Treat this as the actual Gantt schedule for the project, not a generic checklist.
+  - Prefer 6-18 concrete tasks that clearly reflect the project the user described (e.g., phases, migration waves, reviews, cutover, stabilization).
+  - Use realistic ISO date strings (format: YYYY-MM-DD) for start and end that cover the full project duration the user mentions (for example, a 3-month project should have tasks spread across roughly 3 months, not all on the same day).
+  - Do NOT put every task on the same single date; each task should have a sensible duration and the overall set should form a believable timeline.
  - Never create generic placeholder rows like "Task - Owner", "Task 1 - Owner", or rows where the task name is just "Task" and the owner is just "Owner"/"TBD"/"Person"/"Name".
  - If you cannot infer specific tasks or owners from the user input, leave those fields empty or omit that row instead of inventing placeholder labels.

Current PID snapshot (JSON):
${JSON.stringify(pidData).slice(0, 14000)}

Conversation:
${recent}
`;

    const run = async (m) => {
      const r = await m.generateContent(assistantPrompt);
      const response = await r.response;
      return response.text();
    };

    let replyText = '';
    let parsed = null;

    try {
      replyText = await run(model);
      parsed = extractJsonObject(replyText);
    } catch (e) {
      try {
        const fallback = genAI.getGenerativeModel({ model: fallbackModel });
        replyText = await run(fallback);
        parsed = extractJsonObject(replyText);
      } catch (e2) {
        console.error('Assistant model call failed', e2);
        return res.status(500).json({ ok: false, error: 'Assistant model call failed.' });
      }
    }

    const scrubPidPlaceholders = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;

      let next = obj;

      // --- Work Breakdown: remove generic "Task — Owner" style rows ---
      if (Array.isArray(next.workBreakdownTasks)) {
        const genericTaskPatterns = [/^task$/i, /^task\s+\d+$/i, /^tbd$/i, /^item\s+\d+$/i];
        const genericOwnerPatterns = [/^owner$/i, /^tbd$/i, /^person$/i, /^name$/i];

        const cleanedWbs = next.workBreakdownTasks.filter((row) => {
          const name = typeof row?.name === 'string' ? row.name.trim() : '';
          const owner = typeof row?.owner === 'string' ? row.owner.trim() : '';

          const isGenericName = !name || genericTaskPatterns.some((re) => re.test(name));
          const isGenericOwner = owner && genericOwnerPatterns.some((re) => re.test(owner));

          // Drop rows where the task name is generic AND the owner is generic or missing
          return !(isGenericName && (!owner || isGenericOwner));
        });

        if (cleanedWbs.length !== next.workBreakdownTasks.length) {
          next = { ...next, workBreakdownTasks: cleanedWbs };
        }
      }

      // --- RACI: drop rows where the member is just a placeholder like "-" or "TBD" ---
      if (Array.isArray(next.teamRaci)) {
        const genericMemberPatterns = [/^[-–—]$/u, /^tbd$/i, /^member$/i, /^name$/i, /^person$/i];

        const cleanedRaci = next.teamRaci.filter((row) => {
          const member = typeof row?.teamMember === 'string' ? row.teamMember.trim() : '';
          const isGenericMember = !member || genericMemberPatterns.some((re) => re.test(member));
          // If the member is purely a placeholder, drop the row and let the user add real names later.
          return !isGenericMember;
        });

        if (cleanedRaci.length !== next.teamRaci.length) {
          next = { ...next, teamRaci: cleanedRaci };
        }
      }

      // --- Governance: drop rows like "Gate — —" with no real content ---
      if (Array.isArray(next.governanceApprovals)) {
        const genericGatePatterns = [/^gate$/i, /^gate\s+\d+$/i, /^gate\s*[-–—]?\s*$/iu];
        const genericSignoffPatterns = [/^[-–—]$/u, /^tbd$/i, /^n\/a$/i];

        const cleanedGov = next.governanceApprovals.filter((row) => {
          const gate = typeof row?.gate === 'string' ? row.gate.trim() : '';
          const signoff = typeof row?.signoffRequirement === 'string' ? row.signoffRequirement.trim() : '';

          const isGenericGate = !gate || genericGatePatterns.some((re) => re.test(gate));
          const isGenericSignoff = !signoff || genericSignoffPatterns.some((re) => re.test(signoff));

          // Drop rows where both gate and signoff requirement are effectively placeholders.
          return !(isGenericGate && isGenericSignoff);
        });

        if (cleanedGov.length !== next.governanceApprovals.length) {
          next = { ...next, governanceApprovals: cleanedGov };
        }
      }

      return next;
    };

    const hasHealthyGantt = (pid) => {
      const tasks = Array.isArray(pid?.workBreakdownTasks) ? pid.workBreakdownTasks : [];
      if (tasks.length < 4) return false;

      const validDates = [];
      for (const t of tasks) {
        const s = Date.parse(t.start);
        const e = Date.parse(t.end);
        if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
        validDates.push(new Date(s), new Date(e));
      }
      if (validDates.length < 4) return false;

      let min = validDates[0];
      let max = validDates[0];
      for (const d of validDates) {
        if (d < min) min = d;
        if (d > max) max = d;
      }
      const spanDays = Math.abs((max.getTime() - min.getTime()) / (24 * 60 * 60 * 1000));
      // Require at least ~30 days of spread for a 3‑month style Gantt; lenient enough for shorter projects.
      return spanDays >= 30;
    };

    const ensureGantt = (pid, requestText) => {
      if (!pid || typeof pid !== 'object') return pid;
      if (hasHealthyGantt(pid)) return pid;

      const base = buildCanonicalPid(requestText);
      const merged = {
        ...pid,
        // Only overwrite Gantt-critical fields when missing or clearly unhealthy
        workBreakdownTasks: hasHealthyGantt(pid) ? pid.workBreakdownTasks : base.workBreakdownTasks,
        milestones: Array.isArray(pid.milestones) && pid.milestones.length ? pid.milestones : base.milestones,
        timelineOverview: pid.timelineOverview || base.timelineOverview,
      };
      return merged;
    };

    if (parsed && isPlainObject(parsed)) {
      // Two supported response styles:
      // 1) Wrapper: { reply, patch?, pid? }
      // 2) Full PID object (Create mode): { titleBlock, executiveSummary, ... }
      const createIntent = topIntent === 'create_pid';
      const isWrapper =
        Object.prototype.hasOwnProperty.call(parsed, 'reply') ||
        Object.prototype.hasOwnProperty.call(parsed, 'patch') ||
        Object.prototype.hasOwnProperty.call(parsed, 'pid') ||
        Object.prototype.hasOwnProperty.call(parsed, 'pidData');

      if (isWrapper) {
        // If the model returns only a patch during CREATE intent, synthesize a full canonical PID
        // and apply the patch on top so the frontend always receives a complete 28-field PID.
        const wrapperPid = parsed.pid || parsed.pidData;
        let cleanedWrapperPid = wrapperPid && scrubPidPlaceholders(wrapperPid);
        if (createIntent && cleanedWrapperPid) {
          cleanedWrapperPid = ensureGantt(cleanedWrapperPid, lastUserText);
        }
        if (createIntent && !wrapperPid) {
          const base = buildCanonicalPid(lastUserText);
          const patch = isPlainObject(parsed.patch) ? scrubPidPlaceholders(parsed.patch) : {};
          const merged = {
            ...base,
            ...patch,
            titleBlock: { ...(base.titleBlock || {}), ...(patch.titleBlock || {}) },
            projectSponsor: { ...(base.projectSponsor || {}), ...(patch.projectSponsor || {}) },
            projectManagerOwner: { ...(base.projectManagerOwner || {}), ...(patch.projectManagerOwner || {}) },
          };
          const withGantt = ensureGantt(mergeWithEmpty(scrubPidPlaceholders(merged)), lastUserText);
          return res.json({ ok: true, reply: safeText(parsed.reply || ''), pid: withGantt });
        }

        const out = {
          ok: true,
          reply: safeText(parsed.reply || ''),
          patch: isPlainObject(parsed.patch) ? scrubPidPlaceholders(parsed.patch) : parsed.patch,
          pid: cleanedWrapperPid,
          pidData: cleanedWrapperPid,
        };
        return res.json(out);
      }

      const looksLikePid =
        isPlainObject(parsed.titleBlock) ||
        Object.prototype.hasOwnProperty.call(parsed, 'executiveSummary') ||
        Object.prototype.hasOwnProperty.call(parsed, 'objectivesSmart');

      if (looksLikePid) {
        let cleanedPid = scrubPidPlaceholders(parsed);
        if (createIntent) {
          cleanedPid = ensureGantt(cleanedPid, lastUserText);
        }
        return res.json({ ok: true, reply: '', pid: cleanedPid });
      }
    }

    // Fallback: unstructured reply
    if (createIntent) {
      const pid = buildCanonicalPid(lastUserText);
      return res.json({ ok: true, reply: safeText(replyText), pid });
    }

    return res.json({ ok: true, reply: safeText(replyText) });
  } catch (e) {
    const msg = typeof e?.message === 'string' ? e.message : 'Assistant failed.';
    console.error('Assistant endpoint error:', e);
    return res.status(500).json({ ok: false, error: msg });
  }
});

const distExists = fs.existsSync(DIST_DIR);
const indexExists = fs.existsSync(INDEX_HTML);

if (distExists) {
  // Serve built assets + static files
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
}

// SPA fallback: any GET that isn't /api/* should return index.html
// This is the key fix that prevents "/" returning "ok".
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) return next();

  if (!distExists || !indexExists) {
    // Helpful message when someone runs the server without building the frontend
    return res
      .status(500)
      .send('Frontend build not found. Run `npm run build` so dist/index.html exists.');
  }

  return res.sendFile(INDEX_HTML);
});

app.listen(PORT, () => {
  console.log(`[server] listening on ${PORT}`);
  console.log(`[server] dist: ${distExists ? 'found' : 'missing'} (${DIST_DIR})`);
});
