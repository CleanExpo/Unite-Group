import { parseContactEmail } from '../_validate-email';

describe('parseContactEmail', () => {
  it('accepts canonical addresses', () => {
    for (const e of [
      'founder@acme.com.au',
      'a@b.co',
      'first.last+tag@subdomain.example.io',
      'x_y-z@xyz.dev',
    ]) {
      const r = parseContactEmail(e);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(e);
    }
  });

  it('treats undefined / null / empty string as "no value"', () => {
    for (const v of [undefined, null, '', '   ']) {
      const r = parseContactEmail(v);
      expect(r).toEqual({ ok: true, value: null });
    }
  });

  it('rejects obvious typos', () => {
    for (const e of [
      'garbage',
      'foo@',
      '@bar.com',
      'x@y',
      'no spaces@yes.com',
      'two@@signs.com',
      'trailing@dot.',
    ]) {
      expect(parseContactEmail(e).ok).toBe(false);
    }
  });

  it('rejects strings over 250 chars even if otherwise valid', () => {
    const long = 'a'.repeat(240) + '@example.com'; // ~252 chars
    expect(parseContactEmail(long).ok).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(parseContactEmail(42).ok).toBe(false);
    expect(parseContactEmail({}).ok).toBe(false);
    expect(parseContactEmail(['a@b.com']).ok).toBe(false);
  });

  it('trims whitespace before validating', () => {
    const r = parseContactEmail('  founder@acme.com.au  ');
    expect(r).toEqual({ ok: true, value: 'founder@acme.com.au' });
  });
});
