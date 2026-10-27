import type { Metadata } from 'next'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import { SiteFooter } from '@/public/site/site-footer'
import { SiteNav } from '@/public/site/site-nav'
import { SectionIntro } from '@/public/section-intro'
import m from '@/public/layout/marketing-page.module.css'
import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'

import g from './grow-page.module.css'
import { LeadForm } from './lead-form'
import { LivingCardSection } from './living-card-section'
import { liveCardOffers } from './living-card'
import { GROW_PACKAGES, formatAud, paymentLinkFor, serializeJsonLd } from './packages'

const PAGE_URL = 'https://unite-group.in/grow'

export const metadata: Metadata = {
  title: 'Local business growth: websites, Google profile and AI search | Unite Group',
  description:
    'Unite Group sets up and runs your website, Google Business Profile, reviews and AI-search visibility. Fixed prices in AUD. Free AI-visibility audit.',
  alternates: { canonical: PAGE_URL },
  robots: { index: false, follow: false },
}

const STEPS = [
  { title: 'Free audit', body: 'We measure your site speed, Google profile and whether AI assistants mention you. You get the numbers.' },
  { title: 'We set it up', body: 'Your package goes live in days, not months. You approve anything public before it goes out.' },
  { title: 'Monthly proof', body: 'Every month you see before and after screenshots and scores, not claims.' },
]

function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Unite Group local business growth packages',
    url: PAGE_URL,
    provider: { '@type': 'Organization', name: COMPANY_NAME, url: 'https://unite-group.in' },
    itemListElement: GROW_PACKAGES.map((pkg) => ({
      '@type': 'Offer',
      name: pkg.name,
      description: pkg.pitch,
      priceCurrency: 'AUD',
      price: pkg.setupAud,
      priceSpecification: [
        { '@type': 'UnitPriceSpecification', price: pkg.setupAud, priceCurrency: 'AUD', valueAddedTaxIncluded: false, name: 'Setup' },
        { '@type': 'UnitPriceSpecification', price: pkg.monthlyAud, priceCurrency: 'AUD', valueAddedTaxIncluded: false, unitCode: 'MON', name: 'Monthly' },
      ],
      areaServed: ['AU', 'NZ'],
    })),
  }
}

export default function GrowPage() {
  const cardOffers = liveCardOffers()
  return (
    <PublicPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd()) }} />
      <SiteNav />

      <main id="main" className={m.main}>
        <section className={m.heroBand}>
          <div className={m.wrap}>
            <SectionIntro
              as="h1"
              eyebrow="For Australian and New Zealand local businesses"
              title="More calls, more reviews, and found on Google and in AI answers."
              lead="We set up and run your website, Google Business Profile, reviews and AI-search visibility. Fixed monthly prices, and you approve everything public before it goes out."
            />
            <div className={m.actions}>
              <a href="#audit" className={m.btnPrimary}>Get a free AI-visibility audit</a>
              <a href="#packages" className={m.btnSecondary}>See packages</a>
            </div>
          </div>
        </section>

        <section id="packages" className={m.section}>
          <div className={m.wrap}>
            <SectionIntro title="Packages" lead="Prices in AUD, excluding GST." />
            <div className={m.packageGrid}>
              {GROW_PACKAGES.map((pkg, index) => {
                const payLink = paymentLinkFor(pkg)
                return (
                  <article key={pkg.id} data-package={pkg.id} className={`${g.card} ${index === 1 ? g.cardFeatured : ''}`}>
                    <h3 className={g.cardTitle}>{pkg.name}</h3>
                    <p className={g.cardPitch}>{pkg.pitch}</p>
                    <p className={g.priceRow}>
                      <span className={g.priceMain}>{formatAud(pkg.monthlyAud)}</span>
                      <span className={g.pricePeriod}> /month</span>
                    </p>
                    <p className={g.setup}>plus {formatAud(pkg.setupAud)} setup</p>
                    <ul className={g.includes}>
                      {pkg.includes.map((item) => (
                        <li key={item}>
                          <span aria-hidden className={g.dot} />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className={g.cardActions}>
                      {payLink ? (
                        <a href={payLink} className={m.btnPrimary}>Start {pkg.name}</a>
                      ) : null}
                      <a href="#audit" className={m.btnSecondary}>Free audit first</a>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <LivingCardSection offers={cardOffers} />

        <section className={m.sectionAlt} aria-label="How it works">
          <div className={m.wrap}>
            <SectionIntro title="How it works" />
            <div className={m.stepsRow}>
              {STEPS.map((step, i) => (
                <div key={step.title} className={m.stepCard}>
                  <p className={m.stepNo}>Step {i + 1}</p>
                  <h3 className={m.stepTitle}>{step.title}</h3>
                  <p className={m.stepBody}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="audit" className={m.section}>
          <div className={m.wrap}>
            <SectionIntro
              title="Get your free AI-visibility audit"
              lead="We check your site speed, your Google Business Profile, and whether ChatGPT, Perplexity and Google mention your business."
            />
            <div className={g.formWrap}>
              <LeadForm />
            </div>
            <p className={g.auditLead} style={{ marginTop: '1.5rem' }}>
              {COMPANY_NAME} · {companyAbnLabel()}
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
