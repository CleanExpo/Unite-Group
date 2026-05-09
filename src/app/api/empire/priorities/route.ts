export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// Hard-coded known priorities until real Linear sync is built
// These will be replaced by live Linear data in Wave 2
const PRIORITIES = [
  {
    id: 'RA-1718',
    title: 'RestoreAssist V1 Cutover',
    subtitle: 'Phase 5: production migration + pilot onboarding. Runbook is ready.',
    priority: 'urgent' as const,
    owner: 'phill',
    url: 'https://linear.app/unite-group/issue/RA-1718',
    team: 'RestoreAssist',
  },
  {
    id: 'PI-CEO-RESCAN',
    title: 'Pi-CEO health rescan needed',
    subtitle: '8 security PRs merged overnight. Scores still showing pre-merge values (~74, real is ~84).',
    priority: 'high' as const,
    owner: 'system',
    url: null,
    team: 'System',
  },
  {
    id: 'SYN-936',
    title: 'Synthex preview deploys broken',
    subtitle: '5 env vars missing from Vercel Preview environment. Fix takes 5 minutes.',
    priority: 'medium' as const,
    owner: 'phill',
    url: 'https://linear.app/unite-group/issue/SYN-936',
    team: 'Synthex',
  },
];

export async function GET() {
  return NextResponse.json({ priorities: PRIORITIES });
}
