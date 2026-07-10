// POST /api/webhooks/front-desk — estate front-desk witness receiver.
//
// Receives HMAC-signed `lead.captured` events emitted by @cleanexpo/front-desk's
// `withWitness` across the estate (CARSI, RestoreAssist, DR, NRPG, CCW,
// Unite-Group). Verifies the signature, maps the event through the existing
// CRM-timeline builders (which strip PII), and records it in `agent_actions` so
// the command centre witnesses lead activity brand-wide.
//
// Dark by default: no WITNESS_SECRET ⇒ 404 (endpoint does not exist).
// Drift-aware: if Supabase isn't configured or `agent_actions` isn't migrated,
// the event is verified + accepted but NOT persisted — an honest 501
// `not_connected` (mirrors the github webhook's degradation), never a crash or
// invented schema. The `agent_actions` DDL ships as a separate founder-gated
// migration; this route is safe to deploy before it (it simply reports
// not_connected until the table exists).
//
// The signature scheme mirrors @cleanexpo/front-desk `verifyWitnessSignature`
// verbatim (HMAC-SHA256, base64url, timing-safe). Swap this inline verify for
// the package import once apps/web consumes @cleanexpo/front-desk.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import {
  buildCrmActivityTimelineEvent,
  buildCrmTimelineAgentActionInsert,
} from '@/lib/crm/activity-timeline';
import { createServiceClient, hasSupabaseServiceConfig } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

interface FrontDeskWitnessEvent {
  type: string;
  brand: string;
  reference: string;
  occurredAt: string;
  data?: Record<string, unknown>;
}

/** Mirrors @cleanexpo/front-desk `verifyWitnessSignature` (HMAC-SHA256, base64url, timing-safe). */
function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret || secret.length < 16 || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function isMissingRelation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const message = err instanceof Error ? err.message : String(err ?? '');
  return code === '42P01' || /does not exist|could not find the table|schema cache/i.test(message);
}

export async function POST(request: NextRequest) {
  // Dark by default — without a configured secret the endpoint does not exist.
  const secret = process.env.WITNESS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-nexus-signature'), secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let event: FrontDeskWitnessEvent;
  try {
    event = JSON.parse(rawBody) as FrontDeskWitnessEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (event?.type !== 'lead.captured') {
    return NextResponse.json({ error: 'unsupported_event', received: event?.type ?? null }, { status: 422 });
  }
  const brand = typeof event.brand === 'string' ? event.brand.trim() : '';
  const reference = typeof event.reference === 'string' ? event.reference.trim() : '';
  const occurredAt = typeof event.occurredAt === 'string' ? event.occurredAt.trim() : '';
  if (!brand || !reference || !occurredAt) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 422 });
  }

  // Map through the existing CRM-timeline builders — these sanitize PII
  // (email/phone/etc.) out of metadata before it ever reaches agent_actions.
  const timelineEvent = buildCrmActivityTimelineEvent({
    type: 'lead_captured',
    actor: `front-desk:${brand}`,
    subjectId: reference,
    subjectLabel: `Lead ${reference}`,
    occurredAt,
    source: `frontdesk:${brand}`,
    businessSlug: brand,
    metadata: { reference, ...(event.data ?? {}) },
  });
  const insert = buildCrmTimelineAgentActionInsert(timelineEvent);

  // Drift-aware: accept-but-don't-persist when the DB isn't ready.
  if (!hasSupabaseServiceConfig()) {
    return NextResponse.json(
      { received: true, persisted: false, reason: 'not_connected' },
      { status: 501 },
    );
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from('agent_actions').insert(insert).select('id').single();
    if (error) {
      if (isMissingRelation(error)) {
        return NextResponse.json(
          { received: true, persisted: false, reason: 'not_connected' },
          { status: 501 },
        );
      }
      return NextResponse.json({ received: true, persisted: false, error: 'insert_failed' }, { status: 502 });
    }
    return NextResponse.json({ received: true, persisted: true, id: (data as { id?: string } | null)?.id ?? null });
  } catch (err) {
    if (isMissingRelation(err)) {
      return NextResponse.json(
        { received: true, persisted: false, reason: 'not_connected' },
        { status: 501 },
      );
    }
    return NextResponse.json({ received: true, persisted: false, error: 'server_error' }, { status: 500 });
  }
}
