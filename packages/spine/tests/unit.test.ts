import { describe, it, expect } from 'vitest';
import { toVectorLiteral, buildClaims } from '../data-access/internal.js';

describe('spine internals (pure, no DB)', () => {
  it('formats a pgvector literal', () => {
    expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
    expect(toVectorLiteral([])).toBe('[]');
  });

  it('builds RLS claims from context', () => {
    expect(JSON.parse(buildClaims({ orgId: 'org-1', personId: 'person-1' }))).toEqual({
      app_metadata: { org_id: 'org-1', person_id: 'person-1' },
    });
  });

  it('builds claims with nulls when unauthenticated', () => {
    expect(JSON.parse(buildClaims({ orgId: null, personId: null }))).toEqual({
      app_metadata: { org_id: null, person_id: null },
    });
  });
});
