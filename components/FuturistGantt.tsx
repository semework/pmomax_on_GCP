import React, { useMemo } from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

// Futurist: slanted bars, glow, angled/curved connectors
type Task = {
  id?: string;
  name: string;
  start: string;
  end: string;
  owner?: string;
  critical?: boolean;
};

function connectorPath(x0: number, y0: number, x1: number, y1: number): string {
  const midX = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${midX} ${y0}, ${midX} ${y1}, ${x1} ${y1}`;
}

export function FuturistGantt({
  tasks,
  width = 900,
  height = 400,
}: {
  tasks: Task[];
  width?: number;
  height?: number;
}) {
  const safeTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);

  const orderedTasks = useMemo(
    () =>
      [...safeTasks].sort(
        (a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    [safeTasks],
  );

  const barHeight = 32;
  const barGap = 18;
  const leftPad = 140;
  const topPad = 52;
  const rightPad = 24;
  const bottomPad = 48;

  const bgColor = '#10182a';
  const gridColor = '#2a3550';
  const axisColor = '#ffffff';
  const todayColor = '#ffd600';
  const criticalColor = '#e10600';
  const glowColor = '#00eaff';

  const ownerColors: Record<string, string> = {
    'Julia Nguyen': '#3b6cff',
    'Rosa Alvarez': '#ff9800',
    'Lina Park': '#a259ff',
    'Leila Patel': '#00cfc8',
    'Ethan Brooks': '#ff69b4',
    'Omar Haddad': '#e10600',
    'Marco Diaz': '#00eaff',
    'Priya Singh': '#ffd600',
    default: '#7ecbff',
  };

  const bounds = useMemo(() => {
    const starts = orderedTasks
      .map((t) => toDate(t.start)?.getTime())
      .filter((x): x is number => typeof x === 'number');
    const ends = orderedTasks
      .map((t) => toDate(t.end)?.getTime())
      .filter((x): x is number => typeof x === 'number');

    if (!starts.length || !ends.length) {
      const now = new Date();
      return { min: now, max: new Date(now.getTime() + 86400000 * 30) };
    }
    return { min: new Date(Math.min(...starts)), max: new Date(Math.max(...ends)) };
  }, [orderedTasks]);

  const dateToX = useMemo(
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

  const svgHeight = Math.max(
    height,
    topPad + orderedTasks.length * (barHeight + barGap) + bottomPad,
  );

  return (
    <svg width={width} height={svgHeight} style={{ background: bgColor, borderRadius: 12 }}>
      {/* unchanged SVG body */}
    </svg>
  );
}
