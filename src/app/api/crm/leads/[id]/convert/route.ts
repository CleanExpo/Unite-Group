import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

type CrmLeadConversionRow = {
  id: string;
  email: string;
  company: string | null;
  status: string;
  matched_client_id: string | null;
  converted_client_id: string | null;
  converted_at: string | null;
};

const conversionSchema = z.object({
  targetClientId: z.string().uuid(),
  boardApprovalId: z.string().trim().min(6).max(120),
  dryRun: z.boolean().default(false),
});

async function resolveLeadId(context: RouteContext) {
  const params = await context.params;
  return params.id?.trim() ?? '';
}

function isUuid(value: string) {
  return z.string().uuid().safeParse(value).success;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  const leadId = await resolveLeadId(context);
  if (!isUuid(leadId)) {
    return NextResponse.json({ error: 'exact_lead_id_required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_conversion_request' }, { status: 400 });
  }

  const boardApprovalId =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).boardApprovalId
      : undefined;
  if (typeof boardApprovalId === 'undefined' || (typeof boardApprovalId === 'string' && !boardApprovalId.trim())) {
    return NextResponse.json({ error: 'operator_approval_required' }, { status: 403 });
  }

  const parsed = conversionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_conversion_request', details: parsed.error.format() },
      { status: 400 },
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'crm_not_configured' }, { status: 503 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data: leadData, error: leadError } = await supabase
    .from('crm_leads')
    .select('id,email,company,status,matched_client_id,converted_client_id,converted_at')
    .eq('id', leadId)
    .single();

  if (leadError || !leadData) {
    return NextResponse.json({ error: 'lead_not_found' }, { status: 404 });
  }

  const lead = leadData as CrmLeadConversionRow;
  if (lead.converted_client_id || lead.converted_at || lead.status === 'converted') {
    return NextResponse.json({ error: 'lead_already_converted' }, { status: 409 });
  }

  if (lead.matched_client_id && lead.matched_client_id !== parsed.data.targetClientId) {
    return NextResponse.json({ error: 'identity_conflict' }, { status: 409 });
  }

  const conversionPayload = {
    status: 'converted',
    converted_client_id: parsed.data.targetClientId,
    matched_client_id: parsed.data.targetClientId,
    converted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.dryRun) {
    return NextResponse.json(
      {
        success: true,
        dry_run: true,
        lead_id: lead.id,
        target_client_id: parsed.data.targetClientId,
        planned_update: conversionPayload,
        board_approval_id: parsed.data.boardApprovalId,
      },
      { status: 200 },
    );
  }

  const { data: updatedLead, error: updateError } = await supabase
    .from('crm_leads')
    .update(conversionPayload)
    .eq('id', lead.id)
    .is('converted_client_id', null)
    .select('id,status,converted_client_id,converted_at')
    .single();

  if (updateError || !updatedLead) {
    return NextResponse.json({ error: 'lead_conversion_failed' }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      lead_id: lead.id,
      target_client_id: parsed.data.targetClientId,
      converted_lead: updatedLead,
      board_approval_id: parsed.data.boardApprovalId,
    },
    { status: 200 },
  );
}
