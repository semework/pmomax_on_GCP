// components/MonochromeMatrixGantt.tsx
import React, { useMemo, useId } from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

type Task = {
  id: string | number;
  name: string;
  start: string | Date;
  end: string | Date;
  critical?: boolean;
  dependsOn?: string | number | null;
  milestone?: boolean;
  type?: string;
};


export function MonochromeMatrixGantt({
  tasks,
  width = 900,
  height = 400,
}: {
  tasks: Task[];
  width?: number;
  height?: number;
}) {
  const uid = useId();
  const safeTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);

  const barHeight = 32 * 0.7;
  const barGap = 18 * 0.7;
  const leftPad = 120;
  const topPad = 40;
  const rightPad = 40;
  const bottomPad = 40;

  const bgColor = '#181c23';
  const gridColor = '#232733';
  const axisColor = '#fff';
  const todayColor = '#ffd600';
  const criticalColor = '#e10600';

  const typeColors: Record<string, string> = {
    Plan: '#7ed957',
    Analysis: '#4bb3fd',
    Prototype: '#38a3a5',
    'Design Asset': '#57cc99',
    Model: '#80ed99',
    Critical: '#e10600',
    default: '#43aa8b',
  };

  const bounds = useMemo(() => {
    const starts = safeTasks
      .map((t) => toDate(t.start)?.getTime())
      .filter((x): x is number => typeof x === 'number');
    const ends = safeTasks
      .map((t) => toDate(t.end)?.getTime())
      .filter((x): x is number => typeof x === 'number');

    if (!starts.length || !ends.length) {
      const now = new Date();
      return { min: now, max: new Date(now.getTime() + 86400000 * 30) };
    }
    return { min: new Date(Math.min(...starts)), max: new Date(Math.max(...ends)) };
  }, [safeTasks]);

  // components/_archived_unused/MonochromeMatrixGantt.tsx
    () => dateToXFactory(bounds.min, bounds.max, Math.max(1, width - leftPad - rightPad)),
    [bounds.min, bounds.max, width],
  );

  const gridLines = useMemo(() => {
    const lines: Date[] = [];
    const d = new Date(bounds.min.getTime());
    while (d <= bounds.max) {
      lines.push(new Date(d.getTime()));
      d.setDate(d.getDate() + 14);
    }
    return lines;
  }, [bounds.min, bounds.max]);

  const todayX = leftPad + dateToX(new Date());

  // Sort tasks so soonest (immediate) is on top
  const sortedTasks = useMemo(() => {
    return [...safeTasks].sort((a, b) => {
      const ta = toDate(a.start)?.getTime() ?? 0;
      const tb = toDate(b.start)?.getTime() ?? 0;
      return ta - tb;
    });
  }, [safeTasks]);

  const svgHeight = Math.max(
    height * 0.7,
    topPad + sortedTasks.length * (barHeight + barGap) + bottomPad,
  );

  function renderConnectors() {
    // Use original ID matching, but draw using sorted row positions.
    const indexById = new Map<string | number, number>();
    sortedTasks.forEach((t, i) => indexById.set(t?.id, i));

    const leafId = `leaf-${uid}`;
    const leafCriticalId = `leafCritical-${uid}`;

    const connectors: React.JSX.Element[] = [];
    for (let i = 0; i < sortedTasks.length; i++) {
      const t = sortedTasks[i];
      const dep = t.dependsOn;

      if (dep == null) continue;

      const depIdx = indexById.get(dep);
      if (typeof depIdx !== 'number') continue;

      const fromTask = sortedTasks[depIdx];
      const fromEnd = toDate(fromTask.end);
      const toStart = toDate(t.start);
      if (!fromEnd || !toStart) continue;

      const fromY = topPad + depIdx * (barHeight + barGap) + barHeight / 2;
      const toY = topPad + i * (barHeight + barGap) + barHeight / 2;

      const fromX = leftPad + dateToX(fromEnd);
      const toX = leftPad + dateToX(toStart);
      const midX = (fromX + toX) / 2;

      connectors.push(
        <g key={`conn-${String(t?.id)}-${String(dep)}`}>
          <path
            d={`M${fromX},${fromY} Q${midX},${fromY - 30} ${toX},${toY}`}
            stroke={t.critical ? criticalColor : '#43aa8b'}
            strokeWidth={2.5}
            fill="none"
            markerEnd={t.critical ? `url(#${leafCriticalId})` : `url(#${leafId})`}
            opacity={0.85}
          />
        </g>,
      );
    }

    return connectors;
  }

  const leafId = `leaf-${uid}`;
  const leafCriticalId = `leafCritical-${uid}`;

  return (
    <svg
      width={width}
      height={svgHeight}
      style={{
        background: bgColor,
        borderRadius: 16,
        boxShadow: '0 0 32px #b6e2d3',
      }}
    >
      <defs>
        <marker
          id={leafId}
          markerWidth="16"
          markerHeight="16"
          refX="8"
          refY="8"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M8,8 Q12,2 16,8 Q12,14 8,8 Z" fill="#43aa8b" />
        </marker>

        <marker
          id={leafCriticalId}
          markerWidth="16"
          markerHeight="16"
          refX="8"
          refY="8"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M8,8 Q12,2 16,8 Q12,14 8,8 Z" fill={criticalColor} />
        </marker>
      </defs>

      {/* Grid lines */}
      {gridLines.map((g, i) => {
        const x = leftPad + dateToX(g);
        return (
          <line
            key={i}
            x1={x}
            x2={x}
            y1={topPad - 20}
            y2={svgHeight - bottomPad}
            stroke={gridColor}
            strokeWidth={1.5}
            strokeDasharray="4 6"
          />
        );
      })}

      {/* Today line */}
      <line
        x1={todayX}
        x2={todayX}
        y1={topPad - 20}
        y2={svgHeight - bottomPad}
        stroke={todayColor}
        strokeWidth={3}
        strokeDasharray="8 6"
      />

      {/* X-axis */}
      <path
        d={`M${leftPad},${svgHeight - bottomPad} Q${(leftPad + (width - rightPad)) / 2},${
          svgHeight - bottomPad + 10
        } ${width - rightPad},${svgHeight - bottomPad}`}
        stroke={axisColor}
        strokeWidth={2.5}
        fill="none"
      />

      {/* Organic connectors */}
      {renderConnectors()}

      {/* Y labels and bars */}
      {sortedTasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);

        const s = toDate(t.start);
        const e = toDate(t.end);
        if (!s || !e) return null;

        const x1 = leftPad + dateToX(s);
        const x2 = leftPad + dateToX(e);

        const isCritical = t.critical === true;
        const fillColor = isCritical
          ? criticalColor
          : typeColors[t.type ?? 'default'] ?? typeColors.default;

        const w = Math.max(1, x2 - x1);
        const safeW = Math.max(0, w);

        return (
          <g key={String(t?.id)}>
            <rect
              x={x1}
              y={y}
              width={safeW}
              height={barHeight}
              rx={barHeight / 2.2}
              fill={fillColor}
              stroke={isCritical ? criticalColor : axisColor}
              strokeWidth={isCritical ? 3 : 2}
            />

            {t.milestone && (
              <ellipse
                cx={x1 + w + 12}
                cy={y + barHeight / 2}
                rx={8}
                ry={6}
                fill="#fff"
                stroke="#43aa8b"
                strokeWidth={2}
              />
            )}

            <text
              x={leftPad - 10}
              y={y + barHeight / 2}
              fill="#fff"
              fontSize={16}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              textAnchor="end"
              alignmentBaseline="middle"
              style={{ textShadow: '0 0 6px #000', fontWeight: 700 }}
            >
              {t.name}
            </text>
          </g>
        );
      })}

      {/* Empty-state */}
      {sortedTasks.length === 0 && (
        <text
          x={width / 2}
          y={svgHeight / 2}
          fill="#94a3b8"
          fontSize={14}
          textAnchor="middle"
        >
          No tasks to display
        </text>
      )}
    </svg>
  );
}
