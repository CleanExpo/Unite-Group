import type { Metadata } from 'next'

import '@/styles/public-tokens.css'

import s from '../order/order.module.css'
import m from './manage.module.css'
import { ManageView } from './manage-view'

export const metadata: Metadata = {
  title: 'Manage your card | Unite Group',
  description: 'Change the details on your living card.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

/** The page holds nothing itself: the client reads the token from the link's fragment and posts it to /api/cards/manage. */
export default function CardManagePage() {
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={`${s.wrap} ${s.headerRow}`}>
          <span className={s.wordmark}>UNITE GROUP</span>
        </div>
      </header>
      <main className={`${s.wrap} ${m.main}`}>
        <p className={s.eyebrow}>LIVING BUSINESS CARD</p>
        <ManageView />
      </main>
    </div>
  )
}
