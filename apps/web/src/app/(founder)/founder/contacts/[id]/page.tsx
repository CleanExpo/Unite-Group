// src/app/(founder)/founder/contacts/[id]/page.tsx
// Contact detail — UNI-2062 Phase 4. Server shell unwraps params; the client
// component loads the founder-scoped contact from /api/contacts/[id].
import { ContactDetailClient } from '@/components/founder/contacts/ContactDetailClient'

export const dynamic = 'force-dynamic'

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ContactDetailClient id={id} />
}
