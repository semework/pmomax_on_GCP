// components/BlueprintCADGantt.tsx
import React from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

interface BlueprintTask {
  id: string | number;
  name: string;
  start: string | Date;
  end: string | Date;
  owner?: string;
  critical?: boolean;
  milestone?: boolean;
}

interface BlueprintCADGanttProps {
  tasks: BlueprintTask[];
  width?: number;
  height?: number;
}

// Blueprint CAD: Blue background, drafting grid, monthly ticks, outline bars
export function BlueprintCADGantt({
  tasks,
  width = 900,
  height = 400,
}: BlueprintCADGanttProps) {
  // Baseline vs Forecast (Variance) style: vibrant colored bars, critical path, grid, today line, readable labels
  const barHeight = 32;
  const barGap = 18;
  const leftPad = 120;
  const topPad = 40;
  const bgColor = '#10182a';
  const gridColor = '#2a3550';
  const axisColor = '#ffffff';
  const todayColor = '#ffd600';
  const criticalColor = '#e10600';

  // Red is reserved for critical path only
  const ownerColors: Record<string, string> = {
    'Julia Nguyen': '#3b6cff',
    'Rosa Alvarez': '#ff9800',
    'Lina Park': '#a259ff',
    'Leila Patel': '#00cfc8',
    'Ethan Brooks': '#ff69b4',
    'Omar Haddad': '#00eaff',
    'Marco Diaz': '#00eaff',
    'Priya Singh': '#ffd600',
    default: '#7ecbff',
  };

  // Guard: no tasks
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        style={{ background: bgColor, borderRadius: 12 }}
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
  const starts = tasks
    .map((t) => new Date(t.start).getTime())
    .filter((v) => Number.isFinite(v));
  const ends = tasks
    .map((t) => new Date(t.end).getTime())
    .filter((v) => Number.isFinite(v));

  if (!starts.length || !ends.length) {
    return (
      <svg
        width={width}
        height={height}
        style={{ background: bgColor, borderRadius: 12 }}
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

  const minDate = new Date(Math.min(...starts));
  const maxDate = new Date(Math.max(...ends));

  // Map date to X, with consistent left padding
  const innerWidth = width - leftPad - 40;
  const dateToX = dateToXFactory(minDate, maxDate, innerWidth);
  const dateToXWithPad = (date: string | Date | Date) =>
    leftPad + dateToX(date);

  // Draw vertical grid lines (every 2 weeks)
  const gridLines: Date[] = [];
  let d = new Date(minDate);
  while (d.getTime() <= maxDate.getTime()) {
    gridLines.push(new Date(d));
    d.setDate(d.getDate() + 14);
  }

  // Today line (within the same scale; even if outside range it will render off to side)
  const today = new Date();
  const todayX = dateToXWithPad(today);

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: bgColor,
        borderRadius: 12,
        boxShadow: '0 0 32px #ffffff22',
      }}
    >
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
            strokeWidth={1}
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

      {/* X-axis */}
      <line
        x1={leftPad}
        x2={width - 20}
        y1={height - 40}
        y2={height - 40}
        stroke={axisColor}
        strokeWidth={2}
      />

      {/* Y labels and bars */}
      {tasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const x1 = dateToXWithPad(t.start);
        const x2 = dateToXWithPad(t.end);
        const barWidth = Math.max(4, x2 - x1);
        const safeBarWidth = Math.max(0, barWidth);
        const isCritical = !!t.critical;
        const ownerColor = (t.owner && ownerColors[t.owner]) || ownerColors.default;
        // Only critical path bars use red
        const barFill = isCritical ? criticalColor : (ownerColor === criticalColor ? ownerColors.default : ownerColor);
        return (
          <g key={t?.id}>
              width={safeBarWidth}
            <rect
              x={x1}
              y={y}
              width={Math.max(4, x2 - x1)}
              height={barHeight}
              rx={8}
              fill={barFill}
              stroke={isCritical ? criticalColor : axisColor}
              strokeWidth={isCritical ? 3 : 2}
            />
            {/* Label: adaptive color for accessibility */}
            <text
              x={leftPad - 10}
              y={y + barHeight / 2}
              fill="#fff"
              fontSize={15}
              fontFamily="monospace"
              textAnchor="end"
              alignmentBaseline="middle"
              style={{ textShadow: '0 0 6px #222', fontWeight: 700 }}
            >
              {t.name}
            </text>
          </g>
        );
      })}

      {/* Render milestone/critical diamonds in a row below x-tick labels */}
      {tasks.map((t, i) => {
        if (!t.milestone && !t.critical) return null;
        const x = dateToXWithPad(t.end);
        const size = 12;
        const fill = t.critical ? criticalColor : todayColor;
        const stroke = t.critical ? criticalColor : axisColor;
        const diamondRowY = height - 20 + 24; // 24px below x-axis
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

      {/* Month labels along X-axis */}
      {(() => {
        const months: Date[] = [];
        let m = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        while (m.getTime() <= maxDate.getTime()) {
          months.push(new Date(m));
          m.setMonth(m.getMonth() + 1);
        }
        return months.map((month, i) => {
          const x = dateToXWithPad(month);
          return (
            <text
              key={i}
              x={x}
              y={height - 20}
              fill="#ffffff"
              fontSize={12}
              fontFamily="monospace"
              textAnchor="middle"
            >
              {month.toLocaleString('default', {
                month: 'short',
                year: '2-digit',
              })}
            </text>
          );
        });
      })()}
    </svg>
  );
}

// Usage: <BlueprintCADGantt tasks={tasks} />
