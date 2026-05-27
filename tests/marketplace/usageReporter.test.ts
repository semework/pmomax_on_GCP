import { describe, it, expect } from 'vitest';
import { enqueueUsage } from '../../lib/marketplace/usageReporter';

describe('usageReporter', () => {
  it('rejects invalid samples', () => {
    const res = enqueueUsage({ metric: '', quantity: 1 });
    expect(res.ok).toBe(false);
  });

  it('accepts valid samples', () => {
    const res = enqueueUsage({ metric: 'custom.googleapis.com/pmomax/requests', quantity: 2 });
    expect(res.ok).toBe(true);
  });
});
