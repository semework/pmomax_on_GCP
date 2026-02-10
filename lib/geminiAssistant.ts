// lib/geminiAssistant.ts
//
// IMPORTANT:
// - This module is used by browser-side UI.
// - Do NOT call the Gemini REST API directly from the browser.
//   (API keys must not be exposed; CORS/auth will fail in production.)
// - Route assistant calls through the backend Cloud Run server.
//
// Backend route (server.mjs):
//   POST /api/ai/assistant
//   body: { messages: [{role, content}], context?: string }

type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

type AssistantOptions = {
  context?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Returns assistant text.
 * The backend is responsible for calling Gemini and returning a safe response.
 */
export async function geminiAssistant(prompt: string, options?: AssistantOptions): Promise<string> {
  const context = options?.context ? String(options.context) : '';

  // --- Gemini Assistant API Call ---
  // This function sends the prompt and options to the backend, which handles model selection and fallback.
  // The backend will use Gemini 2.5 Flash as primary and Gemini 2.0 Flash as fallback if needed.
  // Endpoint: /api/ai/assistant (see server.mjs for logic)
  // Never call Gemini API directly from the browser!
  const messages: ChatMsg[] = [
    {
      role: 'system',
      content:
        'You are PMOMax PID Architect AI assistant. Be concise, helpful, and return plain text unless asked otherwise.',
    },
    ...(context
      ? [
          {
            role: 'system',
            content: context,
          } as ChatMsg,
        ]
      : []),
    {
      role: 'user',
      content: String(prompt || ''),
    },
  ];

  const res = await fetch('/api/ai/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      // Keep compatibility if backend wants context separately.
      context,
      // optional hints (backend may ignore)
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Assistant error (${res.status})`;
    throw new Error(String(msg));
  }

  // server.mjs returns: { ok: true, message: { role, content }, meta }
  const content = data?.message?.content;
  if (typeof content === 'string' && content.trim().length > 0) return content;

  // Some older builds may return { text }.
  if (typeof data?.text === 'string' && data.text.trim().length > 0) return data.text;

  return '';
}
