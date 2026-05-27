// components/OrganicFlowGantt.tsx
import React from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

interface OrganicTask {
  id: string | number;
  name: string;
  start: string | Date;
  end: string | Date;
  type?: string;
  critical?: boolean;
  milestone?: boolean;
  dependsOn?: string | number | null;
}

interface OrganicFlowGanttProps {
  tasks: OrganicTask[];
  width?: number;
  height?: number;
}

// Organic Flow: Green/blue palette, wavy bars, leaf/organic connectors, milestone icons
export function OrganicFlowGantt({
  tasks,
  width = 900,
  height = 400,
}: OrganicFlowGanttProps) {
  const barHeight = 32;
  const barGap = 18;
  const leftPad = 120;
  const topPad = 40;
  const bgColor = '#181c23';
  const gridColor = '#232733';
  const axisColor = '#ffffff';
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

  // Guard: no tasks
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        style={{ background: bgColor, borderRadius: 16 }}
      >
        <text
          x={width / 2}
          y={height / 2}
          fill={axisColor}
          fontSize={14}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          No tasks to display
        </text>
      </svg>
    );
  }

  // Calculate min/max dates safely
  const startTimes = tasks
    .map((t) => new Date(t.start).getTime())
    .filter((v) => Number.isFinite(v));
  const endTimes = tasks
    .map((t) => new Date(t.end).getTime())
    .filter((v) => Number.isFinite(v));

  if (!startTimes.length || !endTimes.length) {
    return (
      <svg
        width={width}
        height={height}
        style={{ background: bgColor, borderRadius: 16 }}
      >
        <text
          x={width / 2}
          y={height / 2}
          fill={axisColor}
          fontSize={14}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          Invalid task dates
        </text>
      </svg>
    );
  }

  const minDate = new Date(Math.min(...startTimes));
  const maxDate = new Date(Math.max(...endTimes));

  const innerWidth = Math.max(1, width - leftPad - 40);
  const dateToX = dateToXFactory(minDate, maxDate, innerWidth);
  // Offset by leftPad for correct placement
  const dateToXWithPad = (date: string | Date | Date) =>
    leftPad + dateToX(date);

  // Draw vertical grid lines (every 2 weeks)
  const gridLines: Date[] = [];
  let d = new Date(minDate);
  while (d.getTime() <= maxDate.getTime()) {
    gridLines.push(new Date(d));
    d.setDate(d.getDate() + 14);
  }

  // Find today line
  const today = new Date();
  const todayX = dateToXWithPad(today);

  // Draw organic/leaf connectors for dependencies (if present)
  function renderConnectors() {
    const connectors: React.ReactNode[] = [];

    for (let i = 0; i < tasks.length; i += 1) {
      const t = tasks[i];
      if (t.dependsOn !== null && t.dependsOn !== undefined) {
        const depIdx = tasks.findIndex((x) => x.id === t.dependsOn);
        if (depIdx >= 0) {
          const fromY =
            topPad + depIdx * (barHeight + barGap) + barHeight / 2;
          const toY = topPad + i * (barHeight + barGap) + barHeight / 2;
          const fromX = dateToXWithPad(tasks[depIdx].end);
          const toX = dateToXWithPad(t.start);

          const midX = (fromX + toX) / 2;

          connectors.push(
            <g key={`conn-${t?.id}`}>
              <path
                d={`M${fromX},${fromY} Q${midX},${fromY - 30} ${toX},${toY}`}
                stroke={t.critical ? criticalColor : '#43aa8b'}
                strokeWidth={2.5}
                fill="none"
                markerEnd={
                  t.critical ? 'url(#leafCritical)' : 'url(#leaf)'
                }
                opacity={0.85}
              />
            </g>,
          );
        }
      }
    }

    return connectors;
  }

  // Sort tasks so soonest (immediate) is on top
  const sortedTasks = [...tasks].sort(
    (a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: bgColor,
        borderRadius: 16,
        boxShadow: '0 0 32px #b6e2d3',
      }}
    >
      <defs>
        <marker
          id="leaf"
          markerWidth="16"
          markerHeight="16"
          refX="8"
          refY="8"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M8,8 Q12,2 16,8 Q12,14 8,8 Z"
            fill="#43aa8b"
          />
        </marker>
        <marker
          id="leafCritical"
          markerWidth="16"
          markerHeight="16"
          refX="8"
          refY="8"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M8,8 Q12,2 16,8 Q12,14 8,8 Z"
            fill={criticalColor}
          />
        </marker>
      </defs>

      {/* Grid lines */}
      {gridLines.map((g, i) => {
        const x = dateToXWithPad(g);
        return (
          <line
            key={i}
            x1={x}
            x2={x}
            y1={topPad - 20}
            y2={height - 40}
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
        y2={height - 40}
        stroke={todayColor}
        strokeWidth={3}
        strokeDasharray="8 6"
      />

      {/* X-axis (hand-drawn style) */}
      <path
        d={`M${leftPad},${height - 40} Q${(leftPad + width - 20) / 2},${
          height - 30
        } ${width - 20},${height - 40}`}
        stroke={axisColor}
        strokeWidth={2.5}
        fill="none"
      />

      {/* Organic connectors */}
      {renderConnectors()}

      {/* Y labels and bars */}
      {sortedTasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const x1 = dateToXWithPad(t.start);
        const x2 = dateToXWithPad(t.end);
        const barWidth = Math.max(4, x2 - x1);
        const safeBarWidth = Math.max(0, barWidth);
        const isCritical = !!t.critical;
        const typeKey = t.type && typeColors[t.type] ? t.type : 'default';
        const fillColor = isCritical
          ? criticalColor
          : typeColors[typeKey];

        return (
          <g key={t?.id}>
            {/* Bar: wavy/organic shape, green/blue, red if critical */}
            <rect
              x={x1}
              y={y}
              width={safeBarWidth}
              height={barHeight}
              rx={barHeight / 2.2}
              fill={fillColor}
              stroke={isCritical ? criticalColor : axisColor}
              strokeWidth={isCritical ? 3 : 2}
            />

            {/* Milestone icon */}
            {t.milestone && (
              <ellipse
                cx={x2 + 12}
                cy={y + barHeight / 2}
                rx={8}
                ry={6}
                fill="#ffffff"
                stroke="#43aa8b"
                strokeWidth={2}
              />
            )}

            {/* Label: white, readable */}
            <text
              x={leftPad - 10}
              y={y + barHeight / 2}
              fill="#ffffff"
              fontSize={16}
              fontFamily="monospace"
              textAnchor="end"
              alignmentBaseline="middle"
              style={{
                textShadow: '0 0 6px #000',
                fontWeight: 700,
              }}
            >
              {t.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Usage: <OrganicFlowGantt tasks={tasks} />
