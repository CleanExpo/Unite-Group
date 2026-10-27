import Image from 'next/image'
import type { CSSProperties } from 'react'

import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, pillarPath, type Pillar } from '@/lib/public-site'

import { PILLAR_CHAPTER } from './pillar-page-copy'
import ps from './pillar.module.css'
import pp from './pillar-solution.module.css'
import { PILLAR_SCREENS, type Screen } from './pillar-visuals'
import { PublicPageShell } from './public-page-shell'
import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'

const WIDE_SIZES = '(min-width: 1280px) 600px, (min-width: 760px) 48vw, 100vw'

function ScreenFigure({
  shot,
  eager,
  variant = 'default',
}: {
  shot: Screen
  eager: boolean
  variant?: 'default' | 'cinema' | 'theater'
}) {
  const phone = shot.frame === 'phone'
  const frameClass =
    variant === 'cinema'
      ? phone
        ? `${ps.phone} ${ps.phoneCinema}`
        : `${ps.browser} ${ps.browserCinema}`
      : variant === 'theater'
        ? phone
          ? `${ps.phone} ${ps.phoneTheater}`
          : `${ps.browser} ${ps.browserTheater}`
        : phone
          ? ps.phone
          : ps.browser

  return (
    <figure className={frameClass} style={{ '--shot-w': `${shot.cssWidth}px` } as CSSProperties}>
      {phone ? null : (
        <span className={ps.browserBar} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      <Image
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        preload={eager}
        loading={eager ? undefined : 'lazy'}
        sizes={phone ? (variant === 'cinema' ? 'min(90vw, 320px)' : '280px') : WIDE_SIZES}
      />
    </figure>
  )
}

export function PillarPage({ slug }: { slug: Pillar['slug'] }) {
  const pillar = PILLARS.find((p) => p.slug === slug)
  if (!pillar) throw new Error(`Unknown pillar ${slug}`)
  const live = slug === SHIPPED_PILLAR
  const { hero, support } = PILLAR_SCREENS[slug]
  const from = lowestCardPrice()
  const copy = PILLAR_CHAPTER[slug]
  const sisters = PILLARS.filter((p) => p.slug !== slug)

  return (
    <PublicPageShell>
      <SiteNav />
      <main id="main" className={pp.page} data-pillar={slug}>
        <section className={pp.heroCinema} aria-labelledby="pillar-title">
          <div className={pp.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={pp.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li>Solutions</li>
                <li aria-current="page">{pillar.name}</li>
              </ol>
            </nav>
          </div>
          <div className={pp.wrap}>
            <div className={pp.heroStage}>
              <div className={pp.heroMedia}>
                <div className={pp.heroMediaInner}>
                  <ScreenFigure shot={hero} eager variant="cinema" />
                </div>
                <div className={pp.heroVignette} aria-hidden="true" />
                <p className={pp.screenTag}>Product preview · sample data</p>
              </div>
              <div className={pp.heroPanel}>
                <p className={pp.kicker}>{pillar.name}</p>
                <h1 id="pillar-title" className={pp.h1}>{pillar.headline}</h1>
                <p className={pp.lead}>{pillar.intro}</p>
                <p className={pp.statusRow}>
                  <span className={pp.chipComing}>Coming</span>
                </p>
                <div className={pp.heroActions}>
                  <a href="/#contact" className={pp.ctaPrimary}>Ask a question</a>
                  <a href="/cards" className={pp.ctaSecondary}>See living cards</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={pp.chapter} aria-labelledby="pillar-will">
          <div className={pp.wrap}>
            <header className={pp.showHead}>
              <p className={pp.eyebrow}>Capabilities</p>
              <h2 id="pillar-will" className={pp.sectionTitle}>{copy.capabilitiesTitle}</h2>
              <p className={pp.sectionLead}>{copy.capabilitiesLead}</p>
            </header>
            <ol className={pp.capGrid}>
              {pillar.will.map((item, index) => (
                <li key={item} className={pp.capCard}>
                  <span className={pp.capNo}>{index + 1}</span>
                  <p className={pp.capText}>{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {support ? (
          <section className={pp.chapterShow} aria-labelledby="pillar-proof">
            <div className={pp.wrap}>
              <header className={pp.showHead}>
                <p className={pp.eyebrow}>Proof</p>
                <h2 id="pillar-proof" className={pp.sectionTitle}>{copy.proofTitle}</h2>
                <p className={pp.sectionLead}>{copy.proofLead}</p>
              </header>
              <div className={pp.theater}>
                <ScreenFigure shot={support} eager={false} variant="theater" />
              </div>
            </div>
          </section>
        ) : null}

        {live ? (
          <section className={pp.offerBand} aria-labelledby="pillar-live">
            <div className={pp.wrap}>
              <div className={pp.offerGrid}>
                <a href="/cards" className={pp.poster} tabIndex={-1}>
                  <Image
                    src="/cards/media/edition-blueprint-poster.jpg"
                    width={720}
                    height={1280}
                    alt="The Blueprint edition of the living business card: a cracked copper U glowing orange on navy, with the words Unite-Group Nexus beneath"
                    loading="lazy"
                    sizes="200px"
                  />
                </a>
                <div>
                  <header className={pp.showHead}>
                    <p className={pp.eyebrow}>Available now</p>
                    <h2 id="pillar-live" className={pp.sectionTitle}>Available now: the video business card</h2>
                    <p className={pp.sectionLead}>
                      {from ? `From ${from}, one-off price, GST included.` : 'Online orders are not open yet. Ask us about a card.'}
                    </p>
                  </header>
                  <div className={pp.heroActions}>
                    <a href="/cards" className={pp.ctaPrimary}>See the living card</a>
                    <a href="/cards/order" className={pp.ctaSecondary}>Order a card</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={pp.chapter} aria-labelledby="pillar-sisters">
          <div className={pp.wrap}>
            <header className={pp.showHead}>
              <p className={pp.eyebrow}>The stack</p>
              <h2 id="pillar-sisters" className={pp.sectionTitle}>Other layers</h2>
              <p className={pp.sectionLead}>Four pillars, one product direction. Explore the rest while this layer is on the roadmap.</p>
            </header>
            <ul className={pp.pillarGrid}>
              {sisters.map((p) => (
                <li key={p.slug}>
                  <a href={pillarPath(p.slug)} className={pp.pillarCard}>
                    <span className={pp.pillarName}>{p.name}</span>
                    <span className={pp.pillarLine}>{p.line}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={pp.closeBand} aria-labelledby="pillar-close">
          <div className={pp.wrap}>
            <div className={pp.closePanel}>
              <h2 id="pillar-close" className={pp.sectionTitle}>{copy.closeTitle}</h2>
              <p className={pp.sectionLead}>{copy.closeLead}</p>
              <div className={pp.heroActions}>
                <a href="/#contact" className={pp.ctaPrimary}>Contact us</a>
                <a href="/pricing" className={pp.ctaSecondary}>View pricing</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </PublicPageShell>
  )
}
