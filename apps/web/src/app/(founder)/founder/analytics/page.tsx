import { noIndexPageMetadata } from '@/lib/page-metadata'

// src/app/(founder)/founder/analytics/page.tsx
import AnalyticsDashboard from '@/founder/analytics/AnalyticsDashboard'

export const metadata = noIndexPageMetadata({
  path: "/founder/analytics",
  title: "Analytics | Unite Group",
  description: "Private founder workspace: Analytics.",
})
export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <AnalyticsDashboard />
    </div>
  )
}
