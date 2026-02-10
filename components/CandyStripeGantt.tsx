

import * as React from 'react';
import { dateToXFactory, toDate } from '../lib/ganttUtils';

// Candy Stripe: Pastel fills, bold bars, smooth curved connectors, milestone/critical icons
export function CandyStripeGantt({ tasks, width = 900, height = 400 }) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const barHeight = 32;
  const barGap = 18;
  const leftPad = 120;
  const topPad = 40;
  const bgColor = '#181c23'; // dark background
  const gridColor = '#232733';
  const axisColor = '#fff';
  const todayColor = '#ffd600';
  const criticalColor = '#e10600';
  // Red is reserved for critical path only
  const pastelColors = [
    '#2ec4b6', '#ffb703', '#8ecae6', '#f9f7cf', '#f7d6e0', '#b5ead7', '#f7cac9', '#b5ead7', '#c7ceea', '#f9f7cf'
  ];


  // Calculate min/max dates
  const minDate = new Date(Math.min(...safeTasks.map(t => new Date(t.start).getTime())));
  const maxDate = new Date(Math.max(...safeTasks.map(t => new Date(t.end).getTime())));
  const dateToX = dateToXFactory(minDate, maxDate, width - leftPad - 40);
  // Offset by leftPad for correct placement
  const dateToXWithPad = (date: string | Date) => leftPad + dateToX(date);

  // Draw vertical grid lines (every 2 weeks)
  const gridLines: Date[] = [];
  let d = new Date(minDate);
  while (d.getTime() <= (maxDate instanceof Date ? maxDate.getTime() : maxDate)) {
    gridLines.push(new Date(d));
    d.setDate(d.getDate() + 14);
  }

  // Find today line
  const today = new Date();
  const todayX = dateToXWithPad(today);

  // Draw smooth/curved connectors for dependencies (if present)
  function renderConnectors() {
    const connectors: React.ReactElement[] = [];
    for (let i = 0; i < safeTasks.length; i++) {
      const t = tasks[i];
      if (t.dependsOn != null && typeof t.dependsOn === 'number') {
        const depIdx = tasks.findIndex(x => x.id === t.dependsOn);
        if (depIdx >= 0) {
          const fromY = topPad + depIdx * (barHeight + barGap) + barHeight / 2;
          const toY = topPad + i * (barHeight + barGap) + barHeight / 2;
          const fromX = dateToXWithPad(tasks[depIdx].end);
          const toX = dateToXWithPad(t.start);
          // Draw a smooth cubic Bezier curve
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
            />
          );
        }
      }
    }
    return connectors;
  }

  // Sort tasks so soonest (immediate) is on top
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <svg width={width} height={height} style={{ background: bgColor, borderRadius: 12, boxShadow: '0 0 32px #fff2' }}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" fill="#b5b5b5" />
        </marker>
        <marker id="arrowCritical" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L10,5 L0,10 Z" fill={criticalColor} />
        </marker>
        <circle id="milestoneDot" r="7" fill="#fff" stroke="#222" strokeWidth="2" />
      </defs>
      {/* Grid lines */}
      {gridLines.map((g, i) => {
        const x = dateToX(g);
        return <line key={i} x1={x} x2={x} y1={topPad-20} y2={height-40} stroke={gridColor} strokeWidth={1} strokeDasharray="4 6" />;
      })}
      {/* Today line */}
      <line x1={todayX} x2={todayX} y1={topPad-20} y2={height-40} stroke={todayColor} strokeWidth={3} strokeDasharray="8 6" />
      {/* X-axis */}
      <line x1={leftPad} x2={width-20} y1={height-40} y2={height-40} stroke={axisColor} strokeWidth={2} />
      {/* Curved connectors */}
      {renderConnectors()}
      {/* Y labels and bars */}
      {sortedTasks.map((t, i) => {
        const y = topPad + i * (barHeight + barGap);
        const x1 = dateToX(t.start);
        const x2 = dateToX(t.end);
        const xStart = Math.min(x1, x2);
          const barW = Math.max(1, Math.abs(x2 - x1));
          const safeBarW = Math.max(0, barW);
        const isCritical = t.critical;
        // Only critical path bars use red
        const fillColor = isCritical ? criticalColor : pastelColors[i % pastelColors.length];
        // Prevent accidental red in non-critical
        const safeFill = (!isCritical && fillColor === criticalColor) ? pastelColors[0] : fillColor;
        return (
          <g key={t?.id}>
            {/* Bar: pastel fill, red if critical */}
            <rect x={xStart} y={y} width={safeBarW} height={barHeight} rx={16} fill={safeFill} stroke={isCritical ? criticalColor : axisColor} strokeWidth={isCritical ? 3 : 2} />
            {/* Label: adaptive color for accessibility */}
            <text x={leftPad-10} y={y+barHeight/2} fill="#fff" fontSize={16} fontFamily="monospace" textAnchor="end" alignmentBaseline="middle" style={{ textShadow: '0 0 6px #000', fontWeight: 700 }}>
              {t.name}
            </text>
          </g>
        );
      })}

      {/* Render milestone/critical diamonds in a row below x-tick labels */}
      {sortedTasks.map((t, i) => {
        if (!t.milestone && !t.critical) return null;
        const x = dateToX(t.end);
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
    </svg>
  );
}
