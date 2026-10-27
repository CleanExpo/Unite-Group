// src/app/(founder)/founder/site-agent/page.tsx
export const dynamic = 'force-dynamic'

import { SiteAgentAdminClient } from '@/founder/site-agent/SiteAgentAdminClient'

export default function SiteAgentPage() {
  return <SiteAgentAdminClient />
}
