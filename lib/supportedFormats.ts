// lib/supportedFormats.ts
// Central place for all supported input formats and hard limits.

export const MAX_PAGES = 112; // UI hard limit (PDF page cap)
export const WORDS_PER_PAGE = 450;
export const INTERNAL_MAX_PAGES = 112;
export const INTERNAL_MAX_WORDS = 75_000;
export const MAX_WORDS = INTERNAL_MAX_WORDS;

export const SUPPORTED_EXTENSIONS = [
  '.docx',
  '.pdf',
  '.txt',
  '.md',
  '.csv',
  '.tsv',
  '.xls',
  '.xlsx',
];

export const SUPPORTED_MIMES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'text/tsv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// File input accept string (extensions + common mimes).
export const INPUT_ACCEPT =
  '.docx,.pdf,.txt,.md,.csv,.tsv,.xls,.xlsx,' + SUPPORTED_MIMES.join(',');

export const SUPPORTED_LABEL = 'DOCX, PDF, TXT, MD, CSV/TSV, XLS/XLSX';

export function isSupportedFile(file: File): boolean {
  const name = (file?.name || '').toLowerCase();
  const mime = (file?.type || '').toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  return SUPPORTED_EXTENSIONS.includes(ext) || SUPPORTED_MIMES.includes(mime);
}
