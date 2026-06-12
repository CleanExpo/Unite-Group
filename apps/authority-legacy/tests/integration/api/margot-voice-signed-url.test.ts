jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/ratelimit', () => ({
  rateLimit: jest.fn(),
  RATE_LIMITS: {
    margotVoiceSignedUrl: { limit: 10, windowMs: 60_000 },
  },
}));

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GET } from '@/app/api/pi-ceo/margot-voice/signed-url/route';
import { requireAdmin } from '@/lib/security/require-admin';
import { rateLimit } from '@/lib/ratelimit';

const mockedRequireAdmin = requireAdmin as jest.Mock;
const mockedRateLimit = rateLimit as jest.Mock;

function req(): NextRequest {
  return new Request('https://unite-group.in/api/pi-ceo/margot-voice/signed-url', {
    headers: { 'x-forwarded-for': '127.0.0.1' },
  }) as NextRequest;
}

describe('GET /api/pi-ceo/margot-voice/signed-url', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...oldEnv,
      ELEVENLABS_API_KEY: 'xi-test',
      ELEVENLABS_MARGOT_AGENT_ID: 'agent_test',
    };
    mockedRateLimit.mockResolvedValue({ ok: true });
    mockedRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'phill.mcgurk@gmail.com' });
  });

  afterEach(() => {
    process.env = oldEnv;
    jest.restoreAllMocks();
  });

  it('returns 429 when rate limited', async () => {
    mockedRateLimit.mockResolvedValue({ ok: false, retryAfterMs: 12_345 });

    const res = await GET(req());

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited', retry_after_ms: 12_345 });
    expect(mockedRequireAdmin).not.toHaveBeenCalled();
  });

  it('returns 401/403 response from admin gate', async () => {
    mockedRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('fails closed when env is missing', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'elevenlabs_not_configured' });
  });

  it('returns 502 when ElevenLabs returns a non-OK response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad gateway' }), { status: 500 }),
    );

    const res = await GET(req());

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'elevenlabs_signed_url_failed' });
  });

  it('returns 502 when ElevenLabs is unreachable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    const res = await GET(req());

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'elevenlabs_unreachable' });
  });

  it('returns a signed url without exposing the api key', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          signed_url: 'wss://api.elevenlabs.io/v1/convai/conversation?conversation_signature=abc',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.signed_url).toContain('conversation_signature=abc');
    expect(JSON.stringify(body)).not.toContain('xi-test');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=agent_test&include_conversation_id=true',
      expect.objectContaining({
        method: 'GET',
        headers: { 'xi-api-key': 'xi-test' },
      }),
    );
  });
});
