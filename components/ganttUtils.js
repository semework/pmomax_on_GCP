// components/ganttUtils.ts
// Minimal utilities used by components/GanttChart.tsx
// Keep these functions pure + dependency-free to avoid regressions.
export function makeJaggedRect(x, y, w, h, spike = 4, step = 10) {
    const right = x + w;
    const bottom = y + h;
    const s = Math.max(1, spike);
    const st = Math.max(6, step);
    const pts = [];
    for (let cx = x; cx <= right; cx += st) {
        const isSpike = ((cx - x) / st) % 2 === 0;
        pts.push([Math.min(cx, right), y + (isSpike ? 0 : s)]);
    }
    for (let cy = y; cy <= bottom; cy += st) {
        const isSpike = ((cy - y) / st) % 2 === 0;
        pts.push([right - (isSpike ? 0 : s), Math.min(cy, bottom)]);
    }
    for (let cx = right; cx >= x; cx -= st) {
        const isSpike = ((right - cx) / st) % 2 === 0;
        pts.push([Math.max(cx, x), bottom - (isSpike ? 0 : s)]);
    }
    for (let cy = bottom; cy >= y; cy -= st) {
        const isSpike = ((bottom - cy) / st) % 2 === 0;
        pts.push([x + (isSpike ? 0 : s), Math.max(cy, y)]);
    }
    if (pts.length === 0)
        return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++)
        d += ` L ${pts[i][0]} ${pts[i][1]}`;
    d += ' Z';
    return d;
}
export function makeConnector(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const sx = (_c = (_b = (_a = input.x1) !== null && _a !== void 0 ? _a : input.fromX) !== null && _b !== void 0 ? _b : input.sx) !== null && _c !== void 0 ? _c : 0;
    const sy = (_f = (_e = (_d = input.y1) !== null && _d !== void 0 ? _d : input.fromY) !== null && _e !== void 0 ? _e : input.sy) !== null && _f !== void 0 ? _f : 0;
    const tx = (_j = (_h = (_g = input.x2) !== null && _g !== void 0 ? _g : input.toX) !== null && _h !== void 0 ? _h : input.tx) !== null && _j !== void 0 ? _j : 0;
    const ty = (_m = (_l = (_k = input.y2) !== null && _k !== void 0 ? _k : input.toY) !== null && _l !== void 0 ? _l : input.ty) !== null && _m !== void 0 ? _m : 0;
    const type = (input.type || 'elbow').toLowerCase();
    if (type === 'straight')
        return `M ${sx} ${sy} L ${tx} ${ty}`;
    if (type === 'bezier') {
        const dx = Math.max(30, Math.abs(tx - sx) * 0.35);
        const c1x = sx + dx;
        const c1y = sy;
        const c2x = tx - dx;
        const c2y = ty;
        return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
    }
    const midX = sx + (tx - sx) * 0.6;
    return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
}
