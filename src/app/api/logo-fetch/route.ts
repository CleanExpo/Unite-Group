/**
 * Logo Fetch API — scrapes a company website and returns the best logo URL.
 * Used during client onboarding to automatically set the company logo.
 * 
 * GET /api/logo-fetch?domain=ccwonline.com.au
 * Returns: { logoUrl, source, width, height } or { error }
 */

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

interface LogoCandidate {
  url: string;
  score: number;  // higher = better candidate
  source: string;
}

function normaliseUrl(url: string, base: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return new URL(url, base).href;
  if (url.startsWith('http')) return url;
  return new URL(url, base).href;
}

function scoreCandidate(url: string, alt: string, context: string): number {
  const u = url.toLowerCase();
  const a = (alt + ' ' + context).toLowerCase();
  let score = 0;
  
  // Strong logo signals
  if (u.includes('logo')) score += 10;
  if (a.includes('logo')) score += 8;
  if (u.includes('brand')) score += 6;
  if (u.includes('header')) score += 4;
  
  // Format preference: SVG > WebP > PNG > JPG
  if (u.endsWith('.svg')) score += 5;
  else if (u.endsWith('.webp')) score += 3;
  else if (u.endsWith('.png')) score += 2;
  else if (u.endsWith('.jpg') || u.endsWith('.jpeg')) score += 1;
  
  // Penalise obviously wrong images
  if (u.includes('banner') || u.includes('hero') || u.includes('background')) score -= 8;
  if (u.includes('avatar') || u.includes('profile') || u.includes('thumbnail')) score -= 4;
  if (u.includes('icon') && !u.includes('logo')) score -= 2;
  
  return score;
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
  }

  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

  let html = '';
  try {
    const res = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
  } catch (e) {
    return NextResponse.json({ error: `Could not fetch ${baseUrl}: ${(e as Error).message}` }, { status: 422 });
  }

  const candidates: LogoCandidate[] = [];

  // 1. og:image (reliable, usually high quality)
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogImageMatch?.[1]) {
    candidates.push({ url: normaliseUrl(ogImageMatch[1], baseUrl), score: 3, source: 'og:image' });
  }

  // 2. Explicit logo img tags (id/class/alt containing "logo")
  const logoImgRegex = /<img[^>]+(id|class|alt|itemprop)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']|<img[^>]+src=["']([^"']+)["'][^>]+(id|class|alt|itemprop)=["'][^"']*logo[^"']*["']/gi;
  let m;
  while ((m = logoImgRegex.exec(html)) !== null) {
    const url = m[2] || m[3];
    const context = m[0];
    if (url) {
      candidates.push({
        url: normaliseUrl(url, baseUrl),
        score: scoreCandidate(url, '', context),
        source: 'logo-img-attr',
      });
    }
  }

  // 3. Any img in header/nav with logo-like src
  const headerImgRegex = /<(?:header|nav)[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = headerImgRegex.exec(html)) !== null) {
    const url = m[1];
    if (url) {
      const score = scoreCandidate(url, '', m[0]);
      if (score > 0) {
        candidates.push({ url: normaliseUrl(url, baseUrl), score, source: 'header-img' });
      }
    }
  }

  // 4. Apple touch icon (often the cleanest square mark)
  const touchIconMatch = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
  if (touchIconMatch?.[1]) {
    candidates.push({ url: normaliseUrl(touchIconMatch[1], baseUrl), score: 2, source: 'apple-touch-icon' });
  }

  // 5. Favicon SVG (clean vector mark)
  const svgFaviconMatch = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"'.]+\.svg[^"']*?)["']/i);
  if (svgFaviconMatch?.[1]) {
    candidates.push({ url: normaliseUrl(svgFaviconMatch[1], baseUrl), score: 4, source: 'svg-favicon' });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: 'No logo candidates found on the page', domain, baseUrl }, { status: 404 });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  return NextResponse.json({
    logoUrl: best.url,
    source: best.source,
    score: best.score,
    allCandidates: candidates.slice(0, 5).map(c => ({ url: c.url, source: c.source, score: c.score })),
    domain,
    fetchedAt: new Date().toISOString(),
  });
}
