// /[locale]/command-center/layered — Layered design variant
// Reuses all server-read infrastructure from the main Command Center page.
// Admin gate, data fetching, and error handling mirrored exactly.
// Only the presentation shell is swapped for LayeredCommandCenterShell.

import { redirect } from 'next/navigation';
import { checkAdminSession } from '@/lib/security/require-admin';
import { readPortfolioSummary } from '@/lib/empire/read-portfolio-summary';
import { readGlobalStatus } from '@/lib/empire/read-global-status';
import { readActivityFeed } from '@/lib/empire/read-activity-feed';
import { readBusiness360 } from '@/lib/empire/read-business-360';
import { readAgentTopology } from '@/lib/empire/read-agent-topology';
import { readDataRoomHealth } from '@/lib/empire/read-data-room-health';
import { readCrmDailyDigestForCommandCenter } from '@/lib/crm/read-daily-digest';
import { checkStaleSyncs } from '@/lib/runtime/stale-sync-check';
import { getAdminClient } from '@/lib/supabase/admin';
import { LayeredCommandCenterShell } from '@/components/command-center/LayeredCommandCenterShell';
import { AccessDenied } from '@/components/command-center/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function CommandCenterLayeredPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await checkAdminSession();
  if (!session.ok && session.reason === 'anonymous') {
    redirect(`/${locale}/login?next=/${locale}/command-center/layered`);
  }
  if (!session.ok && session.reason === 'forbidden') {
    return <AccessDenied actorEmail={session.actorEmail} locale={locale} />;
  }

  // Server reads in parallel (mirrors main page exactly)
  const [
    summary,
    globalStatus,
    activity,
    business360,
    topology,
    dataRoomHealth,
    dailyDigest,
  ] = await Promise.all([
    readPortfolioSummary(),
    readGlobalStatus(),
    readActivityFeed(),
    readBusiness360(),
    readAgentTopology(),
    readDataRoomHealth(),
    readCrmDailyDigestForCommandCenter(),
  ]);

  // Fetch integration sync state for the health ticker
  const integrations = ['linear', 'github', 'vercel', 'supabase', 'railway'];
  const cadenceMap: Record<string, number> = {
    linear: 5 * 60_000,
    github: 10 * 60_000,
    vercel: 10 * 60_000,
    supabase: 15 * 60_000,
    railway: 15 * 60_000,
  };

  const { data: syncState } = await getAdminClient()
    .from('integration_sync_state')
    .select('integration,last_sync_status,last_sync_completed_at,next_sync_due_at,rows_upserted,last_sync_error')
    .in('integration', integrations);

  const stale = checkStaleSyncs((syncState ?? []) as any, new Date(), cadenceMap);

  const integrationHealth = integrations.map((name) => {
    const row = (syncState ?? []).find((s) => s.integration === name);
    const staleItem = stale.find((s) => s.integration === name);
    const isStale = !!staleItem;
    const isError = row?.last_sync_status === 'error';
    const value = isError ? 0 : isStale ? 30 : 100;
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      max: 100,
      status: (isError ? 'error' : isStale ? 'stale' : 'ok') as 'ok' | 'error' | 'stale',
    };
  });

  // Build KPI tiles from CRM digest
  const kpiTiles = [
    {
      label: 'Open Leads',
      value: String(dailyDigest?.summary?.leadCount ?? 0),
    },
    {
      label: 'Opportunities',
      value: String(dailyDigest?.summary?.opportunityCount ?? 0),
    },
    {
      label: 'Blocked',
      value: String(dailyDigest?.summary?.blockedTaskCount ?? 0),
      delta: dailyDigest?.summary?.blockedTaskCount ?? 0,
    },
    {
      label: 'Stale Mirrors',
      value: String(stale.length),
      delta: stale.length,
    },
  ];

  return (
    <LayeredCommandCenterShell
      kpiTiles={kpiTiles}
      integrationHealth={integrationHealth}
      liveState={stale.length === 0 ? 'live' : 'paused'}
    />
  );
}
