import type { Metadata } from 'next'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import { SiteFooter } from '@/public/site/site-footer'
import { SiteNav } from '@/public/site/site-nav'
import { SectionIntro } from '@/public/section-intro'
import m from '@/public/layout/marketing-page.module.css'
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
      <main id="main" className={m.main} data-pricing>
        <section className={m.heroBand}>
          <div className={m.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={m.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li aria-current="page">Pricing</li>
              </ol>
            </nav>
            <SectionIntro
              as="h1"
              eyebrow="Pricing"
              title="One plan. Add what you need."
              lead="Australian dollars on every line. GST is called out so nothing is hidden."
            />
          </div>
        </section>

        <section className={m.section} aria-labelledby="plan-title" data-plan="starter">
          <div className={m.wrap}>
            <div className={m.planGrid}>
              <article className={`${m.planCard} ${m.planCardFeatured}`}>
                <h2 id="plan-title" className={m.planPrice}>{STARTER_PLAN.name}</h2>
                <p className={m.planMeta}>
                  <strong>{formatAud(STARTER_PLAN.priceAud)}</strong> a {STARTER_PLAN.period}, {PLUS_GST}
                </p>
                <p className={m.planBody}>{STARTER_PLAN.line}</p>
                <div className={m.actions}>
                  <a href="/#contact" className={m.btnPrimary}>Ask about Starter</a>
                </div>
              </article>

              <div>
                <SectionIntro title="Add-ons" lead="Stack a living card or signatures when you are ready." />
                <ul className={m.addonList}>
                  <li className={m.addonItem} data-addon="signatures">
                    <a href={SIGNATURE_ADDON.href}>{SIGNATURE_ADDON.name}</a>
                    {' — '}
                    {formatAud(SIGNATURE_ADDON.priceAud)} {SIGNATURE_ADDON.unit}, {PLUS_GST}. {SIGNATURE_ADDON.line}
                  </li>
                  <li className={m.addonItem} data-addon="card">
                    <a href="/cards">Living business card</a>
                    {cardFrom !== null ? (
                      <>
                        {' — from '}
                        {formatAud(cardFrom)}, one-off, GST included.{' '}
                        <a href="/cards/order">Order a card</a>
                      </>
                    ) : (
                      <>
                        {' — online orders are not open yet. '}
                        <a href="/cards/order">See the card</a>
                      </>
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className={m.sectionAlt}>
          <div className={m.wrap}>
            <SectionIntro
              title="Not sure yet?"
              lead="Tell us what you are trying to fix — we reply by email, no funnel."
            />
            <div className={m.actions}>
              <a href="/#contact" className={m.btnSecondary}>Ask a question</a>
              <a href="/cards" className={m.btnSecondary}>Open the showroom</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </PublicPageShell>
  )
}
