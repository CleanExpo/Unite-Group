// /[locale]/command-center — Unite-Group operations cockpit.
//
// Per UNI-2022 (PM audit 18/05/2026), the page route gate must mirror the
// API admin policy. Anonymous callers redirect to /en/login; authenticated
// non-admins see the AccessDenied UX. Only allow-listed admins ever reach
// the shell — no "visible but unusable" state where the UI renders behind
// a wall of 401 responses.

import { redirect } from 'next/navigation';
import { CommandCenterShell } from '@/components/command-center/CommandCenterShell';
import { AccessDenied } from '@/components/command-center/AccessDenied';
import { checkAdminSession } from '@/lib/security/require-admin';
import { readPortfolioSummary } from '@/lib/empire/read-portfolio-summary';
import { readGlobalStatus } from '@/lib/empire/read-global-status';
import { readActivityFeed } from '@/lib/empire/read-activity-feed';
import { readBusiness360 } from '@/lib/empire/read-business-360';
import { readAgentTopology } from '@/lib/empire/read-agent-topology';
import { readDataRoomHealth } from '@/lib/empire/read-data-room-health';

export const dynamic = 'force-dynamic';

export default async function CommandCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await checkAdminSession();
  if (!session.ok && session.reason === 'anonymous') {
    redirect(`/${locale}/login?next=/${locale}/command-center`);
  }
  if (!session.ok && session.reason === 'forbidden') {
    return <AccessDenied actorEmail={session.actorEmail} />;
  }

  // Server-fetch summaries in parallel. The page is already admin-gated, so
  // we skip requireAdmin (which is an API-route concern) and read directly.
  const [summary, globalStatus, activity, business360, topology, dataRoomHealth] = await Promise.all([
    readPortfolioSummary(),
    readGlobalStatus(),
    readActivityFeed(),
    readBusiness360(),
    readAgentTopology(),
    readDataRoomHealth(),
  ]);

  return (
    <CommandCenterShell
      kpiInitial={
        summary
          ? {
              arrCents: summary.total_arr_cents,
              atRiskCount: summary.at_risk_count,
              arrSourceLiveAt: summary.fetched_at,
            }
          : undefined
      }
      globalStatusInitial={
        globalStatus
          ? {
              agentsAlive: globalStatus.agentsAlive,
              alerts: globalStatus.alerts,
              buildSha: globalStatus.buildSha,
              sourceLiveAt: globalStatus.fetchedAt,
              dataRoomHealth: dataRoomHealth?.health,
            }
          : undefined
      }
      activityInitial={
        activity && activity.events.length > 0
          ? {
              events: activity.events,
              sourceLiveAt: activity.fetchedAt,
            }
          : undefined
      }
      business360Initial={
        business360 && business360.liveBusinessCount > 0
          ? {
              tiles: business360.tiles,
              sourceLiveAt: business360.fetchedAt,
            }
          : undefined
      }
      topologyInitial={
        topology && topology.liveNodeCount > 0
          ? {
              agents: topology.nodes,
              edges: topology.edges,
              sourceLiveAt: topology.fetchedAt,
            }
          : undefined
      }
    />
  );
}
