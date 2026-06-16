import { mapMargotFailure } from '@/components/command-center/voice/failure-taxonomy';

describe('mapMargotFailure', () => {
  it.each([
    {
      name: '401 unauthorized session failure',
      status: 401,
      code: 'unauthorized',
      expected: {
        category: 'unauthorized',
        title: 'Sign in required',
        message: 'Your Command Center session expired before the voice link could be issued.',
        nextAction: 'Sign in again, then click Start secure voice.',
      },
    },
    {
      name: '403 forbidden allow-list failure',
      status: 403,
      code: 'forbidden',
      expected: {
        category: 'forbidden',
        title: 'Account not authorised',
        message: 'You are signed in, but this account is not on the operator allow-list.',
        nextAction: 'Switch to an admin account in /en/login.',
      },
    },
    {
      name: '429 signed-link rate limit',
      status: 429,
      code: 'rate_limited',
      expected: {
        category: 'rate_limited',
        title: 'Signed-link throttled',
        message: 'Too many voice sessions were requested in a short window.',
        nextAction: 'Wait ~30 seconds and try again.',
      },
    },
    {
      name: '503 ElevenLabs configuration failure',
      status: 503,
      code: 'elevenlabs_not_configured',
      expected: {
        category: 'not_configured',
        title: 'ElevenLabs not configured',
        message: 'The server is missing ELEVENLABS_API_KEY or ELEVENLABS_MARGOT_AGENT_ID.',
        nextAction: 'Set ELEVENLABS_API_KEY and ELEVENLABS_MARGOT_AGENT_ID in Vercel env, then redeploy.',
      },
    },
    {
      name: '502 ElevenLabs rejected signed-url request',
      status: 502,
      code: 'elevenlabs_signed_url_failed',
      expected: {
        category: 'upstream_failed',
        title: 'ElevenLabs rejected the request',
        message: 'ElevenLabs accepted the connection but returned a non-OK response when issuing the signed URL.',
        nextAction: 'Check the ElevenLabs dashboard for the agent ID and account status, then retry.',
      },
    },
    {
      name: '502 ElevenLabs unreachable or timed out',
      status: 502,
      code: 'elevenlabs_unreachable',
      expected: {
        category: 'upstream_unreachable',
        title: 'ElevenLabs unreachable',
        message: 'The signed-url request to ElevenLabs failed (network or 8-second timeout).',
        nextAction: 'Check the ElevenLabs status page or try again in a minute.',
      },
    },
    {
      name: 'browser/network failure before a response is available',
      status: null,
      code: null,
      expected: {
        category: 'network',
        title: 'Network error',
        message: 'The browser could not reach the Command Center API.',
        nextAction: 'Check your connection, then click Start secure voice again.',
      },
    },
    {
      name: 'unexpected API response',
      status: 418,
      code: 'teapot',
      expected: {
        category: 'unknown',
        title: 'Voice session failed',
        message: 'The signed-url endpoint returned an unexpected response.',
        nextAction: 'Retry. If it persists, check server logs for the request ID.',
      },
    },
  ])('maps $name to operator-safe UI copy', ({ status, code, expected }) => {
    expect(mapMargotFailure(status, code)).toEqual(expected);
  });

  it('allows known machine codes to classify failures when status is unavailable or generic', () => {
    expect(mapMargotFailure(null, 'rate_limited').category).toBe('rate_limited');
    expect(mapMargotFailure(500, 'forbidden').category).toBe('forbidden');
    expect(mapMargotFailure(500, 'elevenlabs_signed_url_failed').category).toBe('upstream_failed');
    expect(mapMargotFailure(500, 'elevenlabs_unreachable').category).toBe('upstream_unreachable');
  });
});
