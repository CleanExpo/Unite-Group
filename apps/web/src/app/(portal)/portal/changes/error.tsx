'use client'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import m from '@/public/layout/marketing-page.module.css'

import u from './portal-ui.module.css'

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PublicPageShell>
      <main id="main" className={m.main}>
        <section className={m.section}>
          <div className={m.wrap}>
            <div className={u.panel} role="alert">
              <h1 className={u.panelTitle}>Something went wrong</h1>
              <p className={u.lede}>This page did not load. Nothing you sent has been lost.</p>
              <div className={`${u.actions} ${u.actionsTop}`}>
                <button type="button" className={u.btn} onClick={reset}>Try again</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  )
}
