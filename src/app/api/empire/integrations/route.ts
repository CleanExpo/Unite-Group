import { NextResponse } from 'next/server';
import { getIntegrationsState } from '@/lib/integrations/dashboard-state';

// NOTE: Auth path uses a static `PI_CEO_API_KEY` compare because the
// `@/lib/auth/admin-jwt` helper referenced by Plan 2 Task 12 does not yet
// exist in this repo (Task 15 of the security-sweep plan introduces it).
// Timing-unsafe compare is acceptable here — H1 deferred globally; swap to
// `crypto.timingSafeEqual` when JWT helper lands.
function isAuthorized(token: string | null): boolean {
  if (!token) return false;
  const expected = process.env.PI_CEO_API_KEY ?? '';
  if (!expected) return false;
  return token === expected;
}

export async function GET(req: Request) {
  const auth = req.headers.get('x-admin-token');
  if (!isAuthorized(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = await getIntegrationsState();
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
}
