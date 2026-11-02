'use client'

import { useEffect } from 'react'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import { captureClientError } from '@/lib/error-reporting'

import s from '@/components/portal/portal.module.css'

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureClientError(error, { errorBoundary: 'portal', level: 'error' })
  }, [error])

  return (
    <PublicPageShell>
      <main className={s.main}>
        <div className={s.wrap}>
          <div className={s.section}>
            <div className={s.panel} role="alert">
              <h1 className={s.h2}>We could not open your portal.</h1>
              <p className={s.panelText}>Please try again in a minute. Nothing was changed.</p>
              <div className={s.actions}>
                <button type="button" className={s.ctaPrimary} onClick={reset}>Try again</button>
                <a href="/#contact" className={s.ctaSecondary}>Contact us</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </PublicPageShell>
  )
}
