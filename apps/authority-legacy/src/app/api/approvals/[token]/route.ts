// @ts-nocheck
// PUBLIC route: GET /api/approvals/[token] and POST /api/approvals/[token]
//
// Magic-link auth: the URL token IS the credential. The portal page server-side
// fetches the approval via GET; the user-facing form posts back via POST with
// { status: 'approved' | 'changes-requested' | 'rejected', changes_requested_body? }.
//
// Tamper-evident receipt (Electronic Transactions Act 1999 Cth):
//   signature_hash = HMAC-SHA256(APPROVAL_SIGNING_SECRET, id|status|responded_at|deliverable_id)
//
// Lookup is by `sha256(token)` rather than the raw token (deepsec P0-3) so
// the B-tree index timing oracle that previously distinguished prefix-matches
// from misses is closed. The raw `token` column is kept in DB during a
// transition window (≤60d) for legacy rows; new writes only carry the hash.
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { safeError } from '@/lib/safeError';
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const TERMINAL_STATUSES = new Set(['approved', 'changes-requested', 'rejected']);

const APPROVAL_FIELDS = 'id, client_slug, deliverable_id, deliverable_title, deliverable_body, preview_url, proof_video_url, expires_at, status, changes_requested_body, signature_hash, responded_at, notified_email';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function findByToken(token: string) {
  const admin = getAdminClient();
  const tokenHash = hashToken(token);

  // Primary lookup: by hash (new rows + backfilled rows).
  const { data: hashed, error: hashedErr } = await admin
    .from('client_approvals')
    .select(APPROVAL_FIELDS)
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (hashedErr) throw hashedErr;
  if (hashed) return hashed;

  // Fallback for the (closing) window where rows pre-date the backfill.
  // Once token_hash is fully backfilled (migration 20260514180000), this
  // branch becomes dead and can be removed in a follow-up.
  const { data: legacy, error: legacyErr } = await admin
    .from('client_approvals')
    .select(APPROVAL_FIELDS)
    .eq('token', token)
    .maybeSingle();
  if (legacyErr) throw legacyErr;
  return legacy;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function clientIp(request: NextRequest): string | null {
  // Vercel signs x-vercel-forwarded-for; trust that first (deepsec P1).
  // x-forwarded-for is client-spoofable so only use as last-resort.
  const vercel = request.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return null;
}

function computeSignatureHash(opts: {
  id: string;
  status: string;
  respondedAt: string;
  deliverableId: string;
}): string {
  // HMAC-keyed (deepsec P0-5). The previous sha256(token+status+responded_at)
  // was a fingerprint not a signature — anyone with the token (i.e. the
  // responder) could recompute it. HMAC with APPROVAL_SIGNING_SECRET separates
  // capability (the token) from receipt (the signature).
  const secret = process.env.APPROVAL_SIGNING_SECRET;
  if (!secret) {
    throw new Error('APPROVAL_SIGNING_SECRET not configured');
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`${opts.id}|${opts.status}|${opts.respondedAt}|${opts.deliverableId}`)
    .digest('hex');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate-limit (deepsec P0-4): 30 GET/min/IP keeps casual brute-force at
  // ~24 hrs/billion tokens; combined with 384-bit entropy this is decisive.
  const gate = await rateLimit(request, { key: 'approvals-get', ...RATE_LIMITS.approvalsGet });
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retry_after_ms: gate.retryAfterMs },
      { status: 429 },
    );
  }

  const { token } = await params;
  if (!token || token.length < 32 || token.length > 128) {
    return NextResponse.json({ error: 'invalid token' }, { status: 400 });
  }
  let row;
  try {
    row = await findByToken(token);
  } catch (e) {
    return NextResponse.json(safeError('lookup_failed', e), { status: 500 });
  }
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    deliverable_title: row.deliverable_title,
    deliverable_body: row.deliverable_body,
    preview_url: row.preview_url,
    proof_video_url: row.proof_video_url,
    client_slug: row.client_slug,
    status: row.status,
    expires_at: row.expires_at,
    expired: isExpired(row.expires_at),
    responded_at: row.responded_at,
    changes_requested_body: row.changes_requested_body,
    signature_hash: row.signature_hash,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Rate-limit (deepsec P0-4): tighter cap on writes — 10/min/IP.
    const gate = await rateLimit(request, { key: 'approvals-post', ...RATE_LIMITS.approvalsPost });
    if (!gate.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retry_after_ms: gate.retryAfterMs },
        { status: 429 },
      );
    }

    const { token } = await params;
    if (!token || token.length < 32 || token.length > 128) {
      return NextResponse.json({ error: 'invalid token' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
    const { status, changes_requested_body } = body;
    if (!TERMINAL_STATUSES.has(status)) {
      return NextResponse.json({ error: `status must be one of: ${[...TERMINAL_STATUSES].join(',')}` }, { status: 400 });
    }
    if (status === 'changes-requested') {
      if (!changes_requested_body || typeof changes_requested_body !== 'string') {
        return NextResponse.json({ error: 'changes_requested_body required when requesting changes' }, { status: 400 });
      }
      if (changes_requested_body.length > 10000) {
        return NextResponse.json({ error: 'changes_requested_body exceeds 10000 chars' }, { status: 400 });
      }
    }

    const row = await findByToken(token);
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (row.status !== 'pending') {
      return NextResponse.json({
        error: 'already-responded',
        status: row.status,
        signature_hash: row.signature_hash,
        responded_at: row.responded_at,
      }, { status: 409 });
    }
    if (isExpired(row.expires_at)) {
      return NextResponse.json({ error: 'expired' }, { status: 410 });
    }

    const respondedAt = new Date().toISOString();
    const signatureHash = computeSignatureHash({
      id: row.id,
      status,
      respondedAt,
      deliverableId: row.deliverable_id,
    });

    // Atomic status transition (deepsec P1): two concurrent POSTs would both
    // observe status=pending under the read-then-write pattern and both write,
    // with the audit recording the LAST hash. The conditional update collapses
    // that race — only the writer whose row was still pending at execution
    // time receives a row back. The other gets 0 rows → 409.
    const admin = getAdminClient();
    const { data: updated, error: updateErr } = await admin
      .from('client_approvals')
      .update({
        status,
        changes_requested_body: status === 'changes-requested' ? changes_requested_body : null,
        responded_at: respondedAt,
        signature_hash: signatureHash,
        approver_ip: clientIp(request),
        approver_user_agent: request.headers.get('user-agent') || null,
      })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id, status, signature_hash, responded_at');

    if (updateErr) {
      return NextResponse.json(safeError('update_failed', updateErr), { status: 500 });
    }

    if (!updated || updated.length === 0) {
      // Another writer won the race in the few ms between findByToken and
      // the conditional update. Re-read the row to return their authoritative
      // receipt rather than mint a competing one.
      const { data: fresh } = await admin
        .from('client_approvals')
        .select('status, signature_hash, responded_at')
        .eq('id', row.id)
        .single();
      return NextResponse.json({
        error: 'already-responded',
        status: fresh?.status,
        signature_hash: fresh?.signature_hash,
        responded_at: fresh?.responded_at,
      }, { status: 409 });
    }

    return NextResponse.json({
      status,
      signature_hash: signatureHash,
      responded_at: respondedAt,
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json(safeError('unexpected', e), { status: 500 });
  }
}
