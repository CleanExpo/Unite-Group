import type { Metadata } from 'next'

import { SiteFooter } from '@/components/public/site-footer'
import { PublicPageShell } from '@/components/public/public-page-shell'
import { CONTACT_MAILTO, SiteNav } from '@/components/public/site-nav'
import { cardsShowroomJsonLd } from '@/lib/cards-jsonld'
import { liveCardTiers } from '@/lib/public-pricing'
import { SITE_URL } from '@/lib/public-site'

import { serializeJsonLd } from '@/app/grow/packages'

import { EditionTile } from './edition-tile'
import { EDITIONS } from './editions'
import p from './showroom-page.module.css'
import s from './showroom.module.css'
import { EXCLUSION_FACTS, FAQ_FACTS, HOSTING_FACTS, PRICE_NOTE, TIER_LINES } from './showroom-facts'

export const metadata: Metadata = {
  title: 'Living business cards Australia | Video card with QR | Unite Group',
  description:
    'Order a living business card that opens on a short film and ends on your logo. Nine editions, QR and vCard for Australian businesses. From $249 GST included.',
  alternates: { canonical: `${SITE_URL}/cards` },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Living business cards | Unite Group',
    description: 'A business card that opens like a film and ends on your logo.',
    url: `${SITE_URL}/cards`,
  },
}

const STEPS = [
  { title: 'Pick an opener', body: 'Choose the edition you like. Yours ends on your own logo, not ours.' },
  { title: 'Send your details', body: 'Your logo, colours, contact details and the businesses you want linked.' },
  { title: 'Approve a proof', body: 'We build your card and send you a private link to check before anything goes live.' },
]

export default function CardsShowroomPage() {
  const [signature, ...editions] = EDITIONS
  const live = liveCardTiers()
  const productLd = cardsShowroomJsonLd()
  return (
    <PublicPageShell>
      {productLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productLd) }} />
      ) : null}
      <SiteNav />
      <div className={p.toolbar}>
        <div className={p.toolbarInner}>
          <a href="/cards/order" data-track="cta" data-track-label="cards-header-get-card" className={p.btnPrimary}>
            Get your own card
          </a>
        </div>
      </div>

      <main id="main">
        <section className={p.hero} aria-labelledby="cards-title">
          <div>
            <p className={p.eyebrow}>Living business cards</p>
            <h1 id="cards-title" className={p.h1}>
              A business card that opens like a film and ends on your logo.
            </h1>
            <p className={p.lead}>
              One link or QR code. It plays a short opener, then shows your details, saves to contacts in one tap, and links to
              your businesses. Tap any edition below to watch it.
            </p>
            <div className={p.actions}>
              <a href="/cards/order" data-track="cta" data-track-label="cards-hero-get-card" className={p.btnPrimary}>
                Get your own card
              </a>
              <a href="#editions" data-track="cta" data-track-label="cards-hero-see-editions" className={p.btnSecondary}>
                See the editions
              </a>
              <a href={CONTACT_MAILTO} data-contact-email className={p.btnSecondary}>
                Email us
              </a>
            </div>
          </div>
          <div className={p.qrWrap} data-card-qr>
            <EditionTile edition={signature} />
            <figure className={p.qrFigure}>
              <img src="/cards/living-card-qr.png" alt="QR code that opens unite-group.in/cards" width={128} height={128} />
              <figcaption>Scan to open this page</figcaption>
            </figure>
          </div>
        </section>

        <section id="editions" className={p.editions}>
          <h2 className={p.h2}>Nine editions</h2>
          <p className={p.editionsLead}>
            Every example ends on the Unite Group logo. Yours ends on your own. Each clip is AI-generated and runs for about four
            seconds.
          </p>
          <div className={p.grid}>
            {editions.map((edition) => (
              <EditionTile key={edition.name} edition={edition} />
            ))}
          </div>
        </section>

        <section className={p.stepsBand} aria-label="How you get your card">
          <div className={p.stepsInner}>
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <p className={p.stepNo}>Step {i + 1}</p>
                <h3 className={p.stepTitle}>{step.title}</h3>
                <p className={p.stepBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className={s.section}>
          <p className={s.eyebrow}>Price</p>
          <h2 className={s.heading}>{live.length > 1 ? 'Two ways to get a card' : 'Get a card'}</h2>
          <p className={s.note}>{live.length ? PRICE_NOTE : 'Online orders are not open yet. Ask us about a card.'}</p>
          <ul className={s.tiers}>
            {live.map((tier) => (
              <li key={tier.id} className={s.tier}>
                <h3 className={s.tierName}>{tier.name}</h3>
                <p className={s.price}>
                  {`AUD ${tier.priceAud} `}
                  <span className={s.priceGst}>(GST included)</span>
                </p>
                <p className={s.tierLine}>{TIER_LINES[tier.id]}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={s.band}>
          <div className={`${s.section} ${s.cols}`}>
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

        <section id="faq" className={s.section}>
          <h2 className={s.heading}>Questions</h2>
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
        </section>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
