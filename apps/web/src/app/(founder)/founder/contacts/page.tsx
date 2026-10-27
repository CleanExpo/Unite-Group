// src/app/(founder)/founder/contacts/page.tsx
import { ContactsPageClient } from '@/founder/contacts/ContactsPageClient'

export const dynamic = 'force-dynamic'

export default function ContactsPage() {
  return <ContactsPageClient />
}
