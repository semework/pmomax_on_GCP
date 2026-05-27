// lib/performanceMonitor.ts
// Lightweight performance / telemetry utility for PID Architect.
// This module now supports BOTH default and named imports so that any
// existing bundler-generated code (default import) and new code
// (named import) can safely call `.logEvent(...)` without runtime errors.
class PerformanceMonitor {
    constructor() {
        this.events = [];
        this.marks = new Map();
        this.safeStringify = function(value) {
            try {
                return JSON.stringify(value, (_key, v) => {
                    if (typeof v === 'bigint')
                        return v.toString();
                    if (typeof v === 'function')
                        return '[Function]';
                    if (v instanceof Error)
                        return { name: v.name, message: v.message };
                    return v;
                });
            }
            catch (err) {
                try {
                    return String(value);
                }
                catch {
                    return '[unserializable]';
                }
            }
        };
    }
    logEvent(phase, durationMs, payload) {
        try {
            const evt = {
                phase,
                timestamp: Date.now(),
                durationMs,
                payload,
            };
            this.events.push(evt);
            if (typeof console !== 'undefined') {
                // Centralized debug logging so we can quickly inspect timings.
                const safeLog = this.safeStringify({ durationMs, payload });
                console.log('[PERF]', phase, safeLog);
            }
        }
        catch (err) {
            // Never break the app due to telemetry.
            console.warn('[PERF] logEvent failed:', err);
        }
    }
    mark(label) {
        try {
            this.marks.set(label, Date.now());
        }
        catch (err) {
            console.warn('[PERF] mark failed:', err);
        }
    }
    measure(label, phase, payload) {
        try {
            const start = this.marks.get(label);
            if (!start) {
                return;
            }
            const durationMs = Date.now() - start;
            this.logEvent(phase, durationMs, payload);
            this.marks.delete(label);
        }
        catch (err) {
            console.warn('[PERF] measure failed:', err);
        }
    }
    getLogs() {
        return [...this.events];
    }
    getStats(phase) {
        const subset = this.events.filter((e) => e.phase === phase && e.durationMs != null);
        if (!subset.length) {
            return null;
        }
        const durations = subset.map((e) => e.durationMs);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;
        const max = Math.max(...durations);
        const min = Math.min(...durations);
        return { count: subset.length, avg, min, max };
    }
}
// Singleton instance used across the app.
export const perfMonitor = new PerformanceMonitor();
// Default export shaped so that existing compiled code that does
// `import M4 from '../lib/performanceMonitor'` and then calls
// `M4.logEvent(...)` will still work.
const defaultExport = {
    logEvent: perfMonitor.logEvent.bind(perfMonitor),
    mark: perfMonitor.mark.bind(perfMonitor),
    measure: perfMonitor.measure.bind(perfMonitor),
    getLogs: () => perfMonitor.getLogs(),
    getStats: (phase) => perfMonitor.getStats(phase),
};
export default defaultExport;
