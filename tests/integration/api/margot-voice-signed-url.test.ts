jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GET } from '@/app/api/pi-ceo/margot-voice/signed-url/route';
import { requireAdmin } from '@/lib/security/require-admin';

const mockedRequireAdmin = requireAdmin as jest.Mock;

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
    mockedRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'phill.mcgurk@gmail.com' });
  });

  afterEach(() => {
    process.env = oldEnv;
    jest.restoreAllMocks();
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
