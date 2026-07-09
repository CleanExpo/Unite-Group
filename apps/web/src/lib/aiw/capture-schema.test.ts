import { describe, it, expect } from 'vitest';
import { aiwCaptureSchema, AIW_MAX_QUALIFYING_ANSWERS } from './capture-schema';

const base = { name: 'Jane', sourcePath: '/aiw' };

describe('aiwCaptureSchema', () => {
  it('accepts a lead with email only', () => {
    expect(aiwCaptureSchema.safeParse({ ...base, email: 'jane@acme.com' }).success).toBe(true);
  });

  it('accepts a lead with phone only', () => {
    expect(aiwCaptureSchema.safeParse({ ...base, phone: '0400111222' }).success).toBe(true);
  });

  it('rejects a lead with neither email nor phone', () => {
    expect(aiwCaptureSchema.safeParse({ ...base }).success).toBe(false);
  });

  it('rejects more than the allowed qualifying answers', () => {
    const tooMany = Array.from({ length: AIW_MAX_QUALIFYING_ANSWERS + 1 }, (_, i) => `a${i}`);
    expect(aiwCaptureSchema.safeParse({ ...base, email: 'j@a.co', qualifyingAnswers: tooMany }).success).toBe(false);
  });

  it('rejects a filled honeypot (bot)', () => {
    expect(aiwCaptureSchema.safeParse({ ...base, email: 'j@a.co', company_website: 'http://spam' }).success).toBe(false);
  });

  it('rejects a sourcePath that is not an app path', () => {
    expect(aiwCaptureSchema.safeParse({ ...base, email: 'j@a.co', sourcePath: 'https://evil.com' }).success).toBe(false);
  });
});
