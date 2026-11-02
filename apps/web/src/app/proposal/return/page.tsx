import type { Metadata } from 'next'

import '@/styles/public-tokens.css'

import { checkoutSessionId } from '@/app/cards/thanks/session-id'
import { returnStateFor, type ReturnState } from '@/lib/proposals/return-state'
import { createServiceClient, hasSupabaseServiceConfig } from '@/lib/supabase/service'

import s from '../[token]/proposal.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your proposal | Unite Group',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const COPY: Record<ReturnState, { title: string; body: string }> = {
  cancelled: {
    title: 'You have not been charged',
    body: 'You left the payment page before paying. Open the proposal link we sent you whenever you are ready.',
  },
  confirmed: {
    title: 'Thank you, you are all set',
    body: 'Your payment is confirmed. We will be in touch about the next steps.',
  },
  confirming: {
    title: 'We are confirming your payment',
    body: 'We are waiting for Stripe to confirm it. This usually takes a moment, so please refresh this page shortly. You do not need to pay again.',
  },
  unavailable: {
    title: 'Please try again soon',
    body: 'We could not check your payment just now. Please refresh this page in a few minutes. You do not need to pay again.',
  },
}

type SearchParams = Record<string, string | string[] | undefined>

async function load(sessionId: string | null): Promise<ReturnState> {
  if (!sessionId) return 'cancelled'
  if (!hasSupabaseServiceConfig()) return 'unavailable'
  try {
    return await returnStateFor(createServiceClient(), sessionId)
  } catch (err) {
    console.error('[proposals] return page failed:', err instanceof Error ? err.message : err)
    return 'unavailable'
  }
}

/** Where Stripe sends a client after Checkout. Its URL holds a session id at most, never the proposal's link token. */
export default async function ProposalReturnPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const copy = COPY[await load(checkoutSessionId(await searchParams))]
  return (
    <div className={s.page}>
      <header className={s.header}>
        <span className={s.wordmark}>UNITE GROUP</span>
      </header>
      <main className={s.main}>
        <section className={s.notice}>
          <h1 className={s.title}>{copy.title}</h1>
          <p className={s.lead}>{copy.body}</p>
        </section>
      </main>
    </div>
  )
}
