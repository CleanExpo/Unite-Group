import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { canEmailCardOwner } from '@/lib/card/enquiry-alert'
import { getCard } from '@/lib/card/any-card'
import { isSampleSlug, SAMPLE_CARD } from '@/lib/card/sample'

import { CardView } from './card-view'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // the sample is an example for buyers: never indexed, never canonical
  if (isSampleSlug(slug)) return { title: 'Sample card', robots: { index: false, follow: false } }
  const card = await getCard(slug)
  if (!card) return { title: 'Card not found', robots: { index: false, follow: false } }
  // A staff card's words are changed by a customer's link, with no review, so it never joins the site's search presence.
  if (card.staff) return { title: [card.displayName, card.businessName].filter(Boolean).join(' | '), robots: { index: false, follow: false } }
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
  const card = await getCard(slug)
  if (!card) notFound()
  // Staff cards take no enquiries: card_enquiries is keyed on card_owners, which a staff card is not in.
  if (card.staff) return <CardView card={card} />
  return (
    <CardView card={card} enquiryOpen={process.env.CARD_ENQUIRY_RECEIPT_ENABLED === '1'} ownerAlerts={canEmailCardOwner(card.email)} />
  )
}
