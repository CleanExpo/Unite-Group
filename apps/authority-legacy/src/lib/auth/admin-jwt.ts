// Admin JWT — replaces the static PI_CEO_API_KEY check pattern.
//
// Why: a static API key in `x-admin-token` headers (current shape across 9
// routes) has two failure modes — it never expires, and if leaked it's a
// permanent backdoor until manually rotated. A signed JWT with a 24h TTL
// fails closed on expiry, and rotation is automatable (see
// scripts/rotate-admin-jwt.ts in a follow-up PR).
//
// The token shape carries one explicit claim: `scope` (e.g. "empire:full",
// "empire:read"). Routes can downgrade their requirement by checking scope
// after verifying — the verifier itself only confirms signature + non-
// expiry + subject == "admin".
//
// HS256 (HMAC-SHA256) is sufficient here: this is a single-issuer / single-
// verifier setup running inside Vercel + Railway with a shared secret. No
// need for asymmetric keys until we have third-party consumers.

import { jwtVerify, SignJWT } from 'jose';

const ADMIN_SUBJECT = 'admin';
const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24h

export interface AdminJwtClaims {
  /** e.g. "empire:full", "empire:read" — route-level enforcement is the caller's job. */
  scope: string;
  /** Issued-at (unix seconds). */
  iat: number;
  /** Expiry (unix seconds). */
  exp: number;
}

/**
 * Resolve the signing secret. Lazy so the module imports without throwing
 * during Next.js static analysis when ADMIN_JWT_SECRET isn't set in the
 * build environment.
 */
function getSecret(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'ADMIN_JWT_SECRET not set or too short (need ≥32 chars for HS256 safety)',
    );
  }
  return new TextEncoder().encode(raw);
}

/**
 * Mint a fresh admin JWT.
 *
 * @param scope         e.g. "empire:full". Defaults to the broadest scope.
 * @param ttlSeconds    Lifetime in seconds. Defaults to 24h.
 */
export async function mintAdminJwt(
  scope: string = 'empire:full',
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  return new SignJWT({ scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(ADMIN_SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecret());
}

/**
 * Verify an admin JWT. Returns the decoded claims on success, `null` on
 * any failure (bad signature, wrong subject, expired, malformed). Never
 * throws — callers branch on `null`.
 */
export async function verifyAdminJwt(
  token: string | null | undefined,
): Promise<AdminJwtClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.sub !== ADMIN_SUBJECT) return null;
    if (typeof payload.scope !== 'string') return null;
    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
      return null;
    }
    return {
      scope: payload.scope,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
