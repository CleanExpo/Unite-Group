// Margot voice failure taxonomy. Maps the API's (HTTP status, machine code)
// pair to operator-safe UI copy. Per UNI-2023, the panel must distinguish
// 401 / 403 / 503 / 502 / network and tell the operator the exact next
// action for each — no raw JSON parse traces leaking through.
//
// The API surface (`src/app/api/pi-ceo/margot-voice/signed-url/route.ts`)
// emits these `error` codes:
//   - `unauthorized`              (401, no Supabase session / no bearer)
//   - `forbidden`                 (403, session email not on ALLOWED_ADMINS)
//   - `rate_limited`              (429, signed-url ratelimit tripped)
//   - `elevenlabs_not_configured` (503, ELEVENLABS_API_KEY/AGENT_ID missing)
//   - `elevenlabs_signed_url_failed` (502, upstream non-ok)
//   - `elevenlabs_unreachable`    (502, fetch threw / 8s timeout)
//
// Anything outside that table — including a fetch that throws before a
// response is parsed — is classified as `network`.

export type FailureCategory =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'not_configured'
  | 'upstream_failed'
  | 'upstream_unreachable'
  | 'network'
  | 'unknown';

export interface FailureRender {
  category: FailureCategory;
  title: string;
  message: string;
  nextAction: string;
}

export function mapMargotFailure(
  status: number | null,
  code: string | null,
): FailureRender {
  if (status === 401 || code === 'unauthorized') {
    return {
      category: 'unauthorized',
      title: 'Sign in required',
      message: 'Your Command Center session expired before the voice link could be issued.',
      nextAction: 'Sign in again, then click Start secure voice.',
    };
  }

  if (status === 403 || code === 'forbidden') {
    return {
      category: 'forbidden',
      title: 'Account not authorised',
      message: 'You are signed in, but this account is not on the operator allow-list.',
      nextAction: 'Switch to an admin account in /en/login.',
    };
  }

  if (status === 429 || code === 'rate_limited') {
    return {
      category: 'rate_limited',
      title: 'Signed-link throttled',
      message: 'Too many voice sessions were requested in a short window.',
      nextAction: 'Wait ~30 seconds and try again.',
    };
  }

  if (status === 503 || code === 'elevenlabs_not_configured') {
    return {
      category: 'not_configured',
      title: 'ElevenLabs not configured',
      message: 'The server is missing ELEVENLABS_API_KEY or ELEVENLABS_MARGOT_AGENT_ID.',
      nextAction: 'Set ELEVENLABS_API_KEY and ELEVENLABS_MARGOT_AGENT_ID in Vercel env, then redeploy.',
    };
  }

  if (code === 'elevenlabs_signed_url_failed') {
    return {
      category: 'upstream_failed',
      title: 'ElevenLabs rejected the request',
      message: 'ElevenLabs accepted the connection but returned a non-OK response when issuing the signed URL.',
      nextAction: 'Check the ElevenLabs dashboard for the agent ID and account status, then retry.',
    };
  }

  if (code === 'elevenlabs_unreachable') {
    return {
      category: 'upstream_unreachable',
      title: 'ElevenLabs unreachable',
      message: 'The signed-url request to ElevenLabs failed (network or 8-second timeout).',
      nextAction: 'Check the ElevenLabs status page or try again in a minute.',
    };
  }

  if (status === null) {
    return {
      category: 'network',
      title: 'Network error',
      message: 'The browser could not reach the Command Center API.',
      nextAction: 'Check your connection, then click Start secure voice again.',
    };
  }

  return {
    category: 'unknown',
    title: 'Voice session failed',
    message: 'The signed-url endpoint returned an unexpected response.',
    nextAction: 'Retry. If it persists, check server logs for the request ID.',
  };
}
