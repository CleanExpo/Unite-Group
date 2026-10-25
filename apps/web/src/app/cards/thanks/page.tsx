import type { Metadata } from 'next'

import s from '../order/order.module.css'
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
    <div className={s.page}>
      <header className={s.header}>
        <div className={`${s.wrap} ${s.headerRow}`}>
          <span className={s.wordmark}>UNITE GROUP</span>
        </div>
      </header>
      <main className={s.wrap}>
        <p className={s.eyebrow}>LIVING BUSINESS CARD</p>
        <h1 className={s.title}>Thank you</h1>
        {reference ? (
          <>
            <p className={s.lead}>Your payment came through. Tell us what goes on your card and we will take it from here.</p>
            <IntakeForm reference={reference} />
            <p className={s.buyLine}>Order reference: {reference}</p>
          </>
        ) : (
          <p className={s.lead}>
            Your payment came through, but this page did not get your order reference. Please reply to your payment receipt email
            and we will sort it out.
          </p>
        )}
      </main>
    </div>
  )
}
