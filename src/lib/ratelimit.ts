// Minimal in-memory rate limiter — V0.
//
// Per deepsec-2026-05-14: public + admin routes have NO rate limiting.
// Magic-link tokens are 384-bit (entropy-safe) but the absence of any
// limiter is the audit failure on its own. P0-4 ships an in-memory
// limiter now; upgrade to @upstash/ratelimit + @vercel/kv as a P1
// follow-up once first abuse is observed.
//
// Trade-off accepted (documented):
//   - In-memory state resets on each cold start (serverless function
//     boot) → attackers can wait out a 60s window by retrying when
//     Vercel scales the function. Acceptable at current traffic levels
//     (single-digit RPS); not acceptable when daily traffic > 1k requests.
//   - Per-instance, not per-edge — different Vercel functions/regions
//     don't share state. Again — acceptable at current scale.
//   - This file is the abstraction boundary. When we switch to Upstash/KV,
//     callers don't change.
//
// Usage:
//   const gate = await rateLimit(request, { key: 'approvals-post', limit: 10, windowMs: 60_000 });
//   if (!gate.ok) return NextResponse.json({ error: 'rate_limited', retry_after_ms: gate.retryAfterMs }, { status: 429 });

import type { NextRequest } from 'next/server';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(request: NextRequest): string {
  // Vercel injects x-vercel-forwarded-for (signed). Trust that first; fall back to x-real-ip;
  // x-forwarded-for is client-spoofable so it's last-resort and we only take the first hop.
  const vercel = request.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return '0.0.0.0';
}

export type RateGate =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterMs: number };

export async function rateLimit(
  request: NextRequest,
  opts: { key: string; limit: number; windowMs: number },
): Promise<RateGate> {
  const ip = clientIp(request);
  const bucketKey = `${opts.key}:${ip}`;
  const now = Date.now();

  const existing = buckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1 };
  }

  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }

  existing.count += 1;
  return { ok: true, remaining: opts.limit - existing.count };
}

// Convenience preset map — keep configs in ONE place per route.
export const RATE_LIMITS = {
  approvalsGet: { limit: 30, windowMs: 60_000 },
  approvalsPost: { limit: 10, windowMs: 60_000 },
  adminApprovalsCreate: { limit: 10, windowMs: 60_000 },
  // Batch 2c (deepsec-2026-05-14 cost-amplification surface) —
  // routes that burn paid third-party APIs per call and were
  // previously unauthenticated.
  contentGen: { limit: 10, windowMs: 60_000 },          // OpenAI burn
  hermesChat: { limit: 20, windowMs: 60_000 },          // Hermes → paid LLMs
  margotVoiceSignedUrl: { limit: 20, windowMs: 60_000 }, // ElevenLabs signed URL
  margotVoiceTaskCreate: { limit: 30, windowMs: 60_000 }, // Pi-CEO voice packet ingest
  portalSeoRefresh: { limit: 5, windowMs: 60_000 },     // DataForSEO burn (heavy)
  seoAuditPdf: { limit: 3, windowMs: 60_000 },          // full audit + PDF render (very heavy)
  videoPublished: { limit: 30, windowMs: 60_000 },      // legit webhook bursts OK
  onboardingMagicLink: { limit: 5, windowMs: 60_000 },  // public, burn-defense only
  // Migrated from the deprecated @/lib/rate-limit module (UNI-2015 wave).
  clientBrandVote:            { limit: 20, windowMs: 60_000 },  // public vote; defense-in-depth over the 24h IP dedupe in portal_content
  portalRequest:              { limit: 5,  windowMs: 60_000 },  // public client-portal intake (creates Linear ticket)
  marketingLeads:             { limit: 10, windowMs: 60_000 },  // public lead form (SendGrid burn)
  logoFetch:                  { limit: 5,  windowMs: 60_000 },  // SSRF-guarded outbound image fetch
  billingSubscribe:           { limit: 30, windowMs: 60_000 },  // admin-gated; rate-limit on top of admin auth
  onboardingCheckoutSession:  { limit: 5,  windowMs: 60_000 },  // public Stripe checkout creation
} as const;
