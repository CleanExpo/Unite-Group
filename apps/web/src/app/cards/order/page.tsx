import type { Metadata } from 'next'

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
  return <OrderView edition={resolveEdition(params.edition)?.name ?? null} referrer={cleanRef(params.ref)} />
}
