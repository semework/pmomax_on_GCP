// lib/supportedFormats.ts
// Central place for all supported input formats and hard limits.

export const MAX_PAGES = 50; // UI only

// Conservative word-per-page heuristic for plain text inputs (client + server).
// Used as a hard gate to keep parsing stable for uploads/paste.
export const WORDS_PER_PAGE = 450;

// Internal parse cap (all formats): ~55 pages, not shown in UI
export const INTERNAL_MAX_PAGES = 55;
export const INTERNAL_MAX_WORDS = INTERNAL_MAX_PAGES * WORDS_PER_PAGE;
export const MAX_WORDS = MAX_PAGES * WORDS_PER_PAGE;

export const SUPPORTED_EXTENSIONS = [
  '.docx',
  '.pdf',
  '.txt',
  '.md',
  '.csv',
  '.xls',
  '.xlsx',
];

export const SUPPORTED_MIMES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// File input accept string (extensions + common mimes).
export const INPUT_ACCEPT =
  '.docx,.pdf,.txt,.md,.csv,.xls,.xlsx,' + SUPPORTED_MIMES.join(',');

export const SUPPORTED_LABEL = 'DOCX, PDF, TXT, MD, CSV, XLS/XLSX';

export function isSupportedFile(file: File): boolean {
  const name = (file?.name || '').toLowerCase();
  const mime = (file?.type || '').toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  return SUPPORTED_EXTENSIONS.includes(ext) || SUPPORTED_MIMES.includes(mime);
}
