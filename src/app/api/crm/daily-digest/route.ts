import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin } from '@/lib/security/require-admin';
import { createCrmDailyDigest, type CrmDigestLead, type CrmDigestTask } from '@/lib/crm/daily-digest';

export const dynamic = 'force-dynamic';

type CrmLeadDigestRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  status: string | null;
  qualification_score: number | null;
  captured_at: string;
};

type CrmTaskDigestRow = {
  id: string;
  title: string | null;
  status: string | null;
  priority: string | null;
  assignee_name: string | null;
  created_at: string;
};

const DIGEST_SELECT_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'email',
  'company',
  'status',
  'qualification_score',
  'captured_at',
].join(',');

const TASK_DIGEST_SELECT_COLUMNS = [
  'id',
  'title',
  'status',
  'priority',
  'assignee_name',
  'created_at',
].join(',');

const digestQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const QUALIFICATION_BANDS = new Set(['qualified', 'nurture', 'needs_review', 'spam_risk']);

function parseQuery(request: NextRequest) {
  return digestQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function mapLead(row: CrmLeadDigestRow): CrmDigestLead {
  const firstName = clean(row.first_name);
  const lastName = clean(row.last_name);
  const name = [firstName, lastName].filter(Boolean).join(' ') || null;
  const status = clean(row.status) || null;

  return {
    id: row.id,
    name,
    company: clean(row.company) || null,
    email: clean(row.email) || null,
    status,
    qualificationBand: status && QUALIFICATION_BANDS.has(status) ? status : null,
    score: typeof row.qualification_score === 'number' ? row.qualification_score : null,
    nextAction: 'Review and decide next CRM action',
  };
}

function mapTask(row: CrmTaskDigestRow): CrmDigestTask {
  return {
    id: row.id,
    title: clean(row.title) || 'Untitled task',
    owner: clean(row.assignee_name) || null,
    status: clean(row.status) || null,
    priority: clean(row.priority) || null,
  };
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
    const { data, error } = await supabase
      .from('crm_leads')
      .select(DIGEST_SELECT_COLUMNS)
      .order('captured_at', { ascending: false })
      .limit(parsed.data.limit);

    if (error) {
      console.error('Error reading CRM daily digest leads:', error);
      return NextResponse.json({ error: 'crm_digest_read_failed' }, { status: 500 });
    }

    const { data: taskData, error: taskError } = process.env.UNITE_CRM_WORKSPACE_ID
      ? await supabase
          .from('tasks')
          .select(TASK_DIGEST_SELECT_COLUMNS)
          .eq('workspace_id', process.env.UNITE_CRM_WORKSPACE_ID)
          .in('status', ['blocked', 'todo'])
          .order('created_at', { ascending: false })
          .limit(parsed.data.limit)
      : { data: [], error: null };

    if (taskError) {
      console.error('Error reading CRM daily digest tasks:', taskError);
      return NextResponse.json({ error: 'crm_digest_tasks_read_failed' }, { status: 500 });
    }

    const leads = (((data ?? []) as unknown) as CrmLeadDigestRow[]).map(mapLead);
    const tasks = (((taskData ?? []) as unknown) as CrmTaskDigestRow[]).map(mapTask);
    const digest = createCrmDailyDigest({
      generatedAt: new Date().toISOString(),
      leads,
      tasks,
      verification: [{ command: 'GET /api/crm/daily-digest', status: 'passed' }],
    });

    return NextResponse.json(
      {
        success: true,
        digest,
        leadCount: leads.length,
        filters: { limit: parsed.data.limit },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Unexpected CRM daily digest read error:', error);
    return NextResponse.json({ error: 'crm_digest_read_failed' }, { status: 500 });
  }
}
