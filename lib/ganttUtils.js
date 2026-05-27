// lib/ganttUtils.ts
// PMOMax Gantt helpers used across chart implementations.
// IMPORTANT: Keep exports stable. GanttChart.tsx imports makeConnectedBracketPath.
// -----------------------------
// Geometry helpers
// -----------------------------
export function makeJaggedRect(x, y, w, h, teeth = 6) {
    const safeTeeth = Math.max(2, Math.floor(teeth));
    const t = h / safeTeeth;
    let d = `M ${x} ${y}`;
    for (let i = 0; i < safeTeeth; i++) {
        const yy = y + i * t;
        d += ` L ${x + (i % 2 ? 3 : 0)} ${yy + t}`;
    }
    d += ` L ${x + w} ${y + h}`;
    for (let i = safeTeeth; i > 0; i--) {
        const yy = y + i * t;
        d += ` L ${x + w - (i % 2 ? 3 : 0)} ${yy - t}`;
    }
    d += ' Z';
    return d;
}
export function makeConnector(args) {
    const { x1, y1, x2, y2 } = args;
    const type = (args.type || 'straight').toLowerCase();
    if (type === 'curve') {
        const mx = (x1 + x2) / 2;
        return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    }
    if (type === 'elbow') {
        return `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} L ${x2} ${y2}`;
}
/**
 * SVG path helper for bracket bars (Outcome/Milestone-Centric).
 * REQUIRED by components/GanttChart.tsx:
 *   import { makeConnectedBracketPath } from '../lib/ganttUtils';
 */
export function makeConnectedBracketPath(xL, xR, yCenter, postHalfHeight = 0.35, cornerYr = 0.10, cornerXRatio = 0.08) {
    const h = postHalfHeight;
    const cy = yCenter;
    const x0 = xL;
    const x1 = xL + (xR - xL) * cornerXRatio;
    const x2 = xR - (xR - xL) * cornerXRatio;
    const x3 = xR;
    const y0 = cy - h;
    const y1 = cy - h * (1 - cornerYr);
    const y2 = cy + h * (1 - cornerYr);
    const y3 = cy + h;
    return [
        `M ${x0} ${y0}`,
        `L ${x1} ${y0}`,
        `Q ${x1} ${y0} ${x1} ${y1}`,
        `L ${x1} ${y2}`,
        `Q ${x1} ${y3} ${x2} ${y3}`,
        `L ${x3} ${y3}`,
    ].join(' ');
}
// -----------------------------
// Date helpers
// -----------------------------
export function toDate(x) {
    const d = x instanceof Date ? x : new Date(String(x));
    return Number.isFinite(d.getTime()) ? d : null;
}
export function dateToXFactory(minDate, maxDate, innerWidth) {
    const minT = minDate.getTime();
    const maxT = maxDate.getTime();
    const span = Math.max(1, maxT - minT);
    const w = Math.max(1, innerWidth);
    return (date) => {
        const d = toDate(date);
        if (!d)
            return 0;
        const t = d.getTime();
        const pct = (t - minT) / span;
        const clamped = Math.max(0, Math.min(1, pct));
        return clamped * w;
    };
}
// -----------------------------
// Plotly shape helpers (if used elsewhere)
// -----------------------------
export function applyBezierConnector(shapes, args) {
    const { x0, x1, y0, y1, color = '#FFD600', width = 2 } = args;
    shapes.push({
        type: 'path',
        path: `M ${x0},${y0} C ${x0},${y1} ${x1},${y0} ${x1},${y1}`,
        line: { color, width },
    });
}
// -----------------------------
// Critical path (optional utility)
// -----------------------------
export function computeCriticalPath(tasks) {
    var _a, _b;
    if (!Array.isArray(tasks) || tasks.length === 0)
        return [];
    const n = tasks.length;
    // Canonical IDs and key→index map (support id or name references)
    const idToIndex = new Map();
    const canonicalIds = new Array(n);
    for (let i = 0; i < n; i++) {
        const t = tasks[i];
        const canonical = String((_b = (_a = t.id) !== null && _a !== void 0 ? _a : t.name) !== null && _b !== void 0 ? _b : i);
        canonicalIds[i] = canonical;
        if (!idToIndex.has(canonical))
            idToIndex.set(canonical, i);
        if (t.name) {
            const nameKey = String(t.name);
            if (!idToIndex.has(nameKey))
                idToIndex.set(nameKey, i);
        }
    }
    // Normalize dependency fields into predecessor indices
    const preds = Array.from({ length: n }, () => []);
    function normalizeDepValues(raw) {
        const out = [];
        const seen = new Set();
        const pushVal = (v) => {
            const s = String(v).trim();
            if (!s || seen.has(s))
                return;
            seen.add(s);
            out.push(s);
        };
        if (Array.isArray(raw)) {
            raw.forEach(pushVal);
        }
        else if (typeof raw === 'string' || typeof raw === 'number') {
            String(raw)
                .split(',')
                .forEach(pushVal);
        }
        return out;
    }
    for (let i = 0; i < n; i++) {
        const t = tasks[i];
        const rawDeps = (Array.isArray(t._depsArr) && t._depsArr) ||
            t.deps ||
            t.dependsOn ||
            t.dependencies ||
            [];
        const depKeys = normalizeDepValues(rawDeps);
        const list = preds[i];
        const seenIdx = new Set();
        for (const key of depKeys) {
            const idx = idToIndex.get(key);
            if (typeof idx === 'number' && idx >= 0 && idx < n && idx !== i && !seenIdx.has(idx)) {
                seenIdx.add(idx);
                list.push(idx);
            }
        }
    }
    // Cycle detection on the index graph to avoid infinite recursion
    const visited = new Array(n).fill(false);
    const inStack = new Array(n).fill(false);
    let hasCycle = false;
    function dfsCycle(i) {
        if (inStack[i]) {
            hasCycle = true;
            return;
        }
        if (visited[i] || hasCycle)
            return;
        visited[i] = true;
        inStack[i] = true;
        for (const p of preds[i])
            dfsCycle(p);
        inStack[i] = false;
    }
    for (let i = 0; i < n && !hasCycle; i++) {
        dfsCycle(i);
    }
    if (hasCycle) {
        // Invalid DAG: fail gracefully instead of recursing forever
        return [];
    }
    // Duration in days (at least 1 day for any task with valid dates)
    function safeDurationDays(t) {
        var _a, _b;
        const s = toDate(t.start);
        const e = toDate((_b = (_a = t.end) !== null && _a !== void 0 ? _a : t.finish) !== null && _b !== void 0 ? _b : t.dueDate);
        if (!s || !e)
            return 0;
        const msPerDay = 24 * 60 * 60 * 1000;
        const span = Math.max(0, e.getTime() - s.getTime());
        const days = Math.round(span / msPerDay);
        return Math.max(1, days || 1);
    }
    const durations = tasks.map(safeDurationDays);
    // Longest-path DP over predecessors
    const memo = new Array(n).fill(-1);
    const parent = new Array(n).fill(-1);
    function dp(i) {
        if (memo[i] >= 0)
            return memo[i];
        let best = 0;
        let bestPred = -1;
        for (const p of preds[i]) {
            const v = dp(p);
            if (v > best) {
                best = v;
                bestPred = p;
            }
        }
        parent[i] = bestPred;
        memo[i] = best + durations[i];
        return memo[i];
    }
    let bestVal = 0;
    let endIdx = -1;
    for (let i = 0; i < n; i++) {
        const v = dp(i);
        if (v > bestVal) {
            bestVal = v;
            endIdx = i;
        }
    }
    if (endIdx === -1)
        return [];
    // Reconstruct path from endIdx back to start
    const idxPath = [];
    const seenOnPath = new Set();
    let cur = endIdx;
    while (cur !== -1 && !seenOnPath.has(cur)) {
        idxPath.unshift(cur);
        seenOnPath.add(cur);
        cur = parent[cur];
    }
    return idxPath.map((i) => tasks[i]);
}
