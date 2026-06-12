// src/types/__tests__/portal-content.test.ts
// UNI-1947 Pillar 2: tests for typed portal_content helpers + zod schema.

import {
  isValidPortalContent,
  normalizePortalContent,
} from '../portal-content';
import { portalContentSchema } from '@/lib/validation/portal-content-schema';

const validFull = {
  welcome_text: 'Welcome aboard. Engagement live.',
  deliverables: [
    { category: 'Discovery', status: 'in-progress' as const, detail: 'Month 1' },
    { category: 'Launch',    status: 'planned'     as const, detail: 'Month 6' },
  ],
  touchpoints: [
    { name: 'Primary site', domain: 'example.com', status: 'active' as const },
  ],
  quick_links: [
    { label: 'Proposal', href: '/proposals/x', note: 'Signed' },
  ],
};

describe('isValidPortalContent', () => {
  it('returns true for an empty object', () => {
    expect(isValidPortalContent({})).toBe(true);
  });

  it('returns true for a full valid PortalContent', () => {
    expect(isValidPortalContent(validFull)).toBe(true);
  });

  it('returns false for non-object input', () => {
    expect(isValidPortalContent(null)).toBe(false);
    expect(isValidPortalContent('nope')).toBe(false);
    expect(isValidPortalContent([])).toBe(false);
    expect(isValidPortalContent(42)).toBe(false);
  });

  it('returns false when welcome_text exceeds 2000 chars', () => {
    expect(isValidPortalContent({ welcome_text: 'x'.repeat(2001) })).toBe(false);
  });

  it('returns false when a deliverable has invalid status', () => {
    expect(
      isValidPortalContent({
        deliverables: [{ category: 'X', status: 'bogus', detail: 'y' }],
      }),
    ).toBe(false);
  });

  it('returns false when touchpoints is not an array', () => {
    expect(isValidPortalContent({ touchpoints: 'oops' })).toBe(false);
  });

  it('returns false when a quick_link is missing href', () => {
    expect(
      isValidPortalContent({
        quick_links: [{ label: 'X', note: 'y' }],
      }),
    ).toBe(false);
  });
});

describe('normalizePortalContent', () => {
  it('returns {} for non-object input', () => {
    expect(normalizePortalContent(null)).toEqual({});
    expect(normalizePortalContent('nope')).toEqual({});
    expect(normalizePortalContent(undefined)).toEqual({});
  });

  it('strips unknown top-level keys', () => {
    const out = normalizePortalContent({
      welcome_text: 'hi',
      stray_key: 'should be gone',
    } as Record<string, unknown>);
    expect(out.welcome_text).toBe('hi');
    expect('stray_key' in out).toBe(false);
  });

  it('drops invalid deliverable elements but keeps valid siblings', () => {
    const out = normalizePortalContent({
      deliverables: [
        { category: 'Good', status: 'done', detail: 'finished' },
        { category: 'Bad',  status: 'bogus', detail: 'invalid' },
        { category: 'Also good', status: 'planned', detail: 'tbd' },
      ],
    });
    expect(out.deliverables).toHaveLength(2);
    expect(out.deliverables![0].category).toBe('Good');
    expect(out.deliverables![1].category).toBe('Also good');
  });

  it('drops welcome_text when too long, keeps other valid fields', () => {
    const out = normalizePortalContent({
      welcome_text: 'x'.repeat(3000),
      deliverables: [{ category: 'X', status: 'done', detail: 'y' }],
    });
    expect(out.welcome_text).toBeUndefined();
    expect(out.deliverables).toHaveLength(1);
  });

  it('keeps a fully valid object intact', () => {
    const out = normalizePortalContent(validFull);
    expect(out).toEqual(validFull);
  });
});

describe('portalContentSchema (zod)', () => {
  it('parses an empty object', () => {
    expect(portalContentSchema.parse({})).toEqual({});
  });

  it('parses a full valid object', () => {
    expect(portalContentSchema.parse(validFull)).toEqual(validFull);
  });

  it('rejects unknown top-level keys (strict)', () => {
    const result = portalContentSchema.safeParse({
      welcome_text: 'hi',
      stray_key: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid deliverable status', () => {
    const result = portalContentSchema.safeParse({
      deliverables: [{ category: 'X', status: 'bogus', detail: 'y' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects welcome_text over 2000 chars', () => {
    const result = portalContentSchema.safeParse({
      welcome_text: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
