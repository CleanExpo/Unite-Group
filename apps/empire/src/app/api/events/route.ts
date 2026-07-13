/**
 * POST /api/events — Synthex → Unite-Group witness receiver (Flywheel C2).
 *
 * Receives fire-and-forget events from Synthex's unite-group-connector
 * (`POST {UNITE_GROUP_EVENTS_URL}/api/events`, header `x-api-key`) and lands
 * each as an `agent_actions` row (source='synthex') so the /empire activity
 * feed witnesses every distribution action.
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 * - SYNTHEX_EVENTS_API_KEY: shared key the sender must present (503 when unset)
 * - NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: service-role writes
 *
 * GET/HEAD are unauthenticated reachability probes (no data) for the sender's
 * status route and the connection-spine health panel.
 */

import { timingSafeEqual } from 'crypto';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import {
  resolveBusinessSlug,
  synthexEventSchema,
  toAgentActionInsert,
} from '@/lib/integrations/synthex-events';

export const dynamic = 'force-dynamic';

function keysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    receiver: 'synthex-events',
    configured: Boolean(process.env.SYNTHEX_EVENTS_API_KEY),
  });
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.SYNTHEX_EVENTS_API_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: 'receiver_not_configured' },
      { status: 503 }
    );
  }

  const providedKey = request.headers.get('x-api-key') ?? '';
  if (!providedKey || !keysMatch(providedKey, expectedKey)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = synthexEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_event', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'storage_not_configured' },
      { status: 503 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const businessSlug = resolveBusinessSlug(parsed.data.orgSlug);
  let businessId: string | null = null;
  if (businessSlug) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', businessSlug)
      .maybeSingle();
    businessId = business?.id ?? null;
  }

  const insert = toAgentActionInsert(parsed.data, businessId);
  const { data, error } = await supabase
    .from('agent_actions')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[synthex-events] agent_actions insert failed:', error.message);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
