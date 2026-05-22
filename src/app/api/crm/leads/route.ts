import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';

type CrmLeadRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  message: string | null;
  interests: string | null;
  referral_source: string | null;
  marketing_consent: boolean;
  email_list_id: string | null;
  source: string;
  status: string;
  qualification_score: number | null;
  assigned_owner: string;
  matched_client_id: string | null;
  matched_business_id: string | null;
  converted_client_id: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
  converted_at: string | null;
};

const leadListQuerySchema = z.object({
  status: z
    .enum(['new', 'qualified', 'nurture', 'converted', 'disqualified', 'spam'])
    .optional(),
  owner: z.string().trim().min(1).max(120).optional(),
  source: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const LEAD_SELECT_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'email',
  'phone',
  'company',
  'job_title',
  'message',
  'interests',
  'referral_source',
  'marketing_consent',
  'email_list_id',
  'source',
  'status',
  'qualification_score',
  'assigned_owner',
  'matched_client_id',
  'matched_business_id',
  'converted_client_id',
  'captured_at',
  'created_at',
  'updated_at',
  'converted_at',
].join(',');

function parseQuery(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return leadListQuerySchema.safeParse({
    status: params.get('status') ?? undefined,
    owner: params.get('owner') ?? undefined,
    source: params.get('source') ?? undefined,
    limit: params.get('limit') ?? undefined,
  });
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  const parsed = parseQuery(request);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_lead_query', details: parsed.error.format() },
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

  try {
    let query = supabase
      .from('crm_leads')
      .select(LEAD_SELECT_COLUMNS);

    if (parsed.data.status) query = query.eq('status', parsed.data.status);
    if (parsed.data.owner) query = query.eq('assigned_owner', parsed.data.owner);
    if (parsed.data.source) query = query.eq('source', parsed.data.source);

    query = query
      .order('captured_at', { ascending: false })
      .limit(parsed.data.limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error reading CRM leads:', error);
      return NextResponse.json({ error: 'crm_leads_read_failed' }, { status: 500 });
    }

    const leads = ((data ?? []) as unknown) as CrmLeadRow[];
    return NextResponse.json(
      {
        success: true,
        leads,
        count: leads.length,
        filters: {
          status: parsed.data.status ?? null,
          owner: parsed.data.owner ?? null,
          source: parsed.data.source ?? null,
          limit: parsed.data.limit,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Unexpected CRM leads read error:', error);
    return NextResponse.json({ error: 'crm_leads_read_failed' }, { status: 500 });
  }
}
