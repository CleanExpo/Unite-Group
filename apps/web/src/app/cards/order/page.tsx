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
  // An explicit ?edition= wins. Otherwise start on the film past clients approved most
  // (design-lessons loop, UNI-3017); null keeps the old default when the loop is dormant.
  const edition = resolveEdition(params.edition)?.name ?? (await loadPreferredEdition())
  return <OrderView edition={edition} referrer={cleanRef(params.ref)} />
}
