'use client'

import '@/styles/public-tokens.css'

import s from '../[token]/proposal.module.css'

export default function ProposalReturnError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={s.page}>
      <main className={s.main}>
        <section className={s.notice}>
          <h1 className={s.title}>Please try again soon</h1>
          <p className={s.lead}>We could not check your payment just now. You do not need to pay again.</p>
          <button className={s.textButton} type="button" onClick={reset}>Try again</button>
        </section>
      </main>
    </div>
  )
}
