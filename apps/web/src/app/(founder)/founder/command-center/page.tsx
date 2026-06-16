// /founder/command-center — CEO control panel (ported from Authority cockpit).
//
// Auth is enforced by the (founder) layout (getUser() → redirect). This page
// renders the founder-scoped control panel + activity + daily-digest panels.
// The control panel fetches /api/command-center/control-panel client-side and
// reconciles the workstream/add-on seed against the founder's live cc_tasks.
//
// Scope note: the Authority business-360 (needs @visx) and agent-topology
// (needs @xyflow/react) panels are omitted — those packages are not in
// apps/web and No-Invaders rule #3 forbids adding dependencies.

import { HermesControlPanel } from '@/components/command-center/control-panel/HermesControlPanel'
import { LiveAgentOperationsMap } from '@/components/command-center/live-agent-operations/LiveAgentOperationsMap'
import { ActivityFeedPanel } from '@/components/command-center/activity/ActivityFeedPanel'
import { DailyCrmDigestPanel } from '@/components/command-center/digest/DailyCrmDigestPanel'
import styles from '@/components/command-center/command-center.module.css'

export const dynamic = 'force-dynamic'

export default function CommandCenterPage() {
  return (
    <div className={styles.scope}>
      <header className="px-6 py-5" style={{ borderBottom: '1px solid var(--cc-grid)' }}>
        <p
          className="font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          Command Center
        </p>
        <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--cc-ink)' }}>
          CEO Control Panel
        </h1>
      </header>

      <HermesControlPanel />
      <LiveAgentOperationsMap />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_22rem]" style={{ gap: 1, background: 'var(--cc-grid)' }}>
        <ActivityFeedPanel />
        <DailyCrmDigestPanel />
      </div>
    </div>
  )
}
