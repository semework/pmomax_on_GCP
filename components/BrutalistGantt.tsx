
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { dateToXFactory } from '../lib/ganttUtils';

// Brutalist style for Gantt: Bold black/white, thick borders, sharp bars, straight connectors, critical icons
export function BrutalistGantt({ taskRows, milestones, preset, height, isDark }) {

  const traceBars = useMemo(() => {
    const x: number[] = [];
    const base: string[] = [];
    const y: string[] = [];
    const text: string[] = [];
    const hovertext: string[] = [];
    const markerColors: string[] = [];
    const customdata: (string | number)[] = [];

    taskRows.forEach((r, index) => {
      const { start, end } = getStartEnd(r);
      if (!start || !end) return;
      const startDate = new Date(start);
      const endDate = new Date(end);
      const duration = endDate.getTime() - startDate.getTime();
      if (duration <= 0) return;

      x.push(duration);
      base.push(startDate.toISOString());

      y.push(r.name || `Task ${index + 1}`);
      text.push(r.name || '');
      hovertext.push(`${r.name}<br>${startDate.toISOString()} → ${endDate.toISOString()}`);
      markerColors.push(isDark ? '#4FC3F7' : '#222');
      customdata.push(r.id || index);
    });

    return {
      type: 'bar' as any,
      orientation: 'h',
      x,
      base,
      y,
      marker: {
        color: markerColors,
        line: { color: '#000000', width: 2 },
        opacity: 0.95,
      },
      text,
      textposition: 'none',
      hoverinfo: 'text',
      hovertext,
      customdata,
      name: 'Task Plan',
    };
  }, [taskRows, isDark]);

  const layout = useMemo(() => {
    const taskCount = Array.isArray(taskRows) ? taskRows.length : 0;
    const baseHeight = (height || 260) * 0.7;
    const dynamicHeight = Math.max(baseHeight, 140 + taskCount * 28 * 0.7);

    return {
      title: {
        text: 'Brutalist Gantt',
        font: {
          family: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          size: 16,
          color: '#FBBF24',
        },
      },
      showlegend: false,
      barmode: 'stack',
      height: dynamicHeight,
      paper_bgcolor: isDark ? '#020617' : '#f9fafb',
      plot_bgcolor: isDark ? '#0b1120' : '#ffffff',
      margin: { l: 200, r: 40, t: 56, b: 80 },
      xaxis: {
        type: 'date',
        tickangle: -45,
        tickformat: '%b %d',
        gridcolor: isDark ? '#1f2937' : '#e5e7eb',
        linecolor: isDark ? '#FBBF24' : '#111827',
        tickfont: {
          size: 10,
          color: isDark ? '#e5e7eb' : '#111827',
        },
      },
      yaxis: {
        type: 'category',
        autorange: 'reversed',
        automargin: true,
        tickfont: {
          size: 11,
          color: isDark ? '#f9fafb' : '#111827',
        },
      },
    };
  }, [height, isDark, taskRows]);

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
