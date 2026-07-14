export const dynamic = 'force-dynamic'

import { OwnBoard } from '@/components/founder/kanban/OwnBoard'
import { PageHeader } from '@/components/ui/PageHeader'

export default function OwnKanbanPage() {
  return (
    <div
      className="p-6"
      style={{ background: 'var(--surface-canvas)', minHeight: '100%' }}
    >
      <PageHeader
        title="My Board"
        subtitle="Your own editable Kanban — create cards, move across columns"
        className="mb-6"
      />
      <div className="overflow-x-auto">
        <OwnBoard />
      </div>
    </div>
  )
}
