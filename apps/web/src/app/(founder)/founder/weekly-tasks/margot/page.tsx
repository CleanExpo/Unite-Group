import { MissionControlShell } from '../../command-centre/MissionControlShell'
import { MargotWeeklyReview } from './MargotWeeklyReview'

export const dynamic = 'force-dynamic'

// The parent founder layout enforces authentication. No durable weekly source
// is configured; never import the local test packet into this production page.
export default function MargotWeeklyPage() {
  return <MissionControlShell section="weekly-tasks" title="Margot campaign review" description="Weekly Tasks · review only">
    <MargotWeeklyReview review={{ source: 'not_configured' }} />
  </MissionControlShell>
}
