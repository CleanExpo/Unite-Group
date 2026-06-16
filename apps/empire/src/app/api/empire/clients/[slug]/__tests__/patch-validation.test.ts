// Pure input-validation coverage for PATCH /api/empire/clients/[slug].
// Exercises the same contract the route uses to reject input before it
// reaches Supabase.

import { isValidBrandConfig } from '@/types/brand-config';
import { isValidPortalContent } from '@/types/portal-content';

const ALLOWED_STATUSES = new Set(['active', 'paused', 'churned', 'onboarding']);

describe('PATCH /api/empire/clients/[slug] — status whitelist', () => {
  it('accepts the four CHECK-constraint values', () => {
    for (const s of ['active', 'paused', 'churned', 'onboarding']) {
      expect(ALLOWED_STATUSES.has(s)).toBe(true);
    }
  });

  it('rejects every other value', () => {
    for (const s of ['Active', 'ACTIVE', 'deleted', '', ' active', 'closed']) {
      expect(ALLOWED_STATUSES.has(s)).toBe(false);
    }
  });
});

describe('PATCH /api/empire/clients/[slug] — brand_config delegates to isValidBrandConfig', () => {
  it('accepts a partial update with only primary_color', () => {
    expect(isValidBrandConfig({ primary_color: '#123ABC' })).toBe(true);
  });

  it('accepts a no-op empty brand_config', () => {
    expect(isValidBrandConfig({})).toBe(true);
  });

  it('rejects an obviously bad hex', () => {
    expect(isValidBrandConfig({ primary_color: '#XYZ' })).toBe(false);
  });

  it('rejects a tagline longer than the schema cap', () => {
    expect(isValidBrandConfig({ tagline: 'a'.repeat(201) })).toBe(false);
  });
});

describe('PATCH /api/empire/clients/[slug] — portal_content delegates to isValidPortalContent', () => {
  it('accepts an empty portal_content (no-op publish)', () => {
    expect(isValidPortalContent({})).toBe(true);
  });

  it('accepts deliverables with a valid status enum', () => {
    expect(
      isValidPortalContent({
        deliverables: [{ category: 'SEO', status: 'in-progress', detail: 'audit in week 1' }],
      }),
    ).toBe(true);
  });

  it('rejects deliverables with an unknown status', () => {
    expect(
      isValidPortalContent({
        deliverables: [{ category: 'SEO', status: 'shipped', detail: 'x' }],
      }),
    ).toBe(false);
  });

  it('rejects a touchpoint with an over-long name', () => {
    expect(
      isValidPortalContent({
        touchpoints: [{ name: 'a'.repeat(201), status: 'active' }],
      }),
    ).toBe(false);
  });
});
