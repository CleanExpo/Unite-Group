import Image from 'next/image'
import type { CSSProperties } from 'react'

import '@/styles/public-tokens.css'

import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, type Pillar } from '@/lib/public-site'

import ps from './pillar.module.css'
import { PILLAR_SCREENS, type Screen } from './pillar-visuals'
import s from './public.module.css'
import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'

const WIDE_SIZES = '(min-width: 1280px) 600px, (min-width: 760px) 48vw, 100vw'

// A real product screen in a CSS browser or phone frame. The phone frame caps its width, so its image is sized to match.
function ScreenFigure({ shot, eager }: { shot: Screen; eager: boolean }) {
  const phone = shot.frame === 'phone'
  return (
    <figure className={phone ? ps.phone : ps.browser} style={{ '--shot-w': `${shot.cssWidth}px` } as CSSProperties}>
      {phone ? null : (
        <span className={ps.browserBar} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      <Image src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} preload={eager} loading={eager ? undefined : 'lazy'} sizes={phone ? '280px' : WIDE_SIZES} />
    </figure>
  )
}

// One job per pillar page: say what the pillar is, that it is coming, and where to ask. The first
// breadcrumb is "Unite Group", so the word Home never appears.
export function PillarPage({ slug }: { slug: Pillar['slug'] }) {
  const pillar = PILLARS.find((p) => p.slug === slug)
  if (!pillar) throw new Error(`Unknown pillar ${slug}`)
  const live = slug === SHIPPED_PILLAR
  const { hero, support } = PILLAR_SCREENS[slug]
  const from = lowestCardPrice()

  return (
    <div className={s.page}>
      <SiteNav />
      <main id="main" className={s.wrap}>
        <nav aria-label="Breadcrumb">
          <ol className={s.crumbs}>
            <li>
              <a href="/">Unite Group</a>
            </li>
            <li>What we do</li>
            <li aria-current="page">{pillar.name}</li>
          </ol>
        </nav>
        <article className={s.pillarHero}>
          <div className={ps.heroGrid}>
            <div>
              <p className={s.eyebrow}>{pillar.name}</p>
              <h1 className={s.h1}>{pillar.headline}</h1>
              <p className={s.lead}>{pillar.intro}</p>
              <p>
                <span className={s.status}>Coming</span>
              </p>
            </div>
            <ScreenFigure shot={hero} eager />
          </div>
          <div className={support ? ps.listGrid : ps.section}>
            <div>
              <h2 className={s.h2}>What it will do</h2>
              <ul className={s.bullets}>
                {pillar.will.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            {support && <ScreenFigure shot={support} eager={false} />}
          </div>
          {live && (
            <aside className={s.available}>
              <div className={ps.availableRow}>
                {/* Out of the tab order: the button below is the one keyboard stop for /cards. */}
                <a href="/cards" className={ps.poster} tabIndex={-1}>
                  <Image src="/cards/media/edition-blueprint-poster.jpg" width={720} height={1280} alt="The Blueprint edition of the living business card: a cracked copper U glowing orange on navy, with the words Unite-Group Nexus beneath" loading="lazy" sizes="200px" />
                </a>
                <div>
                  <h2>Available now: the video business card</h2>
                  <p>{from ? `From ${from}, one-off price, GST included.` : 'Online orders are not open yet. Ask us about a card.'}</p>
                  <a href="/cards" className={s.buttonPrimary}>
                    See the living card
                  </a>
                </div>
              </div>
            </aside>
          )}
          <p className={ps.section}>
            <a href="/#contact">Ask a question</a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
