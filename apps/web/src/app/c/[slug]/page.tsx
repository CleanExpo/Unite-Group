import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPublishedCard } from '@/lib/card/published'

import { CardView } from './card-view'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
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
  const card = await getPublishedCard(slug)
  if (!card) notFound()
  return <CardView card={card} />
}
