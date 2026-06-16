// Pure-input tests for /api/empire/clients POST validation.
// We exercise the same SLUG_RE + isValidBrandConfig contract the route uses
// to reject input before it ever reaches Supabase, without mocking the
// full Next.js request/response cycle.

import { isValidBrandConfig } from '@/types/brand-config';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

describe('/api/empire/clients — slug validation', () => {
  it('accepts canonical slugs', () => {
    for (const s of ['acme', 'acme-co', 'a1b2', 'restore-assist-1', 'a-b-c']) {
      expect(SLUG_RE.test(s)).toBe(true);
    }
  });

  it('rejects slugs with uppercase, underscores, leading/trailing hyphens, or spaces', () => {
    for (const s of ['Acme', 'acme_co', '-acme', 'acme-', 'acme ', '', 'a'.repeat(64) + 'b']) {
      expect(SLUG_RE.test(s)).toBe(false);
    }
  });

  it('accepts single-character slugs (e.g. /portal/a is a valid URL)', () => {
    expect(SLUG_RE.test('a')).toBe(true);
    expect(SLUG_RE.test('1')).toBe(true);
  });

  it('caps slug length at 64 chars', () => {
    expect(SLUG_RE.test('a'.repeat(64))).toBe(true);
    expect(SLUG_RE.test('a'.repeat(65))).toBe(false);
  });
});

describe('/api/empire/clients — brand_config validation', () => {
  it('accepts minimal brand_config (empty object)', () => {
    expect(isValidBrandConfig({})).toBe(true);
  });

  it('accepts a fully populated brand_config', () => {
    expect(
      isValidBrandConfig({
        primary_color: '#D62828',
        accent_color: '#E62128',
        tagline: 'Restoration partner of choice',
      }),
    ).toBe(true);
  });

  it('rejects malformed hex colours', () => {
    expect(isValidBrandConfig({ primary_color: 'red' })).toBe(false);
    expect(isValidBrandConfig({ accent_color: '#FFF' })).toBe(false);
    expect(isValidBrandConfig({ primary_color: '#GGGGGG' })).toBe(false);
  });

  it('rejects taglines over 200 chars', () => {
    expect(isValidBrandConfig({ tagline: 'a'.repeat(200) })).toBe(true);
    expect(isValidBrandConfig({ tagline: 'a'.repeat(201) })).toBe(false);
  });
});
