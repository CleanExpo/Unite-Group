import type { Metadata } from 'next'

import { Film } from '@/app/cards/order/film'
import { EDITIONS } from '@/app/cards/editions'
import { formatAud } from '@/app/grow/packages'
import { PublicPageShell } from '@/public/layout/public-page-shell'
import { SiteFooter } from '@/public/site/site-footer'
import { SiteNav } from '@/public/site/site-nav'
import { SectionIntro } from '@/public/section-intro'
import m from '@/public/layout/marketing-page.module.css'
import { SITE_URL } from '@/lib/public-site'

import {
  DELIVERY_PROMISE,
  MONTHLY_LINE,
  PAGE_PATH,
  PRESENTER_LINE,
  PRICE_AUD,
  PRICE_LINE,
  SAMPLE_EDITION,
  SAMPLE_LABEL,
  STEPS,
  WHAT_WE_NEED,
  WHAT_YOU_GET,
} from './offer'
import { TenClipsForm } from './ten-clips-form'
import t from './ten-clips.module.css'

const PAGE_URL = `${SITE_URL}${PAGE_PATH}`
const TITLE = 'Ten short videos in a week | Unite Group'
const DESCRIPTION = `Ten short on-brand videos for your social and ads, made from your photos, logo and a one-page brief. ${formatAud(PRICE_AUD)} one-off, GST included. Delivered within 7 days of receiving your materials.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: 'Ten short on-brand videos for your social and ads, from your photos, logo and a one-page brief.',
    url: PAGE_URL,
  },
}

export default function TenClipsPage() {
  const sample = EDITIONS.find((e) => e.name === SAMPLE_EDITION)
  return (
    <PublicPageShell>
      <SiteNav />

      <main id="main" className={m.main} data-offer="ten-clips">
        <section className={m.heroBand}>
          <div className={m.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={m.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li aria-current="page">Ten clips in a week</li>
              </ol>
            </nav>
            <SectionIntro
              as="h1"
              eyebrow="For small business owners"
              title="Ten short videos for your social and ads, without an agency bill."
              lead="You need fresh videos for Instagram, Facebook, TikTok and your ads, and an agency quote is hard to justify. Send us your photos, your logo and a one-page brief, and we make ten short videos for you."
            />
            <div className={m.actions}>
              <a href="#request" className={m.btnPrimary}>Ask for your ten clips</a>
              <a href="#what-you-get" className={m.btnSecondary}>See what you get</a>
            </div>
          </div>
        </section>

        <section id="what-you-get" className={m.section}>
          <div className={m.wrap}>
            <div className={t.split}>
              <div>
                <SectionIntro title="What you get" />
                <ul className={t.list}>
                  {WHAT_YOU_GET.map((item) => (
                    <li key={item}>
                      <span aria-hidden className={t.dot} />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className={t.promise}>{DELIVERY_PROMISE}</p>
              </div>
              {sample ? (
                <div className={t.sample}>
                  <Film edition={sample} />
                  <p className={t.sampleLabel}>{SAMPLE_LABEL}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section id="price" className={m.sectionAlt} aria-label="Price">
          <div className={m.wrap}>
            <div className={t.split}>
              <article className={t.priceCard} data-price="ten-clips">
                <h2 className={t.priceName}>Ten clips in a week</h2>
                <p className={t.price}>{formatAud(PRICE_AUD)}</p>
                <p className={t.priceNote}>One-off, GST included.</p>
                <div className={m.actions}>
                  <a href="#request" className={m.btnPrimary}>Ask for your ten clips</a>
                </div>
              </article>
              <div>
                <SectionIntro title="Price" lead={PRICE_LINE} />
                <p className={t.fine}>{MONTHLY_LINE}</p>
                <p className={t.fine}>{PRESENTER_LINE}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={m.section} aria-label="How it works">
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

        <section className={m.sectionAlt} aria-label="What we need from you">
          <div className={m.wrap}>
            <SectionIntro title="What we need from you" lead="Three things, and the clock starts when we have them." />
            <ul className={t.list}>
              {WHAT_WE_NEED.map((item) => (
                <li key={item}>
                  <span aria-hidden className={t.dot} />
                  {item}
                </li>
              ))}
            </ul>
            <p className={t.promise}>{DELIVERY_PROMISE}</p>
          </div>
        </section>

        <section id="request" className={m.section}>
          <div className={m.wrap}>
            <SectionIntro
              title="Ask for your ten clips"
              lead="Tell us about your business. We reply by email to confirm your brief and how to pay. Nothing is charged when you send this."
            />
            <div className={t.formWrap}>
              <TenClipsForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
