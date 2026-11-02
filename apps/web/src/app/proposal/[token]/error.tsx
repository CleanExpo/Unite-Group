'use client'

import '@/styles/public-tokens.css'

import s from './proposal.module.css'

export default function ProposalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={s.page}>
      <main className={s.main}>
        <section className={s.notice}>
          <h1 className={s.title}>Please try again soon</h1>
          <p className={s.lead}>We could not show this proposal just now. Your link is still good.</p>
          <button className={s.textButton} type="button" onClick={reset}>Try again</button>
        </section>
      </main>
    </div>
  )
}
