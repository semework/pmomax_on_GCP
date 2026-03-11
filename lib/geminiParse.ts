import { GEMINI_API_URL, GEMINI_API_KEY } from './geminiConfig';

export async function geminiParse(text: string): Promise<any> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not set');
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      temperature: 0.2,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 4096
    }
  };
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gemini parse failed: ${res.status}`);
  const data = await res.json();
  // Expecting a JSON string in data.candidates[0].content.parts[0].text
  const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    return JSON.parse(output);
  } catch {
    return output;
  }
}
