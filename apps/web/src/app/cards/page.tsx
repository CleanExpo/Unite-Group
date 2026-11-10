import type { Metadata } from 'next'
import {
  BadgeCheck,
  Film,
  MessagesSquare,
  Palette,
  QrCode,
  Sparkles,
} from 'lucide-react'

import { SiteFooter } from '@/public/site/site-footer'
import { PublicPageShell } from '@/public/layout/public-page-shell'
import { CONTACT_MAILTO, SiteNav } from '@/public/site/site-nav'
import { cardsPageGraphJsonLd, cardsShowroomJsonLd } from '@/lib/cards-jsonld'
import { liveCardTiers } from '@/lib/public-pricing'
import { publicPageMetadata } from '@/lib/page-metadata'

import { formatAud, serializeJsonLd, stripePaymentLink } from '@/app/grow/packages'

import { SectionIntro } from '@/public/section-intro'
import m from '@/public/layout/marketing-page.module.css'

import { EditionTile } from './edition-tile'
import { EDITIONS } from './editions'
import { CARD_TIERS } from './order/order-view'
import { PAYMENT_ENTITY_LINE } from './payment-entity'
import p from './showroom-page.module.css'
import s from './showroom.module.css'
import { EXCLUSION_FACTS, FAQ_FACTS, HOSTING_FACTS, PRICE_NOTE, TIER_LINES } from './showroom-facts'

export const metadata: Metadata = publicPageMetadata({
  path: '/cards',
  title: 'Living business cards Australia | Video card with QR | Unite Group',
  description:
    'Order a living business card that opens on a short film and ends on your logo. Nine editions, QR and vCard for Australian businesses. From $249 GST included.',
  openGraphTitle: 'Living business cards | Unite Group',
  openGraphDescription: 'A business card that opens like a film and ends on your logo.',
})

const STEPS = [
  {
    icon: Sparkles,
    title: 'Pick an opener',
    body: 'Choose the edition you like. Yours ends on your own logo, not ours.',
  },
  {
    icon: Palette,
    title: 'Send your details',
    body: 'Your logo, colours, contact details and the businesses you want linked.',
  },
  {
    icon: BadgeCheck,
    title: 'Approve a proof',
    body: 'We build your card and send you a private link to check before anything goes live.',
  },
] as const

const HERO_FACTS = [
  {
    icon: Film,
    title: 'Short film opener',
    line: 'A four-second clip loops in the tile, then your card opens the full story.',
  },
  {
    icon: QrCode,
    title: 'QR and one link',
    line: 'Print the QR or share the link — same card on phone and desktop.',
  },
  {
    icon: MessagesSquare,
    title: 'Save to contacts',
    line: 'One tap to vCard so people keep your details without retyping.',
  },
] as const

export default function CardsShowroomPage() {
  const [signature, ...editions] = EDITIONS
  const live = liveCardTiers()
  const liveTierIds = new Set(live.map((t) => t.id))
  const productLd = cardsShowroomJsonLd()
  // One-click buy (UNI-3049): the Starter pack Payment Link straight from the hero. Same env var and validator as the
  // order page, so an unset or non-Stripe value shows no button and /cards/order stays the way in.
  const ready = CARD_TIERS.find((t) => t.id === 'ready')
  const buyLink = ready ? stripePaymentLink(process.env[ready.paymentLinkEnv]) : null
  return (
    <PublicPageShell>
      {productLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productLd) }} />
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(cardsPageGraphJsonLd()) }} />
      <SiteNav />

      <main id="main" className={m.main}>
        <section className={m.heroBand} aria-labelledby="cards-title">
          <div className={m.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={m.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li aria-current="page">Living cards</li>
              </ol>
            </nav>
            <div className={p.heroGrid}>
              <div className={p.heroCopy}>
                <SectionIntro
                  as="h1"
                  id="cards-title"
                  eyebrow="Living business cards"
                  title="A business card that opens like a film and ends on your logo."
                  lead="One link or QR code. A short opener, your details, one-tap save to contacts, and links to your businesses."
                />
                <ul className={p.heroFacts} aria-label="What you get">
                  {HERO_FACTS.map((fact) => {
                    const Icon = fact.icon
                    return (
                      <li key={fact.title} className={p.heroFact}>
                        <span className={p.heroFactIcon} aria-hidden="true">
                          <Icon strokeWidth={1.75} size={22} />
                        </span>
                        <span className={p.heroFactText}>
                          <strong className={p.heroFactTitle}>{fact.title}</strong>
                          <span className={p.heroFactLine}>{fact.line}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {ready && buyLink ? (
                  <div className={p.buyNow} data-buy-now={ready.id}>
                    <a href={buyLink} rel="noopener" data-track="cta" data-track-label="cards-hero-buy-ready" className={m.btnPrimary}>
                      {`Buy ${ready.name}, A${formatAud(ready.priceAud)}`}
                    </a>
                    <p className={p.buyNote}>One-off price, GST included.</p>
                    <p className={p.buyNote}>{PAYMENT_ENTITY_LINE}</p>
                  </div>
                ) : null}
                <div className={m.actions}>
                  <a href="/cards/order" data-track="cta" data-track-label="cards-hero-get-card" className={buyLink ? m.btnSecondary : m.btnPrimary}>
                    Get your own card
                  </a>
                  <a href="#editions" data-track="cta" data-track-label="cards-hero-see-editions" className={m.btnSecondary}>
                    See the editions
                  </a>
                  <a href={CONTACT_MAILTO} data-contact-email className={m.btnSecondary}>
                    Email us
                  </a>
                </div>
              </div>
              <div className={p.heroShowcase}>
                <p className={p.showcaseEyebrow}>Live preview</p>
                <div className={p.qrWrap} data-card-qr>
                  <EditionTile edition={signature} />
                  <figure className={p.qrFigure}>
                    <img src="/cards/living-card-qr.png" alt="QR code that opens unite-group.in/cards" width={128} height={128} />
                    <figcaption>Scan to open this page</figcaption>
                  </figure>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="editions" className={`${m.section} ${p.editionsBand}`}>
          <div className={m.wrap}>
            <SectionIntro
              title="Nine editions"
              lead="Every example ends on the Unite Group logo. Yours ends on your own. Each clip is AI-generated and runs for about four seconds."
            />
            <p className={p.editionsHint}>Hover or tap a tile to play the clip. Your card uses your logo and colours instead of ours.</p>
            <div className={p.grid}>
              {editions.map((edition) => (
                <EditionTile key={edition.name} edition={edition} />
              ))}
            </div>
          </div>
        </section>

        <section className={m.sectionAlt} aria-label="How you get your card">
          <div className={m.wrap}>
            <SectionIntro title="How you get your card" />
            <div className={m.stepsRow}>
              {STEPS.map((step, i) => {
                const StepIcon = step.icon
                return (
                  <div key={step.title} className={`${m.stepCard} ${p.stepCardLift}`}>
                    <p className={m.stepNo}>Step {i + 1}</p>
                    <span className={p.stepIcon} aria-hidden="true">
                      <StepIcon strokeWidth={1.5} size={24} />
                    </span>
                    <h3 className={m.stepTitle}>{step.title}</h3>
                    <p className={m.stepBody}>{step.body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="compare" className={m.section} aria-labelledby="compare-title">
          <div className={m.wrap}>
            <SectionIntro
              id="compare-title"
              eyebrow="Compare"
              title="Starter pack and Business Pack"
              lead="Both are one-off prices with GST included. Choose the pack that matches how much bespoke film work you need."
            />
            <ul className={p.compareGrid}>
              {CARD_TIERS.map((tier) => {
                const on = liveTierIds.has(tier.id)
                return (
                  <li
                    key={tier.id}
                    className={`${p.compareCard} ${tier.id === 'ready' ? p.compareFeatured : ''}`}
                    data-tier={tier.id}
                  >
                    <h3 className={p.compareName}>{tier.name}</h3>
                    <p className={p.comparePrice}>
                      {on ? (
                        <>
                          <span className={p.compareAmount}>{formatAud(tier.priceAud)}</span>
                          <span className={p.compareGst}> GST included</span>
                        </>
                      ) : (
                        <span className={p.compareAsk}>Ask us for the current price</span>
                      )}
                    </p>
                    <p className={p.compareLine}>{TIER_LINES[tier.id]}</p>
                    <p className={p.compareMeta}>{`${tier.rounds} rounds of changes.`}</p>
                    <div className={p.compareCtas}>
                      {on ? (
                        <a
                          href="/cards/order"
                          data-track="cta"
                          data-track-label={`cards-compare-${tier.id}`}
                          className={tier.id === 'ready' ? m.btnPrimary : m.btnSecondary}
                        >
                          {`Order ${tier.name}`}
                        </a>
                      ) : (
                        <a href={CONTACT_MAILTO} data-contact-email className={m.btnSecondary}>
                          Email to order
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section id="pricing" className={m.section}>
          <div className={m.wrap}>
            <SectionIntro
              eyebrow="Price"
              title={live.length > 1 ? 'Two ways to get a card' : 'Get a card'}
              lead={live.length ? PRICE_NOTE : 'Online orders are not open yet. Ask us about a card.'}
            />
            <ul className={s.tiers}>
            {live.map((tier) => (
              <li key={tier.id} className={s.tier}>
                <h3 className={s.tierName}>{tier.name}</h3>
                <p className={s.price}>
                  {`AUD ${tier.priceAud} `}
                  <span className={s.priceGst}>(GST included)</span>
                </p>
                <p className={s.tierLine}>{TIER_LINES[tier.id]}</p>
                <p className={s.tierLine} data-tier-rounds>{`Includes ${tier.rounds} rounds of changes.`}</p>
              </li>
            ))}
          </ul>
          </div>
        </section>

        <section className={m.sectionAlt} aria-label="Hosting and limits">
          <div className={`${m.wrap} ${s.cols}`}>
            <div id="hosting">
              <h2 className={s.heading}>Hosting</h2>
              <ul className={s.list}>
                {HOSTING_FACTS.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            <div id="exclusions">
              <h2 className={s.heading}>Not included, and limits</h2>
              <ul className={s.list}>
                {EXCLUSION_FACTS.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="faq" className={m.section}>
          <div className={m.wrap}>
            <SectionIntro title="Questions" />
            <div className={s.faq}>
            {FAQ_FACTS.map((item) => (
              <details key={item.question} className={s.faqItem}>
                <summary>{item.question}</summary>
                <p>{item.answer.join(' ')}</p>
              </details>
            ))}
          </div>
          <p className={s.note}>Every answer is quoted from the order terms; section numbers refer to them.</p>
            <p className={s.links}>
              <a href="/cards/terms" className={s.link}>
                Order terms
              </a>
              <a href="/cards/order" data-track="cta" data-track-label="cards-faq-order" className={s.link}>
                Get your own card
              </a>
            </p>
          </div>
        </section>

        <section className={m.sectionAlt}>
          <div className={m.wrap}>
            <SectionIntro
              title="Ready for your logo?"
              lead="Pick an edition, send your details, and approve a proof before anything goes live."
            />
            <div className={m.actions}>
              <a href="/cards/order" data-track="cta" data-track-label="cards-footer-order" className={m.btnPrimary}>
                Get your own card
              </a>
              <a href="/pricing" className={m.btnSecondary}>See full pricing</a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
