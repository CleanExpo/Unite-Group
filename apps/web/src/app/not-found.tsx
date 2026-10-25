import '@/styles/public-tokens.css'

import s from '@/components/public/public.module.css'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteNav } from '@/components/public/site-nav'

// Any address that is not a page on this site. Same shell as the pillar pages: nav, one message, a way back, footer.
export default function NotFound() {
  return (
    <div className={s.page}>
      <SiteNav />
      <main id="main" className={s.wrap}>
        <article className={s.pillarHero}>
          <p className={s.eyebrow}>404</p>
          <h1 className={s.h1}>Page not found</h1>
          <p className={s.lead}>There is no page at this address. It may have moved, or the link may be mistyped.</p>
          <p style={{ marginTop: 24 }}>
            <a href="/" className={s.buttonPrimary}>
              Go to the Unite Group home page
            </a>
          </p>
          <p style={{ marginTop: 16 }}>
            Or <a href="/#contact">ask a question</a> and we will point you to the right place.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
