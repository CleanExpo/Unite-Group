import type { Metadata } from 'next'

import { PublicPageShell } from '@/components/public/public-page-shell'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteNav } from '@/components/public/site-nav'
import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'

import g from './grow-page.module.css'
import { LeadForm } from './lead-form'
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
  return (
    <PublicPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd()) }} />
      <SiteNav />

      <main id="main">
        <section className={g.hero}>
          <p className={g.eyebrow}>For Australian and New Zealand local businesses</p>
          <h1 className={g.h1}>More calls, more reviews, and found on Google and in AI answers.</h1>
          <p className={g.lead}>
            We set up and run your website, Google Business Profile, reviews and AI-search visibility. Fixed monthly prices, and you
            approve everything public before it goes out.
          </p>
          <div className={g.actions}>
            <a href="#audit" className={g.btnPrimary}>
              Get a free AI-visibility audit
            </a>
            <a href="#packages" className={g.btnSecondary}>
              See packages
            </a>
          </div>
        </section>

        <section id="packages" className={g.packages}>
          <h2 className={g.h2}>Packages</h2>
          <p className={g.packagesNote}>Prices in AUD, excluding GST.</p>
          <div className={g.grid}>
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
                    {payLink && (
                      <a href={payLink} className={g.btnPrimary}>
                        Start {pkg.name}
                      </a>
                    )}
                    <a href="#audit" className={g.btnSecondary}>
                      Free audit first
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className={g.stepsBand} aria-label="How it works">
          <div className={g.stepsInner}>
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <p className={g.stepNo}>Step {i + 1}</p>
                <h3 className={g.stepTitle}>{step.title}</h3>
                <p className={g.stepBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="audit" className={g.audit}>
          <h2 className={g.h2}>Get your free AI-visibility audit</h2>
          <p className={g.auditLead}>
            We check your site speed, your Google Business Profile, and whether ChatGPT, Perplexity and Google mention your business.
          </p>
          <div className={g.formWrap}>
            <LeadForm />
          </div>
          <p className={g.auditLead} style={{ marginTop: '1.5rem' }}>
            {COMPANY_NAME} · {companyAbnLabel()}
          </p>
        </section>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
