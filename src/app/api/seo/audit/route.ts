import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SEOResult {
  domain: string;
  fetchedAt: string;
  score: number;
  checks: {
    title:       { pass: boolean; value: string; note: string };
    description: { pass: boolean; value: string; note: string };
    ogTitle:     { pass: boolean; value: string; note: string };
    ogImage:     { pass: boolean; value: string; note: string };
    canonical:   { pass: boolean; value: string; note: string };
    h1:          { pass: boolean; value: string; note: string };
    robots:      { pass: boolean; value: string; note: string };
    sitemap:     { pass: boolean; value: string; note: string };
  };
  error?: string;
}

function extract(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? (m[1] || m[2] || '').trim() : '';
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

  const url = `https://${domain}`;
  let html = '';
  let fetchError: string | undefined;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Unite-Group SEO Audit/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    html = await res.text();
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Fetch failed';
  }

  // Parse checks
  const title       = extract(html, /<title[^>]*>([^<]{1,200})<\/title>/i);
  const description = extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i)
                   || extract(html, /<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i);
  const ogTitle     = extract(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i)
                   || extract(html, /<meta[^>]+content=["']([^"']{1,200})["'][^>]+property=["']og:title["']/i);
  const ogImage     = extract(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']{1,400})["']/i)
                   || extract(html, /<meta[^>]+content=["']([^"']{1,400})["'][^>]+property=["']og:image["']/i);
  const canonical   = extract(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']{1,400})["']/i)
                   || extract(html, /<link[^>]+href=["']([^"']{1,400})["'][^>]+rel=["']canonical["']/i);
  const robotsMeta  = extract(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']{1,100})["']/i)
                   || extract(html, /<meta[^>]+content=["']([^"']{1,100})["'][^>]+name=["']robots["']/i);
  const h1          = extract(html, /<h1[^>]*>([^<]{1,200})<\/h1>/i);

  // Check sitemap and robots.txt
  let sitemapOk = false;
  let robotsTxtOk = false;
  try {
    const [sm, rb] = await Promise.all([
      fetch(`https://${domain}/sitemap.xml`, { signal: AbortSignal.timeout(4000) }),
      fetch(`https://${domain}/robots.txt`,  { signal: AbortSignal.timeout(4000) }),
    ]);
    sitemapOk  = sm.ok;
    robotsTxtOk = rb.ok;
  } catch { /* ignore */ }

  const checks: SEOResult['checks'] = {
    title:       { pass: title.length >= 20 && title.length <= 60,  value: title,       note: title.length ? `${title.length} chars (ideal 20–60)` : 'Missing' },
    description: { pass: description.length >= 70 && description.length <= 160, value: description, note: description.length ? `${description.length} chars (ideal 70–160)` : 'Missing' },
    ogTitle:     { pass: ogTitle.length > 0,    value: ogTitle,     note: ogTitle     ? 'Present' : 'Missing og:title' },
    ogImage:     { pass: ogImage.length > 0,    value: ogImage,     note: ogImage     ? 'Present' : 'Missing og:image — social shares will lack preview' },
    canonical:   { pass: canonical.length > 0,  value: canonical,   note: canonical   ? 'Present' : 'Missing — duplicate content risk' },
    h1:          { pass: h1.length > 0,         value: h1,          note: h1          ? 'Present' : 'Missing H1 tag' },
    robots:      { pass: !robotsMeta.toLowerCase().includes('noindex'), value: robotsMeta || 'not set', note: robotsMeta.toLowerCase().includes('noindex') ? 'Page is NOINDEX' : robotsMeta ? 'Indexing allowed' : 'No robots meta (indexable by default)' },
    sitemap:     { pass: sitemapOk,             value: sitemapOk ? `https://${domain}/sitemap.xml` : 'Not found', note: sitemapOk ? 'Sitemap accessible' : '/sitemap.xml returned non-200' },
  };

  // Suppress unused variable warning
  void robotsTxtOk;

  const passed = Object.values(checks).filter(c => c.pass).length;
  const score  = Math.round((passed / Object.keys(checks).length) * 100);

  const result: SEOResult = {
    domain,
    fetchedAt: new Date().toISOString(),
    score,
    checks,
    ...(fetchError ? { error: fetchError } : {}),
  };

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
