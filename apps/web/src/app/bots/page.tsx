import type { Metadata } from 'next'
import { MotionItem, MotionSection, PremiumHero, PremiumImage } from '@cleanexpo/premium-visuals'

import { PublicPageShell } from '@/public/layout/public-page-shell'
import { SiteFooter } from '@/public/site/site-footer'
import { SiteNav } from '@/public/site/site-nav'
import { SectionIntro } from '@/public/section-intro'
import m from '@/public/layout/marketing-page.module.css'
import { serializeJsonLd } from '@/app/grow/packages'
import { BOTS, BOTS_HERO, BOTS_PAGE_PATH, LEAD_DEMO_ANCHOR, type Bot, type BotMediaSlot } from '@/lib/bots/catalogue'
import { botsPageJsonLd } from '@/lib/bots/jsonld'
import { SITE_URL } from '@/lib/public-site'

import { LeadDemo } from './lead-demo'
import s from './bots.module.css'

const PAGE_URL = `${SITE_URL}${BOTS_PAGE_PATH}`
const TITLE = 'AI bots for small business | Unite Group'
const DESCRIPTION =
  'Meet the Unite Group bots that answer enquiries, follow up leads, take bookings and handle order questions for small businesses. Try the lead follow-up bot live.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL },
}

/** One named picture from the media manifest (premium-visuals PremiumImage: next/image, lazy, sized). */
function BotImage({ slot }: { slot: BotMediaSlot }) {
  return (
    <div className={s.picture} data-image-slot={slot.name}>
      <PremiumImage media={slot.media} sizes="(min-width: 1180px) 33vw, (min-width: 760px) 50vw, 100vw" />
    </div>
  )
}

/** The explainer video slot. Renders only when a real video file is set in the catalogue. */
function BotVideo({ bot }: { bot: Bot }) {
  const v = bot.video
  if (!v.src) return null
  return (
    <video
      className={s.video}
      src={v.src}
      poster={v.poster ?? undefined}
      controls
      preload="none"
      playsInline
      data-track="video"
      data-track-label={v.name}
      data-video-slot={v.name}
    />
  )
}

function BotCard({ bot }: { bot: Bot }) {
  const live = bot.status === 'live'
  return (
    <article id={bot.id} className={s.card} data-bot={bot.id} data-bot-status={bot.status}>
      <BotImage slot={bot.image} />
      <BotVideo bot={bot} />
      <div className={s.cardBody}>
        <p className={live ? s.badgeLive : s.badgeSoon}>{live ? 'Live demo' : 'Demo coming soon'}</p>
        <h3 className={s.cardTitle}>{bot.name}</h3>
        <p className={s.cardSummary}>{bot.summary}</p>
        <ul className={s.points}>
          {bot.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        {live ? (
          <a href={`#${LEAD_DEMO_ANCHOR}`} className={m.btnPrimary} data-track="cta" data-track-label={`bots-try-${bot.id}`}>
            Try it live
          </a>
        ) : (
          <span className={s.soon} aria-disabled="true">
            Demo coming soon
          </span>
        )}
      </div>
    </article>
  )
}

export default function BotsPage() {
  return (
    <PublicPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(botsPageJsonLd()) }} />
      <SiteNav />

      <main id="main" className={`${m.main} ${s.page}`}>
        <div className={s.hero}>
          <PremiumHero
            media={BOTS_HERO}
            eyebrow="For small business owners"
            title="Bots that answer your customers while you get on with the work."
            lede="A cafe owner mid-rush, a clinic between patients, a salon with every chair full: the enquiry still gets a reply. Each Unite Group bot does one job well. The lead follow-up bot is live below, so you can try it yourself."
            actions={
              <a href={`#${LEAD_DEMO_ANCHOR}`} className={m.btnPrimary} data-track="cta" data-track-label="bots-hero-try-lead-follow-up">
                Try the lead follow-up bot
              </a>
            }
          />
        </div>

        <section className={m.section} aria-labelledby="bots-team">
          <div className={m.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={m.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li aria-current="page">Bots</li>
              </ol>
            </nav>
            <SectionIntro id="bots-team" title="The bot team" lead="One card per bot. Only the lead follow-up bot has a live demo today; the others are on the way." />
            <MotionSection as="div" effect="stagger" className={s.grid}>
              {BOTS.map((bot) => (
                <MotionItem key={bot.id} className={s.gridItem}>
                  <BotCard bot={bot} />
                </MotionItem>
              ))}
            </MotionSection>
          </div>
        </section>

        <section id={LEAD_DEMO_ANCHOR} className={m.sectionAlt} aria-labelledby="bots-demo-title">
          <div className={m.wrap}>
            <SectionIntro
              id="bots-demo-title"
              title="Try the lead follow-up bot"
              lead="Tell it what your business needs, as a customer would. It asks a few questions, then shows you the details it picked up before anything is sent."
            />
            <div className={s.demoWrap}>
              <LeadDemo />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
