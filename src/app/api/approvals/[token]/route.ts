// @ts-nocheck
// PUBLIC route: GET /api/approvals/[token] and POST /api/approvals/[token]
//
// Magic-link auth: the URL token IS the credential. The portal page server-side
// fetches the approval via GET; the user-facing form posts back via POST with
// { status: 'approved' | 'changes-requested' | 'rejected', changes_requested_body? }.
//
// We record approver_ip + approver_user_agent and compute
//   signature_hash = sha256(token + status + responded_at_iso)
// stored on the row as a tamper-evident receipt (Electronic Transactions Act 1999).
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const TERMINAL_STATUSES = new Set(['approved', 'changes-requested', 'rejected']);

async function findByToken(token: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('client_approvals')
    .select('id, client_slug, deliverable_id, deliverable_title, deliverable_body, preview_url, proof_video_url, token, expires_at, status, changes_requested_body, signature_hash, responded_at, notified_email')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function clientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 32 || token.length > 128) {
    return NextResponse.json({ error: 'invalid token' }, { status: 400 });
  }
  const row = await findByToken(token);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  // Don't return the token itself back to the client; it's already in their URL.
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
    if (status === 'changes-requested' && (!changes_requested_body || typeof changes_requested_body !== 'string')) {
      return NextResponse.json({ error: 'changes_requested_body required when requesting changes' }, { status: 400 });
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
    const signatureHash = crypto
      .createHash('sha256')
      .update(token + status + respondedAt)
      .digest('hex');

    const admin = getAdminClient();
    const { error: updateErr } = await admin
      .from('client_approvals')
      .update({
        status,
        changes_requested_body: status === 'changes-requested' ? changes_requested_body : null,
        responded_at: respondedAt,
        signature_hash: signatureHash,
        approver_ip: clientIp(request),
        approver_user_agent: request.headers.get('user-agent') || null,
      })
      .eq('id', row.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      status,
      signature_hash: signatureHash,
      responded_at: respondedAt,
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', detail: String(e?.message || e) }, { status: 500 });
  }
}
