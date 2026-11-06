import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { BoardroomClient } from '@/founder/boardroom/BoardroomClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = noIndexPageMetadata({
  path: "/founder/boardroom",
  title: "Boardroom | Unite Group",
  description: "Private founder workspace: Boardroom.",
})
export default function BoardroomPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="CEO Boardroom"
        subtitle="Daily board meeting · Gantt · Decisions · Team"
        tip="Generated at 11:50 AEST each morning from Linear, GitHub, Xero, and your AI insights"
      />
      <BoardroomClient />
    </div>
  )
}
