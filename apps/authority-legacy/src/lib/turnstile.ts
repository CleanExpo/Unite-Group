// Cloudflare Turnstile server-side verifier.
//
// Wraps the siteverify endpoint per
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
//
// Usage from a Next.js route handler:
//
//   const ts = await verifyTurnstile(body.cfTurnstileResponse, clientIp);
//   if (!ts.success) {
//     return NextResponse.json({ error: 'CAPTCHA failed' }, { status: 401 });
//   }
//
// Fails closed: if the secret env var is unset, if the token is empty, or if
// the network call throws, returns `{ success: false }`. The caller must
// check `success` — there is no thrown-error path that bypasses verification.

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  /** Cloudflare error codes — see the siteverify docs. Empty on success. */
  errorCodes: string[];
  /** Hostname the widget was rendered on, returned by Cloudflare. */
  hostname?: string;
  /** Optional action name set on the widget (for tagging). */
  action?: string;
}

/**
 * Verify a Cloudflare Turnstile token against the siteverify endpoint.
 *
 * @param token       The `cf-turnstile-response` value posted from the client.
 * @param remoteIp    Caller IP (e.g. from `x-forwarded-for`). Pass `null` to
 *                    omit the `remoteip` field from the verification request.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.CF_TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error(
      '[turnstile] CF_TURNSTILE_SECRET_KEY not set — failing closed',
    );
    return { success: false, errorCodes: ['missing-secret'] };
  }
  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      return { success: false, errorCodes: [`http-${res.status}`] };
    }
    const data = (await res.json()) as {
      success: boolean;
      'error-codes'?: string[];
      hostname?: string;
      action?: string;
    };
    return {
      success: data.success === true,
      errorCodes: data['error-codes'] ?? [],
      hostname: data.hostname,
      action: data.action,
    };
  } catch (err) {
    console.error('[turnstile] verify request failed:', err);
    return { success: false, errorCodes: ['internal-error'] };
  }
}
