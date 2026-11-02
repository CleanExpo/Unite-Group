import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { after } from 'next/server'

import { canEmailCardOwner } from '@/lib/card/enquiry-alert'
import { getPublishedCard } from '@/lib/card/published'
import { classifyUserAgent } from '@/lib/card/review-link'
import { getCardReviewLink, logReviewEvent } from '@/lib/card/review-store'
import { isSampleSlug, SAMPLE_CARD } from '@/lib/card/sample'

import { CardView } from './card-view'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

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

export default async function OwnerCardPage({ params, searchParams }: Props) {
  const { slug } = await params
  // enquiries stay closed on the sample: there is no owner to receive them
  if (isSampleSlug(slug)) return <CardView card={SAMPLE_CARD} sample />
  // the review link is a separate read: a failure there hides the button but never takes the card down
  const [card, review] = await Promise.all([getPublishedCard(slug), getCardReviewLink(slug)])
  if (!card) notFound()
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
