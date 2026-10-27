import type { Metadata } from 'next'

import { PublicPageShell } from '@/components/public/public-page-shell'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteNav } from '@/components/public/site-nav'
import { SectionIntro } from '@/components/public/section-intro'
import m from '@/components/public/marketing-page.module.css'
import { formatAud } from '@/app/grow/packages'
import { PLUS_GST, SIGNATURE_ADDON } from '@/lib/public-pricing'
import { CONTACT_EMAIL, SITE_URL } from '@/lib/public-site'

import sig from './signatures-page.module.css'

export const metadata: Metadata = {
  title: 'Email signatures | Unite Group',
  description: `Branded email signatures for your team, ${formatAud(SIGNATURE_ADDON.priceAud)} each (${PLUS_GST}), introduced by Margot.`,
  alternates: { canonical: `${SITE_URL}/signatures` },
  robots: { index: true, follow: true },
}

const STEPS = [
  'Tell us who needs a signature.',
  'We design each one in your brand and send a proof.',
  'You approve it and we install it in your email.',
]

export default function SignaturesPage() {
  return (
    <PublicPageShell>
      <SiteNav />
      <main id="main" className={m.main} data-signatures>
        <section className={m.heroBand}>
          <div className={m.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={m.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li><a href="/pricing">Pricing</a></li>
                <li aria-current="page">Email signatures</li>
              </ol>
            </nav>
            <SectionIntro
              as="h1"
              eyebrow="Add-on"
              title={`Email signatures, ${formatAud(SIGNATURE_ADDON.priceAud)} each`}
              lead={`${SIGNATURE_ADDON.line} Prices are ${PLUS_GST}.`}
            />
            <div className={m.actions}>
              <a href="/#contact" className={m.btnPrimary}>Order signatures</a>
              <a href="/pricing" className={m.btnSecondary}>Back to pricing</a>
            </div>
          </div>
        </section>

        <section className={m.section} aria-labelledby="margot-title">
          <div className={m.wrap}>
            <SectionIntro id="margot-title" title="Meet Margot" lead="Margot is the AI face of Unite Group. She introduces your signatures and answers questions about them." />
            <figure className={sig.sample} data-signature-sample>
              <p><strong>Margot</strong></p>
              <p>AI assistant, Unite Group</p>
              <p>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                {' · '}
                <a href={SITE_URL}>unite-group.in</a>
              </p>
              <figcaption>A sample signature. Yours carries your name, role, logo and links.</figcaption>
            </figure>
          </div>
        </section>

        <section className={m.sectionAlt} aria-labelledby="how-title">
          <div className={m.wrap}>
            <SectionIntro id="how-title" title="How it works" />
            <ol className={sig.steps}>
              {STEPS.map((step, i) => (
                <li key={step}>
                  <span className={sig.stepNo}>{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className={sig.planNote}>
              Signatures are an add-on to the <a href="/pricing">Starter plan</a>.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="signatures-cta">
          <div className={m.wrap}>
            <SectionIntro
              id="signatures-cta"
              title="Ready for consistent signatures?"
              lead="Tell us how many people need one and we will send a proof before anything goes live."
            />
            <div className={m.actions}>
              <a href="/#contact" className={m.btnPrimary}>Start with contact</a>
              <a href="/cards/order" className={m.btnSecondary}>Order a card first</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </PublicPageShell>
  )
}
