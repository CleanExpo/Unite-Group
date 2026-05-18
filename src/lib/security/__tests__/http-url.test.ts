import { isHttpUrl, isHttpUrlOrNullish } from '../http-url';

describe('isHttpUrl', () => {
  it('accepts canonical http / https URLs', () => {
    for (const u of [
      'https://acme.com',
      'http://acme.com',
      'https://sub.acme.com/path?q=1#h',
      'https://acme.com:8443',
    ]) {
      expect(isHttpUrl(u)).toBe(true);
    }
  });

  it('rejects malformed strings', () => {
    for (const u of ['not a url', 'acme.com', '://no-scheme.com']) {
      expect(isHttpUrl(u)).toBe(false);
    }
  });

  it('rejects dangerous schemes', () => {
    for (const u of [
      'javascript:alert(1)',
      'data:text/html,<script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'ftp://acme.com',
      'mailto:x@y.com',
    ]) {
      expect(isHttpUrl(u)).toBe(false);
    }
  });

  it('rejects non-strings and empty strings', () => {
    for (const v of [undefined, null, '', 42, {}, []]) {
      expect(isHttpUrl(v)).toBe(false);
    }
  });
});

describe('isHttpUrlOrNullish', () => {
  it('accepts null and undefined as "no value"', () => {
    expect(isHttpUrlOrNullish(null)).toBe(true);
    expect(isHttpUrlOrNullish(undefined)).toBe(true);
  });

  it('rejects empty string (not nullish)', () => {
    expect(isHttpUrlOrNullish('')).toBe(false);
  });

  it('delegates to isHttpUrl for non-nullish values', () => {
    expect(isHttpUrlOrNullish('https://acme.com')).toBe(true);
    expect(isHttpUrlOrNullish('javascript:alert(1)')).toBe(false);
  });
});

describe('isSafeUrl', () => {
  // Import locally so the require doesn't pollute the file-top imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isSafeUrl } = require('../http-url');

  it('accepts absolute http(s) URLs (delegates to isHttpUrl)', () => {
    expect(isSafeUrl('https://acme.com')).toBe(true);
    expect(isSafeUrl('http://acme.com/path')).toBe(true);
  });

  it('accepts root-relative paths (internal portal navigation)', () => {
    expect(isSafeUrl('/proposals/123')).toBe(true);
    expect(isSafeUrl('/')).toBe(true);
    expect(isSafeUrl('/portal/acme?ref=email')).toBe(true);
  });

  it('rejects protocol-relative URLs (would inherit current scheme)', () => {
    expect(isSafeUrl('//evil.com')).toBe(false);
    expect(isSafeUrl('//evil.com/login')).toBe(false);
  });

  it('rejects dangerous schemes (same as isHttpUrl)', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects bareword strings without a scheme', () => {
    expect(isSafeUrl('acme.com')).toBe(false);
    expect(isSafeUrl('not a url')).toBe(false);
  });
});
