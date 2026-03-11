import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GanttChart from '../GanttChart';
import { STYLE_PRESETS } from '../../lib/ganttPresets';

describe('GanttChart critical path - cycle handling', () => {
  it('renders a clear error message when a dependency cycle exists', () => {
    const tasks = [
      {
        id: 'A',
        name: 'Task A',
        start: '2025-01-01',
        end: '2025-01-03',
        deps: ['B'],
      },
      {
        id: 'B',
        name: 'Task B',
        start: '2025-01-04',
        end: '2025-01-06',
        deps: ['A'],
      },
    ];

    const html = renderToStaticMarkup(
      <GanttChart
        tasks={tasks as any}
        stylePreset={STYLE_PRESETS[0] as any}
        criticalPath={true}
      />
    );

    expect(html).toContain('Dependency cycle detected; cannot compute critical path.');
  });
});
