// Unified admin-token check — dual-auth bridge for the PI_CEO_API_KEY → JWT
// migration (Security Sweep plan Task 15, slice 2 of 3).
//
// Accepts EITHER a JWT minted by `mintAdminJwt` (preferred — short-lived,
// signed, rotatable) OR the legacy static `PI_CEO_API_KEY` (timing-safe
// compare, kept for transition until the rotation script lands).
//
// Removing the static fallback is a future PR — when `ADMIN_JWT_SECRET` +
// `scripts/rotate-admin-jwt.ts` are wired into Vercel/Railway env, every
// caller will be issuing JWTs and the static check becomes dead code.

import { verifyAdminJwt, type AdminJwtClaims } from '@/lib/auth/admin-jwt';
import { timingSafeTokenMatch } from '@/lib/security/safe-compare';

export type AdminAuthResult =
  | { ok: true; via: 'jwt'; claims: AdminJwtClaims }
  | { ok: true; via: 'static'; claims: null }
  | { ok: false };

/**
 * Verify an incoming `x-admin-token` header value.
 *
 * Preference order:
 *   1. JWT (via `verifyAdminJwt`). Requires `ADMIN_JWT_SECRET` env to be set
 *      and the token to be a valid HS256-signed JWT.
 *   2. Static `PI_CEO_API_KEY` (timing-safe compare). Bridge path while
 *      callers are still issuing the legacy static credential.
 *
 * Returns `{ ok: false }` when both paths reject. Never throws.
 */
export async function checkAdminToken(
  token: string | null | undefined,
): Promise<AdminAuthResult> {
  if (!token) return { ok: false };

  // JWT path. verifyAdminJwt is fail-soft: returns null on missing secret,
  // bad signature, wrong subject, expiry, etc. Falls through to static.
  try {
    const claims = await verifyAdminJwt(token);
    if (claims) return { ok: true, via: 'jwt', claims };
  } catch {
    // verifyAdminJwt itself catches errors and returns null, but if the
    // module's getSecret() throws because ADMIN_JWT_SECRET is unset, that
    // surfaces here. Treat as fall-through to static.
  }

  // Static-key fallback. timingSafeTokenMatch is constant-time and
  // fail-closed on missing secret.
  const expected = process.env.PI_CEO_API_KEY;
  if (expected && timingSafeTokenMatch(token, expected)) {
    return { ok: true, via: 'static', claims: null };
  }

  return { ok: false };
}
