import { NextResponse } from 'next/server';
import { getIntegrationsState } from '@/lib/integrations/dashboard-state';
import { checkAdminToken } from '@/lib/auth/check-admin-token';

export async function GET(req: Request) {
  const auth = req.headers.get('x-admin-token');
  const result = await checkAdminToken(auth);
  if (!result.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = await getIntegrationsState();
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
}
