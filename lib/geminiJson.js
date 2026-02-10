// lib/geminiJson.js
//
// Small helper to call Gemini and parse a JSON-structured PID response.
// Used by /api/ai/parse in server.mjs.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash-001';

/**
 * Call Gemini with a prompt that should return JSON for the PID schema.
 *
 * @param {string} prompt - Full text prompt (includes PID content + instructions).
 * @param {string} schemaDescription - Human-readable description of expected schema (for logging only).
 * @returns {Promise<any>} Parsed JSON object or throws on failure.
 */
export async function callGeminiJson(promptOrConfig, schemaDescription) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY or GOOGLE_API_KEY is not set. Cannot call Gemini /parse.'
    );
  }

  // Node 18+ / 20+ has global fetch; if not, fail loudly.
  if (typeof fetch !== 'function') {
    throw new Error(
      'Global fetch is not available in this Node runtime. Use Node 18+ or polyfill fetch.'
    );
  }

  let promptText = '';
  let isChatMode = false;

  if (typeof promptOrConfig === 'string') {
    promptText = promptOrConfig;
  } else if (promptOrConfig && typeof promptOrConfig === 'object') {
    promptText = promptOrConfig.input || '';
    isChatMode = promptOrConfig.mode === 'chat';
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const generationConfig = {
    temperature: 0.2,
    topP: 0.9,
    maxOutputTokens: 2048,
  };

  // Only force JSON if NOT in chat mode
  if (!isChatMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: promptText,
          },
        ],
      },
    ],
    generationConfig,
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const message = `Gemini /parse HTTP ${resp.status}: ${
      text || resp.statusText || 'Unknown error'
    }`;
    throw new Error(message);
  }

  const data = await resp.json();

  // Candidates → content → parts[0].text
  const candidate = data?.candidates?.[0];
  const partText =
    candidate?.content?.parts?.map((p) => p.text || '').join('\n').trim() || '';

  if (!partText) {
    throw new Error('Gemini response did not contain any text.');
  }

  // If chat mode, return text wrapped in an object (to match server expectation)
  if (isChatMode) {
    return { answer: partText, text: partText };
  }

  // Otherwise, parse JSON
  try {
    const parsed = JSON.parse(partText);
    return parsed;
  } catch (err) {
    console.error('[GEMINI_JSON] Failed to parse JSON from Gemini:', err);
    // As a fallback, return raw text so the frontend can at least show something.
    return { _raw: partText, _schemaDescription: schemaDescription };
  }
}
