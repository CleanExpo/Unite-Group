import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const CFO_STATE = path.join(
  process.env.HOME || '/Users/phill-mac',
  'Pi-CEO/Pi-Dev-Ops/.harness/swarm/cfo_state.jsonl',
);
const CTO_STATE = path.join(
  process.env.HOME || '/Users/phill-mac',
  'Pi-CEO/Pi-Dev-Ops/.harness/swarm/cto_state.jsonl',
);
const CMO_STATE = path.join(
  process.env.HOME || '/Users/phill-mac',
  'Pi-CEO/Pi-Dev-Ops/.harness/swarm/cmo_state.jsonl',
);

type AgentBrief = {
  agent: 'CFO' | 'CTO' | 'CMO' | 'CS';
  status: 'live' | 'synthetic' | 'offline';
  last_run: string | null;
  headline: string;
  metrics: Record<string, string | number>;
};

function readLastLine(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

function cfoSummary(): AgentBrief {
  const snap = readLastLine(CFO_STATE);
  if (!snap) {
    return {
      agent: 'CFO',
      status: 'offline',
      last_run: null,
      headline: 'First brief at 6am AEST',
      metrics: {},
    };
  }
  const mrr = typeof snap.mrr === 'number' ? snap.mrr : 0;
  const runway = typeof snap.runway_months === 'number' ? snap.runway_months : null;
  const nrr = typeof snap.nrr === 'number' ? snap.nrr : null;
  return {
    agent: 'CFO',
    status: 'live',
    last_run: typeof snap.ts === 'string' ? snap.ts : null,
    headline: `$${mrr >= 1000 ? `${(mrr / 1000).toFixed(1)}k` : mrr} MRR${runway ? ` · ${runway.toFixed(1)}m runway` : ''}`,
    metrics: {
      mrr: mrr,
      runway_months: runway ?? '—',
      nrr: nrr !== null ? `${(nrr * 100).toFixed(1)}%` : '—',
    },
  };
}

function ctoSummary(): AgentBrief {
  const snap = readLastLine(CTO_STATE);
  if (!snap) {
    return {
      agent: 'CTO',
      status: 'offline',
      last_run: null,
      headline: 'First brief at 6am AEST',
      metrics: {},
    };
  }
  return {
    agent: 'CTO',
    status: 'live',
    last_run: typeof snap.ts === 'string' ? snap.ts : null,
    headline: typeof snap.headline === 'string' ? snap.headline : 'Platform health brief',
    metrics: {
      deploys_last_week: String(snap.deploys_last_week ?? '—'),
      lead_time_hours: String(snap.lead_time_hours_p50 ?? '—'),
      change_failure_rate: String(snap.change_failure_rate ?? '—'),
    },
  };
}

function cmoSummary(): AgentBrief {
  const snap = readLastLine(CMO_STATE);
  if (!snap) {
    return {
      agent: 'CMO',
      status: 'synthetic',
      last_run: null,
      headline: 'Needs Google Ads credentials',
      metrics: {},
    };
  }
  return {
    agent: 'CMO',
    status: 'live',
    last_run: typeof snap.ts === 'string' ? snap.ts : null,
    headline: typeof snap.headline === 'string' ? snap.headline : 'Marketing brief',
    metrics: {},
  };
}

export async function GET() {
  return NextResponse.json({
    agents: [cfoSummary(), ctoSummary(), cmoSummary()],
    fetched_at: new Date().toISOString(),
  });
}
