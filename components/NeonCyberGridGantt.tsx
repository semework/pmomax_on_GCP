import { dateToXFactory, toDate } from '../lib/ganttUtils';
// components/NeonCyberGridGantt.tsx
import React from 'react';

interface NeonGanttTask {
  id: string | number;
  name: string;
  start: string | Date;
  end: string | Date;
  critical?: boolean;
  milestone?: boolean;
}

interface NeonCyberGridGanttProps {
  tasks: NeonGanttTask[];
  width?: number;
  height?: number;
}



// PROTOTYPE: Neon Cyber Grid Gantt (custom SVG, not Plotly)
// Dark bg, neon grid, today line, critical bars, milestone diamonds.
export const NeonCyberGridGantt: React.FC<NeonCyberGridGanttProps> = ({
  tasks,
  width = 900,
  height = 400,
}) => {
  const barHeight = 32;
  const barGap = 18;
  const leftPad = 120;
  const topPad = 40;
  const rightPad = 40;
  const bottomPad = 40;

  const bgColor = '#10182a';
  const axisColor = '#ffffff';
  const gridColor = '#2a3550';
  const todayColor = '#ffd600';
  const criticalColor = '#e10600';
  const milestoneColor = '#ffffff';

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  if (safeTasks.length === 0) {
    return (
      <svg width={width} height={height} style={{ background: bgColor, borderRadius: 12 }}>
        <text
          x={width / 2}
          y={height / 2}
          fill={axisColor}
          fontSize={14}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          No tasks to display
        </text>
      </svg>
    );
  }

  const starts = safeTasks.map((t) => toDate(t.start)?.getTime()).filter((v): v is number => typeof v === 'number');
  const ends = safeTasks.map((t) => toDate(t.end)?.getTime()).filter((v): v is number => typeof v === 'number');

  if (!starts.length || !ends.length) {
    return (
      <svg width={width} height={height} style={{ background: bgColor, borderRadius: 12 }}>
        <text
          x={width / 2}
          y={height / 2}
          fill={axisColor}
          fontSize={14}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
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

  const innerWidth = Math.max(1, width - leftPad - rightPad);
  const dateToX = dateToXFactory(minDate, maxDate, innerWidth);
  const dateToXWithPad = (date: string | Date) => leftPad + dateToX(date);

  // Vertical grid lines every 2 weeks
  const gridLines: Date[] = [];
  const d = new Date(minDate.getTime());
  while (d.getTime() <= maxDate.getTime()) {
    gridLines.push(new Date(d.getTime()));
    d.setDate(d.getDate() + 14);
  }

  const todayX = dateToXWithPad(new Date());
  const milestones = safeTasks.filter((t) => t.milestone);

  // Expand SVG height if needed for many tasks
  const svgHeight = Math.max(
    height,
    topPad + safeTasks.length * (barHeight + barGap) + bottomPad,
  );

  return (
    <svg
      width={width}
      height={svgHeight}
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
            key={`grid-${i}`}
            x1={x}
            x2={x}
            y1={topPad - 20}
            y2={svgHeight - bottomPad}
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
        y2={svgHeight - bottomPad}
        stroke={todayColor}
        strokeWidth={3}
        strokeDasharray="8 6"
      />

      {/* X-axis */}
      <line
        x1={leftPad}
        x2={width - rightPad}
        y1={svgHeight - bottomPad}
        y2={svgHeight - bottomPad}
        stroke={axisColor}
        strokeWidth={2}
      />

      {/* Rows */}
      {safeTasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const x1 = dateToXWithPad(t.start);
        const x2 = dateToXWithPad(t.end);
        const isCritical = t.critical === true;
        const barWidth = Math.max(4, x2 - x1);
        const safeBarWidth = Math.max(0, barWidth);

        return (
          <g key={String(t?.id)}>
            <rect
              x={x1}
              y={y}
              width={safeBarWidth}
              height={barHeight}
              rx={8}
              fill="none"
              stroke={isCritical ? criticalColor : axisColor}
              strokeWidth={isCritical ? 3 : 2}
            />
            <text
              x={leftPad - 10}
              y={y + barHeight / 2}
              fill="#ffffff"
              fontSize={15}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              textAnchor="end"
              alignmentBaseline="middle"
              style={{ textShadow: '0 0 6px #222' }}
            >
              {t.name}
            </text>
          </g>
        );
      })}

      {/* Milestone diamonds */}
      {milestones.map((m, i) => {
        const x = dateToXWithPad(m.start);
        return (
          <polygon
            key={`ms-${i}`}
            points={`${x},${topPad - 10} ${x - 8},${topPad} ${x},${topPad + 10} ${x + 8},${topPad}`}
            fill={milestoneColor}
            stroke="#ffffff"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
};

export default NeonCyberGridGantt;
