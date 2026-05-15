import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { createClient } from '@/lib/supabase/server';
import { timingSafeTokenMatch } from '@/lib/security/safe-compare';

const HERMES_URL = process.env.HERMES_API_URL || 'http://127.0.0.1:8642';
const HERMES_TIMEOUT_MS = 120_000;

// Inline admin gate — duplicates the pattern in admin/approvals/create.
// Will be collapsed once security-2b's `requireAdmin` helper lands on main.
const ALLOWED_ADMINS = new Set<string>([
  'contact@unite-group.in',
  'phill.mcgurk@gmail.com',
]);

async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
  if (timingSafeTokenMatch(bearer, process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return true;
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user?.email && ALLOWED_ADMINS.has(user.email);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await rateLimit(request, { key: 'hermes-chat', ...RATE_LIMITS.hermesChat });
    if (!gate.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retry_after_ms: gate.retryAfterMs },
        { status: 429 },
      );
    }
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const upstream = await fetch(`${HERMES_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(HERMES_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: 'Hermes upstream error', detail: text },
        { status: upstream.status }
      );
    }

    // Streaming: pipe through if the client requested SSE
    if (body.stream) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Hermes request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to reach Hermes API' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const gate = await rateLimit(request, { key: 'hermes-chat', ...RATE_LIMITS.hermesChat });
    if (!gate.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retry_after_ms: gate.retryAfterMs },
        { status: 429 },
      );
    }
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const upstream = await fetch(`${HERMES_URL}/v1/models`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Hermes offline' }, { status: 502 });
    }
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Hermes offline' }, { status: 502 });
  }
}
