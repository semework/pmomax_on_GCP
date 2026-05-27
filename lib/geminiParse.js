import { GEMINI_API_URL, GEMINI_API_KEY } from './geminiConfig';
export async function geminiParse(text) {
    var _a, _b, _c, _d, _e;
    if (!GEMINI_API_KEY)
        throw new Error('Gemini API key not set');
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
    if (!res.ok)
        throw new Error(`Gemini parse failed: ${res.status}`);
    const data = await res.json();
    // Expecting a JSON string in data.candidates[0].content.parts[0].text
    const output = (_e = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
    try {
        return JSON.parse(output);
    }
    catch (_f) {
        return output;
    }
}
