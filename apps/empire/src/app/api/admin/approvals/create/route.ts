// @ts-nocheck
// POST /api/admin/approvals/create
//
// Admin-gated: Phill or the swarm (service-role bearer) calls this to enqueue a
// new milestone/sprint approval request. Returns `{ id, token, expires_at }`;
// callers reconstruct the magic-link URL as `${NEXT_PUBLIC_APP_URL}/approvals/${token}`.
// The magic-link URL is NOT returned in the response so that response-logged
// transcripts (Vercel logs, swarm traces) do not contain live tokens.
//
// Body:
//   client_slug        (required, string) — e.g. 'dimitri-itr'
//   deliverable_id     (required, string) — e.g. 'milestone-1-discovery'
//   deliverable_title  (required, string)
//   deliverable_body   (optional, markdown)
//   preview_url        (optional)
//   proof_video_url    (optional)
//   notified_email     (optional — captured for audit; the route doesn't send the email)
//   expires_in_days    (optional, default 7)
//
// Returns 201 { id, token, expires_at }
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { safeError } from '@/lib/safeError';
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_ADMINS = new Set<string>([
  'contact@unite-group.in',
  'phill.mcgurk@gmail.com',
]);

export async function POST(request: NextRequest) {
  try {
    // 0. Rate-limit (deepsec P0-4) — admin endpoint, but brute-force surface
    //    against the service-role bearer makes it the highest blast-radius
    //    path in the app. 10 reqs/min/IP is generous for legitimate admin use.
    const gate = await rateLimit(request, { key: 'admin-approvals-create', ...RATE_LIMITS.adminApprovalsCreate });
    if (!gate.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retry_after_ms: gate.retryAfterMs },
        { status: 429 },
      );
    }

    // 1. Auth — admin email OR service-role bearer (for swarm callers)
    //    Bearer comparison MUST be constant-time (deepsec P0-2): `===` on a
    //    secret leaks length and prefix via JS short-circuit semantics.
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
    const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let isServiceRole = false;
    if (bearer && expected) {
      const a = Buffer.from(bearer);
      const b = Buffer.from(expected);
      isServiceRole = a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    let actorEmail: string | null = null;
    if (!isServiceRole) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || !ALLOWED_ADMINS.has(user.email)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      actorEmail = user.email;
    }

    // 2. Validate body
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });

    const {
      client_slug, deliverable_id, deliverable_title, deliverable_body,
      preview_url, proof_video_url, notified_email,
      expires_in_days = 7,
    } = body;

    for (const [k, v] of Object.entries({ client_slug, deliverable_id, deliverable_title })) {
      if (typeof v !== 'string' || v.length === 0 || v.length > 500) {
        return NextResponse.json({ error: `${k} required (1-500 chars)` }, { status: 400 });
      }
    }
    if (typeof expires_in_days !== 'number' || expires_in_days < 1 || expires_in_days > 60) {
      return NextResponse.json({ error: 'expires_in_days must be 1-60' }, { status: 400 });
    }

    // 3. Mint token (384 bits, urlsafe base64). The DB stores sha256(token)
    //    only — the raw token never lands at rest (deepsec P0-3).
    const token = crypto.randomBytes(48).toString('base64url'); // 64 chars
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);

    const admin = getAdminClient();
    const { data, error } = await admin
      .from('client_approvals')
      .insert({
        client_slug,
        deliverable_id,
        deliverable_title,
        deliverable_body: deliverable_body || null,
        preview_url: preview_url || null,
        proof_video_url: proof_video_url || null,
        token,        // kept for backwards-compat with in-flight legacy reads; safe to drop after 60d
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        notified_email: notified_email || null,
      })
      .select('id, expires_at')
      .single();

    if (error) {
      return NextResponse.json(safeError('insert_failed', error), { status: 500 });
    }

    // Do NOT return the magic_link_url here — it would land in response logs
    // alongside the live token. Callers reconstruct it client-side:
    //   const url = `${process.env.NEXT_PUBLIC_APP_URL}/approvals/${token}`;
    return NextResponse.json({
      id: data.id,
      token,
      expires_at: data.expires_at,
      actor: actorEmail || 'service-role',
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json(safeError('unexpected', e), { status: 500 });
  }
}
