import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { VaultPageClient } from '@/founder/vault/VaultPageClient'

export const metadata = noIndexPageMetadata({
  path: "/founder/vault",
  title: "Vault | Unite Group",
  description: "Private founder workspace: Vault.",
})
export default function VaultPage() {
  return <VaultPageClient />
}
