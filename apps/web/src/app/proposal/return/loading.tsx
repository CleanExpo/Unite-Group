import '@/styles/public-tokens.css'

import s from '../[token]/proposal.module.css'

export default function Loading() {
  return (
    <div className={s.page}>
      <main className={s.main}>
        <p className={s.lead} role="status">Checking your payment</p>
      </main>
    </div>
  )
}
