// components/PaperSketchGantt.tsx
import React from 'react';
import { dateToXFactory } from '../lib/ganttUtils';

interface SketchTask {
  id: string | number;
  name: string;
  start: string | Date;
  end: string | Date;
}

interface PaperSketchGanttProps {
  tasks: SketchTask[];
  width?: number;
  height?: number;
}

// Paper Sketch: Pencil-drawn look, rough edges, hand-written font, paper background
export const PaperSketchGantt: React.FC<PaperSketchGanttProps> = ({
  tasks,
  width = 900,
  height = 400,
}) => {
  const barHeight = 24;
  const barGap = 22;
  const leftPad = 120;
  const topPad = 38;
  const barColor = '#fffbe6';
  const pencilColor = '#444';
  const labelColor = '#222';
  const axisColor = '#888';
  const paperBg =
    "url(\"data:image/svg+xml;utf8,<svg width='20' height='20' xmlns='http://www.w3.org/2000/svg'><rect width='20' height='20' fill='%23fffbe6'/><path d='M0 0L20 20ZM20 0L0 20Z' stroke='%23f5e9b8' stroke-width='1'/></svg>\")";

  // Guard: no tasks
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        style={{ background: paperBg, borderRadius: 16 }}
      >
        <text
          x={width / 2}
          y={height / 2}
          fill={labelColor}
          fontSize={14}
          fontFamily="cursive, 'Comic Sans MS', system-ui, sans-serif"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          No tasks to sketch
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
        style={{ background: paperBg, borderRadius: 16 }}
      >
        <text
          x={width / 2}
          y={height / 2}
          fill={labelColor}
          fontSize={14}
          fontFamily="cursive, 'Comic Sans MS', system-ui, sans-serif"
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
  const dateToXWithPad = (date: string | Date) => leftPad + dateToX(date);

  // Rough bar path
  function roughBar(x: number, y: number, w: number, h: number) {
    return `M${x},${y + h / 2} Q${x + w / 4},${y - 6} ${
      x + w / 2
    },${y + h / 2} T${x + w},${y + h / 2} Q${x + w - 8},${y + h + 6} ${
      x
    },${y + h / 2} Z`;
  }

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: paperBg,
        borderRadius: 16,
        boxShadow: '0 0 32px #f5e9b8',
      }}
    >
      {/* X-axis */}
      <line
        x1={leftPad}
        x2={width - 20}
        y1={height - 40}
        y2={height - 40}
        stroke={axisColor}
        strokeWidth={2}
        strokeDasharray="4 3"
      />

      {/* Y labels and bars */}
      {tasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const x1 = dateToXWithPad(t.start);
        const x2 = dateToXWithPad(t.end);
        const w = Math.max(4, x2 - x1);

        return (
          <g key={t?.id}>
            {/* Rough bar */}
            <path
              d={roughBar(x1, y, w, barHeight)}
              fill={barColor}
              stroke={pencilColor}
              strokeWidth={2}
              strokeDasharray="2 2"
            />
            {/* Label */}
            <text
              x={leftPad - 14}
              y={y + barHeight / 2}
              fill={labelColor}
              fontSize={15}
              fontFamily="cursive, 'Comic Sans MS', sans-serif"
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

// Usage: <PaperSketchGantt tasks={tasks} />
