import type { Metadata } from 'next'

import { loadPreferredEdition } from '@/lib/design-feedback/preferred'

import { cleanRef, resolveEdition } from '../editions'
import { OrderView } from './order-view'

export const metadata: Metadata = {
  title: 'Get your own living card | Unite Group',
  description: 'Ask Unite Group to build your living business card. Choose your opener and send your details.',
  alternates: { canonical: 'https://unite-group.in/cards/order' },
  robots: { index: true, follow: true },
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function CardOrderPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  // Any ?edition= present is the caller's choice (unknown values still mean nothing chosen).
  // Only with no ?edition= do we start on the film past clients approved most (design-lessons
  // loop, UNI-3017); null keeps the old default when the loop is dormant.
  const asked = Array.isArray(params.edition) ? params.edition.length > 0 : Boolean(params.edition)
  const edition = asked ? (resolveEdition(params.edition)?.name ?? null) : await loadPreferredEdition()
  return <OrderView edition={edition} referrer={cleanRef(params.ref)} />
}
