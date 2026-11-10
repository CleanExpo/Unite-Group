import { noIndexPageMetadata } from '@/lib/page-metadata'

// src/app/(founder)/founder/opportunities/page.tsx
import { OpportunitiesPageClient } from '@/founder/opportunities/OpportunitiesPageClient'

export const dynamic = 'force-dynamic'

export const metadata = noIndexPageMetadata({
  path: "/founder/opportunities",
  title: "Opportunities | Unite Group",
  description: "Private founder workspace: Opportunities.",
})
export default function OpportunitiesPage() {
  return <OpportunitiesPageClient />
}
