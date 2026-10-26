import type { Metadata } from 'next'

import '@/styles/public-tokens.css'

import s from '@/components/public/public.module.css'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteNav } from '@/components/public/site-nav'
import { formatAud } from '@/app/grow/packages'
import { PLUS_GST, SIGNATURE_ADDON } from '@/lib/public-pricing'
import { CONTACT_EMAIL, SITE_URL } from '@/lib/public-site'

export const metadata: Metadata = {
  title: 'Email signatures | Unite Group',
  description: `Branded email signatures for your team, ${formatAud(SIGNATURE_ADDON.priceAud)} each (${PLUS_GST}), introduced by Margot.`,
  alternates: { canonical: `${SITE_URL}/signatures` },
  robots: { index: true, follow: true },
}

export default function SignaturesPage() {
  return (
    <div className={s.page}>
      <SiteNav />
      <main id="main" className={s.wrap} data-signatures>
        <nav aria-label="Breadcrumb">
          <ol className={s.crumbs}>
            <li><a href="/">Unite Group</a></li>
            <li><a href="/pricing">Pricing</a></li>
            <li aria-current="page">Email signatures</li>
          </ol>
        </nav>
        <p className={s.eyebrow}>Add-on</p>
        <h1 className={s.h1}>Email signatures, {formatAud(SIGNATURE_ADDON.priceAud)} each</h1>
        <p className={s.lead}>{SIGNATURE_ADDON.line} Prices are {PLUS_GST}.</p>

        <section aria-labelledby="margot-title">
          <h2 id="margot-title" className={s.h2}>Meet Margot</h2>
          <p>Margot is the AI face of Unite Group. She introduces your signatures and answers questions about them.</p>
          <figure data-signature-sample style={{ border: '1px solid currentColor', padding: '16px', borderRadius: '8px', maxWidth: '420px' }}>
            <p style={{ margin: 0 }}><strong>Margot</strong></p>
            <p style={{ margin: 0 }}>AI assistant, Unite Group</p>
            <p style={{ margin: 0 }}><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · <a href={SITE_URL}>unite-group.in</a></p>
            <figcaption style={{ fontSize: '12px', marginTop: '8px' }}>A sample signature. Yours carries your name, role, logo and links.</figcaption>
          </figure>
        </section>

        <section aria-labelledby="how-title">
          <h2 id="how-title" className={s.h2}>How it works</h2>
          <ol className={s.bullets}>
            <li>Tell us who needs a signature.</li>
            <li>We design each one in your brand and send a proof.</li>
            <li>You approve it and we install it in your email.</li>
          </ol>
        </section>

        <p>
          <a href="/#contact" className={s.buttonPrimary}>Order signatures</a>
        </p>
        <p>Signatures are an add-on to the <a href="/pricing">Starter plan</a>.</p>
      </main>
      <SiteFooter />
    </div>
  )
}
