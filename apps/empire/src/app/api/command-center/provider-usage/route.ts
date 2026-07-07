import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';
import { buildProviderUsage, summarizeProviderUsage, buildPlanMetrics } from '@/lib/mission-control/provider-usage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const providers = buildProviderUsage(process.env);
  const planMetrics = buildPlanMetrics();

  return NextResponse.json(
    {
      source: 'mission-control:provider-usage',
      generatedAt: new Date().toISOString(),
      providers,
      summary: summarizeProviderUsage(providers),
      planMetrics,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
