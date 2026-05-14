// @ts-nocheck
// POST /api/admin/approvals/create
//
// Admin-gated: Phill or the swarm (service-role bearer) calls this to enqueue a
// new milestone/sprint approval request. Returns the magic-link URL + token; the
// caller can then trigger the client email (this route returns synchronously and
// doesn't auto-send to give the caller a chance to validate before notifying).
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
// Returns 201 { id, token, magic_link_url, expires_at }
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_ADMINS = new Set<string>([
  'contact@unite-group.in',
  'phill.mcgurk@gmail.com',
]);

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — admin email OR service-role bearer (for swarm callers)
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
    const isServiceRole = bearer && bearer === process.env.SUPABASE_SERVICE_ROLE_KEY;

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
      if (typeof v !== 'string' || v.length === 0) {
        return NextResponse.json({ error: `${k} required` }, { status: 400 });
      }
    }
    if (typeof expires_in_days !== 'number' || expires_in_days < 1 || expires_in_days > 60) {
      return NextResponse.json({ error: 'expires_in_days must be 1-60' }, { status: 400 });
    }

    // 3. Mint token (256 bits, urlsafe base64)
    const token = crypto.randomBytes(48).toString('base64url'); // 64 chars
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
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        notified_email: notified_email || null,
      })
      .select('id, token, expires_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://unite-group.in';
    const magicLinkUrl = `${baseUrl}/approvals/${token}`;

    return NextResponse.json({
      id: data.id,
      token: data.token,
      magic_link_url: magicLinkUrl,
      expires_at: data.expires_at,
      actor: actorEmail || 'service-role',
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', detail: String(e?.message || e) }, { status: 500 });
  }
}
