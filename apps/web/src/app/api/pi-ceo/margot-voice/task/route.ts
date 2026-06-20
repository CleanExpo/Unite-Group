import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

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

function normalizeRiskLevel(value: unknown): 'low' | 'medium' | 'high' | 'critical' {
  const riskLevel = asString(value).toLowerCase();
  if (riskLevel === 'medium' || riskLevel === 'high' || riskLevel === 'critical') return riskLevel;
  return 'low';
}

function validatePacket(value: unknown): VoicePacket | null {
  if (!isRecord(value)) return null;

  const packetId = asString(value.packet_id);
  const summary = asString(value.summary);
  const transcript = asString(value.transcript_text);
  if (!packetId || !summary || !transcript) return null;

  return {
    packet_id: packetId,
    conversation_id: asString(value.conversation_id),
    transcript_text: transcript,
    summary: summary.slice(0, 500),
    requested_outcome: asString(value.requested_outcome) || summary,
    business_context: asString(value.business_context) || 'unite-group',
    risk_level: normalizeRiskLevel(value.risk_level),
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
    .from('voice_command_sessions')
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

  return NextResponse.json(
    {
      ok: true,
      session_id: session.id,
      risk_level: packet.risk_level,
      approval_required: approvalRequired,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
