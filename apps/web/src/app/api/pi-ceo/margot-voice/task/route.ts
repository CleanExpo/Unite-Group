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

function validatePacket(value: unknown): VoicePacket | null {
  if (!isRecord(value)) return null;

  const packetId = asString(value.packet_id);
  const summary = asString(value.summary);
  const transcript = asString(value.transcript_text);
  if (!packetId || !summary || !transcript) return null;

  const riskLevel = readRiskLevel(value.risk_level);
  if (!riskLevel) return null;

  return {
    packet_id: packetId,
    conversation_id: asString(value.conversation_id),
    transcript_text: transcript,
    summary: summary.slice(0, 500),
    requested_outcome: asString(value.requested_outcome) || summary,
    business_context: asString(value.business_context) || 'unite-group',
    risk_level: riskLevel,
    approval_required: value.approval_required === true,
    approval_reason: asString(value.approval_reason),
    actions: asRecordArray(value.actions),
    evidence_refs: asStringRecord(value.evidence_refs),
  };
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

  const packet = validatePacket(body);
  if (!packet) return NextResponse.json({ error: 'invalid_packet' }, { status: 400 });

  const supabase = createServiceClient();
  const highPriorityRisk = packet.risk_level === 'high' || packet.risk_level === 'critical';
  const approvalRequired = packet.approval_required || highPriorityRisk;

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
  // A bridge failure is REPORTED, never swallowed: the session is already
  // persisted, so the response stays 200 and carries an honest mission status
  // the caller and Mission Control can act on.
  const mission = await bridgeMission(supabase as unknown as SupabaseLike, founderId, body);

  // A reused packet id carrying a changed control payload is a conflict, not a
  // success. The delivery is still recorded above (the session row is the
  // durable account of what was said) but the caller is told plainly that its
  // mission was NOT accepted under an id that already means something else.
  const status = mission.status === 'conflict' ? 409 : 200;

  return NextResponse.json(
    {
      ok: mission.status !== 'conflict',
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
