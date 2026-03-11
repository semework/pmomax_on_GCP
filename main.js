import './src/styles/global.css';
import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
// Global error handler for uncaught runtime errors
window.addEventListener('error', (event) => {
    console.error('[GLOBAL] Uncaught error:', event.error || event.message || event);
});
const rootEl = document.getElementById('root');
if (!rootEl) {
    throw new Error('Root element with id "root" not found in index.html');
}
const root = ReactDOM.createRoot(rootEl);
root.render(_jsx(React.StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(App, {}) }) }));
