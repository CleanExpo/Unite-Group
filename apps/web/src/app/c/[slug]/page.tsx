import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPublishedCard } from '@/lib/card/published'
import { isSampleSlug, SAMPLE_CARD } from '@/lib/card/sample'

import { CardView } from './card-view'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // the sample is an example for buyers: never indexed, never canonical
  if (isSampleSlug(slug)) return { title: 'Sample card', robots: { index: false, follow: false } }
  const card = await getPublishedCard(slug)
  if (!card) return { title: 'Card not found', robots: { index: false, follow: false } }
  const title = [card.displayName, card.businessName].filter(Boolean).join(' | ')
  return {
    title,
    description: [card.roleTitle, card.serviceArea].filter(Boolean).join(' · ') || `${card.displayName}'s business card`,
    alternates: { canonical: `https://unite-group.in/c/${card.slug}` },
    robots: { index: true, follow: true },
  }
}

export default async function OwnerCardPage({ params }: Props) {
  const { slug } = await params
  // enquiries stay closed on the sample: there is no owner to receive them
  if (isSampleSlug(slug)) return <CardView card={SAMPLE_CARD} sample />
  const card = await getPublishedCard(slug)
  if (!card) notFound()
  return <CardView card={card} enquiryOpen={process.env.CARD_ENQUIRY_RECEIPT_ENABLED === '1'} />
}
