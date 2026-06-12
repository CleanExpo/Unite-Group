import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';

const PI_CEO_URL = process.env.PI_CEO_API_URL || 'https://pi-dev-ops-production.up.railway.app';
const PI_CEO_KEY = process.env.PI_CEO_API_KEY || '';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  if (!PI_CEO_KEY) {
    return NextResponse.json({ events: [], connected: false, source: 'no_key' });
  }

  try {
    const loginRes = await fetch(`${PI_CEO_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PI_CEO_KEY }),
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!loginRes.ok) return NextResponse.json({ events: [], connected: false, source: 'login_failed' });

    const setCookie = loginRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/tao_session=([^;]+)/);
    const cookie = cookieMatch ? `tao_session=${cookieMatch[1]}` : '';
    if (!cookie) return NextResponse.json({ events: [], connected: false });

    const autonomyRes = await fetch(`${PI_CEO_URL}/api/autonomy/status`, {
      headers: { Cookie: cookie },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!autonomyRes.ok) return NextResponse.json({ events: [], connected: false });

    const data = await autonomyRes.json();
    const events = (data.recent_events || []).slice(-10).reverse().map((e: {
      action: string; poll?: number; found?: number; ts: string
    }) => ({
      agent: e.action === 'poll' ? 'orchestrator' : e.action,
      action: e.action === 'poll'
        ? `Health sweep #${e.poll} — ${e.found === 0 ? 'no issues found' : `${e.found} issue(s) found`}`
        : e.action,
      timeAgo: formatAgo(e.ts),
      ts: e.ts,
      found: e.found ?? 0,
    }));

    return NextResponse.json({
      events,
      connected: true,
      poll_count: data.poll_count,
      last_poll_ago_s: data.last_poll_ago_s,
      autonomy_pct: data.effective_autonomy?.effective_autonomy_pct ?? 100,
      poll_success_rate: data.effective_autonomy?.poll_success_rate_pct ?? 100,
      source: 'pi_ceo_live',
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch {
    return NextResponse.json({ events: [], connected: false, source: 'error' });
  }
}

function formatAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
