// components/ArtDecoGantt.tsx
import React from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';


type ArtDecoGanttTask = {
  id: string | number;
  name: string;
  start: string | Date;
  end: string | Date;
  critical?: boolean;
  milestone?: boolean;
  owner?: string;
};

interface ArtDecoGanttProps {
  tasks?: ArtDecoGanttTask[];
  width?: number;
  height?: number;
}

export function ArtDecoGantt({ tasks = [], width = 900, height = 400 }: ArtDecoGanttProps) {
    // Row for milestone/critical diamonds below x-tick labels
    const diamondRowY = height - 20 + 24; // 24px below x-axis
  const safeTasks: ArtDecoGanttTask[] = Array.isArray(tasks) ? tasks : [];

  const barHeight = 32;
  const barGap = 18;
  const leftPad = 120;
  const topPad = 40;
  const bgColor = '#10182a';
  const gridColor = '#2a3550';
  const axisColor = '#fff';
  const todayColor = '#ffd600';
  const criticalColor = '#e10600';
  // Adaptive y-axis label color for accessibility
  const yAxisLabelColor = '#fff';
  const yAxisTextShadow = '0 0 6px #222';

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

  if (!safeTasks.length) return null;

  const minDate = new Date(Math.min(...safeTasks.map(t => new Date(t.start).getTime())));
  const maxDate = new Date(Math.max(...safeTasks.map(t => new Date(t.end).getTime())));

  const dateToX = dateToXFactory(minDate, maxDate, width - leftPad - 40);
  const dateToXWithPad = (d: string | Date) => leftPad + dateToX(d);

  const gridLines: Date[] = [];
  let d = new Date(minDate);
  while (d <= maxDate) {
    gridLines.push(new Date(d));
    d.setDate(d.getDate() + 14);
  }

  const todayX = dateToXWithPad(new Date());

  return (
    <svg width={width} height={height} style={{ background: bgColor, borderRadius: 12 }}>
      {gridLines.map((g, i) => (
        <line
          key={i}
          x1={dateToXWithPad(g)}
          x2={dateToXWithPad(g)}
          y1={topPad - 20}
          y2={height - 40}
          stroke={gridColor}
          strokeDasharray="4 6"
        />
      ))}

      <line
        x1={todayX}
        x2={todayX}
        y1={topPad - 20}
        y2={height - 40}
        stroke={todayColor}
        strokeWidth={3}
        strokeDasharray="8 6"
      />

      <line
        x1={leftPad}
        x2={width - 20}
        y1={height - 40}
        y2={height - 40}
        stroke={axisColor}
        strokeWidth={2}
      />


      {safeTasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const x1 = dateToXWithPad(t.start);
        const x2 = dateToXWithPad(t.end);
        const isCritical = t.critical === true;
        const ownerColor = ownerColors[t.owner ?? 'default'] || ownerColors.default;
        const barWidth = Math.max(1, x2 - x1);
        const safeBarWidth = Math.max(0, barWidth);
        // Only critical path bars use red
        const barFill = isCritical ? criticalColor : (ownerColor === criticalColor ? ownerColors.default : ownerColor);
        return (
          <g key={t?.id || i}>
            <rect
              x={x1}
              y={y}
              width={safeBarWidth}
              height={barHeight}
              rx={8}
              fill={barFill}
              stroke={isCritical ? criticalColor : axisColor}
              strokeWidth={isCritical ? 3 : 2}
            />
            <text
              x={leftPad - 10}
              y={y + barHeight / 2}
              fill={yAxisLabelColor}
              fontSize={15}
              textAnchor="end"
              alignmentBaseline="middle"
              style={{ textShadow: yAxisTextShadow }}
            >
              {t.name}
            </text>
          </g>
        );
      })}

      {/* Render milestone/critical diamonds in a row below x-tick labels */}
      {safeTasks.map((t, i) => {
        if (!t.milestone && !t.critical) return null;
        const x = dateToXWithPad(t.end);
        const size = 12;
        const fill = t.critical ? criticalColor : todayColor;
        const stroke = t.critical ? criticalColor : axisColor;
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
