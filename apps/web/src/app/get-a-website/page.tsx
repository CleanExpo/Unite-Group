import type { Metadata } from 'next'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import { SiteFooter } from '@/public/site/site-footer'
import { SiteNav } from '@/public/site/site-nav'
import { SectionIntro } from '@/public/section-intro'
import m from '@/public/layout/marketing-page.module.css'
import { publicPageMetadata } from '@/lib/page-metadata'

import { IntakeForm } from './intake-form'
import { HERO_IMAGE, OFFER_ID, STEPS } from './offer'
import { SlotImage } from './slot-image'
import s from './get-a-website.module.css'

const TITLE = 'Get a new website | Unite Group'
const DESCRIPTION = 'Tell us about your business in a few short questions. We read your answers, then give you a clear plan and a quote before anything starts.'

export const metadata: Metadata = publicPageMetadata({
  path: '/get-a-website',
  title: TITLE,
  description: DESCRIPTION,
})

export default function GetAWebsitePage() {
  return (
    <PublicPageShell>
      <SiteNav />

      <main id="main" className={m.main} data-offer={OFFER_ID}>
        <section className={m.heroBand}>
          <div className={m.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={m.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li aria-current="page">Get a new website</li>
              </ol>
            </nav>
            <div className={HERO_IMAGE.src ? s.heroSplit : undefined}>
              <div>
                <SectionIntro
                  as="h1"
                  eyebrow="For small business owners"
                  title="A new website for your business, starting with a few short questions."
                  lead="You run the business, so you should not have to learn how websites work. Tell us what you do and what you need. We read your answers and come back with a clear plan and a quote."
                />
                <div className={m.actions}>
                  <a href="#questions" className={m.btnPrimary}>Start the questions</a>
                </div>
              </div>
              <SlotImage slot={HERO_IMAGE} />
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

        <section id="questions" className={m.sectionAlt}>
          <div className={m.wrap}>
            <SectionIntro
              title="Tell us about your business"
              lead="Nothing is charged when you send this, and you are not signing up to anything."
            />
            <div className={s.formWrap}>
              <IntakeForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
