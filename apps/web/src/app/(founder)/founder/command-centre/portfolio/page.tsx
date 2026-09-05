export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { getUser } from '@/lib/supabase/server'
import { loadPipelineOpportunities } from '@/lib/command-centre/pipeline-opportunities'
import { PortfolioView } from './PortfolioView'
import { IntegrationStatus } from '@/components/founder/dashboard/IntegrationStatus'
import { BusinessFocusRail } from '@/components/command-centre/business-focus/BusinessFocusRail'

export default async function PortfolioDeckPage() {
  const projects = await getProjects()
  const [integrationStatuses, user] = await Promise.all([
    loadProjectIntegrationStatuses(projects),
    getUser(),
  ])
  // Needs user.id from the batch above, so it runs after. Degrades honestly
  // (empty board + 'degraded' badge) when the session or query is unavailable.
  const pipeline = await loadPipelineOpportunities(user?.id ?? null)


  return <PortfolioView projects={projects} integrationStatuses={integrationStatuses} pipeline={pipeline} integrationStatus={user ? <IntegrationStatus founderId={user.id} /> : null} businessFocus={<BusinessFocusRail />} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
