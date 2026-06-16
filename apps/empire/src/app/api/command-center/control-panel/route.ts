import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  ADD_ON_GATES,
  CONTROL_WORKSTREAMS,
  type AddOnGate,
  type ControlRyg,
  type ControlStatus,
  type ControlWorkstream,
} from '@/components/command-center/control-panel/control-panel-data';

export const dynamic = 'force-dynamic';

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  tags: string[] | null;
  assignee_name: string | null;
  obsidian_path: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type LiveWorkstream = ControlWorkstream & {
  crmTaskId?: string;
  crmTaskStatus?: string;
  lastUpdated?: string;
};

type LiveAddOnGate = AddOnGate & {
  crmTaskId?: string;
  crmTaskStatus?: string;
  lastRequestedAt?: string;
};

type CapabilityDecision = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  assigneeName: string | null;
  obsidianPath: string | null;
  lastUpdated?: string;
  tags: string[];
};

const WORKSTREAM_MATCHERS: Record<string, string[]> = {
  'ug-v0-01': ['plaud', 'intake', 'transcript', 'margot brief'],
  'ug-v0-02': ['margot-voice', 'voice/', 'unite crm', 'crm task'],
  'ug-v0-03': ['kanban', 'crm to kanban', 'execution spine'],
  'ug-v0-04': ['synthex', 'marketing only', 'routing'],
  'ug-v0-05': ['add-on', 'addon', 'registry', 'approval gate'],
  'ug-v0-06': ['hermes update scout', 'update scout', 'scout automation'],
  'ug-v0-07': ['portfolio ryg', 'dashboard', 'source matrix'],
};

function taskHaystack(task: TaskRow) {
  return [
    task.title,
    task.status,
    task.priority ?? '',
    task.assignee_name ?? '',
    task.obsidian_path ?? '',
    ...(task.tags ?? []),
  ].join(' ').toLowerCase();
}

function findTaskForWorkstream(id: string, tasks: TaskRow[]) {
  const terms = WORKSTREAM_MATCHERS[id] ?? [];
  return tasks.find((task) => {
    const haystack = taskHaystack(task);
    return terms.some((term) => haystack.includes(term));
  });
}

function mapStatus(task: TaskRow | undefined, fallback: ControlStatus): ControlStatus {
  if (!task) return fallback;
  const status = task.status.trim().toLowerCase();
  if (['done', 'closed', 'complete', 'completed'].includes(status)) return 'live';
  if (['blocked', 'needs_approval', 'approval', 'blocked-on-you'].includes(status)) return 'gated';
  if (['todo', 'ready', 'running', 'in_progress', 'in-progress'].includes(status)) return 'building';
  return fallback;
}

function mapRyg(task: TaskRow | undefined, fallback: ControlRyg): ControlRyg {
  if (!task) return fallback;
  const status = task.status.trim().toLowerCase();
  const priority = task.priority?.trim().toLowerCase() ?? '';
  if (['blocked', 'failed', 'red'].includes(status) || priority === 'urgent') return 'red';
  if (['done', 'closed', 'complete', 'completed'].includes(status)) return 'green';
  return 'yellow';
}

function isApprovalRequiredTask(task: TaskRow) {
  const status = task.status.trim().toLowerCase();
  const assignee = task.assignee_name?.trim().toLowerCase() ?? '';
  const tags = (task.tags ?? []).map((tag) => tag.trim().toLowerCase());
  return (
    ['blocked', 'blocked-on-you', 'needs_approval', 'approval'].includes(status) ||
    tags.some((tag) => ['approval', 'approval-required', 'needs-approval'].includes(tag)) ||
    assignee.includes('phill approval') ||
    assignee.includes('board approval') ||
    assignee.includes('operator approval')
  );
}

function countApprovalRequired(tasks: TaskRow[]) {
  return tasks.filter(isApprovalRequiredTask).length;
}

function priorityRank(priority: string | null) {
  switch (priority?.trim().toLowerCase()) {
    case 'urgent':
      return 5;
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'normal':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function taskTimestamp(task: TaskRow) {
  return new Date(task.updated_at ?? task.created_at ?? 0).getTime();
}

function isCapabilityDecisionTask(task: TaskRow) {
  const haystack = taskHaystack(task);
  return [
    'capability-scout',
    'idea-expansion',
    'strategic-expansion',
    'hermes-intake',
    'compound-development-loop',
  ].some((term) => haystack.includes(term));
}

function collectCapabilityDecisions(tasks: TaskRow[]): CapabilityDecision[] {
  return tasks
    .filter((task) => isApprovalRequiredTask(task) && isCapabilityDecisionTask(task))
    .sort((left, right) => {
      const priorityDelta = priorityRank(right.priority) - priorityRank(left.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return taskTimestamp(right) - taskTimestamp(left);
    })
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigneeName: task.assignee_name,
      obsidianPath: task.obsidian_path,
      lastUpdated: task.updated_at ?? task.created_at ?? undefined,
      tags: (task.tags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6),
    }));
}

function mergeTasks(tasks: TaskRow[]): LiveWorkstream[] {
  return CONTROL_WORKSTREAMS.map((item) => {
    const task = findTaskForWorkstream(item.id, tasks);
    if (!task) return item;

    return {
      ...item,
      status: mapStatus(task, item.status),
      ryg: mapRyg(task, item.ryg),
      owner: task.assignee_name || item.owner,
      crmTaskId: task.id,
      crmTaskStatus: task.status,
      lastUpdated: task.updated_at ?? task.created_at ?? undefined,
    };
  });
}

function mergeAddOns(tasks: TaskRow[]): LiveAddOnGate[] {
  return ADD_ON_GATES.map((item) => {
    const task = tasks.find((row) => {
      const tags = (row.tags ?? []).map((tag) => tag.trim().toLowerCase());
      return (
        row.obsidian_path === `command-center/add-ons/${item.id}` ||
        (tags.includes('hermes-addon-request') && tags.includes(item.id))
      );
    });

    if (!task) return item;

    return {
      ...item,
      state: mapStatus(task, item.state),
      crmTaskId: task.id,
      crmTaskStatus: task.status,
      lastRequestedAt: task.updated_at ?? task.created_at ?? undefined,
    };
  });
}

function responseFor(
  workstreams: LiveWorkstream[],
  source: string,
  taskCount = 0,
  addOns: LiveAddOnGate[] = ADD_ON_GATES,
  approvalRequired = 0,
  capabilityDecisions: CapabilityDecision[] = [],
) {
  return NextResponse.json(
    {
      source,
      taskCount,
      generatedAt: new Date().toISOString(),
      summary: {
        green: workstreams.filter((item) => item.ryg === 'green').length,
        yellow: workstreams.filter((item) => item.ryg === 'yellow').length,
        red: workstreams.filter((item) => item.ryg === 'red').length,
        approvalRequired,
      },
      workstreams,
      addOns,
      capabilityDecisions,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

function isLocalPreview() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.COMMAND_CENTER_LOCAL_PREVIEW === 'true'
  );
}

export async function GET(req: NextRequest) {
  if (isLocalPreview()) {
    return responseFor(CONTROL_WORKSTREAMS, 'fallback:local_preview');
  }

  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const workspaceId = process.env.UNITE_CRM_WORKSPACE_ID?.trim();
  if (!workspaceId) {
    return responseFor(CONTROL_WORKSTREAMS, 'fallback:no_workspace');
  }

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('tasks')
      .select('id,title,status,priority,tags,assignee_name,obsidian_path,updated_at,created_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      return responseFor(CONTROL_WORKSTREAMS, 'fallback:crm_read_error');
    }

    const tasks = (data ?? []) as TaskRow[];
    return responseFor(
      mergeTasks(tasks),
      'crm:tasks',
      tasks.length,
      mergeAddOns(tasks),
      countApprovalRequired(tasks),
      collectCapabilityDecisions(tasks),
    );
  } catch {
    return responseFor(CONTROL_WORKSTREAMS, 'fallback:crm_unavailable');
  }
}
