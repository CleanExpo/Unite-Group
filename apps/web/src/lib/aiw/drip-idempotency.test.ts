import { describe, it, expect } from 'vitest';
import { dripQueueKey } from './drip-idempotency';

describe('dripQueueKey', () => {
  it('is stable for the same lead + step (double-submit dedups)', () => {
    expect(dripQueueKey('lead-1', 0)).toBe(dripQueueKey('lead-1', 0));
  });

  it('differs by step and by lead', () => {
    expect(dripQueueKey('lead-1', 0)).not.toBe(dripQueueKey('lead-1', 1));
    expect(dripQueueKey('lead-1', 0)).not.toBe(dripQueueKey('lead-2', 0));
  });

  it('rejects invalid input', () => {
    expect(() => dripQueueKey('', 0)).toThrow();
    expect(() => dripQueueKey('lead-1', -1)).toThrow();
    expect(() => dripQueueKey('lead-1', 1.5)).toThrow();
  });
});
