export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { summariseDashboard } from '@/lib/command-centre/dashboard-summary'
import { loadDashboardHealthFromSupabase } from '@/lib/command-centre/dashboard-health-supabase'
import { tailEvidence } from '@/lib/command-centre/evidence-stream'
import { loadEvidenceLedgerFromSupabase } from '@/lib/command-centre/evidence-ledger-supabase'
import { loadCrmMissionControlJobs } from '@/lib/command-centre/crm-mission-control-jobs-supabase'
import { loadAgentEventsWall } from '@/lib/command-centre/agent-events-wall'
import { getUser } from '@/lib/supabase/server'
import { loadActionQueueData } from '../ActionQueueTile'
import { loadBlockedLanesData } from '../BlockedLanesTile'
import { OperationsView } from './OperationsView'
import { CrmAutonomyPanel } from '@/components/command-centre/crm-autonomy/CrmAutonomyPanel'

export default async function OperationsDeckPage() {
  const [dashboard, evidence, actionQueue, blockedLanes, user] = await Promise.all([
    // UNI-2229: cloud substrate first (works on Vercel); local .agentic_nexus
    // dir remains the dev fallback when the table is unreachable or empty.
    (async () => {
      const cloud = await loadDashboardHealthFromSupabase()
      if (cloud.ok && cloud.result.entries.length > 0) return cloud.result
      return summariseDashboard()
    })(),
    // UNI-2227: cloud substrate first (works on Vercel); local ledger tail
    // remains the dev fallback when the table is unreachable or empty.
    (async () => {
      const cloud = await loadEvidenceLedgerFromSupabase()
      if (cloud.ok && cloud.result.entries.length > 0) return cloud.result
      return tailEvidence()
    })(),
    loadActionQueueData(),
    loadBlockedLanesData(),
    getUser(),
  ])
  // These are independent founder-scoped reads. Keep the honest degraded
  // states, but avoid making the Agent Events Wall wait for CRM jobs (or vice
  // versa) before the operations surface can render.
  const [crmMissionControlJobs, agentEventsWall] = await Promise.all([
    // Recent CRM Mission Control jobs (UNI-2234 slice 3). Founder-scoped;
    // degrades honestly when the session or query is unavailable.
    loadCrmMissionControlJobs(user?.id ?? null),
    // Agent events wall (UNI-2384 wave B2). The cc_agent_events migration is
    // founder-gated, so a missing table renders an honest dark state.
    loadAgentEventsWall(user?.id ?? null),
  ])

  return <OperationsView dashboard={dashboard} evidence={evidence} actionQueue={actionQueue} blockedLanes={blockedLanes} crmAutonomy={<CrmAutonomyPanel recentJobs={crmMissionControlJobs} />} agentEventsWall={agentEventsWall} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
