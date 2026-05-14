export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { requireAdmin } from '@/lib/security/require-admin';

async function getHarnessActivity(): Promise<{ label: string; when: string }[]> {
  const pulseDir = join(os.homedir(), 'Pi-CEO/Pi-Dev-Ops/.harness/portfolio-pulse/_synthesis');
  const boardDir = join(os.homedir(), 'Pi-CEO/Pi-Dev-Ops/.harness/board-meetings');
  const activity: { label: string; when: string }[] = [];

  try {
    const pulseFiles = (await readdir(pulseDir)).filter(f => f.endsWith('.md')).sort().reverse();
    if (pulseFiles[0]) {
      activity.push({ label: 'Portfolio pulse generated', when: pulseFiles[0].replace('.md', '') });
    }
  } catch { /* dir may not exist in production */ }

  try {
    const boardFiles = (await readdir(boardDir))
      .filter(f => f.endsWith('-board-minutes.md'))
      .sort()
      .reverse();
    if (boardFiles[0]) {
      const content = await readFile(join(boardDir, boardFiles[0]), 'utf-8');
      const topicMatch = content.match(/(?:Topic:|Brief:|##?\s+(?:Topic|Brief)):?\s*(.+)/i);
      const topic = topicMatch?.[1]?.trim().slice(0, 60) ?? 'Board deliberation';
      activity.push({ label: `Board: ${topic}`, when: boardFiles[0].replace('-board-minutes.md', '') });
    }
  } catch { /* harness not accessible in cloud deploy */ }

  return activity;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const supabase = getAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: actions } = await supabase
    .from('agent_actions')
    .select('status, created_at, action_type')
    .gte('created_at', since);

  const rows = actions ?? [];

  const stages = [
    {
      id: 'margot',
      label: 'Margot',
      sublabel: 'Research',
      count: rows.filter(a => a.status === 'pending').length,
      active: rows.some(a => a.status === 'pending'),
    },
    {
      id: 'board',
      label: 'Board',
      sublabel: 'Deliberating',
      count: rows.filter(a => a.status === 'in_progress' && a.action_type === 'board').length,
      active: rows.some(a => a.status === 'in_progress' && a.action_type === 'board'),
    },
    {
      id: 'pm',
      label: 'PM',
      sublabel: 'Dispatched',
      count: rows.filter(a => a.status === 'in_progress' && a.action_type !== 'board').length,
      active: rows.some(a => a.status === 'in_progress' && a.action_type !== 'board'),
    },
    {
      id: 'orchestrator',
      label: 'Orchestrator',
      sublabel: 'Executing',
      count: rows.filter(a => a.status === 'running').length,
      active: rows.some(a => a.status === 'running'),
    },
    {
      id: 'deployed',
      label: 'Deployed',
      sublabel: 'Today',
      count: rows.filter(a => a.status === 'done').length,
      active: false,
    },
  ];

  const activity = await getHarnessActivity();

  return NextResponse.json({
    stages,
    // Legacy fields for backward compat
    ideas_in_flight: stages[0].count,
    board_active: stages[1].count + stages[2].count,
    completed_today: stages[4].count,
    recent_activity: activity,
  });
}
