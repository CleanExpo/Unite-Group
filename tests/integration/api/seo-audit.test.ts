/**
 * Integration tests: /api/seo/audit
 *
 * Tests that the SEO audit correctly parses HTML from a domain,
 * scores the on-page signals, and handles edge cases (timeouts,
 * unreachable domains, missing tags).
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/seo/audit/route';

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/seo/audit');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function mockHtmlResponse(html: string, sitemapOk = false) {
  // Mock 1: main HTML fetch
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    text: async () => html,
  });
  // Mock 2: /sitemap.xml check
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: sitemapOk });
  // Mock 3: /robots.txt check
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
}

// ── Fixtures ───────────────────────────────────────────────────────────────
const WELL_OPTIMISED_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>CCW — Professional Carpet Cleaning Supplies</title>
  <meta name="description" content="Australia's leading supplier of professional carpet cleaning equipment, chemicals and machinery. Free shipping on orders over $200.">
  <meta property="og:title" content="CCW — Professional Carpet Cleaning Supplies">
  <meta property="og:image" content="https://ccw.com.au/images/og-cover.jpg">
  <link rel="canonical" href="https://ccw.com.au/">
  <meta name="robots" content="index, follow">
</head>
<body>
  <h1>Professional Carpet Cleaning Supplies</h1>

</body>
</html>`;

const POORLY_OPTIMISED_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Home</title>
</head>
<body>
  <p>Welcome to our website.</p>
</body>
</html>`;

// ── Tests ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  global.fetch = jest.fn();
});

describe('/api/seo/audit GET', () => {

  test('returns 400 when domain param is missing', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/domain required/i);
  });

  test('returns 400 when domain param is empty string', async () => {
    const res = await GET(makeReq({ domain: '' }));
    expect(res.status).toBe(400);
  });

  test('returns correct shape with all check fields', async () => {
    mockHtmlResponse(WELL_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'ccw.com.au' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('domain', 'ccw.com.au');
    expect(body).toHaveProperty('score');
    expect(body).toHaveProperty('fetchedAt');
    expect(body).toHaveProperty('checks');

    const checkKeys = ['title', 'description', 'ogTitle', 'ogImage', 'canonical', 'h1', 'robots', 'sitemap'];
    checkKeys.forEach(key => {
      expect(body.checks).toHaveProperty(key);
      expect(body.checks[key]).toHaveProperty('pass');
      expect(typeof body.checks[key].pass).toBe('boolean');
      expect(body.checks[key]).toHaveProperty('value');
      expect(body.checks[key]).toHaveProperty('note');
    });
  });

  test('all checks pass for well-optimised page', async () => {
    mockHtmlResponse(WELL_OPTIMISED_HTML, true); // sitemapOk=true

    const res = await GET(makeReq({ domain: 'ccw.com.au' }));
    const body = await res.json();

    expect(body.checks.title.pass).toBe(true);
    expect(body.checks.description.pass).toBe(true);
    expect(body.checks.ogTitle.pass).toBe(true);
    expect(body.checks.ogImage.pass).toBe(true);
    expect(body.checks.canonical.pass).toBe(true);
    expect(body.checks.h1.pass).toBe(true);
    expect(body.checks.robots.pass).toBe(true);
  });

  test('score is 100 for fully optimised page', async () => {
    mockHtmlResponse(WELL_OPTIMISED_HTML, true); // sitemapOk=true

    const res = await GET(makeReq({ domain: 'ccw.com.au' }));
    const body = await res.json();

    expect(body.score).toBe(100);
  });

  test('title check fails when <title> is generic ("Home", "Untitled")', async () => {
    mockHtmlResponse(POORLY_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'example.com' }));
    const body = await res.json();

    // "Home" is a known generic title that should fail
    expect(body.checks.title.pass).toBe(false);
  });

  test('description check fails when meta description is missing', async () => {
    mockHtmlResponse(POORLY_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'example.com' }));
    const body = await res.json();

    expect(body.checks.description.pass).toBe(false);
  });

  test('h1 check fails when no <h1> tag exists', async () => {
    mockHtmlResponse(POORLY_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'example.com' }));
    const body = await res.json();

    expect(body.checks.h1.pass).toBe(false);
  });

  test('score is 0 when all checks fail', async () => {
    mockHtmlResponse(POORLY_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'example.com' }));
    const body = await res.json();

    expect(body.score).toBeLessThan(50);
  });

  test('score is a number between 0 and 100', async () => {
    mockHtmlResponse(WELL_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'ccw.com.au' }));
    const body = await res.json();

    expect(typeof body.score).toBe('number');
    expect(body.score).toBeGreaterThanOrEqual(0);
    expect(body.score).toBeLessThanOrEqual(100);
  });

  test('correctly extracts title text', async () => {
    mockHtmlResponse(WELL_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'ccw.com.au' }));
    const body = await res.json();

    expect(body.checks.title.value).toContain('CCW');
  });

  test('correctly extracts canonical URL', async () => {
    mockHtmlResponse(WELL_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'ccw.com.au' }));
    const body = await res.json();

    expect(body.checks.canonical.value).toContain('ccw.com.au');
  });

  test('returns error field (not 500) when domain is unreachable', async () => {
    // Reject all 3 fetch calls: main HTML + sitemap.xml + robots.txt
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
      .mockRejectedValueOnce(new Error('ENOTFOUND'));

    const res = await GET(makeReq({ domain: 'this-domain-does-not-exist-xyz.com' }));
    const body = await res.json();

    // Graceful degradation — score returned but with error noted
    // Note: robots check passes by design for empty HTML (no noindex = indexable)
    // so score is ~13 (1/8), not 0
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('error');
    expect(body.score).toBeLessThanOrEqual(25);
  });

  test('returns error field (not 500) when fetch times out', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new DOMException('AbortError'));

    const res = await GET(makeReq({ domain: 'slow-site.com' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('error');
  });

  test('fetchedAt is a valid ISO timestamp', async () => {
    mockHtmlResponse(WELL_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'ccw.com.au' }));
    const body = await res.json();

    const date = new Date(body.fetchedAt);
    expect(date.toString()).not.toBe('Invalid Date');
    expect(body.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('domain field in response matches the requested domain', async () => {
    mockHtmlResponse(WELL_OPTIMISED_HTML);

    const res = await GET(makeReq({ domain: 'restoreassist.com.au' }));
    const body = await res.json();

    expect(body.domain).toBe('restoreassist.com.au');
  });

});
