import { ProviderAccountsTile } from '@/components/command-centre/provider-accounts/ProviderAccountsTile'
import { ProviderUsageCockpit } from '@/components/command-centre/provider-usage/ProviderUsageCockpit'
import { CostAllocationTile } from '@/components/command-centre/cost-allocation/CostAllocationTile'
import { MissionControlShell } from '../MissionControlShell'
import shell from '../shell.module.css'
import styles from '../command-deck.module.css'


export interface ProvidersViewProps { className?: string }

export function ProvidersView({ className }: ProvidersViewProps) {
  return (
    <MissionControlShell section="providers" title="Providers" className={className}>

      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="providers">
        <h2>Providers</h2>
        <span className={shell.glassSub}>accounts pool · usage meters · cost allocation</span>
      </div>

      {/* The LLM provider pool — register plans, see live routing state. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.02s' }}>
        <ProviderAccountsTile />
      </section>

      {/* AI provider capacity — usage meters next to the accounts pool. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.04s' }}>
        <ProviderUsageCockpit />
      </section>

      {/* Cost allocation — metering spend per source vs revenue, current month. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.06s' }}>
        <CostAllocationTile />
      </section>
    </MissionControlShell>
  )
}
