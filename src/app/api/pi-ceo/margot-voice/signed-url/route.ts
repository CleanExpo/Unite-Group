import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const ELEVENLABS_SIGNED_URL_ENDPOINT =
  'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await rateLimit(req, {
    key: 'margot-voice-signed-url',
    ...RATE_LIMITS.margotVoiceSignedUrl,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retry_after_ms: gate.retryAfterMs },
      { status: 429 },
    );
  }

  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const agentId = process.env.ELEVENLABS_MARGOT_AGENT_ID?.trim();
  if (!apiKey || !agentId) {
    return NextResponse.json({ error: 'elevenlabs_not_configured' }, { status: 503 });
  }

  const url = new URL(ELEVENLABS_SIGNED_URL_ENDPOINT);
  url.searchParams.set('agent_id', agentId);
  url.searchParams.set('include_conversation_id', 'true');

  try {
    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'elevenlabs_signed_url_failed' }, { status: 502 });
    }
    const data = await upstream.json();
    if (typeof data?.signed_url !== 'string' || data.signed_url.trim() === '') {
      return NextResponse.json({ error: 'elevenlabs_signed_url_failed' }, { status: 502 });
    }

    return NextResponse.json(
      {
        signed_url: data.signed_url,
        actor_email: admin.actorEmail,
        expires_in_seconds: 900,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'elevenlabs_unreachable' }, { status: 502 });
  }
}
