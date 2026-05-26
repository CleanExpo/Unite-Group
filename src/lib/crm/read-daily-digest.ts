import { createClient } from '@supabase/supabase-js';
import type { DailyCrmDigestPanelProps } from '@/components/command-center/digest/DailyCrmDigestPanel';
import {
  createCrmDailyDigest,
  type CrmDailyDigest,
  type CrmDigestLead,
  type CrmDigestOpportunity,
  type CrmDigestTask,
} from './daily-digest';

type CrmLeadDigestRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
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

type CrmOpportunityDigestRow = {
  id: string;
  name: string | null;
  stage: string | null;
  status: string | null;
  value_amount: number | string | null;
  probability: number | null;
  approval_required: boolean | null;
  next_action: string | null;
  updated_at: string;
};

const DIGEST_SELECT_COLUMNS = [
  'id',
  'first_name',
  'last_name',
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

const OPPORTUNITY_DIGEST_SELECT_COLUMNS = [
  'id',
  'name',
  'stage',
  'status',
  'value_amount',
  'probability',
  'approval_required',
  'next_action',
  'updated_at',
].join(',');

const QUALIFICATION_BANDS = new Set(['qualified', 'nurture', 'needs_review', 'spam_risk']);

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

function valueEstimate(value: number | string | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mapOpportunity(row: CrmOpportunityDigestRow): CrmDigestOpportunity {
  return {
    id: row.id,
    name: clean(row.name) || 'Untitled opportunity',
    stage: clean(row.stage) || clean(row.status) || null,
    valueEstimate: valueEstimate(row.value_amount),
    probability: typeof row.probability === 'number' ? row.probability / 100 : null,
    requiresApproval: row.approval_required === true,
    nextAction: clean(row.next_action) || null,
  };
}

function toPanelProps(digest: CrmDailyDigest, generatedAt: string): DailyCrmDigestPanelProps {
  return {
    generatedAt,
    summary: digest.summary,
    operatorPriorities: digest.sections.operatorPriorities,
    approvals: digest.sections.approvals,
    blockers: digest.sections.blockers,
    sourceLiveAt: generatedAt,
  };
}

export type DailyCrmDigestReadResult =
  | {
      ok: true;
      digest: CrmDailyDigest;
      panelProps: DailyCrmDigestPanelProps;
      leadCount: number;
      opportunityCount: number;
      filters: { limit: number };
    }
  | { ok: false; error: 'crm_not_configured' | 'crm_digest_read_failed' | 'crm_digest_tasks_read_failed' | 'crm_digest_opportunities_read_failed' };

export async function readDailyCrmDigestForRoute(limit = 10): Promise<DailyCrmDigestReadResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'crm_not_configured' };
  }

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
      .limit(limit);

    if (error) {
      console.error('Error reading CRM daily digest leads:', error);
      return { ok: false, error: 'crm_digest_read_failed' };
    }

    const { data: taskData, error: taskError } = process.env.UNITE_CRM_WORKSPACE_ID
      ? await supabase
          .from('tasks')
          .select(TASK_DIGEST_SELECT_COLUMNS)
          .eq('workspace_id', process.env.UNITE_CRM_WORKSPACE_ID)
          .in('status', ['blocked', 'todo'])
          .order('created_at', { ascending: false })
          .limit(limit)
      : { data: [], error: null };

    if (taskError) {
      console.error('Error reading CRM daily digest tasks:', taskError);
      return { ok: false, error: 'crm_digest_tasks_read_failed' };
    }

    const opportunitiesEnabled = process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED === 'true';
    const { data: opportunityData, error: opportunityError } = opportunitiesEnabled
      ? await supabase
          .from('crm_opportunities')
          .select(OPPORTUNITY_DIGEST_SELECT_COLUMNS)
          .in('status', ['open', 'won', 'blocked_review'])
          .order('updated_at', { ascending: false })
          .limit(limit)
      : { data: [], error: null };

    if (opportunityError) {
      console.error('Error reading CRM daily digest opportunities:', opportunityError);
      return { ok: false, error: 'crm_digest_opportunities_read_failed' };
    }

    const leads = ((data ?? []) as unknown as CrmLeadDigestRow[]).map(mapLead);
    const tasks = ((taskData ?? []) as unknown as CrmTaskDigestRow[]).map(mapTask);
    const opportunities = ((opportunityData ?? []) as unknown as CrmOpportunityDigestRow[]).map(mapOpportunity);
    const generatedAt = new Date().toISOString();
    const digest = createCrmDailyDigest({
      generatedAt,
      leads,
      opportunities,
      tasks,
      verification: [{ command: 'GET /api/crm/daily-digest', status: 'passed' }],
    });

    return {
      ok: true,
      digest,
      panelProps: toPanelProps(digest, generatedAt),
      leadCount: leads.length,
      opportunityCount: opportunities.length,
      filters: { limit },
    };
  } catch (error) {
    console.error('Unexpected CRM daily digest read error:', error);
    return { ok: false, error: 'crm_digest_read_failed' };
  }
}

export async function readDailyCrmDigest(limit = 10): Promise<DailyCrmDigestPanelProps | undefined> {
  const result = await readDailyCrmDigestForRoute(limit);
  return result.ok ? result.panelProps : undefined;
}
