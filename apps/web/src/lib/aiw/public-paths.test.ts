import { describe, it, expect } from 'vitest';
import { isAiwPublicPath, AIW_PUBLIC_PREFIXES } from './public-paths';

describe('isAiwPublicPath — the AIW public surface', () => {
  it('opens exactly the AIW page and API prefixes', () => {
    for (const p of ['/aiw', '/aiw/', '/aiw/demo', '/api/aiw', '/api/aiw/chat', '/api/aiw/capture', '/api/aiw/voice/signed-url']) {
      expect(isAiwPublicPath(p)).toBe(true);
    }
  });

  it('does NOT de-gate sibling routes that share a naive prefix (the shadow-exposure trap)', () => {
    // These would leak if the gate used pathname.startsWith('/aiw') / startsWith('/api/aiw')
    for (const p of ['/aiwesome', '/aiwatch', '/api/aiwatch', '/api/aiweb', '/aiw-admin']) {
      expect(isAiwPublicPath(p)).toBe(false);
    }
  });

  it('keeps the founder app fully gated', () => {
    for (const p of ['/', '/founder', '/dashboard', '/api/crm/leads', '/api/leads', '/api/contacts', '/settings']) {
      expect(isAiwPublicPath(p)).toBe(false);
    }
  });

  it('exposes only two prefixes (guard against scope creep)', () => {
    expect(AIW_PUBLIC_PREFIXES).toEqual(['/aiw', '/api/aiw']);
  });
});
