import { createClient } from '@supabase/supabase-js';
import { createCrmDailyDigest, type CrmDailyDigest } from './daily-digest';
import { logCrmDigestReadError } from './digest-read-error';
import {
  LEAD_SELECT_COLUMNS,
  TASK_SELECT_COLUMNS,
  OPPORTUNITY_SELECT_COLUMNS,
  readDigestOwner,
  mapLead,
  mapTask,
  mapOpportunity,
  type CrmLeadDigestRow,
  type CrmTaskDigestRow,
  type CrmOpportunityDigestRow,
} from './digest-mappers';

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

    const leadRead = supabase
      .from('crm_leads')
      .select(LEAD_SELECT_COLUMNS)
      .eq('assigned_owner', digestOwner)
      .order('captured_at', { ascending: false })
      .limit(limit);

    const taskRead = supabase
      .from('tasks')
      .select(TASK_SELECT_COLUMNS)
      .eq('workspace_id', workspaceId)
      .in('status', ['blocked', 'todo'])
      .order('created_at', { ascending: false })
      .limit(limit);

    const opportunitiesEnabled = process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED === 'true';
    const opportunityRead = opportunitiesEnabled
      ? supabase
          .from('crm_opportunities')
          .select(OPPORTUNITY_SELECT_COLUMNS)
          .eq('owner', digestOwner)
          .in('status', ['open', 'won', 'blocked_review'])
          .order('updated_at', { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null });

    const [{ data, error }, { data: taskData, error: taskError }, { data: opportunityData, error: opportunityError }] =
      await Promise.all([leadRead, taskRead, opportunityRead]);

    if (error) {
      logCrmDigestReadError('leads', 'command-center');
      return undefined;
    }

    if (taskError) {
      logCrmDigestReadError('tasks', 'command-center');
      return undefined;
    }

    if (opportunityError) {
      logCrmDigestReadError('opportunities', 'command-center');
      return undefined;
    }

    return createCrmDailyDigest({
      generatedAt: new Date().toISOString(),
      leads: ((data ?? []) as unknown as CrmLeadDigestRow[]).map(mapLead),
      opportunities: ((opportunityData ?? []) as unknown as CrmOpportunityDigestRow[]).map(mapOpportunity),
      tasks: ((taskData ?? []) as unknown as CrmTaskDigestRow[]).map(mapTask),
      verification: [{ command: 'command-center CRM daily digest read', status: 'passed' }],
    });
  } catch (error) {
    logCrmDigestReadError('unexpected', 'command-center');
    return undefined;
  }
}
