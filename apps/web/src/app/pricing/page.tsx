import type { Metadata } from 'next'

import s from '@/components/public/public.module.css'
import { PublicPageShell } from '@/components/public/public-page-shell'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteNav } from '@/components/public/site-nav'
import { formatAud, serializeJsonLd } from '@/app/grow/packages'
import { pricingPageJsonLd } from '@/lib/pricing-jsonld'
import { cardFromAud, PLUS_GST, SIGNATURE_ADDON, STARTER_PLAN } from '@/lib/public-pricing'
import { SITE_URL } from '@/lib/public-site'

export const metadata: Metadata = {
  title: 'Pricing | Starter plan, signatures & living cards | Unite Group',
  description: `Starter plan ${formatAud(STARTER_PLAN.priceAud)} a month and email signatures at ${formatAud(SIGNATURE_ADDON.priceAud)} each, ${PLUS_GST}. Living business cards from ${cardFromAud() ?? 'ask us'}.`,
  alternates: { canonical: `${SITE_URL}/pricing` },
  robots: { index: true, follow: true },
}

export default function PricingPage() {
  const cardFrom = cardFromAud()
  return (
    <PublicPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pricingPageJsonLd()) }} />
      <SiteNav />
      <main id="main" className={s.wrap} data-pricing>
        <nav aria-label="Breadcrumb">
          <ol className={s.crumbs}>
            <li><a href="/">Unite Group</a></li>
            <li aria-current="page">Pricing</li>
          </ol>
        </nav>
        <header className={s.pillarHero}>
          <p className={s.eyebrow}>Pricing</p>
          <h1 className={s.h1}>One plan. Add what you need.</h1>
          <p className={s.lead}>Prices are in Australian dollars. GST is shown on each line.</p>
        </header>

        <section className={s.section} aria-labelledby="plan-title" data-plan="starter">
          <h2 id="plan-title" className={s.h2}>{STARTER_PLAN.name}</h2>
          <p className={s.lead}>
            <strong>{formatAud(STARTER_PLAN.priceAud)}</strong> a {STARTER_PLAN.period}, {PLUS_GST}
          </p>
          <p>{STARTER_PLAN.line}</p>
          <p style={{ marginTop: '1.25rem' }}>
            <a href="/#contact" className={s.buttonPrimary}>
              Ask about Starter
            </a>
          </p>
        </section>

        <section className={s.section} aria-labelledby="addons-title">
          <h2 id="addons-title" className={s.h2}>Add-ons</h2>
          <ul className={s.bullets}>
            <li data-addon="signatures">
              <a href={SIGNATURE_ADDON.href}><strong>{SIGNATURE_ADDON.name}</strong></a>: {formatAud(SIGNATURE_ADDON.priceAud)}{' '}
              {SIGNATURE_ADDON.unit}, {PLUS_GST}. {SIGNATURE_ADDON.line}
            </li>
            <li data-addon="card">
              <a href="/cards"><strong>Living business card</strong></a>
              {cardFrom !== null ? (
                <>
                  : from {formatAud(cardFrom)}, one-off price, GST included. <a href="/cards/order">Order a card</a>
                </>
              ) : (
                <>
                  : online orders are not open yet. <a href="/cards/order">See the card</a>
                </>
              )}
            </li>
          </ul>
        </section>

        <section className={s.section}>
          <p>
            <a href="/#contact" className={s.buttonSecondary}>
              Ask a question
            </a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </PublicPageShell>
  )
}
