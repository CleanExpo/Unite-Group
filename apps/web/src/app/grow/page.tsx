import type { Metadata } from 'next'

import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'

import { LeadForm } from './lead-form'
import { liveCardOffers } from './living-card'
import { GROW_PACKAGES, formatAud, paymentLinkFor, serializeJsonLd } from './packages'

const PAGE_URL = 'https://unite-group.in/grow'

export const metadata: Metadata = {
  title: 'Local business growth: websites, Google profile and AI search | Unite Group',
  description:
    'Unite Group sets up and runs your website, Google Business Profile, reviews and AI-search visibility. Fixed prices in AUD. Free AI-visibility audit.',
  alternates: { canonical: PAGE_URL },
  // Kept for later but not offered: Synthex is internal only, so no priced customer offer is indexed (go-live audit D3).
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
    <div className="min-h-screen bg-[#fbfaf6] text-stone-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd()) }} />

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-mono text-[13px] tracking-[0.15em] text-green-800">UNITE GROUP</span>
          <a href="#audit" className="rounded-sm border border-green-700 px-4 py-2 text-[14px] font-semibold text-green-800 hover:bg-green-50">
            Free audit
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-14 pt-16 sm:pt-24">
          <p className="font-mono text-[12px] tracking-[0.14em] text-stone-500">FOR AUSTRALIAN AND NEW ZEALAND LOCAL BUSINESSES</p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2.1rem,5.4vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.025em]">
            More calls, more reviews, and found on Google and in AI answers.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-stone-600">
            We set up and run your website, Google Business Profile, reviews and AI-search visibility. Fixed monthly prices, and you
            approve everything public before it goes out.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#audit" className="inline-flex min-h-12 items-center rounded-sm bg-green-700 px-7 text-[15px] font-semibold text-white hover:bg-green-800">
              Get a free AI-visibility audit
            </a>
            <a href="#packages" className="inline-flex min-h-12 items-center rounded-sm border border-stone-300 bg-white px-7 text-[15px] font-semibold text-stone-800 hover:border-stone-400">
              See packages
            </a>
          </div>
        </section>

        <section id="packages" className="mx-auto max-w-6xl px-6 pb-16">
          <h2 className="text-2xl font-semibold tracking-[-0.015em]">Packages</h2>
          <p className="mt-2 text-[15px] text-stone-600">Prices in AUD, excluding GST.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {GROW_PACKAGES.map((pkg, index) => {
              const payLink = paymentLinkFor(pkg)
              return (
                <article
                  key={pkg.id}
                  data-package={pkg.id}
                  className={`flex flex-col rounded-sm border bg-white p-6 ${index === 1 ? 'border-green-700 shadow-[0_18px_40px_-28px_rgba(21,128,61,0.6)]' : 'border-stone-200'}`}
                >
                  <h3 className="text-lg font-semibold">{pkg.name}</h3>
                  <p className="mt-1.5 min-h-[3rem] text-[15px] text-stone-600">{pkg.pitch}</p>
                  <p className="mt-5">
                    <span className="text-3xl font-semibold tracking-[-0.02em]">{formatAud(pkg.monthlyAud)}</span>
                    <span className="text-[15px] text-stone-500"> /month</span>
                  </p>
                  <p className="mt-1 text-[14px] text-stone-500">plus {formatAud(pkg.setupAud)} setup</p>
                  <ul className="mt-5 space-y-2.5 text-[14px] leading-snug text-stone-700">
                    {pkg.includes.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden className="mt-[0.45em] h-1.5 w-1.5 flex-none rounded-full bg-green-700" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-col gap-2 pt-6">
                    {payLink && (
                      <a href={payLink} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-green-700 px-5 text-[14px] font-semibold text-white hover:bg-green-800">
                        Start {pkg.name}
                      </a>
                    )}
                    <a href="#audit" className="inline-flex min-h-11 items-center justify-center rounded-sm border border-stone-300 px-5 text-[14px] font-semibold text-stone-800 hover:border-stone-400">
                      Free audit first
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {cardOffers.length > 0 && (
          <section id="living-card" className="mx-auto max-w-6xl px-6 pb-16">
            <h2 className="text-2xl font-semibold tracking-[-0.015em]">Living Business Card</h2>
            <p className="mt-2 text-[15px] text-stone-600">A short film that works as your business card. Prices in AUD, one-off, GST included.</p>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {cardOffers.map((offer) => (
                <article key={offer.id} data-card-offer={offer.id} className="flex flex-col rounded-sm border border-stone-200 bg-white p-6">
                  <h3 className="text-lg font-semibold">{offer.name}</h3>
                  {offer.priceAud > 0 && (
                    <p className="mt-3">
                      <span className="text-3xl font-semibold tracking-[-0.02em]">{formatAud(offer.priceAud)}</span>
                      <span className="text-[15px] text-stone-500">{offer.id === 'extra_business' ? ' each' : ''} inc GST</span>
                    </p>
                  )}
                  <p className="mt-3 text-[15px] text-stone-600">{offer.line}</p>
                  <div className="mt-auto pt-6">
                    <a href={offer.link} className="inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-green-700 px-5 text-[14px] font-semibold text-white hover:bg-green-800">
                      Buy {offer.name}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <p className="font-mono text-[12px] tracking-[0.14em] text-green-800">STEP {i + 1}</p>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="audit" className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-[-0.015em]">Get your free AI-visibility audit</h2>
          <p className="mt-2 text-[15px] text-stone-600">
            We check your site speed, your Google Business Profile, and whether ChatGPT, Perplexity and Google mention your business.
          </p>
          <div className="mt-8">
            <LeadForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[13px] text-stone-500">
          <span>
            {COMPANY_NAME} · {companyAbnLabel()}
          </span>
          <span className="flex gap-4">
            <a href="/privacy-policy" className="hover:text-stone-800">Privacy</a>
            <a href="/terms-of-service" className="hover:text-stone-800">Terms</a>
          </span>
        </div>
      </footer>
    </div>
  )
}
