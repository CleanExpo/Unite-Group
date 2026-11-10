import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { after } from 'next/server'

import { canEmailCardOwner } from '@/lib/card/enquiry-alert'
import { getCard } from '@/lib/card/any-card'
import { classifyUserAgent } from '@/lib/card/review-link'
import { getCardReviewLink, logReviewEvent } from '@/lib/card/review-store'
import { isSampleSlug, SAMPLE_CARD } from '@/lib/card/sample'
import { noIndexPageMetadata, publicPageMetadata } from '@/lib/page-metadata'

import { CardView } from './card-view'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // the sample is an example for buyers: never indexed, no canonical URL
  if (isSampleSlug(slug)) {
    return noIndexPageMetadata({
      title: 'Sample card',
      description: 'Demonstration living business card.',
      canonical: null,
    })
  }
  const card = await getCard(slug)
  if (!card) {
    return noIndexPageMetadata({
      title: 'Card not found',
      description: 'This card is not available.',
      path: `/c/${slug}`,
      canonical: null,
    })
  }
  // A staff card's words are changed by a customer's link, with no review, so it never joins the site's search presence.
  if (card.staff) {
    const title = [card.displayName, card.businessName].filter(Boolean).join(' | ')
    return noIndexPageMetadata({
      title,
      description: [card.roleTitle, card.serviceArea].filter(Boolean).join(' · ') || `${card.displayName}'s business card`,
      path: `/c/${card.slug}`,
    })
  }
  const title = [card.displayName, card.businessName].filter(Boolean).join(' | ')
  return publicPageMetadata({
    title,
    description: [card.roleTitle, card.serviceArea].filter(Boolean).join(' · ') || `${card.displayName}'s business card`,
    path: `/c/${card.slug}`,
    robots: { index: true, follow: true },
  })
}

export default async function OwnerCardPage({ params, searchParams }: Props) {
  const { slug } = await params
  // enquiries stay closed on the sample: there is no owner to receive them
  if (isSampleSlug(slug)) return <CardView card={SAMPLE_CARD} sample />
  const card = await getCard(slug)
  if (!card) notFound()
  // Staff cards take no enquiries and no review button: card_enquiries and the review link are keyed on card_owners, which a staff card is not in.
  // Return before the review read so a staff card never depends on it.
  if (card.staff) return <CardView card={card} />
  // the review link is a separate read: a failure there hides the button but never takes the card down
  const review = await getCardReviewLink(slug)
  const reviewOpen = review.state === 'ready'
  const highlightReview = reviewOpen && (await searchParams).r === '1'
  if (reviewOpen) {
    const ua = classifyUserAgent((await headers()).get('user-agent'))
    if (ua !== 'bot') {
      // counted after the response is sent, so the card never waits on it
      after(async () => {
        await logReviewEvent({ slug, kind: 'button_view', uaClass: ua })
        if (highlightReview) await logReviewEvent({ slug, kind: 'qr_review_open', uaClass: ua })
      })
    }
  }
  return (
    <CardView
      card={card}
      enquiryOpen={process.env.CARD_ENQUIRY_RECEIPT_ENABLED === '1'}
      ownerAlerts={canEmailCardOwner(card.email)}
      reviewOpen={reviewOpen}
      highlightReview={highlightReview}
    />
  )
}
