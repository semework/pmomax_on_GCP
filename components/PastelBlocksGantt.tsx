// components/PastelBlocksGantt.tsx
import * as React from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

type PastelTask = {
  id: string | number;
  name: string;
  start: string | Date;
  end: string | Date;
  critical?: boolean;
  dependsOn?: string | number | null;
  milestone?: boolean;
};

interface PastelBlocksGanttProps {
  tasks: PastelTask[];
  width?: number;
  height?: number;
}

// Pastel Blocks: Candy-stripe style + curved dependency connectors + milestones
export function PastelBlocksGantt({
  tasks,
  width = 900,
  height = 400,
}: PastelBlocksGanttProps) {
  const barHeight = 32;
  const barGap = 18;
  const leftPad = 120;
  const topPad = 40;
  const bgColor = '#181c23'; // dark background
  const gridColor = '#232733';
  const axisColor = '#fff';
  const todayColor = '#ffd600';
  const criticalColor = '#e10600';
  const pastelColors = [
    '#2ec4b6',
    '#ffb703',
    '#8ecae6',
    '#f9f7cf',
    '#f7d6e0',
    '#b5ead7',
    '#f7cac9',
    '#b5ead7',
    '#c7ceea',
    '#f9f7cf',
  ];

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

  const minDate = new Date(Math.min(...startTimes));
  const maxDate = new Date(Math.max(...endTimes));

  const innerWidth = width - leftPad - 40;
  const dateToX = dateToXFactory(minDate, maxDate, innerWidth);
  const dateToXWithPad = (date: string | Date) => leftPad + dateToX(date);

  // Draw vertical grid lines (every 2 weeks)
  const gridLines: Date[] = [];
  let d = new Date(minDate);
  while (d.getTime() <= maxDate.getTime()) {
    gridLines.push(new Date(d));
    d.setDate(d.getDate() + 14);
  }

  // Today line
  const today = new Date();
  const todayX = dateToXWithPad(today);

  // Curved connectors for dependencies
  function renderConnectors() {
    const connectors: JSX.Element[] = [];
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (t.dependsOn != null) {
        const depIdx = tasks.findIndex((x) => x.id === t.dependsOn);
        if (depIdx >= 0) {
          const fromY =
            topPad + depIdx * (barHeight + barGap) + barHeight / 2;
          const toY = topPad + i * (barHeight + barGap) + barHeight / 2;
          const fromX = dateToXWithPad(tasks[depIdx].end);
          const toX = dateToXWithPad(t.start);
          const midX = (fromX + toX) / 2;

          connectors.push(
            <path
              key={`conn-${t?.id}`}
              d={`M${fromX},${fromY} C${midX},${fromY} ${midX},${toY} ${toX},${toY}`}
              stroke={t.critical ? criticalColor : '#b5b5b5'}
              strokeWidth={2.5}
              fill="none"
              markerEnd={t.critical ? 'url(#arrowCritical)' : 'url(#arrow)'}
              opacity={0.85}
            />,
          );
        }
      }
    }
    return connectors;
  }

  // Sort tasks so earliest start is on top
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: bgColor,
        borderRadius: 12,
        boxShadow: '0 0 32px #fff2',
      }}
    >
      <defs>
        <marker
          id="arrow"
          markerWidth="8"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="#b5b5b5" />
        </marker>
        <marker
          id="arrowCritical"
          markerWidth="10"
          markerHeight="10"
          refX="10"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L10,5 L0,10 Z" fill={criticalColor} />
        </marker>
        <circle
          id="milestoneDot"
          r="7"
          fill="#fff"
          stroke="#222"
          strokeWidth="2"
        />
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

      {/* Curved connectors */}
      {renderConnectors()}

      {/* Y labels and bars */}
      {sortedTasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const x1 = dateToXWithPad(t.start);
        const x2 = dateToXWithPad(t.end);
        const barWidth = Math.max(4, x2 - x1);
        const safeBarWidth = Math.max(0, barWidth);
        const isCritical = !!t.critical;
        const fillColor = isCritical
          ? criticalColor
          : pastelColors[i % pastelColors.length];

        return (
          <g key={t?.id}>
            {/* Bar */}
            <rect
              x={x1}
              y={y}
              width={safeBarWidth}
              height={barHeight}
              rx={8}
              fill={fillColor}
              stroke={isCritical ? '#ffb3b3' : '#222'}
              strokeWidth={isCritical ? 3 : 1.5}
              opacity={isCritical ? 0.95 : 0.9}
            />
            {/* Label */}
            <text
              x={leftPad - 10}
              y={y + barHeight / 2}
              fill="#f9fafb"
              fontSize={14}
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
              textAnchor="end"
              alignmentBaseline="middle"
            >
              {t.name}
            </text>
            {/* Milestone dot (if any) */}
            {t.milestone && (
              <use
                href="#milestoneDot"
                x={x2}
                y={y + barHeight / 2}
                transform={`translate(0,0)`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
