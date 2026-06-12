import { parseWebsiteUrl } from '../_validate-website';

describe('parseWebsiteUrl', () => {
  it('accepts http / https URLs with hosts, ports, paths, queries, fragments', () => {
    for (const u of [
      'https://acme.com',
      'http://acme.com.au',
      'https://acme.io:8443',
      'https://acme.io/path?q=1#fragment',
      'https://sub.domain.acme.io',
    ]) {
      const r = parseWebsiteUrl(u);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(u);
    }
  });

  it('treats undefined / null / empty as "no value"', () => {
    for (const v of [undefined, null, '', '   ']) {
      expect(parseWebsiteUrl(v)).toEqual({ ok: true, value: null });
    }
  });

  it('rejects malformed URLs', () => {
    for (const u of [
      'not a url',
      'acme.com',                  // no scheme
      'mailto:x@y.com',            // wrong scheme
      'javascript:alert(1)',       // XSS vector — exactly what the scheme allow-list blocks
      'data:text/html,<script>',   // same
      'file:///etc/passwd',
      'ftp://acme.com',
    ]) {
      expect(parseWebsiteUrl(u).ok).toBe(false);
    }
  });

  it('rejects strings over 500 chars even if otherwise valid', () => {
    const long = 'https://acme.io/' + 'a'.repeat(500);
    expect(parseWebsiteUrl(long).ok).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(parseWebsiteUrl(42).ok).toBe(false);
    expect(parseWebsiteUrl({}).ok).toBe(false);
  });

  it('trims whitespace before validating', () => {
    const r = parseWebsiteUrl('  https://acme.com  ');
    expect(r).toEqual({ ok: true, value: 'https://acme.com' });
  });
});
