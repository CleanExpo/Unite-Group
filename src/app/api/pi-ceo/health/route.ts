import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { requireAdmin } from '@/lib/security/require-admin';

const PI_CEO_URL = process.env.PI_CEO_API_URL || 'https://pi-dev-ops-production.up.railway.app';
const PI_CEO_KEY = process.env.PI_CEO_API_KEY || '';

interface PiCeoHealth {
  session_id: string | null;
  task_title: string | null;
  confidence: number | null;
  last_updated: string | null;
  status_log: string | null;
  plan_units_count: number;
  pi_ceo_api_url: string | null;
  source: 'local_session' | 'env_api' | 'unavailable';
  // Live Railway fields
  poll_count?: number | null;
  last_poll_ago_s?: number | null;
  autonomy_pct?: number | null;
  swarm_enabled?: boolean | null;
  kill_switch_active?: boolean | null;
}

async function getPiCeoSession(): Promise<{ cookie: string; ok: true } | { ok: false }> {
  try {
    const loginRes = await fetch(`${PI_CEO_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PI_CEO_KEY }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!loginRes.ok) return { ok: false };

    const setCookie = loginRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/tao_session=([^;]+)/);
    const cookie = cookieMatch ? `tao_session=${cookieMatch[1]}` : '';
    if (!cookie) return { ok: false };

    return { ok: true, cookie };
  } catch {
    return { ok: false };
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const result: PiCeoHealth = {
    session_id: null,
    task_title: null,
    confidence: null,
    last_updated: null,
    status_log: null,
    plan_units_count: 0,
    pi_ceo_api_url: PI_CEO_URL,
    source: 'unavailable',
  };

  try {
    // Use authenticated Railway API if key is available
    if (PI_CEO_KEY) {
      const session = await getPiCeoSession();

      if (session.ok) {
        const { cookie } = session;

        const [autonomyRes, swarmRes] = await Promise.allSettled([
          fetch(`${PI_CEO_URL}/api/autonomy/status`, {
            headers: { Cookie: cookie },
            cache: 'no-store',
            signal: AbortSignal.timeout(8000),
          }),
          fetch(`${PI_CEO_URL}/api/swarm/status`, {
            headers: { Cookie: cookie },
            cache: 'no-store',
            signal: AbortSignal.timeout(8000),
          }),
        ]);

        const autonomy = autonomyRes.status === 'fulfilled' && autonomyRes.value.ok
          ? await autonomyRes.value.json() : null;
        const swarm = swarmRes.status === 'fulfilled' && swarmRes.value.ok
          ? await swarmRes.value.json() : null;

        return NextResponse.json(
          {
            ...result,
            source: 'env_api',
            last_updated: new Date().toISOString(),
            poll_count: autonomy?.poll_count ?? null,
            last_poll_ago_s: autonomy?.last_poll_ago_s ?? null,
            autonomy_pct: autonomy?.effective_autonomy?.effective_autonomy_pct ?? null,
            swarm_enabled: swarm?.swarm_enabled ?? null,
            kill_switch_active: swarm?.kill_switch_active ?? null,
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    // Fall back to unauthenticated health endpoint
    const apiUrl = PI_CEO_KEY ? null : (process.env.PI_CEO_API_URL || null);
    if (apiUrl) {
      const res = await fetch(`${apiUrl}/api/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(
          { ...result, source: 'env_api', ...data },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    // Fall back to local .pi-ceo/ session files
    const piCeoDir = join(process.cwd(), '.pi-ceo');
    const sessions = await readdir(piCeoDir).catch(() => []);

    if (sessions.length === 0) {
      return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    }

    const latestSession = sessions.sort().at(-1)!;
    result.session_id = latestSession;
    result.source = 'local_session';

    const sessionDir = join(piCeoDir, latestSession);

    const [statusMd, planMd, promptMd] = await Promise.allSettled([
      readFile(join(sessionDir, 'STATUS.md'), 'utf8'),
      readFile(join(sessionDir, 'PLAN.md'), 'utf8'),
      readFile(join(sessionDir, 'PROMPT.md'), 'utf8'),
    ]);

    if (statusMd.status === 'fulfilled') {
      result.status_log = statusMd.value.slice(0, 500);
      result.last_updated = new Date().toISOString();
    }

    if (planMd.status === 'fulfilled') {
      const plan = planMd.value;
      const confMatch = plan.match(/\*\*Confidence:\*\*\s*(\d+)%/);
      result.confidence = confMatch ? parseInt(confMatch[1], 10) : null;
      result.plan_units_count = (plan.match(/^## Unit/gm) || []).length;
    }

    if (promptMd.status === 'fulfilled') {
      const titleMatch = promptMd.value.match(/^#\s+(.+)$/m);
      result.task_title = titleMatch ? titleMatch[1].trim() : null;
    }

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Network or filesystem error — never crash the dashboard
    return NextResponse.json(
      { ...result, source: 'unavailable' as const },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
