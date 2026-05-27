// components/ConstructionHazardGantt.tsx
import React from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

interface GanttTask {
  id: string | number;
  name: string;
  start: string | Date;
  end: string | Date;
}

interface ConstructionHazardGanttProps {
  tasks: GanttTask[];
  width?: number;
  height?: number;
}

// Construction Hazard: Black/yellow diagonal hatch, weekends darkened, striped fill
export const ConstructionHazardGantt: React.FC<ConstructionHazardGanttProps> = ({
  tasks,
  width = 900,
  height = 400,
}) => {
  const barHeight = 32;
  const barGap = 18;
  const leftPad = 120;
  const topPad = 40;
  const barColor = '#222';
  const hatchColor = '#FFD600';
  const bgColor = '#111';

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
          fill={hatchColor}
          fontSize={14}
          fontFamily="monospace"
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
          fill={hatchColor}
          fontSize={14}
          fontFamily="monospace"
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

  const innerWidth = width - leftPad - 40;
  const dateToX = dateToXFactory(minDate, maxDate, innerWidth);

  // Offset by leftPad for correct placement
  const dateToXWithPad = (date: string | Date) => leftPad + dateToX(date);

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: bgColor,
        borderRadius: 12,
        boxShadow: '0 0 32px #FFD60044',
      }}
    >
      <defs>
        <pattern
          id="hazardHatch"
          width="8"
          height="8"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect x="0" y="0" width="8" height="8" fill={barColor} />
          <rect x="0" y="0" width="4" height="8" fill={hatchColor} />
        </pattern>
      </defs>

      {/* X-axis */}
      <line
        x1={leftPad}
        x2={width - 20}
        y1={height - 40}
        y2={height - 40}
        stroke={hatchColor}
        strokeWidth={2}
      />

      {/* Y labels and bars */}
      {tasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const x1 = dateToXWithPad(t.start);
        const x2 = dateToXWithPad(t.end);
        const barWidth = Math.max(4, x2 - x1); // avoid zero-width bars
        const safeBarWidth = Math.max(0, barWidth);

        return (
          <g key={t?.id}>
            {/* Hazard striped bar */}
            <rect
              x={x1}
              y={y}
              width={safeBarWidth}
              height={barHeight}
              rx={4}
              fill="url(#hazardHatch)"
              stroke={hatchColor}
              strokeWidth={2}
            />
            {/* Label */}
            <text
              x={leftPad - 10}
              y={y + barHeight / 2}
              fill={hatchColor}
              fontSize={14}
              fontFamily="monospace"
              textAnchor="end"
              alignmentBaseline="middle"
            >
              {t.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default ConstructionHazardGantt;
