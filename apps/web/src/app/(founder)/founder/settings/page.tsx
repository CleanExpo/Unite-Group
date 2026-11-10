import { noIndexPageMetadata } from '@/lib/page-metadata'

// src/app/(founder)/founder/settings/page.tsx
export const dynamic = 'force-dynamic'

import { SettingsPageClient } from '@/founder/settings/SettingsPageClient'

export const metadata = noIndexPageMetadata({
  path: "/founder/settings",
  title: "Settings | Unite Group",
  description: "Private founder workspace: Settings.",
})
export default function SettingsPage() {
  return <SettingsPageClient />
}
