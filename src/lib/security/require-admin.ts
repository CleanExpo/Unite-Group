// Shared admin auth gate for strategic-info API routes.
//
// Per deepsec-scan-batch2-2026-05-14 finding "Wholesale absence of auth on
// public routes" (30+ routes leak strategic info or enable cost amplification),
// the canonical gate pattern lives here so every route imports the same
// implementation rather than re-implementing it. Mirrors the auth block of
// `src/app/api/admin/approvals/create/route.ts` (the reference implementation
// after PR #45 + PR #47):
//
//   1. Try service-role bearer first (cheap, no DB hit) — for swarm callers.
//   2. Fall back to admin-email Supabase session — for Phill in the browser.
//   3. Bearer path uses constant-time compare to avoid timing leaks on the
//      service-role secret (deepsec P0-2).
//
// Fails closed: missing env, missing session, wrong email all return 401/403.
// 401 when no credential at all; 403 when a credential was supplied but
// the email isn't on the allow-list. The distinction matters for client
// retries — 401 says "log in", 403 says "you're logged in but not allowed".

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { timingSafeTokenMatch } from '@/lib/security/safe-compare';

export const ALLOWED_ADMINS = new Set<string>([
  'contact@unite-group.in',
  'phill.mcgurk@gmail.com',
]);

export interface RequireAdminOk {
  ok: true;
  actorEmail: string;
}

/**
 * Gate an API route to admin callers only.
 *
 * Returns `{ ok: true, actorEmail }` when the caller is authenticated as
 * either a known admin (Supabase session whose email is in ALLOWED_ADMINS) or
 * the swarm (Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>).
 *
 * Returns a `NextResponse` (401 or 403) when the caller is not authorized.
 * Callers should pattern-match:
 *
 *   const gate = await requireAdmin(request);
 *   if (gate instanceof NextResponse) return gate;
 *   // ... use gate.actorEmail
 */
export async function requireAdmin(
  request: NextRequest | Request,
): Promise<RequireAdminOk | NextResponse> {
  // 1. Service-role bearer — constant-time compare. Allows the swarm /
  //    Pi-CEO / cron callers to authenticate without a Supabase session.
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.replace(/^Bearer\s+/, '') ?? null;
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (timingSafeTokenMatch(bearer, expected)) {
    return { ok: true, actorEmail: 'service-role' };
  }

  // 2. Admin-email Supabase session. If no auth header was present and no
  //    Supabase session resolves, this is a 401 (anonymous request). If a
  //    session resolves but the email isn't on the allow-list, it's a 403.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ADMINS.has(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return { ok: true, actorEmail: user.email };
}
