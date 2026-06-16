import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { timingSafeTokenMatch } from '@/lib/security/safe-compare';

export const dynamic = 'force-dynamic';

interface VoicePacket {
  packet_id: string;
  conversation_id: string;
  crm_user_id: string;
  crm_user_email: string;
  transcript_text: string;
  summary: string;
  requested_outcome: string;
  business_context: string;
  route: string;
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

function normalizeRiskLevel(value: unknown): 'low' | 'medium' | 'high' | 'critical' | 'unknown' {
  const riskLevel = asString(value).toLowerCase();
  if (!riskLevel) return 'low';
  return riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high' || riskLevel === 'critical'
    ? riskLevel
    : 'unknown';
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
    crm_user_id: asString(value.crm_user_id),
    crm_user_email: asString(value.crm_user_email),
    transcript_text: transcript,
    summary: summary.slice(0, 500),
    requested_outcome: asString(value.requested_outcome) || summary,
    business_context: asString(value.business_context) || 'unite-group',
    route: asString(value.route) || 'unite_crm',
    risk_level: normalizeRiskLevel(value.risk_level),
    approval_required: value.approval_required === true,
    approval_reason: asString(value.approval_reason),
    actions: asRecordArray(value.actions),
    evidence_refs: asStringRecord(value.evidence_refs),
  };
}

export async function POST(req: NextRequest) {
  const gate = await rateLimit(req, {
    key: 'margot-voice-task-create',
    ...RATE_LIMITS.margotVoiceTaskCreate,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retry_after_ms: gate.retryAfterMs },
      { status: 429 },
    );
  }

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (!timingSafeTokenMatch(bearer, process.env.UNITE_CRM_INGEST_TOKEN)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const orgId = process.env.UNITE_CRM_ORG_ID?.trim();
  const workspaceId = process.env.UNITE_CRM_WORKSPACE_ID?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!orgId || !workspaceId || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'crm_not_configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const packet = validatePacket(body);
  if (!packet) return NextResponse.json({ error: 'invalid_packet' }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceKey);
  const status = packet.approval_required ? 'blocked' : 'todo';
  const highPriorityRisk = packet.risk_level === 'high' || packet.risk_level === 'critical' || packet.risk_level === 'unknown';
  const priority = packet.approval_required || highPriorityRisk ? 'high' : 'normal';
  const tags = [
    'margot-voice',
    packet.business_context,
    packet.route,
    packet.approval_required ? 'approval-required' : 'auto-created',
  ].filter(Boolean);

  const sessionInsert = await supabase
    .from('voice_command_sessions')
    .insert({
      org_id: orgId,
      user_id: packet.crm_user_id || packet.crm_user_email || 'phill',
      transcript: packet.transcript_text,
      parsed_intent: packet,
      status,
      language_code: 'en',
    })
    .select('id')
    .single();

  if (sessionInsert.error || !sessionInsert.data?.id) {
    return NextResponse.json({ error: 'voice_session_insert_failed' }, { status: 500 });
  }

  const description = [
    packet.requested_outcome,
    '',
    `Route: ${packet.route}`,
    `Business context: ${packet.business_context}`,
    `Risk: ${packet.risk_level}`,
    `Approval required: ${packet.approval_required ? 'yes' : 'no'}`,
    packet.approval_reason ? `Approval reason: ${packet.approval_reason}` : '',
    `Voice session: ${sessionInsert.data.id}`,
    `ElevenLabs conversation: ${packet.conversation_id}`,
  ].filter(Boolean).join('\n');

  const taskInsert = await supabase
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      title: packet.summary,
      description,
      status,
      priority,
      assignee_type: 'agent',
      assignee_name: packet.approval_required ? 'Phill approval' : 'Margot',
      tags,
      position: 0,
      obsidian_path: `voice/${packet.packet_id}`,
    })
    .select('id,title')
    .single();

  if (taskInsert.error || !taskInsert.data?.id) {
    return NextResponse.json({ error: 'crm_task_insert_failed' }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      crm_session_id: sessionInsert.data.id,
      crm_task_id: taskInsert.data.id,
      task_title: taskInsert.data.title,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
