// lib/security/pidGuard.js
import { sanitizeUntrustedText, redactSecrets } from './promptDefense.js';

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function sanitizeStringValue(value) {
  const s = typeof value === 'string' ? value : value == null ? '' : String(value);
  const cleaned = sanitizeUntrustedText(s).sanitized;
  return redactSecrets(cleaned);
}

export function sanitizeBySchema(input, schema) {
  if (schema == null) return undefined;
  if (Array.isArray(schema)) {
    if (!Array.isArray(input)) return [];
    const itemSchema = schema[0] ?? '';
    return input.map((item) => sanitizeBySchema(item, itemSchema));
  }
  if (isPlainObject(schema)) {
    if (!isPlainObject(input)) return {};
    const schemaKeys = Object.keys(schema);
    if (schemaKeys.length === 0) {
      const out = {};
      for (const [k, v] of Object.entries(input)) {
        if (Array.isArray(v)) out[k] = v.map((item) => sanitizeBySchema(item, ''));
        else if (isPlainObject(v)) out[k] = sanitizeBySchema(v, {});
        else if (typeof v === 'string') out[k] = sanitizeStringValue(v);
        else if (typeof v === 'number') out[k] = Number.isFinite(Number(v)) ? Number(v) : 0;
        else if (typeof v === 'boolean') out[k] = Boolean(v);
        else out[k] = v;
      }
      return out;
    }
    const out = {};
    for (const key of Object.keys(schema)) {
      if (key in input) {
        out[key] = sanitizeBySchema(input[key], schema[key]);
      }
    }
    return out;
  }
  if (typeof schema === 'string') return sanitizeStringValue(input);
  if (typeof schema === 'number') {
    const n = Number(input);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof schema === 'boolean') return Boolean(input);
    return sanitizeStringValue(input);
}

export function allowlistPatch(patch, schema) {
    if (!patch || typeof patch !== 'object')
        return {};
    return sanitizeBySchema(patch, schema);
}

export function stripHighRiskContext(pid, includeNotes = false) {
  if (!isPlainObject(pid)) return pid;
  const out = { ...pid };
  if (!includeNotes) {
    delete out.notesBackground;
    delete out.fields;
    delete out.tables;
    delete out.workBreakdownNotes;
  }
  return out;
}
