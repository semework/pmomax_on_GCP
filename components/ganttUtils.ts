// components/ganttUtils.ts
// Minimal utilities used by components/GanttChart.tsx
// Keep these functions pure + dependency-free to avoid regressions.

type ConnectorInput = {
  x1?: number; y1?: number; x2?: number; y2?: number;
  fromX?: number; fromY?: number; toX?: number; toY?: number;
  sx?: number; sy?: number; tx?: number; ty?: number;
  type?: 'straight' | 'elbow' | 'orthogonal' | 'bezier' | string;
};

export function makeJaggedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  spike: number = 4,
  step: number = 10
): string {
  const right = x + w;
  const bottom = y + h;

  const s = Math.max(1, spike);
  const st = Math.max(6, step);

  const pts: Array<[number, number]> = [];

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

  if (pts.length === 0) return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;

  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  d += ' Z';
  return d;
}

export function makeConnector(input: ConnectorInput): string {
  const sx = input.x1 ?? input.fromX ?? input.sx ?? 0;
  const sy = input.y1 ?? input.fromY ?? input.sy ?? 0;
  const tx = input.x2 ?? input.toX ?? input.tx ?? 0;
  const ty = input.y2 ?? input.toY ?? input.ty ?? 0;

  const type = (input.type || 'elbow').toLowerCase();

  if (type === 'straight') return `M ${sx} ${sy} L ${tx} ${ty}`;

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
