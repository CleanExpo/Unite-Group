import { redirect } from 'next/navigation'
import { noIndexPageMetadata } from '@/lib/page-metadata'


import { GOOGLE_LOCAL_RANKING_HELP_URL } from '@/lib/card/review-link'
import { loadOwnerCards, type OwnerCardsResult, type OwnerClient } from '@/lib/card/review-owner'
import { createClient, getUser } from '@/lib/supabase/server'

import { ReviewCardPanel } from './review-card-panel'
import styles from './card-reviews.module.css'

export const dynamic = 'force-dynamic'

/** Owner tool: put a Google review button on your card, and ask a customer for a review from your own phone or email. */
export const metadata = noIndexPageMetadata({
  path: "/founder/card-reviews",
  title: "Card Reviews | Unite Group",
  description: "Private founder workspace: Card Reviews.",
})
export default async function CardReviewsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  let result: OwnerCardsResult
  try {
    result = await loadOwnerCards((await createClient()) as unknown as OwnerClient, user.id)
  } catch {
    result = { status: 'error', message: 'could not read your cards' }
  }
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Google reviews from your card</h1>
      <p className={styles.why}>
        You already did the good work. You shouldn&apos;t lose the next job to whoever has more Google reviews.
      </p>
      <p className={styles.lead}>
        Most customers who mean to leave a review forget, or can&apos;t find where. Your card makes asking take one tap, at
        the end of the job: a &ldquo;Leave us a Google review&rdquo; button on your card, and a ready-to-send message you
        send from your own phone or email.
      </p>
      <p className={styles.note}>
        Reviews are one of the things Google lists for local ranking (
        <a href={GOOGLE_LOCAL_RANKING_HELP_URL} target="_blank" rel="noreferrer">Google Business Profile Help</a>
        ). This makes it easy to ask for reviews. It can&apos;t promise how many you get, or where you rank.
      </p>
      {result.status === 'error' ? (
        <p role="alert" className={styles.error}>Not available: {result.message}.</p>
      ) : result.cards.length === 0 ? (
        <p className={styles.note}>You don&apos;t own a card yet.</p>
      ) : (
        result.cards.map((card) => <ReviewCardPanel key={card.slug} card={card} />)
      )}
    </main>
  )
}
