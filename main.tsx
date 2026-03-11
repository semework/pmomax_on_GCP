// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';

// Optional: keep if you have global styles
// import './index.css';

function renderFatal(err: unknown) {
  try {
    const el = document.getElementById('root');
    if (el) {
      el.innerHTML = `
        <div style="padding:16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
          <div style="font-size:18px; font-weight:800; margin-bottom:8px;">PMOMax boot error (mount failed)</div>
          <div style="font-size:13px; opacity:0.9; margin-bottom:12px;">
            A runtime error occurred. If you are deploying, check pod logs and open the browser console for more details.
          </div>
          <pre style="white-space:pre-wrap; font-size:12px; background:#111; color:#f8f8f8; padding:12px; border-radius:10px; overflow:auto;">${String(
            (err as any)?.stack || (err as any)?.message || err
          )}</pre>
        </div>
      `;
    }
  } catch {
    // no-op
  }
}

try {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Missing #root element in index.html');

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  console.error('[main.tsx] fatal mount error:', err);
  renderFatal(err);
}

// Extra safety for async errors that otherwise “vanish” in production
window.addEventListener('unhandledrejection', (e) => {
  console.error('[main.tsx] unhandledrejection:', e.reason);
});
window.addEventListener('error', (e) => {
  console.error('[main.tsx] window.error:', e.error || e.message);
});
