import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { HermesKanbanStatus } from '@/founder/kanban/HermesKanbanStatus'
import { KanbanBoard } from '@/founder/kanban/KanbanBoard'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = noIndexPageMetadata({
  path: "/founder/kanban",
  title: "Kanban | Unite Group",
  description: "Private founder workspace: Kanban.",
})
export default function KanbanPage() {
  return (
    <div className="p-6" style={{ background: 'var(--surface-canvas)', minHeight: '100%' }}>
      <PageHeader
        title="Kanban"
        subtitle="Read-only Linear and Hermes projections; CRM is the mission source of truth"
        className="mb-6"
      />
      <div className="mb-6">
        <HermesKanbanStatus />
      </div>
      <div className="overflow-x-auto">
        <KanbanBoard />
      </div>
    </div>
  )
}
