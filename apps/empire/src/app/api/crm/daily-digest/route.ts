import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin } from '@/lib/security/require-admin';
import { createCrmDailyDigest } from '@/lib/crm/daily-digest';
import { logCrmDigestReadError } from '@/lib/crm/digest-read-error';
import {
  LEAD_SELECT_COLUMNS_WITH_EMAIL,
  TASK_SELECT_COLUMNS,
  OPPORTUNITY_SELECT_COLUMNS,
  readDigestOwner,
  mapLead,
  mapTask,
  mapOpportunity,
  type CrmLeadDigestRow,
  type CrmTaskDigestRow,
  type CrmOpportunityDigestRow,
} from '@/lib/crm/digest-mappers';

export const dynamic = 'force-dynamic';

const digestQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

function parseQuery(request: NextRequest) {
  return digestQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });
}

function getOwnerFilter(request: NextRequest): string | undefined {
  const owner = request.nextUrl.searchParams.get('owner');
  return owner || readDigestOwner();
}

export async function GET(request: NextRequest) {
  const parsed = parseQuery(request);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_digest_query' }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'crm_not_configured' }, { status: 503 });
  }

  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  try {
    const digestOwner = getOwnerFilter(request);

    const { data, error } = await supabase
      .from('crm_leads')
      .select(LEAD_SELECT_COLUMNS_WITH_EMAIL)
      .eq('assigned_owner', digestOwner)
      .order('captured_at', { ascending: false })
      .limit(parsed.data.limit);

    if (error) {
      logCrmDigestReadError('leads', 'api');
      return NextResponse.json({ error: 'crm_digest_read_failed' }, { status: 500 });
    }

    const { data: taskData, error: taskError } = process.env.UNITE_CRM_WORKSPACE_ID
      ? await supabase
          .from('tasks')
          .select(TASK_SELECT_COLUMNS)
          .eq('workspace_id', process.env.UNITE_CRM_WORKSPACE_ID)
          .in('status', ['blocked', 'todo'])
          .order('created_at', { ascending: false })
          .limit(parsed.data.limit)
      : { data: [], error: null };

    if (taskError) {
      logCrmDigestReadError('tasks', 'api');
      return NextResponse.json({ error: 'crm_digest_tasks_read_failed' }, { status: 500 });
    }

    const opportunitiesEnabled = process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED === 'true';
    const { data: opportunityData, error: opportunityError } = opportunitiesEnabled
      ? await supabase
          .from('crm_opportunities')
          .select(OPPORTUNITY_SELECT_COLUMNS)
          .eq('owner', digestOwner)
          .in('status', ['open', 'won', 'blocked_review'])
          .order('updated_at', { ascending: false })
          .limit(parsed.data.limit)
      : { data: [], error: null };

    if (opportunityError) {
      logCrmDigestReadError('opportunities', 'api');
      return NextResponse.json({ error: 'crm_digest_opportunities_read_failed' }, { status: 500 });
    }

    const leads = (((data ?? []) as unknown) as CrmLeadDigestRow[]).map(mapLead);
    const tasks = (((taskData ?? []) as unknown) as CrmTaskDigestRow[]).map(mapTask);
    const opportunities = (((opportunityData ?? []) as unknown) as CrmOpportunityDigestRow[]).map(mapOpportunity);

    const digest = createCrmDailyDigest({
      generatedAt: new Date().toISOString(),
      leads,
      opportunities,
      tasks,
      verification: [{ command: 'GET /api/crm/daily-digest', status: 'passed' }],
    });

    return NextResponse.json(
      {
        success: true,
        digest,
        leadCount: leads.length,
        opportunityCount: opportunities.length,
        filters: { limit: parsed.data.limit, owner: digestOwner },
      },
      { status: 200 },
    );
  } catch (error) {
    logCrmDigestReadError('unexpected', 'api');
    return NextResponse.json({ error: 'crm_digest_read_failed' }, { status: 500 });
  }
}
