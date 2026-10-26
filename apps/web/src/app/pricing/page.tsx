import type { Metadata } from 'next'

import '@/styles/public-tokens.css'

import s from '@/components/public/public.module.css'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteNav } from '@/components/public/site-nav'
import { formatAud } from '@/app/grow/packages'
import { cardFromAud, SIGNATURE_ADDON, STARTER_PLAN } from '@/lib/public-pricing'
import { SITE_URL } from '@/lib/public-site'

export const metadata: Metadata = {
  title: 'Pricing | Unite Group',
  description: `Starter plan ${formatAud(STARTER_PLAN.priceAud)} a month. Add email signatures at ${formatAud(SIGNATURE_ADDON.priceAud)} each and order a living business card.`,
  alternates: { canonical: `${SITE_URL}/pricing` },
  robots: { index: true, follow: true },
}

export default function PricingPage() {
  const cardFrom = cardFromAud()
  return (
    <div className={s.page}>
      <SiteNav />
      <main id="main" className={s.wrap} data-pricing>
        <nav aria-label="Breadcrumb">
          <ol className={s.crumbs}>
            <li><a href="/">Unite Group</a></li>
            <li aria-current="page">Pricing</li>
          </ol>
        </nav>
        <p className={s.eyebrow}>Pricing</p>
        <h1 className={s.h1}>One plan. Add what you need.</h1>
        <p className={s.lead}>Prices are in Australian dollars.</p>

        <section aria-labelledby="plan-title" data-plan="starter">
          <h2 id="plan-title" className={s.h2}>{STARTER_PLAN.name}</h2>
          <p><strong>{formatAud(STARTER_PLAN.priceAud)}</strong> a {STARTER_PLAN.period}</p>
          <p>{STARTER_PLAN.line}</p>
          <a href="/#contact" className={s.buttonPrimary}>Start with Starter</a>
        </section>

        <section aria-labelledby="addons-title">
          <h2 id="addons-title" className={s.h2}>Add-ons</h2>
          <ul className={s.bullets}>
            <li data-addon="signatures">
              <a href={SIGNATURE_ADDON.href}><strong>{SIGNATURE_ADDON.name}</strong></a>: {formatAud(SIGNATURE_ADDON.priceAud)} {SIGNATURE_ADDON.unit}. {SIGNATURE_ADDON.line}
            </li>
            <li data-addon="card">
              <a href="/cards"><strong>Living business card</strong></a>
              {cardFrom !== null ? (
                <>: from {formatAud(cardFrom)}, one-off price, GST included. <a href="/cards/order">Order a card</a></>
              ) : (
                <>: online orders are not open yet. <a href="/cards/order">See the card</a></>
              )}
            </li>
          </ul>
        </section>

        <p><a href="/#contact">Ask a question</a></p>
      </main>
      <SiteFooter />
    </div>
  )
}
