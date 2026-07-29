import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { ingestVoiceMission } from '@/lib/command-centre/voice-mission-bridge';
import type { SupabaseLike } from '@/lib/command-centre/tasks';

export const dynamic = 'force-dynamic';

interface VoicePacket {
  packet_id: string;
  conversation_id: string;
  transcript_text: string;
  summary: string;
  requested_outcome: string;
  business_context: string;
  risk_level: string;
  approval_required: boolean;
  approval_reason: string;
  actions: Array<Record<string, unknown>>;
  evidence_refs: Record<string, string>;
}

// Every free-text and JSON field this route persists is bounded, and a packet
// that exceeds a bound is REFUSED rather than truncated.
//
// The session row is written before the strict mission bridge runs, because the
// transcript is the durable account of what was said even when the mission is
// rejected. That ordering is deliberate, but it meant an authenticated caller
// could park an arbitrarily large blob in margot_voice_sessions: nothing between
// `req.json()` and the insert capped transcript_text, actions or evidence_refs,
// and only `summary` was bounded — by a silent .slice(0, 500) that discarded the
// overflow without telling the caller. Storage growth is not the only cost; the
// row is read back by margot-health and the os-health-rollup cron.
//
// Truncating is the wrong remedy: a transcript cut mid-sentence still reaches the
// mission bridge and can change what the mission is understood to mean. Refusing
// is honest — the caller is told its packet was too large and which field did it.
const LIMITS = {
  packetId: 200,
  conversationId: 200,
  businessContext: 120,
  summary: 500,
  requestedOutcome: 2_000,
  approvalReason: 2_000,
  /** A very long call still transcribes well under this. */
  transcript: 50_000,
  actionCount: 50,
  /** Serialised size ceiling for the two JSONB columns. */
  actionsBytes: 20_000,
  evidenceRefCount: 50,
  evidenceRefKey: 200,
  evidenceRefValue: 2_000,
  /** Serialised ceiling for the evidence_refs column as a whole. */
  evidenceRefsBytes: 20_000,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

/**
 * The single field name that broke a bound, or null when the packet fits.
 * Returned rather than thrown so the caller can name the field in a 413 without
 * echoing any of the oversized content back.
 */
function firstOversizedField(value: Record<string, unknown>): string | null {
  const overLength: Array<[string, unknown, number]> = [
    ['packet_id', value.packet_id, LIMITS.packetId],
    ['conversation_id', value.conversation_id, LIMITS.conversationId],
    ['business_context', value.business_context, LIMITS.businessContext],
    ['summary', value.summary, LIMITS.summary],
    ['requested_outcome', value.requested_outcome, LIMITS.requestedOutcome],
    ['approval_reason', value.approval_reason, LIMITS.approvalReason],
    ['transcript_text', value.transcript_text, LIMITS.transcript],
  ];
  for (const [name, raw, limit] of overLength) {
    if (typeof raw === 'string' && raw.trim().length > limit) return name;
  }

  if (Array.isArray(value.actions)) {
    if (value.actions.length > LIMITS.actionCount) return 'actions';
    // Bound what is actually stored, not what was sent: asRecordArray drops
    // non-object entries, so the persisted array is what must fit.
    const persisted = asRecordArray(value.actions);
    if (JSON.stringify(persisted).length > LIMITS.actionsBytes) return 'actions';
  }

  if (isRecord(value.evidence_refs)) {
    const refs = asStringRecord(value.evidence_refs);
    if (Object.keys(refs).length > LIMITS.evidenceRefCount) return 'evidence_refs';
    // Keys as well as values. Bounding the count and the values while leaving
    // the KEYS unbounded still admits `{ ["k".repeat(100000)]: "v" }` — one
    // entry, a one-character value, and a 100 KB JSONB column. An independent
    // review found exactly this.
    if (Object.keys(refs).some((k) => k.length > LIMITS.evidenceRefKey)) return 'evidence_refs';
    if (Object.values(refs).some((v) => v.length > LIMITS.evidenceRefValue)) return 'evidence_refs';
    // Belt and braces on the column as a whole, so no future combination of
    // individually-legal parts adds up to an illegal total.
    if (JSON.stringify(refs).length > LIMITS.evidenceRefsBytes) return 'evidence_refs';
  }

  return null;
}

// An absent or unrecognised risk_level is REFUSED, not silently downgraded to
// 'low'. Coercing an unclassified risk into the lowest band is how an
// unreviewed mission acquires a safe-looking verdict, so the packet is rejected
// and the caller must state a risk explicitly.
const VOICE_RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
type VoiceRiskLevel = (typeof VOICE_RISK_LEVELS)[number];

function readRiskLevel(value: unknown): VoiceRiskLevel | null {
  if (typeof value !== 'string') return null;
  const riskLevel = value.trim();
  return (VOICE_RISK_LEVELS as readonly string[]).includes(riskLevel)
    ? (riskLevel as VoiceRiskLevel)
    : null;
}

type PacketResult =
  | { ok: true; packet: VoicePacket }
  | { ok: false; error: 'invalid_packet' }
  | { ok: false; error: 'packet_too_large'; field: string };

function validatePacket(value: unknown): PacketResult {
  if (!isRecord(value)) return { ok: false, error: 'invalid_packet' };

  const packetId = asString(value.packet_id);
  const summary = asString(value.summary);
  const transcript = asString(value.transcript_text);
  if (!packetId || !summary || !transcript) return { ok: false, error: 'invalid_packet' };

  const riskLevel = readRiskLevel(value.risk_level);
  if (!riskLevel) return { ok: false, error: 'invalid_packet' };

  // Checked after the shape is known good, so a malformed packet is reported as
  // malformed rather than as oversized.
  const oversized = firstOversizedField(value);
  if (oversized) return { ok: false, error: 'packet_too_large', field: oversized };

  const packet: VoicePacket = {
    packet_id: packetId,
    conversation_id: asString(value.conversation_id),
    transcript_text: transcript,
    // No longer sliced: an over-long summary is refused above, so what is stored
    // is exactly what was sent rather than a silently shortened version of it.
    summary,
    requested_outcome: asString(value.requested_outcome) || summary,
    business_context: asString(value.business_context) || 'unite-group',
    risk_level: riskLevel,
    approval_required: value.approval_required === true,
    approval_reason: asString(value.approval_reason),
    actions: asRecordArray(value.actions),
    evidence_refs: asStringRecord(value.evidence_refs),
  };
  return { ok: true, packet };
}

/**
 * How many deliveries of one packet id are recorded in full before further
 * redeliveries collapse onto the most recent row. Comfortably above the two a
 * normal webhook replay produces, and far below anything that could grow the
 * table without bound.
 */
const DELIVERY_LEDGER_CAP = 10;

/**
 * Existing recorded deliveries for this packet. A read failure is treated as
 * "not at cap": the ledger bound is a storage-growth guard, not a security
 * control, and letting a transient read error silently swallow the delivery
 * record would be the worse failure.
 */
async function readDeliveryLedger(
  supabase: ReturnType<typeof createServiceClient>,
  founderId: string,
  packetId: string,
): Promise<{ state: 'under_cap' | 'at_cap' | 'unknown'; latestId: string | null }> {
  try {
    const { data, error } = await supabase
      .from('margot_voice_sessions')
      .select('id')
      .eq('founder_id', founderId)
      .eq('packet_id', packetId)
      .order('created_at', { ascending: false })
      .limit(DELIVERY_LEDGER_CAP);
    if (error) return { state: 'unknown', latestId: null };
    // `?? []` was wrong: a successful response carrying null or a non-array body
    // is not evidence of an empty ledger, it is evidence the ledger could not be
    // read. Coercing it to [] reported under_cap and inserted another transcript
    // on every redelivery — the same fail-open the explicit error path already
    // closed, reached through a different door.
    if (!Array.isArray(data)) return { state: 'unknown', latestId: null };
    const rows = data as Array<{ id: string }>;
    return {
      state: rows.length >= DELIVERY_LEDGER_CAP ? 'at_cap' : 'under_cap',
      latestId: rows[0]?.id ?? null,
    };
  } catch {
    return { state: 'unknown', latestId: null };
  }
}

function timingSafeTokenMatch(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  try {
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (!timingSafeTokenMatch(bearer, process.env.ELEVENLABS_INGEST_TOKEN)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim();
  if (!founderId) {
    return NextResponse.json({ error: 'founder not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const validated = validatePacket(body);
  if (!validated.ok) {
    // 413 for a well-formed but oversized packet so the caller can tell "your
    // packet is malformed, fix it" from "your packet is too big, trim it".
    // Neither is retryable, so both stay 4xx.
    if (validated.error === 'packet_too_large') {
      return NextResponse.json(
        { error: 'packet_too_large', field: validated.field },
        { status: 413 },
      );
    }
    return NextResponse.json({ error: 'invalid_packet' }, { status: 400 });
  }
  const packet = validated.packet;

  const supabase = createServiceClient();
  const highPriorityRisk = packet.risk_level === 'high' || packet.risk_level === 'critical';
  const approvalRequired = packet.approval_required || highPriorityRisk;

  // Deliberately an insert, not an upsert. This table is the delivery ledger:
  // every delivery of a packet is recorded, including a redelivery, which is the
  // contract asserted by "dedupes the mission but still records both deliveries
  // in the session ledger". Deduplication belongs one layer down, where
  // UNIQUE(founder_id, external_ref) on cc_tasks maps a redelivered packet onto
  // the mission it already created. That is what makes the 503 below safe to
  // retry without minting a second mission.
  //
  // But an unbounded ledger plus a retryable 503 is a growth loop: an
  // independent review pointed out that a bridge failing persistently for one
  // packet means every redelivery writes another full transcript row forever,
  // deduplicated at the mission layer but not here. So the ledger is capped per
  // packet. Below the cap every delivery is recorded, which keeps the audit
  // property that matters; at the cap the delivery is collapsed onto the most
  // recent existing row instead of adding another copy of the same transcript.
  const ledger = await readDeliveryLedger(supabase, founderId, packet.packet_id);

  // An unreadable ledger is not permission to write. Treating a read failure as
  // "under the cap" failed open: with the cap already reached and a persistent
  // SELECT error, the insert below ran on every retry and reproduced exactly the
  // unbounded growth the cap exists to prevent - at the moment the database is
  // already unhealthy. 503 defers the delivery instead of losing it; nothing is
  // written and the caller redelivers once the read recovers.
  if (ledger.state === 'unknown') {
    return NextResponse.json(
      { ok: false, error: 'delivery_ledger_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (ledger.state === 'at_cap') {
    // Answer honestly rather than pretending a fresh delivery was recorded. The
    // mission bridge still runs below, so a packet whose bridge finally succeeds
    // on retry number MAX+1 is not stranded.
    const mission = await bridgeMission(supabase as unknown as SupabaseLike, founderId, body);
    const status =
      mission.status === 'conflict' ? 409 : mission.status === 'bridge_failed' ? 503 : 200;
    return NextResponse.json(
      {
        ok: mission.status !== 'conflict' && mission.status !== 'bridge_failed',
        session_id: ledger.latestId,
        deliveries_collapsed: true,
        risk_level: packet.risk_level,
        approval_required: approvalRequired,
        mission,
      },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from('margot_voice_sessions')
    .insert({
      founder_id: founderId,
      packet_id: packet.packet_id,
      conversation_id: packet.conversation_id || null,
      transcript_text: packet.transcript_text,
      summary: packet.summary,
      requested_outcome: packet.requested_outcome,
      business_context: packet.business_context,
      risk_level: packet.risk_level,
      approval_required: approvalRequired,
      approval_reason: packet.approval_reason || null,
      actions: packet.actions,
      evidence_refs: packet.evidence_refs,
    })
    .select('id')
    .single();

  if (sessionError || !session?.id) {
    return NextResponse.json({ error: 'voice_session_insert_failed' }, { status: 500 });
  }

  // Bridge the packet into the cc_tasks mission authority. The voice session
  // above is the durable record of what was said; this is what makes it governed
  // work. Idempotent by construction (UNIQUE(founder_id, external_ref)), so a
  // webhook redelivery maps to the same mission rather than a second one.
  //
  // A bridge failure is REPORTED, never swallowed: the mission status below
  // always says what happened, and the HTTP status says whether to try again.
  const mission = await bridgeMission(supabase as unknown as SupabaseLike, founderId, body);

  // The HTTP status is the caller's retry instruction, so it has to distinguish
  // "we handled it" from "we dropped it":
  //
  //  - conflict     409 — a reused packet id carrying a changed control payload.
  //                       The delivery is recorded (the session row is the
  //                       durable account of what was said) but the mission was
  //                       NOT accepted under an id that already means something
  //                       else. Retrying the same body cannot help.
  //  - bridge_failed 503 — the transcript persisted but the mission never
  //                       reached cc_tasks. This previously returned 200, so
  //                       ElevenLabs recorded a successful delivery and never
  //                       redelivered: the founder had spoken a mission that
  //                       existed only as a transcript, and nothing on either
  //                       side was going to notice. 503 asks for redelivery, and
  //                       the retry cannot mint a second mission because the
  //                       bridge is idempotent on UNIQUE(founder_id,
  //                       external_ref) — a redelivered packet maps onto the same
  //                       mission and comes back as `duplicate`.
  //  - rejected      200 — the mission was refused on its merits. That verdict is
  //                       the correct final answer; redelivering the same packet
  //                       would only earn the same refusal.
  const status =
    mission.status === 'conflict' ? 409 : mission.status === 'bridge_failed' ? 503 : 200;

  return NextResponse.json(
    {
      ok: mission.status !== 'conflict' && mission.status !== 'bridge_failed',
      session_id: session.id,
      risk_level: packet.risk_level,
      approval_required: approvalRequired,
      mission,
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

interface MissionBridgeView {
  status:
    | 'created'
    | 'created_incomplete'
    | 'duplicate'
    | 'conflict'
    | 'rejected'
    | 'bridge_failed';
  task_id: string | null;
  task_status: string | null;
  tier: string | null;
  reason: string | null;
  /**
   * Whether the mission's immutable `created` receipt is known to exist.
   * 'incomplete'/'unverified' mean the audit trail has a hole — surfaced rather
   * than hidden behind a 200.
   */
  receipt: 'complete' | 'incomplete' | 'unverified' | 'none';
}

async function bridgeMission(
  client: SupabaseLike,
  founderId: string,
  body: unknown,
): Promise<MissionBridgeView> {
  try {
    const result = await ingestVoiceMission(founderId, body, client);
    if (result.status === 'rejected') {
      return {
        status: 'rejected',
        task_id: null,
        task_status: null,
        tier: null,
        reason: result.reasons[0] ?? 'invalid_mission',
        receipt: 'none',
      };
    }
    if (result.status === 'conflict') {
      // The packet id was reused with a different control payload. Reporting
      // this as a duplicate would silently discard a genuinely different
      // instruction, so it is surfaced as a conflict (409 below).
      return {
        status: 'conflict',
        task_id: result.task.id,
        task_status: result.task.status,
        tier: null,
        reason: result.reason,
        receipt: 'unverified',
      };
    }
    return {
      status: result.status,
      task_id: result.task.id,
      task_status: result.task.status,
      tier: result.admission.tier,
      reason: result.admission.reason,
      receipt: result.receipt,
    };
  } catch (err) {
    // Witnessed, not swallowed — a silent bridge failure is how a mission
    // disappears between the transcript and the board.
    console.error(
      'margot-voice: mission bridge failed',
      err instanceof Error ? err.message : 'unknown error',
    );
    return {
      status: 'bridge_failed',
      task_id: null,
      task_status: null,
      tier: null,
      reason: 'bridge_failed',
      receipt: 'unverified',
    };
  }
}
