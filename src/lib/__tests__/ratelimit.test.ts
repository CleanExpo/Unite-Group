import { describe, expect, it } from 'vitest';
import { RATE_LIMITS, rateLimit } from '../ratelimit';
import type { NextRequest } from 'next/server';

// Minimal NextRequest stub — rateLimit() only reads `request.headers.get(...)`.
function makeRequest(ip = '203.0.113.7'): NextRequest {
  return {
    headers: {
      get(name: string): string | null {
        if (name === 'x-vercel-forwarded-for') return ip;
        return null;
      },
    },
  } as unknown as NextRequest;
}

describe('RATE_LIMITS presets — batch 2c keys', () => {
  // Per deepsec-2026-05-14 cost-amplification finding: every paid-API surface
  // needs a preset entry so callers cannot drift the numbers. These tests
  // pin the presets so renames or accidental drops break the build.
  it('defines contentGen at 10 req/min', () => {
    expect(RATE_LIMITS.contentGen).toEqual({ limit: 10, windowMs: 60_000 });
  });

  it('defines hermesChat at 20 req/min', () => {
    expect(RATE_LIMITS.hermesChat).toEqual({ limit: 20, windowMs: 60_000 });
  });

  it('defines portalSeoRefresh at 5 req/min (heavy, paid)', () => {
    expect(RATE_LIMITS.portalSeoRefresh).toEqual({ limit: 5, windowMs: 60_000 });
  });

  it('defines seoAuditPdf at 3 req/min (very heavy)', () => {
    expect(RATE_LIMITS.seoAuditPdf).toEqual({ limit: 3, windowMs: 60_000 });
  });

  it('defines videoPublished at 30 req/min (legit webhook bursts OK)', () => {
    expect(RATE_LIMITS.videoPublished).toEqual({ limit: 30, windowMs: 60_000 });
  });

  it('defines onboardingMagicLink at 5 req/min (public burn-defense)', () => {
    expect(RATE_LIMITS.onboardingMagicLink).toEqual({ limit: 5, windowMs: 60_000 });
  });
});

describe('rateLimit() — behaviour smoke test on new presets', () => {
  it('blocks after seoAuditPdf.limit (3) requests from the same IP', async () => {
    const req = makeRequest('198.51.100.42');
    const key = 'seo-audit-pdf-test';

    const a = await rateLimit(req, { key, ...RATE_LIMITS.seoAuditPdf });
    const b = await rateLimit(req, { key, ...RATE_LIMITS.seoAuditPdf });
    const c = await rateLimit(req, { key, ...RATE_LIMITS.seoAuditPdf });
    const d = await rateLimit(req, { key, ...RATE_LIMITS.seoAuditPdf });

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(true);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.retryAfterMs).toBeGreaterThan(0);
  });

  it('isolates buckets by IP', async () => {
    const reqA = makeRequest('192.0.2.1');
    const reqB = makeRequest('192.0.2.2');
    const key = 'onboarding-magic-link-test';

    // Burn IP-A through the limit
    for (let i = 0; i < RATE_LIMITS.onboardingMagicLink.limit; i++) {
      await rateLimit(reqA, { key, ...RATE_LIMITS.onboardingMagicLink });
    }
    const blockedA = await rateLimit(reqA, { key, ...RATE_LIMITS.onboardingMagicLink });
    const freshB = await rateLimit(reqB, { key, ...RATE_LIMITS.onboardingMagicLink });

    expect(blockedA.ok).toBe(false);
    expect(freshB.ok).toBe(true);
  });
});
