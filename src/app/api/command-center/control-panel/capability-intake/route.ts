import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import { ADD_ON_ASSIGNEE_TYPE } from '../add-ons/_assignee-type';

export const dynamic = 'force-dynamic';

type CapabilityIntakeProposal = {
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_name: string;
  tags: string[];
  obsidian_path: string;
  source_url: string;
  project_matches: string[];
  capability_type: string;
  relevance_score: number;
  hermes_lane: string;
};

type ExistingTask = {
  id: string;
  title: string;
  status: string;
  created_at: string | null;
};

const VALID_PRIORITIES = new Set(['urgent', 'high', 'medium', 'normal', 'low']);
const VALID_HERMES_LANES = new Set(['engineering', 'research-ops', 'content-systems', 'watchlist']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return out.length === value.length ? out : null;
}

function parseProposal(value: unknown): CapabilityIntakeProposal | null {
  if (!isRecord(value)) return null;

  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const description = typeof value.description === 'string' ? value.description.trim() : '';
  const status = typeof value.status === 'string' ? value.status.trim().toLowerCase() : '';
  const priority = typeof value.priority === 'string' ? value.priority.trim().toLowerCase() : '';
  const assigneeName = typeof value.assignee_name === 'string' ? value.assignee_name.trim() : '';
  const obsidianPath = typeof value.obsidian_path === 'string' ? value.obsidian_path.trim() : '';
  const sourceUrl = typeof value.source_url === 'string' ? value.source_url.trim() : '';
  const capabilityType = typeof value.capability_type === 'string' ? value.capability_type.trim() : '';
  const hermesLane = typeof value.hermes_lane === 'string' ? value.hermes_lane.trim() : '';
  const relevanceScore = typeof value.relevance_score === 'number' ? value.relevance_score : NaN;
  const tags = stringArray(value.tags);
  const projectMatches = stringArray(value.project_matches);

  if (!title || !description || !obsidianPath || !sourceUrl || !capabilityType) return null;
  if (status !== 'blocked') return null;
  if (!VALID_PRIORITIES.has(priority)) return null;
  if (!VALID_HERMES_LANES.has(hermesLane)) return null;
  if (!Number.isFinite(relevanceScore) || relevanceScore < 0 || relevanceScore > 100) return null;
  if (!tags || !projectMatches) return null;
  if (!tags.includes('capability-scout') || !tags.includes('approval-required')) return null;

  return {
    title,
    description,
    status,
    priority,
    assignee_name: assigneeName || 'Phill approval',
    tags: Array.from(new Set(tags)).slice(0, 20),
    obsidian_path: obsidianPath,
    source_url: sourceUrl,
    project_matches: projectMatches,
    capability_type: capabilityType,
    relevance_score: relevanceScore,
    hermes_lane: hermesLane,
  };
}

function parseBody(body: unknown): CapabilityIntakeProposal[] | null {
  if (!isRecord(body) || !Array.isArray(body.tasks)) return null;
  if (body.tasks.length === 0 || body.tasks.length > 50) return null;

  const tasks = body.tasks.map(parseProposal);
  if (tasks.some((task) => task === null)) return null;
  return tasks as CapabilityIntakeProposal[];
}

function response(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const workspaceId = process.env.UNITE_CRM_WORKSPACE_ID?.trim();
  if (!workspaceId) return response({ error: 'crm_not_configured' }, 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return response({ error: 'invalid_json' }, 400);
  }

  const proposals = parseBody(body);
  if (!proposals) return response({ error: 'invalid_capability_intake' }, 400);

  try {
    const admin = getAdminClient();
    const results = [];

    for (const proposal of proposals) {
      const existing = await admin
        .from('tasks')
        .select('id,title,status,created_at')
        .eq('workspace_id', workspaceId)
        .eq('obsidian_path', proposal.obsidian_path)
        .neq('status', 'done')
        .limit(1)
        .maybeSingle();

      if (existing.error) return response({ error: 'crm_lookup_failed' }, 500);

      if (existing.data) {
        const task = existing.data as ExistingTask;
        results.push({
          existing: true,
          crm_task_id: task.id,
          task_title: task.title,
          task_status: task.status,
          obsidian_path: proposal.obsidian_path,
          requested_at: task.created_at,
        });
        continue;
      }

      const inserted = await admin
        .from('tasks')
        .insert({
          workspace_id: workspaceId,
          title: proposal.title,
          description: proposal.description,
          status: 'blocked',
          priority: proposal.priority,
          assignee_type: ADD_ON_ASSIGNEE_TYPE,
          assignee_name: proposal.assignee_name,
          tags: proposal.tags,
          position: 0,
          obsidian_path: proposal.obsidian_path,
        })
        .select('id,title,status,created_at')
        .single();

      if (inserted.error || !inserted.data?.id) {
        return response({ error: 'crm_task_insert_failed' }, 500);
      }

      results.push({
        existing: false,
        crm_task_id: inserted.data.id,
        task_title: inserted.data.title,
        task_status: inserted.data.status,
        obsidian_path: proposal.obsidian_path,
        requested_at: inserted.data.created_at,
      });
    }

    return response({
      ok: true,
      source: 'capability-scout-intake',
      created: results.filter((item) => !item.existing).length,
      existing: results.filter((item) => item.existing).length,
      results,
    });
  } catch {
    return response({ error: 'crm_unavailable' }, 503);
  }
}
