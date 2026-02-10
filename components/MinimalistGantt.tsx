
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

// Minimalist: Clean, simple bars, light colors, subtle grid, minimal design
export function MinimalistGantt({ taskRows, preset, height, isDark }) {

  const traceBars = useMemo(() => {
    const x: number[] = [];
    const y: string[] = [];
    const text: string[] = [];
    const hovertext: string[] = [];
    const markerColors: string[] = [];

    taskRows.forEach((r, index) => {
      const { start, end } = getStartEnd(r);
      if (!start || !end) return;
      const startDate = new Date(start);
      const endDate = new Date(end);
      const duration = endDate.getTime() - startDate.getTime();
      if (duration <= 0) return;

      x.push(duration);
      y.push(r.name || `Task ${index + 1}`);
      text.push(r.name || '');
      hovertext.push(`${r.name}<br>${startDate.toISOString()} → ${endDate.toISOString()}`);
      markerColors.push(isDark ? '#4FC3F7' : '#222');
    });

    return {
      type: 'bar' as any,
      orientation: 'h',
      x,
      y,
      marker: { color: markerColors },
      text,
      hoverinfo: 'text',
      hovertext,
      name: 'Task Plan',
    };
  }, [taskRows, isDark]);

  const layout = useMemo(() => {
    return {
      title: 'Minimalist Gantt Chart',
      showlegend: true,
      barmode: 'stack',
      height,
      xaxis: {
        type: 'date',
        tickformat: '%d %b',
      },
      yaxis: {
        type: 'category',
        autorange: 'reversed',
      },
    };
  }, [height]);

  return (
    <div>
      <Plot data={[traceBars as any]} layout={layout as any} />
    </div>
  );
}

function getStartEnd(row) {
  const start = row.start || row.startDate || row.plannedStart;
  const end = row.end || row.endDate || row.plannedEnd;
  return { start, end };
}
