import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface PiCeoHealth {
  session_id: string | null;
  task_title: string | null;
  confidence: number | null;
  last_updated: string | null;
  status_log: string | null;
  plan_units_count: number;
  pi_ceo_api_url: string | null;
  source: 'local_session' | 'env_api' | 'unavailable';
}

export async function GET() {
  const result: PiCeoHealth = {
    session_id: null,
    task_title: null,
    confidence: null,
    last_updated: null,
    status_log: null,
    plan_units_count: 0,
    pi_ceo_api_url: process.env.PI_CEO_API_URL || null,
    source: 'unavailable',
  };

  try {
    // Try the Pi-CEO Railway API first if configured
    const apiUrl = process.env.PI_CEO_API_URL;
    if (apiUrl) {
      const res = await fetch(`${apiUrl}/api/health`, { next: { revalidate: 30 } });
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
  } catch (error) {
    return NextResponse.json(
      { ...result, error: String(error) },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
