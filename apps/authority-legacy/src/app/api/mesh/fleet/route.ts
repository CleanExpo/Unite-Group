// Poll proxy for the Mission Control client view. Returns the fleet snapshot so
// the browser never holds PI_CEO_API_KEY. Admin-gated, mirroring the page route.
import { NextResponse } from 'next/server';
import { readFleet } from '@/lib/mesh/read-fleet';
import { checkAdminSession } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await checkAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 });
  }
  const fleet = await readFleet();
  return NextResponse.json(fleet);
}
