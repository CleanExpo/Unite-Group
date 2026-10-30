import { MargotPhoneLine } from '@/public/site/margot-phone-line'
import { PublicPageShell } from '@/public/layout/public-page-shell'
import { SectionIntro } from '@/public/section-intro'
import { SiteFooter } from '@/public/site/site-footer'
import { SiteNav } from '@/public/site/site-nav'
import m from '@/public/layout/marketing-page.module.css'
import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'
import { readMargotPhoneNumber } from '@/lib/margot/phone-line'

import { formatAud, stripePaymentLink } from '../../grow/packages'
import { EDITIONS } from '../editions'
import { PAYMENT_ENTITY_LINE } from '../payment-entity'
import { CardEnquiryForm } from './enquiry-form'
import { ExtraBusiness } from './extra-business'
import { Film } from './film'
import { BuyFilm, StickyBar } from './order-buy'
import s from './order.module.css'

/**
 * The two card tiers (Phill, 23/10/2026). Prices are AUD, one-off, GST included.
 * A tier is shown, with its price, only while its own Stripe Payment Link is set.
 */
export const CARD_TIERS = [
  {
    id: 'ready',
    name: 'Ready-made',
    priceAud: 249,
    line: 'Pick one of the ten card films below. It ends on your logo and details.',
    paymentLinkEnv: 'STRIPE_PAYMENT_LINK_CARD_READY',
  },
  {
    id: 'custom',
    name: 'Made for you',
    priceAud: 449,
    line: 'We make a film for your business. You approve a private proof before it goes live.',
    paymentLinkEnv: 'STRIPE_PAYMENT_LINK_CARD_CUSTOM',
  },
] as const

/**
 * The extra-business add-on (Phill, 25/10/2026): AUD 199 each, GST included, up to five, on the
 * Made for you card only. Kept out of CARD_TIERS: it is not a card on its own. Shown only while its
 * own Stripe Payment Link is set; that link is a separate payment with an adjustable quantity.
 */
export const CARD_EXTRA_BUSINESS = {
  id: 'extra_business',
  name: 'Extra business',
  priceAud: 199,
  maxQuantity: 5,
  forTier: 'custom',
  paymentLinkEnv: 'STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS',
} as const

/**
 * The rendered order page for already-resolved params. Exported so tests render it without a request.
 * Layout follows the locked Wave gold standard (evidence/business-card-gold/gold/recipe.md).
 */
export function OrderView({ edition, referrer }: { edition: string | null; referrer: string | null }) {
  const tiers = CARD_TIERS.flatMap((t) => {
    const link = stripePaymentLink(process.env[t.paymentLinkEnv])
    return link ? [{ ...t, link }] : []
  })
  const extraLink = stripePaymentLink(process.env[CARD_EXTRA_BUSINESS.paymentLinkEnv])
  const payLink = tiers.length > 0
  const fromPrice = payLink ? formatAud(Math.min(...tiers.map((t) => t.priceAud))) : null
  const signature = EDITIONS[0]

  const facts = payLink
    ? [
        ...tiers.map((t) => ({ value: formatAud(t.priceAud), label: t.name })),
        { value: 'Private proof', label: 'before anything goes live' },
        { value: 'One-off', label: 'GST included, no subscription' },
      ]
    : [
        { value: 'Nine films', label: 'to choose from' },
        { value: 'Your logo', label: 'at the end of every film' },
        { value: 'Private proof', label: 'before anything goes live' },
        { value: 'Nothing charged', label: 'on this page' },
      ]

  return (
    <PublicPageShell>
      <SiteNav />

      <main id="main" className={m.main}>
        <section className={m.heroBand} aria-labelledby="order-title">
          <div className={m.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={m.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li><a href="/cards">Living cards</a></li>
                <li aria-current="page">Order</li>
              </ol>
            </nav>
            <div className={s.heroGrid}>
              <div>
                <SectionIntro
                  as="h1"
                  id="order-title"
                  eyebrow="Living business card"
                  title="Get your own living card"
                  lead="A short film that ends on your logo and contact details. Pick one of our ten, or have one made for your business."
                />
                <div className={m.actions}>
                  <a href="#choose" data-track="cta" data-track-label="order-hero-choose" className={m.btnPrimary}>
                    Choose your film
                  </a>
                  <a href="/cards" className={m.btnSecondary}>See all editions</a>
                </div>
              </div>
              <div className={s.heroFilm}>
                <Film edition={signature} />
              </div>
            </div>
          </div>
        </section>

        <section id="choose" className={`${m.sectionAlt} ${s.buy}`} aria-label="Choose your card">
          <div className={`${m.wrap} ${s.buyGrid}`}>
            <BuyFilm edition={edition} />

            <div className={s.buyBox} data-buy-box>
              <h2 className={s.productName}>Living business card</h2>
              <p className={s.buyLine}>
                Every film ends on your logo and details. You approve a private proof before anything goes live.
              </p>

              {payLink ? (
                <div data-state="orders-online">
                  <p className={s.chosen}>One-off price, GST included. No subscription. Pay securely with Stripe.</p>
                  <div className={s.tiers}>
                    {tiers.map((t) => (
                      <article key={t.id} data-tier={t.id} className={s.tier}>
                        <h3 className={s.tierName}>{t.name}</h3>
                        <p className={s.price}>
                          {formatAud(t.priceAud)}
                          <span className={s.priceNote}>AUD</span>
                        </p>
                        <p className={s.tierLine}>{t.line}</p>
                        <a
                          href={t.link}
                          rel="noopener"
                          data-track="cta"
                          data-track-label={`order-tier-${t.id}`}
                          className={`${s.primary} ${s.block}`}
                        >
                          Order {t.name.toLowerCase()}
                        </a>
                        <p className={s.payEntity}>{PAYMENT_ENTITY_LINE}</p>
                        {extraLink && t.id === CARD_EXTRA_BUSINESS.forTier ? (
                          <ExtraBusiness
                            link={extraLink}
                            priceAud={CARD_EXTRA_BUSINESS.priceAud}
                            maxQuantity={CARD_EXTRA_BUSINESS.maxQuantity}
                          />
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div data-state="orders-offline" className={s.offline}>
                  <p className={s.offlineTag}>NOT ONLINE YET</p>
                  <p className={s.offlineTitle}>We&rsquo;re not taking orders online yet.</p>
                  <p className={s.offlineBody}>
                    Send us your details below and we will contact you to build your card. You approve a private proof before
                    anything goes live, and nothing is charged on this page.
                  </p>
                  <a href="#enquire" data-track="cta" data-track-label="order-send-details" className={`${s.primary} ${s.block}`}>
                    Send my details
                  </a>
                </div>
              )}

              <p className={s.chosen}>
                {payLink ? 'By paying you agree to our order terms.' : 'Our order terms apply when we build your card.'}{' '}
                <a href="/cards/terms" className={s.navLink}>
                  Order terms
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className={m.sectionTight} aria-label="At a glance">
          <dl className={`${m.wrap} ${s.facts}`}>
            {facts.map((f) => (
              <div key={f.value} className={s.fact}>
                <dt className={s.factValue}>{f.value}</dt>
                <dd className={s.factLabel}>{f.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={m.sectionAlt}>
          <div className={`${m.wrap} ${s.statement}`}>
            <p className={s.statementTag}>Every edition</p>
            <h2 className={s.statementTitle}>It ends on your logo.</h2>
            <p className={s.statementBody}>
              The films on this page finish on the cracked U. Yours finishes on your own logo and contact details, not ours.
            </p>
          </div>
        </section>

        <section id="enquire" className={m.section}>
          <div className={m.wrap}>
            <SectionIntro
              title={payLink ? 'Talk to us first' : 'Send us your details'}
              lead={
                payLink
                  ? 'Send your details and we’ll call you before you order.'
                  : 'We will contact you to build your card. Nothing is charged on this page.'
              }
            />
            <div className={s.enquireForm}>
              <CardEnquiryForm referrer={referrer} />
            </div>
            <p className={s.legalLine}>
              {COMPANY_NAME} · {companyAbnLabel()} · <MargotPhoneLine number={readMargotPhoneNumber()} />
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyBar price={fromPrice} />
    </PublicPageShell>
  )
}
