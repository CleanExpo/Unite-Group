import { createClient } from '@supabase/supabase-js';
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

function readDigestOwner(): string {
  return process.env.UNITE_CRM_DIGEST_OWNER?.trim() || 'Margot';
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

export async function readCrmDailyDigestForCommandCenter(limit = 10): Promise<CrmDailyDigest | undefined> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const workspaceId = process.env.UNITE_CRM_WORKSPACE_ID;

  if (!supabaseUrl || !serviceRoleKey || !workspaceId) return undefined;

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const digestOwner = readDigestOwner();

    const { data, error } = await supabase
      .from('crm_leads')
      .select(DIGEST_SELECT_COLUMNS)
      .eq('assigned_owner', digestOwner)
      .order('captured_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error reading command-center CRM daily digest leads:', error);
      return undefined;
    }

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select(TASK_DIGEST_SELECT_COLUMNS)
      .eq('workspace_id', workspaceId)
      .in('status', ['blocked', 'todo'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (taskError) {
      console.error('Error reading command-center CRM daily digest tasks:', taskError);
      return undefined;
    }

    const opportunitiesEnabled = process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED === 'true';
    const { data: opportunityData, error: opportunityError } = opportunitiesEnabled
      ? await supabase
          .from('crm_opportunities')
          .select(OPPORTUNITY_DIGEST_SELECT_COLUMNS)
          .eq('owner', digestOwner)
          .in('status', ['open', 'won', 'blocked_review'])
          .order('updated_at', { ascending: false })
          .limit(limit)
      : { data: [], error: null };

    if (opportunityError) {
      console.error('Error reading command-center CRM daily digest opportunities:', opportunityError);
      return undefined;
    }

    return createCrmDailyDigest({
      generatedAt: new Date().toISOString(),
      leads: (((data ?? []) as unknown) as CrmLeadDigestRow[]).map(mapLead),
      opportunities: (((opportunityData ?? []) as unknown) as CrmOpportunityDigestRow[]).map(mapOpportunity),
      tasks: (((taskData ?? []) as unknown) as CrmTaskDigestRow[]).map(mapTask),
      verification: [{ command: 'command-center CRM daily digest read', status: 'passed' }],
    });
  } catch (error) {
    console.error('Unexpected command-center CRM daily digest read error:', error);
    return undefined;
  }
}
