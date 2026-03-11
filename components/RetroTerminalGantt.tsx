import React, { useMemo } from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

// Retro Terminal: Green-on-black, pixel-ish monospace, scanlines overlay
type Task = {
  id?: string | number;
  name: string;
  start: string;
  end: string;
  critical?: boolean;
  milestone?: boolean;
};

export function RetroTerminalGantt({
  tasks,
  width = 900,
  height = 400,
}: {
  tasks: Task[];
  width?: number;
  height?: number;
}) {
  const safeTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);

  const barHeight = 24;
  const barGap = 18;
  const leftPad = 120;
  const topPad = 44;
  const rightPad = 24;
  const bottomPad = 48;

  const barColor = '#00FF41';
  const bgColor = '#101010';
  const axisColor = '#00FF41';
  const criticalColor = '#e10600';

  const bounds = useMemo(() => {
    const starts = safeTasks.map((t) => toDate(t.start)?.getTime()).filter((x): x is number => typeof x === 'number');
    const ends = safeTasks.map((t) => toDate(t.end)?.getTime()).filter((x): x is number => typeof x === 'number');

    if (!starts.length || !ends.length) {
      const now = new Date();
      return { min: now, max: new Date(now.getTime() + 86400000 * 30) };
    }
    return { min: new Date(Math.min(...starts)), max: new Date(Math.max(...ends)) };
  }, [safeTasks]);

  const dateToX = useMemo(
    () => dateToXFactory(bounds.min, bounds.max, Math.max(1, width - leftPad - rightPad)),
    [bounds.min, bounds.max, width],
  );

  const svgHeight = Math.max(height, topPad + safeTasks.length * (barHeight + barGap) + bottomPad);

  return (
    <svg width={width} height={svgHeight} style={{ background: bgColor, borderRadius: 10, boxShadow: '0 0 32px #00FF4144' }}>
      {/* Scanlines overlay */}
      {Array.from({ length: Math.floor(svgHeight / 12) }).map((_, i) => (
        <rect key={i} x={0} y={i * 12} width={width} height={2} fill="#003300" opacity={0.25} />
      ))}

      {/* X-axis */}
      <line x1={leftPad} x2={width - rightPad} y1={svgHeight - bottomPad} y2={svgHeight - bottomPad} stroke={axisColor} strokeWidth={2} />

      {/* Y labels and bars */}
      {safeTasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const s = toDate(t.start);
        const e = toDate(t.end);
        if (!s || !e) return null;

        const x1 = leftPad + dateToX(s);
        const x2 = leftPad + dateToX(e);
        const isCritical = t.critical === true;
        // Only critical path bars use red
        const fillColor = isCritical ? criticalColor : barColor;
        const safeFill = (!isCritical && fillColor === criticalColor) ? barColor : fillColor;
        return (
          <g key={t?.id ?? `${t?.name}-${i}`}>
            {/* Blocky bar */}
            <rect
              x={x1}
              y={y}
              width={Math.max(1, x2 - x1)}
              height={barHeight}
              rx={2}
              fill={safeFill}
              stroke={isCritical ? criticalColor : '#00FF41'}
              strokeWidth={2}
              opacity={0.95}
            />
            {/* Label: adaptive color for accessibility */}
            <text
              x={leftPad - 10}
              y={y + barHeight / 2}
              fill="#00FF41"
              fontSize={15}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              textAnchor="end"
              alignmentBaseline="middle"
              style={{ textShadow: '0 0 4px #00FF41', fontWeight: 700 }}
            >
              {t.name}
            </text>
          </g>
        );
      })}

      {/* Render milestone/critical diamonds in a row below x-tick labels */}
      {safeTasks.map((t, i) => {
        if (!t.milestone && !t.critical) return null;
        const e = toDate(t.end);
        if (!e) return null;
        const x = leftPad + dateToX(e);
        const size = 12;
        const fill = t.critical ? criticalColor : barColor;
        const stroke = t.critical ? criticalColor : axisColor;
        const diamondRowY = svgHeight - bottomPad + 24; // 24px below x-axis
        return (
          <polygon
            key={`diamond-${t?.id}`}
            points={[
              [x, diamondRowY - size],
              [x + size, diamondRowY],
              [x, diamondRowY + size],
              [x - size, diamondRowY],
            ].map(p => p.join(",")).join(" ")}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
            opacity={0.95}
          />
        );
      })}
    </svg>
  );
}
