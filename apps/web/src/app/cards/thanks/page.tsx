import type { Metadata } from 'next'

import '@/styles/public-tokens.css'

import s from '../order/order.module.css'
import r from './thanks.module.css'
import { CardLoop } from './card-loop'
import { IntakeForm } from './intake-form'
import { checkoutSessionId } from './session-id'

export const metadata: Metadata = {
  title: 'Thank you | Unite Group',
  description: 'Send the details for your living business card.',
  robots: { index: false, follow: false },
}

type SearchParams = Record<string, string | string[] | undefined>

/**
 * Where the payment links send a buyer after paying (see docs/card-payment-links.md). Stripe puts the
 * checkout session id in the URL; the form posts it with the details so they land on the right order.
 */
export default async function CardThanksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const reference = checkoutSessionId(await searchParams)
  return (
    <div className={`${s.page} ${r.page}`}>
      <header className={s.header}>
        <div className={`${s.wrap} ${s.headerRow}`}>
          <span className={s.wordmark}>UNITE GROUP</span>
        </div>
      </header>
      <main className={`${s.wrap} ${r.layout}`}>
        <section className={r.receipt}>
          <div className={r.check} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className={s.eyebrow}>LIVING BUSINESS CARD</p>
          <h1 className={s.title}>Thank you</h1>
          {reference ? (
            <>
              <p className={s.lead}>Your payment came through. Tell us what goes on your card and we will take it from here.</p>
              <p className={`${s.buyLine} ${r.reference}`}>Order reference: {reference}</p>
              <div className={r.panel}>
                <IntakeForm reference={reference} />
              </div>
            </>
          ) : (
            <p className={s.lead}>
              Your payment came through, but this page did not get your order reference. Please reply to your payment receipt email
              and we will sort it out.
            </p>
          )}
        </section>
        <aside className={r.stage} aria-hidden="true">
          <div className={r.card}>
            <CardLoop className={r.video} />
            <span className={r.sheen} />
          </div>
        </aside>
      </main>
    </div>
  )
}
