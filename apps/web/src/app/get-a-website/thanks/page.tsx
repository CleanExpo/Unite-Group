import type { Metadata } from 'next'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import { SiteFooter } from '@/public/site/site-footer'
import { SiteNav } from '@/public/site/site-nav'
import { SectionIntro } from '@/public/section-intro'
import m from '@/public/layout/marketing-page.module.css'

import { BookCall } from '../book-call'
import { BOOKING_URL, THANKS_IMAGE } from '../offer'
import { SlotImage } from '../slot-image'
import s from '../get-a-website.module.css'
import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = noIndexPageMetadata({
  path: '/get-a-website/thanks',
  title: 'Thank you | Unite Group',
  description: 'We have your answers and will contact you about your new website.',
})

export default function GetAWebsiteThanksPage() {
  return (
    <PublicPageShell>
      <SiteNav />

      <main id="main" className={m.main}>
        <section className={m.heroBand}>
          <div className={m.wrap}>
            <div className={THANKS_IMAGE.src ? s.heroSplit : undefined}>
              <div>
                <SectionIntro
                  as="h1"
                  eyebrow="Thank you"
                  title="We have your answers."
                  lead="We will read them and contact you about your new website. Nothing has been charged."
                />
                <div className={s.bookCall}>
                  <h2 className={s.bookTitle}>A call with us</h2>
                  <BookCall bookingUrl={BOOKING_URL} />
                </div>
              </div>
              <SlotImage slot={THANKS_IMAGE} />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
