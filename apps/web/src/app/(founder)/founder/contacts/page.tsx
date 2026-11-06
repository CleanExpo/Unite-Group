import { noIndexPageMetadata } from '@/lib/page-metadata'

// src/app/(founder)/founder/contacts/page.tsx
import { ContactsPageClient } from '@/founder/contacts/ContactsPageClient'

export const dynamic = 'force-dynamic'

export const metadata = noIndexPageMetadata({
  path: "/founder/contacts",
  title: "Contacts | Unite Group",
  description: "Private founder workspace: Contacts.",
})
export default function ContactsPage() {
  return <ContactsPageClient />
}
