import { describe, expect, it } from 'vitest';
import { timingSafeBearerMatch, timingSafeTokenMatch } from '../safe-compare';

describe('timingSafeBearerMatch', () => {
  const SECRET = 'super-long-secret-with-enough-entropy-12345';

  it('returns true for an exact match', () => {
    expect(timingSafeBearerMatch(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it('returns false when the secret differs', () => {
    expect(timingSafeBearerMatch(`Bearer ${SECRET}-tamper`, SECRET)).toBe(false);
  });

  it('returns false when lengths differ (and never throws)', () => {
    expect(timingSafeBearerMatch(`Bearer short`, SECRET)).toBe(false);
  });

  it('fails closed when header is missing', () => {
    expect(timingSafeBearerMatch(null, SECRET)).toBe(false);
    expect(timingSafeBearerMatch(undefined, SECRET)).toBe(false);
    expect(timingSafeBearerMatch('', SECRET)).toBe(false);
  });

  it('fails closed when secret is missing (env not set)', () => {
    expect(timingSafeBearerMatch(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(timingSafeBearerMatch(`Bearer ${SECRET}`, '')).toBe(false);
  });

  it('rejects non-Bearer prefixes', () => {
    expect(timingSafeBearerMatch(SECRET, SECRET)).toBe(false);
    expect(timingSafeBearerMatch(`Basic ${SECRET}`, SECRET)).toBe(false);
    expect(timingSafeBearerMatch(`bearer ${SECRET}`, SECRET)).toBe(false); // case-sensitive
  });

  it('rejects "Bearer " alone (empty token after prefix)', () => {
    expect(timingSafeBearerMatch('Bearer ', SECRET)).toBe(false);
  });
});

describe('timingSafeTokenMatch', () => {
  const SECRET = 'pi_ceo_api_key_value_1234567890';

  it('returns true for an exact match', () => {
    expect(timingSafeTokenMatch(SECRET, SECRET)).toBe(true);
  });

  it('returns false for a mismatch of the same length', () => {
    const tampered = SECRET.slice(0, -1) + 'X';
    expect(tampered.length).toBe(SECRET.length);
    expect(timingSafeTokenMatch(tampered, SECRET)).toBe(false);
  });

  it('returns false for length-mismatched inputs', () => {
    expect(timingSafeTokenMatch('short', SECRET)).toBe(false);
    expect(timingSafeTokenMatch(SECRET + 'extra', SECRET)).toBe(false);
  });

  it('fails closed on null / undefined / empty inputs', () => {
    expect(timingSafeTokenMatch(null, SECRET)).toBe(false);
    expect(timingSafeTokenMatch(undefined, SECRET)).toBe(false);
    expect(timingSafeTokenMatch('', SECRET)).toBe(false);
    expect(timingSafeTokenMatch(SECRET, undefined)).toBe(false);
    expect(timingSafeTokenMatch(SECRET, '')).toBe(false);
  });
});
