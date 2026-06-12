// src/types/__tests__/brand-config.test.ts
// UNI-1991: tests for typed brand_config helpers.
// Repo uses Jest (see jest.config.js, ts-jest preset); describe/it/expect are
// globals so no imports needed for the test runner.

import { isValidBrandConfig, normalizeBrandConfig } from '../brand-config';

describe('isValidBrandConfig', () => {
  it('returns true for an empty object', () => {
    expect(isValidBrandConfig({})).toBe(true);
  });

  it('returns true for a full valid config', () => {
    const full = {
      logo_url: 'https://example.com/logo.png',
      primary_color: '#b30000',
      accent_color: '#228FE0',
      font_family: 'Inter' as const,
      voice_tone: 'formal' as const,
      tagline: 'Property services, unified.',
    };
    expect(isValidBrandConfig(full)).toBe(true);
  });

  it('returns false when primary_color is "red" (not hex)', () => {
    expect(isValidBrandConfig({ primary_color: 'red' })).toBe(false);
  });

  it('returns false when font_family is "Comic Sans"', () => {
    expect(isValidBrandConfig({ font_family: 'Comic Sans' })).toBe(false);
  });

  it('returns true when a legacy key (working_name) is present alongside typed keys', () => {
    expect(
      isValidBrandConfig({
        working_name: 'Otto',
        candidates: ['Otto', 'Sorted'],
        primary_color: '#b30000',
      }),
    ).toBe(true);
  });

  it('returns false for non-object input', () => {
    expect(isValidBrandConfig(null)).toBe(false);
    expect(isValidBrandConfig('nope')).toBe(false);
    expect(isValidBrandConfig([])).toBe(false);
  });
});

describe('normalizeBrandConfig', () => {
  it('preserves legacy working_name + candidates keys', () => {
    const input = {
      working_name: 'Otto',
      candidates: ['Otto', 'Sorted', 'Beau'],
    };
    const out = normalizeBrandConfig(input);
    expect(out.working_name).toBe('Otto');
    expect(out.candidates).toEqual(['Otto', 'Sorted', 'Beau']);
  });

  it('strips an unknown key like foobar', () => {
    const out = normalizeBrandConfig({ foobar: 'remove me', primary_color: '#b30000' });
    expect('foobar' in out).toBe(false);
    expect(out.primary_color).toBe('#b30000');
  });

  it('drops an invalid hex primary_color silently', () => {
    const out = normalizeBrandConfig({ primary_color: 'red' });
    expect('primary_color' in out).toBe(false);
  });

  it('drops an invalid font_family enum silently', () => {
    const out = normalizeBrandConfig({ font_family: 'Comic Sans' });
    expect('font_family' in out).toBe(false);
  });

  it('returns an empty object for non-object input', () => {
    expect(normalizeBrandConfig(null)).toEqual({});
    expect(normalizeBrandConfig('nope')).toEqual({});
  });
});
