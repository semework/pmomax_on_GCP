import { describe, it, expect } from 'vitest';
import { STYLE_PRESETS } from '../../lib/ganttPresets';
import { computeCriticalPath } from '../../lib/ganttUtils';
import { demoData } from '../../data/demoData';

describe('Gantt canonical styles', () => {
  it('exposes tick formats for all presets', () => {
    STYLE_PRESETS.forEach((preset) => {
      expect(preset.xTickFormat).toBeTypeOf('string');
      expect(preset.xTickFormat.length).toBeGreaterThan(0);
    });
  });

  it('computes a non-empty critical path for demo deliverables', () => {
    const cp = computeCriticalPath(demoData.deliverables as any);
    expect(Array.isArray(cp) ? cp.length : 0).toBeGreaterThan(0);
  });

  it('computes longest path using ids and names interchangeably', () => {
    const tasks = [
      {
        id: 'A',
        name: 'Kickoff',
        start: '2025-01-01',
        end: '2025-01-03',
        deps: [],
      },
      {
        id: 'B',
        name: 'Design',
        start: '2025-01-04',
        end: '2025-01-08',
        // Depends on A by name
        deps: ['Kickoff'],
      },
      {
        id: 'C',
        name: 'Build',
        start: '2025-01-09',
        end: '2025-01-15',
        // Depends on B by id
        deps: ['B'],
      },
    ];

    const cp = computeCriticalPath(tasks as any);
    const ids = Array.isArray(cp) ? cp.map((t: any) => t.id) : [];
    expect(ids).toEqual(['A', 'B', 'C']);
  });

  it('returns an empty path for cyclic dependency graphs (fails gracefully)', () => {
    const cyclic = [
      {
        id: 'A',
        name: 'A',
        start: '2025-01-01',
        end: '2025-01-02',
        deps: ['C'],
      },
      {
        id: 'B',
        name: 'B',
        start: '2025-01-02',
        end: '2025-01-03',
        deps: ['A'],
      },
      {
        id: 'C',
        name: 'C',
        start: '2025-01-03',
        end: '2025-01-04',
        deps: ['B'],
      },
    ];

    const cp = computeCriticalPath(cyclic as any);
    expect(Array.isArray(cp) ? cp.length : 0).toBe(0);
  });
});
