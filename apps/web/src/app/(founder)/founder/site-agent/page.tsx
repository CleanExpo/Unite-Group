import { noIndexPageMetadata } from '@/lib/page-metadata'

// src/app/(founder)/founder/site-agent/page.tsx
export const dynamic = 'force-dynamic'

import { SiteAgentAdminClient } from '@/founder/site-agent/SiteAgentAdminClient'

export const metadata = noIndexPageMetadata({
  path: "/founder/site-agent",
  title: "Site Agent | Unite Group",
  description: "Private founder workspace: Site Agent.",
})
export default function SiteAgentPage() {
  return <SiteAgentAdminClient />
}
