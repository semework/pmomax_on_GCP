// Gemini Flash 2.0 API config for PMOMAXX2
// Add your Gemini API key and endpoint here
// Default to Gemini 2.5 Flash. Override via VITE_GEMINI_API_URL if you use a proxy.
const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const GEMINI_API_URL = viteEnv.VITE_GEMINI_API_URL ||
    process.env.VITE_GEMINI_API_URL ||
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-2.5:generateContent';
export const GEMINI_API_KEY = viteEnv.VITE_GEMINI_API_KEY ||
    viteEnv.VITE_GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY ||
    '';
export const isGeminiEnabled = () => typeof GEMINI_API_KEY === 'string' && GEMINI_API_KEY.length > 0;
