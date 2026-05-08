import { NextResponse } from 'next/server';

interface BusinessHealth {
  id: string;
  name: string;
  status: 'operational' | 'building' | 'degraded' | 'down';
  uptime_pct: number;
  deploy_frequency: number; // deploys per week
  open_prs: number;
  ci_passing: boolean | null;
  last_deploy: string | null;
  arr_aud: number;
  trend: number[]; // 7 data points for sparkline
}

interface EmpireHealth {
  score: number; // 0-100
  businesses: BusinessHealth[];
  total_arr: number;
  active_agents: number;
  content_produced: number;
  content_total: number;
  work_orders_open: number;
  fetched_at: string;
}

export async function GET() {
  // Try to get real data from Pi-CEO API
  const apiUrl = process.env.PI_CEO_API_URL;
  let piData: any = null;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/swarm/health`, {
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 60 },
      });
      if (res.ok) piData = await res.json();
    } catch {}
  }

  // Also get GitHub data for CI status
  const githubToken = process.env.GITHUB_TOKEN;
  const repos = [
    { id: 'restoreassist', repo: 'CleanExpo/RestoreAssist' },
    { id: 'synthex', repo: 'CleanExpo/Synthex' },
    { id: 'ccw-crm', repo: 'CleanExpo/CCW-CRM' },
    { id: 'disaster-recovery', repo: 'CleanExpo/DR-NRPG' },
    { id: 'nrpg', repo: 'CleanExpo/NRPG-Onboarding-Framework' },
    { id: 'carsi', repo: 'CleanExpo/carsi' },
  ];

  const ciStatuses: Record<string, { passing: boolean | null; open_prs: number }> = {};

  if (githubToken) {
    await Promise.allSettled(repos.map(async ({ id, repo }) => {
      try {
        const headers = {
          Authorization: `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
        };
        const [runsRes, prsRes] = await Promise.allSettled([
          fetch(`https://api.github.com/repos/${repo}/actions/runs?branch=main&per_page=1`, { headers }),
          fetch(`https://api.github.com/repos/${repo}/pulls?state=open`, { headers }),
        ]);

        let passing: boolean | null = null;
        if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
          const runs = await runsRes.value.json();
          const latest = runs.workflow_runs?.[0];
          if (latest) passing = latest.conclusion === 'success';
        }

        let open_prs = 0;
        if (prsRes.status === 'fulfilled' && prsRes.value.ok) {
          const prs = await prsRes.value.json();
          open_prs = Array.isArray(prs) ? prs.length : 0;
        }

        ciStatuses[id] = { passing, open_prs };
      } catch {}
    }));
  }

  // Build response with real + fallback data
  const businesses: BusinessHealth[] = [
    {
      id: 'restoreassist',
      name: 'RestoreAssist',
      status: 'building',
      uptime_pct: 99.9,
      deploy_frequency: 3,
      open_prs: ciStatuses['restoreassist']?.open_prs ?? 2,
      ci_passing: ciStatuses['restoreassist']?.passing ?? null,
      last_deploy: null,
      arr_aud: 0,
      trend: [2, 3, 2, 4, 3, 5, 3],
    },
    {
      id: 'synthex',
      name: 'Synthex',
      status: 'operational',
      uptime_pct: 99.97,
      deploy_frequency: 5,
      open_prs: ciStatuses['synthex']?.open_prs ?? 1,
      ci_passing: ciStatuses['synthex']?.passing ?? true,
      last_deploy: null,
      arr_aud: 0,
      trend: [8, 10, 9, 12, 11, 14, 13],
    },
    {
      id: 'ccw-crm',
      name: 'CCW-CRM',
      status: 'operational',
      uptime_pct: 99.97,
      deploy_frequency: 2,
      open_prs: ciStatuses['ccw-crm']?.open_prs ?? 0,
      ci_passing: ciStatuses['ccw-crm']?.passing ?? true,
      last_deploy: null,
      arr_aud: 2400,
      trend: [1, 1, 2, 2, 2, 2, 2],
    },
    {
      id: 'disaster-recovery',
      name: 'DR Platform',
      status: 'operational',
      uptime_pct: 99.9,
      deploy_frequency: 2,
      open_prs: ciStatuses['disaster-recovery']?.open_prs ?? 1,
      ci_passing: ciStatuses['disaster-recovery']?.passing ?? null,
      last_deploy: null,
      arr_aud: 0,
      trend: [3, 4, 3, 4, 5, 4, 5],
    },
    {
      id: 'nrpg',
      name: 'NRPG',
      status: 'building',
      uptime_pct: 99.5,
      deploy_frequency: 1,
      open_prs: ciStatuses['nrpg']?.open_prs ?? 0,
      ci_passing: ciStatuses['nrpg']?.passing ?? null,
      last_deploy: null,
      arr_aud: 0,
      trend: [1, 1, 1, 2, 2, 3, 3],
    },
    {
      id: 'carsi',
      name: 'CARSI',
      status: 'operational',
      uptime_pct: 99.8,
      deploy_frequency: 1,
      open_prs: ciStatuses['carsi']?.open_prs ?? 0,
      ci_passing: ciStatuses['carsi']?.passing ?? null,
      last_deploy: null,
      arr_aud: 0,
      trend: [2, 2, 3, 2, 3, 4, 3],
    },
  ];

  const operationalCount = businesses.filter(b => b.status === 'operational').length;
  const score = Math.round(
    (operationalCount / businesses.length) * 60 +
    (businesses.filter(b => b.ci_passing === true).length / businesses.length) * 40,
  );

  const health: EmpireHealth = {
    score,
    businesses,
    total_arr: businesses.reduce((sum, b) => sum + b.arr_aud, 0),
    active_agents: piData?.active_agents ?? 4,
    content_produced: 40,
    content_total: 85,
    work_orders_open: piData?.work_orders_open ?? 0,
    fetched_at: new Date().toISOString(),
  };

  return NextResponse.json(health, { headers: { 'Cache-Control': 'no-store' } });
}
